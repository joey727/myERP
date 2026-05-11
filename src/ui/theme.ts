export const colors = {
  ink: "#16202a",
  muted: "#64748b",
  border: "#dbe3ea",
  panel: "#ffffff",
  panelAlt: "#f8fafc",
  background: "#f6f8f4",
  primary: "#0f766e",
  primaryDark: "#115e59",
  primaryLight: "#ccfbf1",
  accent: "#c2410c",
  success: "#15803d",
  successBg: "#ecfdf5",
  successBorder: "#99f6e4",
  warning: "#a16207",
  warningBg: "#fef3c7",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  inputBg: "#ffffff",
  inputPlaceholder: "#94a3b8",
  disabledBg: "#94a3b8",
  disabledAlt: "#f1f5f9",
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 20,
};

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 18,
  "2xl": 22,
  "3xl": 26,
  "4xl": 34,
};

export const spacing = {
  page: 20,
  card: 14,
};

export const shadow = {
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;
