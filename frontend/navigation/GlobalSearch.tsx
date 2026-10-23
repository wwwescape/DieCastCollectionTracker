import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import FactoryIcon from "@mui/icons-material/Factory";
import SearchIcon from "@mui/icons-material/Search";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import { useTranslation } from "react-i18next";
import { useCarList } from "../hooks/useCars";
import { useManufacturerOverview, useSeriesOverview } from "../hooks/useLookups";
import { useSetList } from "../hooks/useSets";
import RoadIcon from "../icons/RoadIcon";
import { openedFrom } from "../utils/navState";
import { writeSessionValue } from "../utils/sessionValue";
import { writeSessionViewValue } from "../utils/sessionViewState";

type Kind = "vehicle" | "set" | "series" | "manufacturer" | "wiki";

interface SearchOption {
  kind: Kind;
  id: number;
  label: string;
  detail: string;
  to: string;
}

const ICONS: Record<Kind, React.ReactNode> = {
  vehicle: <DirectionsCarIcon fontSize="small" />,
  set: <RoadIcon fontSize="small" />,
  series: <CollectionsBookmarkIcon fontSize="small" />,
  manufacturer: <FactoryIcon fontSize="small" />,
  wiki: <TravelExploreIcon fontSize="small" />,
};

const PER_KIND = 5;

// The header's search box: jumps straight to a vehicle, set, series or manufacturer, and
// Enter on free text opens the Vehicles list filtered by it. The last option hands the text
// to the wiki search on Add Vehicle. "/" focuses it from anywhere.
const GlobalSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const { data: cars } = useCarList();
  const { data: sets } = useSetList();
  const { data: series } = useSeriesOverview();
  const { data: manufacturers } = useManufacturerOverview();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const all = useMemo<SearchOption[]>(
    () => [
      ...(cars ?? []).map((car) => ({
        kind: "vehicle" as const,
        id: car.id,
        label: car.name,
        detail: [car.manufacturerName, car.seriesName, car.year].filter(Boolean).join(" · "),
        to: `/collection/vehicles/${car.id}`,
      })),
      ...(sets ?? []).map((set) => ({
        kind: "set" as const,
        id: set.id,
        label: set.name,
        detail: [set.manufacturerName, set.year].filter(Boolean).join(" · "),
        to: `/collection/sets/${set.id}`,
      })),
      ...(series ?? []).map((item) => ({
        kind: "series" as const,
        id: item.id,
        label: item.name,
        detail: [item.manufacturerName, item.year].filter(Boolean).join(" · "),
        to: `/collection/series/${item.id}`,
      })),
      ...(manufacturers ?? []).map((item) => ({
        kind: "manufacturer" as const,
        id: item.id,
        label: item.name,
        detail: "",
        to: `/collection/manufacturers/${item.id}`,
      })),
    ],
    [cars, sets, series, manufacturers]
  );

  const options = useMemo<SearchOption[]>(() => {
    const query = input.trim().toLowerCase();
    if (!query) return [];
    const counts: Partial<Record<Kind, number>> = {};
    const matches = all.filter((option) => {
      if (!option.label.toLowerCase().includes(query)) return false;
      counts[option.kind] = (counts[option.kind] ?? 0) + 1;
      return counts[option.kind]! <= PER_KIND;
    });
    return [
      ...matches,
      { kind: "wiki", id: 0, label: t("search.wiki", { query: input.trim() }), detail: "", to: "" },
    ];
  }, [all, input, t]);

  const searchVehicles = (text: string) => {
    // The list reads its search from the session (and from route state if it's already open).
    writeSessionViewValue("vehicles.search", text);
    navigate("/collection/vehicles", { state: { search: text } });
  };

  const choose = (option: SearchOption | string | null) => {
    if (option === null) return;
    if (typeof option === "string") {
      if (option.trim()) searchVehicles(option.trim());
    } else if (option.kind === "wiki") {
      writeSessionValue("addCar.catalogQuery", input.trim());
      navigate("/collection/vehicles/add", { state: { catalogQuery: input.trim() } });
    } else {
      navigate(option.to, { state: openedFrom(location) });
    }
    setInput("");
    inputRef.current?.blur();
  };

  return (
    <Autocomplete<SearchOption, false, false, true>
      freeSolo
      options={options}
      value={null}
      inputValue={input}
      onInputChange={(_event, value, reason) => {
        if (reason !== "reset") setInput(value);
      }}
      onChange={(_event, option) => choose(option)}
      filterOptions={(list) => list}
      groupBy={(option) => t(`search.groups.${option.kind}`)}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
      isOptionEqualToValue={(a, b) => a.kind === b.kind && a.id === b.id}
      sx={{ width: "100%", maxWidth: 420 }}
      renderOption={({ key: _key, ...props }, option) => (
        <Box component="li" key={`${option.kind}-${option.id}`} {...props} sx={{ gap: 1.25 }}>
          <Box sx={{ color: "dct.text3", display: "flex" }}>{ICONS[option.kind]}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {option.label}
            </Box>
            {option.detail ? (
              <Box sx={{ fontSize: 12, color: "dct.text3", whiteSpace: "nowrap" }}>
                {option.detail}
              </Box>
            ) : null}
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          placeholder={t("search.placeholder")}
          aria-label={t("search.label")}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "dct.text3" }} />
              </InputAdornment>
            ),
            endAdornment: (
              <Box
                component="kbd"
                sx={{
                  display: { xs: "none", md: "block" },
                  fontFamily: "inherit",
                  fontSize: 11,
                  color: "dct.text3",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 0.75,
                  mr: 0.5,
                }}
              >
                /
              </Box>
            ),
          }}
        />
      )}
    />
  );
};

export default GlobalSearch;
