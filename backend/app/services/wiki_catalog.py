"""Read-only catalog lookups against the community die-cast wikis on Fandom.

The Hot Wheels Wiki and the Matchbox Wiki both run MediaWiki, whose public api.php needs no
key, and both document every casting on a page built from the same `Casting` template. That
page carries a "Versions" table (Col #, Year, Series, Color, Toy #, Photo ...), one row per
release, which is what a collector matches a car in hand against. Wiki content is CC BY-SA,
so the UI credits the wiki and links back to the casting page.

Sets (playsets and track sets) are only matched on the Hot Wheels Wiki, which gives each one
its own page, often with a table of the cars that came with it. Those pages don't share a
template, so they're recognised by their categories instead. The Matchbox Wiki has no
comparable page per set.

Searches and parsed casting pages are cached in memory for a while: the wikis change slowly,
and it keeps a self-hosted instance from re-hitting Fandom on every keystroke or revisit.
"""

import re
import threading
import time
from dataclasses import dataclass, field
from html.parser import HTMLParser
from typing import Any
from urllib.parse import quote

import httpx

from app.services.exceptions import NotFoundError

USER_AGENT = "DieCastCollectionTracker/1.1 (+https://github.com/wwwescape/DieCastCollectionTracker)"
REQUEST_TIMEOUT_SECONDS = 15
SEARCH_LIMIT = 20
# Set pages are a minority of search hits (castings dominate), so ask for more and filter.
SET_SEARCH_LIMIT = 50
SET_SOURCES = ("hotwheels",)
SEARCH_CACHE_TTL_SECONDS = 60 * 60
CASTING_CACHE_TTL_SECONDS = 24 * 60 * 60
CASTING_TEMPLATE = "Template:Casting"
IMAGE_HOST = "static.wikia.nocookie.net"


@dataclass(frozen=True)
class WikiSource:
    id: str
    label: str
    manufacturer: str
    base_url: str

    @property
    def api_url(self) -> str:
        return f"{self.base_url}/api.php"

    def page_url(self, title: str) -> str:
        path = quote(title.replace(" ", "_"), safe="()_,!:'")
        return f"{self.base_url}/wiki/{path}"


SOURCES: dict[str, WikiSource] = {
    "hotwheels": WikiSource("hotwheels", "Hot Wheels Wiki", "Hot Wheels", "https://hotwheels.fandom.com"),
    "matchbox": WikiSource("matchbox", "Matchbox Wiki", "Matchbox", "https://matchbox.fandom.com"),
}


class CatalogUnavailableError(Exception):
    """The wiki couldn't be reached or answered with something unusable — 502."""


@dataclass
class CastingSummary:
    source: str
    title: str
    url: str
    thumbnail_url: str | None


@dataclass
class CastingVersion:
    collector_number: str | None
    year: int | None
    series: str | None
    series_number: str | None
    color: str | None
    tampo: str | None
    toy_numbers: list[str]
    notes: str | None
    photo_url: str | None
    thumbnail_url: str | None


@dataclass
class SetSummary:
    source: str
    title: str
    url: str
    thumbnail_url: str | None
    set_type: str


@dataclass
class SetCar:
    name: str
    color: str | None
    photo_url: str | None
    thumbnail_url: str | None


@dataclass
class SetDetail:
    source: str
    title: str
    url: str
    manufacturer: str
    image_url: str | None
    set_type: str
    toy_number: str | None
    year: int | None
    cars: list[SetCar] = field(default_factory=list)


@dataclass
class CastingDetail:
    source: str
    title: str
    url: str
    manufacturer: str
    image_url: str | None
    versions: list[CastingVersion] = field(default_factory=list)


def get_source(source_id: str) -> WikiSource:
    source = SOURCES.get(source_id)
    if source is None:
        raise NotFoundError(f"Unknown catalog source '{source_id}'")
    return source


# --- HTTP + cache -------------------------------------------------------------------------

_cache: dict[str, tuple[float, Any]] = {}
_cache_lock = threading.Lock()


def _cached(key: str, ttl_seconds: int, load):
    now = time.monotonic()
    with _cache_lock:
        entry = _cache.get(key)
        if entry is not None and entry[0] > now:
            return entry[1]
    value = load()
    with _cache_lock:
        _cache[key] = (now + ttl_seconds, value)
    return value


def clear_cache() -> None:
    with _cache_lock:
        _cache.clear()


def _get_json(source: WikiSource, params: dict[str, str]) -> dict[str, Any]:
    """Single choke point for wiki requests, so tests can swap it out."""
    try:
        response = httpx.get(
            source.api_url,
            params={**params, "format": "json", "formatversion": "2"},
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise CatalogUnavailableError(f"{source.label} is unreachable right now") from exc
    if "error" in payload:
        if payload["error"].get("code") == "missingtitle":
            raise NotFoundError("Casting page not found")
        raise CatalogUnavailableError(f"{source.label} returned an error: {payload['error'].get('info', '')}")
    return payload


# Generator queries return per-page props (categories, templates) in batches; with dozens of
# pages, most arrive with an empty list until the "continue" rounds fill them in.
MAX_CONTINUE_ROUNDS = 5


def _query_pages(source: WikiSource, params: dict[str, str]) -> list[dict[str, Any]]:
    payload = _get_json(source, params)
    pages: dict[int | str, dict[str, Any]] = {
        page.get("pageid", page["title"]): page for page in payload.get("query", {}).get("pages", [])
    }
    for _ in range(MAX_CONTINUE_ROUNDS):
        cont = payload.get("continue")
        # Only finish the current batch's props; a bare "gsroffset" is the next page of search
        # results, which nobody asked for.
        if not cont or not any(key in cont for key in ("clcontinue", "tlcontinue")):
            break
        payload = _get_json(source, {**params, **cont})
        for page in payload.get("query", {}).get("pages", []):
            existing = pages.setdefault(page.get("pageid", page["title"]), page)
            if existing is not page:
                for key in ("categories", "templates"):
                    if page.get(key):
                        existing[key] = existing.get(key, []) + page[key]
                if page.get("thumbnail") and not existing.get("thumbnail"):
                    existing["thumbnail"] = page["thumbnail"]
    return list(pages.values())


# --- Search -------------------------------------------------------------------------------


def search(query: str, source_ids: list[str]) -> list[CastingSummary]:
    """Full-text search, so a name ("Skyline R34") and a toy number printed on the card
    ("HYW18") both work — toy numbers appear in the casting page's versions table. Only pages
    built on the Casting template are kept, which drops list, series and designer pages."""
    query = query.strip()
    per_source: list[list[CastingSummary]] = []
    failures: list[CatalogUnavailableError] = []
    for source_id in source_ids:
        source = get_source(source_id)
        try:
            per_source.append(
                _cached(
                    f"search:{source.id}:{query.lower()}",
                    SEARCH_CACHE_TTL_SECONDS,
                    lambda source=source: _search(source, query),
                )
            )
        except CatalogUnavailableError as exc:
            failures.append(exc)
    if failures and not per_source:
        raise failures[0]

    # Interleave so "All" doesn't bury one wiki's best hits under the other's weaker ones.
    merged: list[CastingSummary] = []
    for rank in range(max((len(results) for results in per_source), default=0)):
        merged.extend(results[rank] for results in per_source if rank < len(results))
    return merged


def _search(source: WikiSource, query: str) -> list[CastingSummary]:
    pages = _query_pages(
        source,
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": "0",
            "gsrlimit": str(SEARCH_LIMIT),
            "prop": "pageimages|templates|categories",
            "piprop": "thumbnail",
            "pithumbsize": "320",
            "tltemplates": CASTING_TEMPLATE,
            "tllimit": "max",
            "clshow": "!hidden",
            "cllimit": "max",
        },
    )
    # Track sets and playsets are written up with the Casting template too; they belong in
    # set search, not among the cars.
    castings = [
        page
        for page in pages
        if page.get("templates") and set_type_from_categories(page["title"], _categories(page)) not in _BOXED_SETS
    ]
    castings.sort(key=lambda page: page.get("index", 0))
    return [
        CastingSummary(
            source=source.id,
            title=page["title"],
            url=source.page_url(page["title"]),
            thumbnail_url=(page.get("thumbnail") or {}).get("source"),
        )
        for page in castings
    ]


# --- Sets ---------------------------------------------------------------------------------

_BOXED_SETS = ("track_set", "playset")
_TRACK_SET_CATEGORIES = {"Track Sets", "Tracksets"}
_PLAYSET_CATEGORIES = {"Playsets", "Play Sets", "City Sets", "Unreleased Playsets"}
# Year overviews ("1977 Track Sets") and "List of ..." pages sit in the same categories as the sets.
_LIST_PAGE = re.compile(r"^(?:\d{4} |List of )", re.IGNORECASE)


def _categories(page: dict[str, Any]) -> list[str]:
    return [category["title"] for category in page.get("categories", [])]


def set_type_from_categories(title: str, categories: list[str]) -> str | None:
    """Classifies a wiki page as a playset or track set from its categories, or None if it
    isn't one (multi-packs and gift packs included). Accepts both "Category:Track Sets"
    (query API) and "Track_Sets" (parse API)."""
    names = {category.removeprefix("Category:").replace("_", " ") for category in categories}
    if "Lists" in names:
        return None
    if names & _PLAYSET_CATEGORIES:
        return "playset"
    if names & _TRACK_SET_CATEGORIES:
        return "track_set"
    return None


def search_sets(query: str) -> list[SetSummary]:
    query = query.strip()
    results: list[SetSummary] = []
    for source_id in SET_SOURCES:
        source = get_source(source_id)
        results.extend(
            _cached(
                f"set-search:{source.id}:{query.lower()}",
                SEARCH_CACHE_TTL_SECONDS,
                lambda source=source: _search_sets(source, query),
            )
        )
    return results


def _search_sets(source: WikiSource, query: str) -> list[SetSummary]:
    pages = _query_pages(
        source,
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": "0",
            "gsrlimit": str(SET_SEARCH_LIMIT),
            "prop": "pageimages|templates|categories",
            "piprop": "thumbnail",
            "pithumbsize": "320",
            "tltemplates": CASTING_TEMPLATE,
            "tllimit": "max",
            "clshow": "!hidden",
            "cllimit": "max",
        },
    )
    pages.sort(key=lambda page: page.get("index", 0))
    results: list[SetSummary] = []
    for page in pages:
        if _LIST_PAGE.match(page["title"]):
            continue
        set_type = set_type_from_categories(page["title"], _categories(page))
        if set_type is None:
            continue
        results.append(
            SetSummary(
                source=source.id,
                title=page["title"],
                url=source.page_url(page["title"]),
                thumbnail_url=(page.get("thumbnail") or {}).get("source"),
                set_type=set_type,
            )
        )
    return results


def get_set(source_id: str, title: str) -> SetDetail:
    source = get_source(source_id)
    if source.id not in SET_SOURCES:
        raise NotFoundError(f"Sets aren't matched on the {source.label}")
    return _cached(f"set:{source.id}:{title}", CASTING_CACHE_TTL_SECONDS, lambda: _get_set(source, title))


_PAREN_CODE = re.compile(r"\(([A-Z0-9]{4,7})\)")
_CATEGORY_YEAR = re.compile(r"^(19[5-9]\d|20\d\d)[ _]")


def _get_set(source: WikiSource, title: str) -> SetDetail:
    parsed = _get_json(
        source, {"action": "parse", "page": title, "prop": "text|categories|wikitext", "redirects": "1"}
    )["parse"]
    resolved_title = parsed["title"]
    categories = [category["category"] for category in parsed.get("categories", []) if not category.get("hidden")]
    html = parsed["text"]
    wikitext = parsed.get("wikitext") or ""
    intro = re.sub(r"<[^>]+>", " ", html.split("<table", 1)[0])

    # Most playsets carry the same {{casting}} infobox as a car, with the toy number in
    # number= and the year in years=. Older pages print the toy number in brackets after the
    # name instead ("The Funny Car Gift Pack (7456) ..."). Bare years aren't toy numbers.
    toy_number = next(iter(_TOY_NUMBER.findall(_infobox_field(wikitext, "number"))), None) or next(
        (code for code in _PAREN_CODE.findall(f"{resolved_title} {intro}") if not _YEAR.fullmatch(code)), None
    )
    year_match = _YEAR.search(_infobox_field(wikitext, "years"))
    year = int(year_match.group(1)) if year_match else None
    if year is None:
        year = next((int(match.group(1)) for c in categories if (match := _CATEGORY_YEAR.match(c))), None)
    if year is None and (match := _YEAR.search(resolved_title)):
        year = int(match.group(1))

    image_payload = _get_json(
        source,
        {"action": "query", "titles": resolved_title, "prop": "pageimages", "piprop": "original"},
    )
    pages = image_payload.get("query", {}).get("pages", [])
    image_url = (pages[0].get("original") or {}).get("source") if pages else None
    if image_url and any(marker in image_url.lower() for marker in _PLACEHOLDER_IMAGES):
        image_url = None

    return SetDetail(
        source=source.id,
        title=resolved_title,
        url=source.page_url(resolved_title),
        manufacturer=source.manufacturer,
        image_url=image_url,
        set_type=set_type_from_categories(resolved_title, categories) or "playset",
        toy_number=toy_number,
        year=year,
        cars=parse_set_cars(html) or parse_included_cars(wikitext),
    )


def _infobox_field(wikitext: str, name: str) -> str:
    match = re.search(rf"\|\s*{name}\s*=\s*([^|}}\n]*)", wikitext)
    return match.group(1) if match else ""


_INCLUDED_HEADING = re.compile(r"^==+\s*(?:cars?|car\(s\)|vehicles?|vehicle\(s\))\s+included\s*==+\s*$", re.I | re.M)
_WIKI_LINK = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")


def parse_included_cars(wikitext: str) -> list[SetCar]:
    """The "Car(s) included" bullet list most playset pages use instead of a table, e.g.
    "*2018: [[Backdrafter]]". Only the linked castings are taken, without color."""
    heading = _INCLUDED_HEADING.search(wikitext)
    if heading is None:
        return []
    section = re.split(r"^==", wikitext[heading.end():], maxsplit=1, flags=re.M)[0]
    cars: list[SetCar] = []
    seen: set[str] = set()
    for line in section.splitlines():
        if not line.lstrip().startswith("*"):
            continue
        for target, label in _WIKI_LINK.findall(line):
            if target.split(":", 1)[0].lower() in ("file", "image", "category"):
                continue
            name = (label or target).strip()
            if name and name not in seen:
                seen.add(name)
                cars.append(SetCar(name=name, color=None, photo_url=None, thumbnail_url=None))
    return cars


def parse_set_cars(html: str) -> list[SetCar]:
    """The "Cars"/"Vehicles" table of a set page: one row per car (or per variant, with the
    casting and color rowspanned), keyed by its "Casting Name" column."""
    parser = _TableParser()
    parser.feed(html)

    cars: list[SetCar] = []
    seen: set[tuple[str, str | None]] = set()
    for table in parser.tables:
        header_index = next((i for i, row in enumerate(table) if row and all(cell.header for cell in row)), None)
        if header_index is None:
            continue
        grid = _expand_rows(table[header_index:])
        keys = [_set_column_key(cell.text) for cell in grid[0]]
        if "name" not in keys:
            continue
        for cells in grid[1:]:
            row = {key: cell for key, cell in zip(keys, cells, strict=False) if key}
            name = _blank(row["name"].text.replace("\n", " ")) if "name" in row else None
            if not name:
                continue
            color = _blank(row["color"].text.replace("\n", " ")) if "color" in row else None
            if (name, color) in seen:
                continue
            seen.add((name, color))
            photo = row.get("photo")
            photo_url = photo.image_href if photo is not None else None
            if photo_url and any(marker in photo_url.lower() for marker in _PLACEHOLDER_IMAGES):
                photo_url = None
            cars.append(
                SetCar(
                    name=name,
                    color=color,
                    photo_url=photo_url,
                    thumbnail_url=photo.image_thumb if photo is not None and photo_url else None,
                )
            )
    return cars


def _set_column_key(header: str) -> str | None:
    name = re.sub(r"[^a-z ]", "", header.lower()).strip()
    if name.startswith("casting") or name in ("car", "vehicle", "model"):
        return "name"
    if name in ("color", "body color"):
        return "color"
    if name.startswith("photo"):
        return "photo"
    return None


# --- Casting page -------------------------------------------------------------------------


def get_casting(source_id: str, title: str) -> CastingDetail:
    source = get_source(source_id)
    return _cached(f"casting:{source.id}:{title}", CASTING_CACHE_TTL_SECONDS, lambda: _get_casting(source, title))


def _get_casting(source: WikiSource, title: str) -> CastingDetail:
    parsed = _get_json(source, {"action": "parse", "page": title, "prop": "text", "redirects": "1"})["parse"]
    resolved_title = parsed["title"]
    image_payload = _get_json(
        source,
        {"action": "query", "titles": resolved_title, "prop": "pageimages", "piprop": "original"},
    )
    pages = image_payload.get("query", {}).get("pages", [])
    image_url = (pages[0].get("original") or {}).get("source") if pages else None

    return CastingDetail(
        source=source.id,
        title=resolved_title,
        url=source.page_url(resolved_title),
        manufacturer=source.manufacturer,
        image_url=image_url,
        versions=parse_versions(parsed["text"]),
    )


# --- Versions table parsing ---------------------------------------------------------------


@dataclass
class _Cell:
    header: bool
    rowspan: int = 1
    colspan: int = 1
    parts: list[str] = field(default_factory=list)
    image_href: str | None = None
    image_thumb: str | None = None

    @property
    def text(self) -> str:
        lines = [re.sub(r"\s+", " ", line).strip() for line in "".join(self.parts).split("\n")]
        return "\n".join(line for line in lines if line)


class _TableParser(HTMLParser):
    """Collects every top-level <table> as rows of cells. Nested tables are flattened into
    the enclosing cell's text, which is all the versions tables ever need."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tables: list[list[list[_Cell]]] = []
        self._depth = 0
        self._cell: _Cell | None = None
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "table":
            self._depth += 1
            if self._depth == 1:
                self.tables.append([])
            return
        if self._depth != 1:
            return
        if tag == "tr":
            self.tables[-1].append([])
        elif tag in ("td", "th") and self.tables[-1]:
            self._cell = _Cell(
                header=tag == "th",
                rowspan=_span(attributes.get("rowspan")),
                colspan=_span(attributes.get("colspan")),
            )
            self.tables[-1][-1].append(self._cell)
        elif self._cell is None:
            return
        elif tag == "br":
            self._cell.parts.append("\n")
        elif tag == "sup":
            self._skip_depth += 1  # footnote markers like [1]
        elif tag == "a" and "image" in (attributes.get("class") or "") and self._cell.image_href is None:
            self._cell.image_href = attributes.get("href")
        elif tag == "img" and self._cell.image_thumb is None:
            src = attributes.get("data-src") or attributes.get("src") or ""
            if not src.startswith("data:"):
                self._cell.image_thumb = src

    def handle_endtag(self, tag: str) -> None:
        if tag == "table":
            self._depth -= 1
        elif self._depth == 1 and tag in ("td", "th"):
            self._cell = None
        elif tag == "sup" and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._cell is not None and not self._skip_depth:
            self._cell.parts.append(data)


def _span(value: str | None) -> int:
    try:
        return max(1, int(value or 1))
    except ValueError:
        return 1


def _column_key(header: str) -> str | None:
    name = re.sub(r"[^a-z ]", "", header.lower()).strip()
    if name in ("color", "body color"):
        return "color"
    if name in ("col", "col no", "collector", "collector number"):
        return "collector_number"
    if name.startswith("toy"):
        return "toy_numbers"
    for key in ("year", "series", "tampo", "notes", "photo"):
        if name.startswith(key):
            return key
    return None


def _expand_rows(rows: list[list[_Cell]]) -> list[list[_Cell]]:
    """Turns rowspan/colspan into a plain grid, so cell N of every row is column N."""
    grid: list[list[_Cell]] = []
    carried: dict[int, tuple[int, _Cell]] = {}
    for row in rows:
        out: list[_Cell] = []
        cells = iter(row)
        column = 0
        while True:
            if column in carried:
                remaining, cell = carried[column]
                out.append(cell)
                if remaining > 1:
                    carried[column] = (remaining - 1, cell)
                else:
                    del carried[column]
                column += 1
                continue
            cell = next(cells, None)
            if cell is None:
                if not any(c >= column for c in carried):
                    break
                column += 1
                out.append(_Cell(header=False))
                continue
            for _ in range(cell.colspan):
                out.append(cell)
                if cell.rowspan > 1:
                    carried[column] = (cell.rowspan - 1, cell)
                column += 1
        grid.append(out)
    return grid


_TOY_NUMBER = re.compile(r"\b(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{3,7}\b")
_YEAR = re.compile(r"\b(19[5-9]\d|20\d\d)\b")
_PLACEHOLDER_IMAGES = ("image_not_available", "image not available", "noimage")


def _blank(value: str) -> str | None:
    return None if value.strip().lower() in ("", "n/a", "-", "?", "none", "unknown") else value.strip()


def _version_from_row(row: dict[str, _Cell]) -> CastingVersion | None:
    def text(key: str) -> str:
        cell = row.get(key)
        return cell.text if cell is not None else ""

    series_lines = text("series").split("\n")
    series_number = next((line for line in series_lines[1:] if re.fullmatch(r"\d+\s*/\s*\d+", line)), None)
    year_match = _YEAR.search(text("year"))
    toy_numbers = list(dict.fromkeys(_TOY_NUMBER.findall(text("toy_numbers"))))

    photo = row.get("photo")
    photo_url = photo.image_href if photo is not None else None
    thumb_url = photo.image_thumb if photo is not None else None
    if photo_url and any(marker in photo_url.lower() for marker in _PLACEHOLDER_IMAGES):
        photo_url = thumb_url = None

    version = CastingVersion(
        collector_number=_blank(text("collector_number").split("\n")[0]),
        year=int(year_match.group(1)) if year_match else None,
        series=_blank(series_lines[0]),
        series_number=series_number.replace(" ", "") if series_number else None,
        color=_blank(text("color").replace("\n", " ")),
        tampo=_blank(text("tampo").replace("\n", " ")),
        toy_numbers=toy_numbers,
        notes=_blank(text("notes").replace("\n", " ")),
        photo_url=photo_url,
        thumbnail_url=thumb_url,
    )
    if version.year is None and not version.toy_numbers and not version.color:
        return None
    return version


def parse_versions(html: str) -> list[CastingVersion]:
    parser = _TableParser()
    parser.feed(html)

    versions: list[CastingVersion] = []
    seen: set[tuple] = set()
    for table in parser.tables:
        header_index = next((i for i, row in enumerate(table) if row and all(cell.header for cell in row)), None)
        if header_index is None:
            continue
        grid = _expand_rows(table[header_index:])
        keys = [_column_key(cell.text) for cell in grid[0]]
        if "year" not in keys or not ({"toy_numbers", "photo"} & set(keys)):
            continue
        for cells in grid[1:]:
            row = {key: cell for key, cell in zip(keys, cells, strict=False) if key}
            version = _version_from_row(row)
            if version is None:
                continue
            identity = (
                version.collector_number,
                version.year,
                version.series,
                version.color,
                tuple(version.toy_numbers),
                version.photo_url,
            )
            if identity not in seen:
                seen.add(identity)
                versions.append(version)
    return versions


# --- Photo import -------------------------------------------------------------------------


def is_wiki_image_url(url: str) -> bool:
    """Only the wikis' own image CDN may be fetched server-side — anything else would turn
    the photo importer into an open proxy (SSRF)."""
    parsed = httpx.URL(url)
    return parsed.scheme == "https" and parsed.host == IMAGE_HOST and parsed.port in (None, 443)


def download_image(url: str, max_bytes: int) -> bytes:
    if not is_wiki_image_url(url):
        raise ValueError("Only images from the Hot Wheels or Matchbox wiki can be imported")
    try:
        with httpx.stream(
            "GET", url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=False
        ) as response:
            response.raise_for_status()
            chunks: list[bytes] = []
            size = 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > max_bytes:
                    raise ValueError("Wiki image is too large to import")
                chunks.append(chunk)
    except httpx.HTTPError as exc:
        raise CatalogUnavailableError("Couldn't download the wiki image") from exc
    return b"".join(chunks)
