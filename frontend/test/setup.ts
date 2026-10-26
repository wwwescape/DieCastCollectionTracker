import { cleanup } from "@testing-library/react";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { apiClient } from "../api/client";
import { publicClient } from "../api/publicClient";
import en from "../locales/en/translation.json";

// Components call useTranslation() without an explicit <I18nextProvider> wrapper — it falls
// back to this default global instance as long as init() has run before render. Using the
// real English bundle (not a stub) keeps assertions on literal English copy meaningful.
void i18next.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// @testing-library/react's automatic post-test cleanup relies on detecting a global
// afterEach (Jest-style globals) — this project runs Vitest with `globals: false` for
// explicit imports everywhere else, so it needs registering here instead.
afterEach(() => {
  cleanup();
});

// No test talks to a real server. Tests mock the api/* functions they rely on; any request
// that still gets through fails like an unreachable server does — whether or not a dev API
// happens to be running on localhost:8000 — instead of quietly hitting it and getting back
// whatever that instance returns.
const refuseUnmockedRequest = (config: InternalAxiosRequestConfig) =>
  Promise.reject(
    new AxiosError(
      `Unmocked request in a test: ${config.method?.toUpperCase()} ${config.url}`,
      "ERR_NETWORK",
      config
    )
  );
for (const client of [axios, apiClient, publicClient]) {
  client.defaults.adapter = refuseUnmockedRequest;
}
