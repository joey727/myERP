import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { Platform, StyleSheet, useColorScheme, useWindowDimensions } from "react-native";

import {
  breakpoint,
  layout,
  motion,
  palettes,
  radius,
  space,
  type,
  type Palette,
  type ThemeName
} from "./tokens";

export type ThemePreference = "system" | ThemeName;

export type Theme = {
  name: ThemeName;
  colors: Palette;
  space: typeof space;
  radius: typeof radius;
  type: typeof type;
  motion: typeof motion;
  layout: typeof layout;
};

const APPEARANCE_KEY = "myerp_appearance";

async function readAppearance(): Promise<ThemePreference | null> {
  try {
    const value =
      Platform.OS === "web"
        ? globalThis.localStorage?.getItem(APPEARANCE_KEY)
        : await SecureStore.getItemAsync(APPEARANCE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {}
  return null;
}

async function writeAppearance(preference: ThemePreference): Promise<void> {
  try {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(APPEARANCE_KEY, preference);
      return;
    }
    await SecureStore.setItemAsync(APPEARANCE_KEY, preference);
  } catch {}
}

function buildTheme(name: ThemeName): Theme {
  return {
    name,
    colors: palettes[name],
    space,
    radius,
    type,
    motion,
    layout
  };
}

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: buildTheme("light"),
  preference: "system",
  setPreference: () => {}
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    readAppearance().then((stored) => {
      if (stored) setPreferenceState(stored);
    });
  }, []);

  const resolved: ThemeName =
    preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    void writeAppearance(next);
  }

  return (
    <ThemeContext.Provider
      value={{ theme: buildTheme(resolved), preference, setPreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext).theme;
}

export function useThemePreference() {
  const { preference, setPreference } = useContext(ThemeContext);
  return { preference, setPreference };
}

export function createStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T
) {
  const cache: Partial<Record<ThemeName, T>> = {};
  return function useStyles(): T {
    const theme = useTheme();
    const cached = cache[theme.name];
    if (cached) return cached;
    const created = StyleSheet.create(factory(theme));
    cache[theme.name] = created;
    return created;
  };
}

export type Breakpoint = "compact" | "medium" | "expanded";

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const current: Breakpoint =
    width >= breakpoint.expanded ? "expanded" : width >= breakpoint.medium ? "medium" : "compact";

  return {
    width,
    height,
    breakpoint: current,
    isCompact: current === "compact",
    isMedium: current === "medium",
    isExpanded: current === "expanded",
    isLandscape: width > height,
    isTwoPane: width >= 820,
    columns: width >= breakpoint.expanded ? 4 : width >= breakpoint.medium ? 3 : 2
  };
}
