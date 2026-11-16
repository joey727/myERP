import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Linking, Platform, View } from "react-native";

import { APP_NAME, APP_VERSION, RELEASES_PAGE } from "@/lib/appInfo";
import {
  checkForUpdate,
  type AvailableUpdate,
  type UpdateCheck
} from "@/lib/updates";
import { notify } from "@/ui/dialog";
import { createStyles, useResponsive, useTheme } from "@/ui/design";
import { AppText, Badge, Button, Screen, Surface } from "@/ui/primitives";

const platformSteps: Record<string, string[]> = {
  android: [
    "Tap Download APK below.",
    "Open the downloaded file.",
    "If Android asks, allow installs from this app, then tap Install."
  ],
  ios: [
    "iOS builds are installed through TestFlight or the App Store.",
    "Open the releases page and follow the install link for this version.",
    "Your shop data stays on this device when the app updates."
  ],
  web: [
    "Reload this page after a new web version is deployed.",
    "Saved shop data is stored on this device and stays intact.",
    "Use the browser menu to install myERP to your home screen."
  ]
};

function platformKey() {
  if (Platform.OS === "android" || Platform.OS === "ios") return Platform.OS;
  return "web";
}

export default function UpdatesScreen() {
  const styles = useUpdatesStyles();
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<UpdateCheck | null>(null);
  const [downloading, setDownloading] = useState(false);

  const steps = platformSteps[platformKey()];

  async function runCheck() {
    setChecking(true);
    try {
      const next = await checkForUpdate();
      setResult(next);
      if (next.status === "current") {
        notify({
          title: "You are up to date",
          message: `${APP_NAME} ${APP_VERSION} is the newest version.`,
          tone: "success"
        });
      }
    } finally {
      setChecking(false);
    }
  }

  async function openDownload(update: AvailableUpdate) {
    setDownloading(true);
    try {
      await Linking.openURL(update.downloadUrl);
      notify({
        title:
          Platform.OS === "android" ? "Download started" : "Releases opened",
        message:
          Platform.OS === "android"
            ? "Open the file once it finishes downloading."
            : "Follow the install instructions on the page.",
        tone: "success"
      });
    } catch {
      notify({
        title: "Could not open the download",
        message: "Open the releases page in your browser instead.",
        tone: "danger"
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Screen maxWidth={isCompact ? 720 : 900}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <AppText variant="title2">App updates</AppText>
          <AppText tone="secondary" variant="small">
            Keep the till current without losing the data on this device.
          </AppText>
        </View>
        <Badge
          icon="pricetag-outline"
          label={`Version ${APP_VERSION}`}
          tone="primary"
        />
      </View>

      <Surface style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <AppText variant="bodyStrong">Check for a newer version</AppText>
            <AppText tone="secondary" variant="small">
              The app works offline. Checking and downloading an update needs
              internet.
            </AppText>
          </View>
          <Badge
            label={result?.status === "available" ? "Update ready" : "Installed"}
            tone={result?.status === "available" ? "attention" : "neutral"}
          />
        </View>

        {result?.status === "available" ? (
          <View style={styles.updateBlock}>
            <View style={styles.versionRow}>
              <VersionPill label="Installed" value={result.update.currentVersion} />
              <Ionicons
                color={theme.colors.muted}
                name="arrow-forward"
                size={18}
              />
              <VersionPill label="Available" value={result.update.latestVersion} />
            </View>
            {result.update.notes ? (
              <View style={styles.notes}>
                <AppText variant="label">What is new</AppText>
                <AppText tone="secondary" variant="small">
                  {result.update.notes}
                </AppText>
              </View>
            ) : null}
            <Button
              haptic
              loading={downloading}
              onPress={() => openDownload(result.update)}
              title={result.update.downloadLabel}
            />
            <Button
              onPress={() => Linking.openURL(result.update.releaseUrl)}
              title="Release notes"
              variant="ghost"
            />
          </View>
        ) : null}

        {result?.status === "unavailable" ? (
          <View style={styles.notice}>
            <Ionicons
              color={theme.colors.attention}
              name="cloud-offline-outline"
              size={18}
            />
            <AppText style={styles.noticeText} tone="secondary" variant="small">
              {result.message}
            </AppText>
          </View>
        ) : null}

        <Button
          haptic
          loading={checking}
          onPress={runCheck}
          title="Check now"
          variant={result?.status === "available" ? "ghost" : "secondary"}
        />
      </Surface>

      <Surface style={styles.card}>
        <AppText variant="bodyStrong">How updating works</AppText>
        {steps.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={styles.stepNumber}>
              <AppText variant="caption">{index + 1}</AppText>
            </View>
            <AppText style={styles.stepText} tone="secondary" variant="small">
              {step}
            </AppText>
          </View>
        ))}
        <AppText tone="muted" variant="caption">
          Products, sales, staff and audit history stay in the app database and
          carry over to the new version.
        </AppText>
      </Surface>

      <Button
        onPress={() => Linking.openURL(RELEASES_PAGE)}
        title="Open all releases"
        variant="ghost"
      />
    </Screen>
  );
}

function VersionPill({ label, value }: { label: string; value: string }) {
  const styles = useUpdatesStyles();
  return (
    <View style={styles.pill}>
      <AppText tone="muted" variant="caption">
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const updatesStyles = createStyles((theme) => ({
  head: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
    justifyContent: "space-between"
  },
  headText: { flex: 1, gap: 2, minWidth: 220 },
  card: { gap: theme.space.md },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.space.sm,
    justifyContent: "space-between"
  },
  rowText: { flex: 1, gap: 2 },
  updateBlock: { gap: theme.space.sm },
  versionRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm
  },
  pill: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: 1,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs
  },
  notes: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    gap: theme.space.xxs,
    maxHeight: 220,
    padding: theme.space.sm
  },
  notice: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.attentionSoft,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.space.xs,
    padding: theme.space.sm
  },
  noticeText: { flex: 1 },
  step: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.space.sm
  },
  stepNumber: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.full,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  stepText: { flex: 1, paddingTop: 3 }
}));
const useUpdatesStyles = () => updatesStyles();
