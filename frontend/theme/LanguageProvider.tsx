import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import i18next from "../i18n";
import { DEFAULT_LANGUAGE, persistLanguage, readStoredLanguage } from "../utils/language";

interface LanguageContextValue {
  language: string;
  setLanguage: (language: string) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

// Ported from VideoGameTrackarr (minus dayjs, which DCT doesn't use). Saved per browser;
// the first visit follows the browser's language when it's one of SUPPORTED_LANGUAGES.
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<string>(() => readStoredLanguage());

  useEffect(() => {
    persistLanguage(language);
    void i18next.changeLanguage(language);
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
