import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";
export type MenuPosition = "left" | "right";

type PreferencesContextValue = {
  theme: ThemeMode;
  menuPosition: MenuPosition;
  setTheme: (value: ThemeMode) => void;
  setMenuPosition: (value: MenuPosition) => void;
};

const THEME_STORAGE_KEY = "theme";
const MENU_POSITION_STORAGE_KEY = "menu-position";
const THEME_META_NAME = "theme-color";
const LIGHT_THEME_COLOR = "#f5f5f5";
const DARK_THEME_COLOR = "#0f172a";

function resolveTheme(initial: string | null): ThemeMode {
  return initial === "dark" ? "dark" : "light";
}

function resolveMenuPosition(initial: string | null): MenuPosition {
  return initial === "left" ? "left" : "right";
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");

  const meta = document.querySelector(
    `meta[name="${THEME_META_NAME}"]`,
  ) as HTMLMetaElement | null;
  if (meta) {
    meta.setAttribute(
      "content",
      theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR,
    );
  }
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined,
);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const nextTheme = resolveTheme(localStorage.getItem(THEME_STORAGE_KEY));
    applyTheme(nextTheme);
    return nextTheme;
  });
  const [menuPosition, setMenuPositionState] = useState<MenuPosition>(() =>
    resolveMenuPosition(localStorage.getItem(MENU_POSITION_STORAGE_KEY)),
  );

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(MENU_POSITION_STORAGE_KEY, menuPosition);
  }, [menuPosition]);

  const setTheme = useCallback((value: ThemeMode) => {
    setThemeState(value);
  }, []);

  const setMenuPosition = useCallback((value: MenuPosition) => {
    setMenuPositionState(value);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      menuPosition,
      setTheme,
      setMenuPosition,
    }),
    [theme, menuPosition, setTheme, setMenuPosition],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider.");
  }
  return context;
}
