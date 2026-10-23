import { useState } from "react";
import { useNavigate } from "react-router-dom";
import KeyIcon from "@mui/icons-material/KeyOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import { Trans, useTranslation } from "react-i18next";
import AccentColorSetting from "../components/AccentColorSetting";
import AutocompleteSelect from "../components/AutocompleteSelect";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import DataManagementSection from "../components/DataManagementSection";
import Page from "../components/Page";
import { SettingRow, SettingsGroup, SettingsToolbar } from "../components/SettingsLayout";
import ShareSection from "../components/ShareSection";
import { useCurrentUser, useLogout } from "../hooks/useAuth";
import { useColorMode } from "../theme/ColorModeProvider";
import { useCurrency } from "../theme/CurrencyProvider";
import { useLanguage } from "../theme/LanguageProvider";
import { getCurrencySymbol, SUPPORTED_CURRENCIES, type CurrencyOption } from "../utils/currency";
import { SUPPORTED_LANGUAGES, type LanguageOption } from "../utils/language";

// Settings laid out as groups of two-column rows. The lookup lists live on their
// own sub-page, Settings → Lookups.
const SettingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const logoutMutation = useLogout();
  const { mode, contrast, toggleColorMode, toggleContrast } = useColorMode();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage } = useLanguage();
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <Page
      crumbs={[{ label: t("settings.title") }, { label: t("settings.general") }]}
      toolbar={<SettingsToolbar />}
    >
      <Box sx={{ maxWidth: 980 }}>
        <SettingsGroup title={t("settings.display.heading")} lead={t("settings.display.lead")}>
          <SettingRow
            name={t("settings.display.darkMode")}
            description={t("settings.display.darkModeHelp")}
          >
            <Switch
              checked={mode === "dark"}
              onChange={toggleColorMode}
              inputProps={{ "aria-label": t("settings.display.darkMode") }}
            />
          </SettingRow>
          <SettingRow
            name={t("settings.display.highContrast")}
            description={t("settings.display.highContrastHelp")}
          >
            <Switch
              checked={contrast === "high"}
              onChange={toggleContrast}
              inputProps={{ "aria-label": t("settings.display.highContrast") }}
            />
          </SettingRow>
          <SettingRow
            name={t("settings.display.accentColor")}
            description={t("settings.display.accentColorHelp")}
          >
            <AccentColorSetting />
          </SettingRow>
        </SettingsGroup>

        <SettingsGroup title={t("settings.regional.heading")} lead={t("settings.regional.lead")}>
          <SettingRow name={t("settings.language.label")}>
            <AutocompleteSelect<LanguageOption>
              label={t("settings.language.label")}
              options={SUPPORTED_LANGUAGES}
              value={SUPPORTED_LANGUAGES.find((option) => option.code === language) ?? null}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, val) => option.code === val.code}
              disableClearable
              onChange={(newValue) => setLanguage(newValue!.code)}
              sx={{ width: { xs: "100%", md: 300 } }}
            />
          </SettingRow>
          <SettingRow
            name={t("settings.currency.label")}
            description={t("settings.currency.description")}
          >
            <AutocompleteSelect<CurrencyOption>
              label={t("settings.currency.label")}
              options={SUPPORTED_CURRENCIES}
              value={SUPPORTED_CURRENCIES.find((option) => option.code === currency) ?? null}
              getOptionLabel={(option) => `${option.name} (${getCurrencySymbol(option.code)})`}
              isOptionEqualToValue={(option, val) => option.code === val.code}
              disableClearable
              onChange={(newValue) => setCurrency(newValue!.code)}
              sx={{ width: { xs: "100%", md: 300 } }}
            />
          </SettingRow>
        </SettingsGroup>

        <SettingsGroup title={t("settings.data.heading")} lead={t("settings.data.lead")}>
          <SettingRow stacked>
            <DataManagementSection />
          </SettingRow>
        </SettingsGroup>

        <SettingsGroup title={t("settings.share.heading")} lead={t("settings.share.description")}>
          <SettingRow stacked>
            <ShareSection />
          </SettingRow>
        </SettingsGroup>

        <SettingsGroup title={t("settings.account.heading")}>
          <SettingRow
            name={
              <Trans
                i18nKey="settings.account.signedInAs"
                values={{ username: currentUser?.username ?? "..." }}
                components={{ 1: <strong /> }}
              />
            }
          >
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={() =>
                logoutMutation.mutate(undefined, {
                  onSuccess: () => navigate("/login", { replace: true }),
                })
              }
            >
              {t("common.logOut")}
            </Button>
          </SettingRow>
          <SettingRow
            name={t("settings.account.password")}
            description={t("settings.account.passwordHelp")}
          >
            <Button
              variant="outlined"
              startIcon={<KeyIcon />}
              onClick={() => setPasswordOpen(true)}
            >
              {t("settings.account.changePassword")}
            </Button>
          </SettingRow>
        </SettingsGroup>
        <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      </Box>
    </Page>
  );
};

export default SettingsPage;
