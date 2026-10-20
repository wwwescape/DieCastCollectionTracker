export interface LanguageOption {
  code: string;
  name: string;
}

// Native names — a language picker shows each option in its own language, not translated
// into the currently selected one.
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "pt", name: "Português" },
];

export const DEFAULT_LANGUAGE = "en";

const SUPPORTED_CODES = new Set(SUPPORTED_LANGUAGES.map((option) => option.code));

const LANGUAGE_STORAGE_KEY = "dct.language";

function detectBrowserLanguage(): string | null {
  const prefix = navigator.language?.split("-")[0];
  return prefix && SUPPORTED_CODES.has(prefix) ? prefix : null;
}

// Storage can be missing or throw (private windows, blocked site data); the language then
// just isn't remembered, and the browser's language is used as on a first visit.
export function readStoredLanguage(): string {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_CODES.has(stored)) {
      return stored;
    }
  } catch {
    // fall through to the browser's language
  }
  return detectBrowserLanguage() ?? DEFAULT_LANGUAGE;
}

export function persistLanguage(language: string): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Not worth surfacing — the app still works, it just won't remember.
  }
}
