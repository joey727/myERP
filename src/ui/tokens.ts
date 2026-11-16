export type ThemeName = "light" | "dark";

const light = {
  background: "#F7F3EC",
  surface: "#FFFFFF",
  surfaceAlt: "#F1ECE3",
  surfaceSunken: "#EAE4D8",
  ink: "#141C18",
  inkSecondary: "#4E5B54",
  muted: "#5A665F",
  border: "#E2DACD",
  borderStrong: "#C9BFAF",
  primary: "#0E5138",
  primaryPressed: "#0A402C",
  primarySoft: "#E4EFE8",
  primarySoftText: "#0B4A32",
  onPrimary: "#FFFFFF",
  attention: "#8A5200",
  attentionSoft: "#FBF0DC",
  success: "#166534",
  successSoft: "#E7F3EA",
  danger: "#A12A21",
  dangerSoft: "#FAE8E5",
  info: "#1D4F7A",
  infoSoft: "#E8F0F7",
  focus: "#1B6B4A",
  overlay: "rgba(15, 23, 19, 0.48)",
  shadow: "#29322C",
};

const dark = {
  background: "#101512",
  surface: "#171E1A",
  surfaceAlt: "#1D2521",
  surfaceSunken: "#0C110E",
  ink: "#F2F0EA",
  inkSecondary: "#B9C2BB",
  muted: "#93A099",
  border: "#2E3832",
  borderStrong: "#56645B",
  primary: "#6FCFA1",
  primaryPressed: "#58B98C",
  primarySoft: "#1B3328",
  primarySoftText: "#9BE4BF",
  onPrimary: "#082016",
  attention: "#E8B15C",
  attentionSoft: "#2A2114",
  success: "#8ADDA8",
  successSoft: "#14251A",
  danger: "#F09A8F",
  dangerSoft: "#2E1917",
  info: "#8CBEE6",
  infoSoft: "#13232F",
  focus: "#8FE0B7",
  overlay: "rgba(0, 0, 0, 0.62)",
  shadow: "#000000",
};

export const palettes = { light, dark } as const;
export type Palette = typeof light;

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "700", letterSpacing: -0.7 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.5 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.3 },
  title3: { fontSize: 18, lineHeight: 24, fontWeight: "600", letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  small: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  smallStrong: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "600", letterSpacing: 0.1 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
} as const;

export type TypeVariant = keyof typeof type;

export const motion = {
  press: 120,
  state: 160,
  toast: 200,
  sheet: 300,
  easing: { x1: 0.23, y1: 1, x2: 0.32, y2: 1 },
} as const;

export const breakpoint = { medium: 600, expanded: 1024 } as const;

export const layout = {
  formMax: 720,
  contentMax: 1200,
  wideMax: 1440,
  rail: 88,
  sidebar: 248,
} as const;

export const tabBarHeight = 64;
