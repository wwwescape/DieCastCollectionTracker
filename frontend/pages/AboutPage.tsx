import { useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Trans, useTranslation } from "react-i18next";
import { useVersion } from "../hooks/useVersion";

const REPO_URL = "https://github.com/wwwescape/DieCastCollectionTracker";
const BMC_URL = "https://buymeacoffee.com/wwwescape";
const HOT_WHEELS_WIKI_URL = "https://hotwheels.fandom.com";
const MATCHBOX_WIKI_URL = "https://matchbox.fandom.com";

// Ported from VideoGameTrackarr's About page, with DCT's own credits (the community wikis
// and the manufacturer logos) in place of IGDB and EmulatorJS.
const AboutPage = () => {
  const { t } = useTranslation();
  const { data: version, checkForUpdates, isFetching } = useVersion();
  // Only confirm "up to date" after an explicit check; on load, no update means no message.
  const [hasCheckedManually, setHasCheckedManually] = useState(false);

  const externalLink = (href: string) => (
    <Link href={href} target="_blank" rel="noopener noreferrer" />
  );

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("about.title")}
      </Typography>
      <Card sx={{ maxWidth: 640 }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
            <Box
              component="img"
              src="/DieCastCollectionTracker.svg"
              alt=""
              sx={{ width: 48, height: 48 }}
            />
            <Typography variant="subtitle1">{t("about.appName")}</Typography>
          </Stack>
          {version && (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {t("about.version", { version: version.currentVersion })}
              </Typography>
              <Button
                size="small"
                variant="text"
                startIcon={
                  isFetching ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />
                }
                disabled={isFetching}
                onClick={() => {
                  setHasCheckedManually(true);
                  void checkForUpdates();
                }}
              >
                {t("about.checkForUpdates")}
              </Button>
            </Stack>
          )}
          {version?.updateAvailable && (
            <Typography variant="body2">
              <Link
                href={version.releaseUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("about.updateAvailable", { version: version.latestVersion })}
              </Link>
            </Typography>
          )}
          {hasCheckedManually && !isFetching && version && !version.updateAvailable && (
            <Typography variant="body2" color="text.secondary">
              {version.latestVersion ? t("about.upToDate") : t("about.checkFailed")}
            </Typography>
          )}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1.5, mt: version ? 1.5 : 0 }}
          >
            {t("about.description")}
          </Typography>
          <Typography variant="body2">
            <Link href={REPO_URL} target="_blank" rel="noopener noreferrer">
              {t("about.sourceCode")}
            </Link>
          </Typography>
          <Typography variant="body2">
            <Link href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">
              {t("about.reportIssue")}
            </Link>
          </Typography>
          <Typography variant="body2">
            {t("about.licenseLabel")}{" "}
            <Link
              href={`${REPO_URL}/blob/master/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("about.licenseName")}
            </Link>
          </Typography>
          <Typography variant="body2">
            {t("about.authorLabel")}{" "}
            <Link href="https://github.com/wwwescape" target="_blank" rel="noopener noreferrer">
              {t("about.authorName")}
            </Link>
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" gutterBottom>
            {t("about.creditsHeading")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Trans
              i18nKey="about.wikiCredits"
              components={{
                1: externalLink(HOT_WHEELS_WIKI_URL),
                2: externalLink(MATCHBOX_WIKI_URL),
              }}
            />
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t("about.trademarks")}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Link href={BMC_URL} target="_blank" rel="noopener noreferrer">
            <Box
              component="img"
              src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
              alt={t("about.buyMeACoffeeAlt")}
              sx={{ height: 48 }}
            />
          </Link>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AboutPage;
