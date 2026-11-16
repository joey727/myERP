import { Platform } from "react-native";

import {
  APP_VERSION,
  LATEST_RELEASE_API,
  RELEASES_PAGE
} from "@/lib/appInfo";

export type AvailableUpdate = {
  currentVersion: string;
  latestVersion: string;
  notes: string | null;
  publishedAt: string | null;
  releaseUrl: string;
  downloadUrl: string;
  downloadLabel: string;
};

export type UpdateCheck =
  | { status: "current"; currentVersion: string }
  | { status: "available"; update: AvailableUpdate }
  | { status: "unavailable"; message: string };

type ReleaseAsset = {
  name?: string;
  browser_download_url?: string;
};

type ReleasePayload = {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  published_at?: string;
  assets?: ReleaseAsset[];
};

function versionParts(value: string) {
  return value
    .trim()
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function isNewerVersion(candidate: string, current: string) {
  const next = versionParts(candidate);
  const base = versionParts(current);
  const length = Math.max(next.length, base.length);
  for (let index = 0; index < length; index += 1) {
    const nextPart = next[index] ?? 0;
    const basePart = base[index] ?? 0;
    if (nextPart > basePart) return true;
    if (nextPart < basePart) return false;
  }
  return false;
}

function downloadFor(assets: ReleaseAsset[], releaseUrl: string) {
  if (Platform.OS === "android") {
    const apk = assets.find((asset) => asset.name?.toLowerCase().endsWith(".apk"));
    if (apk?.browser_download_url) {
      return {
        downloadUrl: apk.browser_download_url,
        downloadLabel: "Download APK"
      };
    }
    return { downloadUrl: releaseUrl, downloadLabel: "Open releases" };
  }
  if (Platform.OS === "ios") {
    const ipa = assets.find((asset) => asset.name?.toLowerCase().endsWith(".ipa"));
    if (ipa?.browser_download_url) {
      return { downloadUrl: ipa.browser_download_url, downloadLabel: "Download IPA" };
    }
    return { downloadUrl: releaseUrl, downloadLabel: "Open releases" };
  }
  return { downloadUrl: releaseUrl, downloadLabel: "Open releases" };
}

function formatReleaseNotes(body: string | undefined | null) {
  if (!body) return null;
  const text = body
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

export async function checkForUpdate(): Promise<UpdateCheck> {
  if (Platform.OS === "web") {
    return { status: "current", currentVersion: APP_VERSION };
  }

  try {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) {
      return {
        status: "unavailable",
        message:
          response.status === 404
            ? "No published release yet."
            : `Update server returned ${response.status}.`
      };
    }
    const release = (await response.json()) as ReleasePayload;
    const releaseUrl = release.html_url ?? RELEASES_PAGE;
    const latestVersion = (release.tag_name ?? release.name ?? "").trim();
    if (!latestVersion) {
      return { status: "unavailable", message: "Release has no version tag." };
    }
    if (!isNewerVersion(latestVersion, APP_VERSION)) {
      return { status: "current", currentVersion: APP_VERSION };
    }
    return {
      status: "available",
      update: {
        currentVersion: APP_VERSION,
        latestVersion: latestVersion.replace(/^v/i, ""),
        notes: formatReleaseNotes(release.body),
        publishedAt: release.published_at ?? null,
        releaseUrl,
        ...downloadFor(release.assets ?? [], releaseUrl)
      }
    };
  } catch {
    return {
      status: "unavailable",
      message: "Could not reach the update server. Check your internet connection."
    };
  }
}
