import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface Theme {
  id: string;
  name: string;
  dark: boolean;
  dots: [string, string, string];
  vars: Record<string, string>;
}

export const themes: Theme[] = [
  // ── Dark ──
  {
    id: "default",
    name: "Default",
    dark: true,
    dots: ["#0a0a0f", "#6366f1", "#a5b4fc"],
    vars: {
      "--bg-base": "#0a0a0f",
      "--bg-surface": "#111118",
      "--bg-card": "#16161f",
      "--bg-hover": "#1e1e2a",
      "--bg-active": "#252535",
      "--border": "rgba(255,255,255,0.06)",
      "--border-focus": "rgba(99,102,241,0.5)",
      "--text-primary": "rgba(255,255,255,0.92)",
      "--text-secondary": "rgba(255,255,255,0.55)",
      "--text-muted": "rgba(255,255,255,0.3)",
      "--accent": "#6366f1",
      "--accent-light": "#818cf8",
      "--accent-dim": "rgba(99,102,241,0.15)",
      "--scrollbar-thumb": "rgba(255,255,255,0.1)",
      "--scrollbar-thumb-hover": "rgba(255,255,255,0.2)",
    },
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    dark: true,
    dots: ["#1e1e2e", "#cba6f7", "#f5c2e7"],
    vars: {
      "--bg-base": "#1e1e2e",
      "--bg-surface": "#313244",
      "--bg-card": "#45475a",
      "--bg-hover": "#585b70",
      "--bg-active": "#6c7086",
      "--border": "rgba(205,214,244,0.08)",
      "--border-focus": "rgba(203,166,247,0.5)",
      "--text-primary": "#cdd6f4",
      "--text-secondary": "#bac2de",
      "--text-muted": "#7f849c",
      "--accent": "#cba6f7",
      "--accent-light": "#f5c2e7",
      "--accent-dim": "rgba(203,166,247,0.15)",
      "--scrollbar-thumb": "rgba(205,214,244,0.1)",
      "--scrollbar-thumb-hover": "rgba(205,214,244,0.2)",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    dark: true,
    dots: ["#1a1b26", "#7aa2f7", "#bb9af7"],
    vars: {
      "--bg-base": "#1a1b26",
      "--bg-surface": "#24283b",
      "--bg-card": "#292e42",
      "--bg-hover": "#343b58",
      "--bg-active": "#3b4261",
      "--border": "rgba(192,202,245,0.08)",
      "--border-focus": "rgba(122,162,247,0.5)",
      "--text-primary": "#c0caf5",
      "--text-secondary": "#9aa5ce",
      "--text-muted": "#565f89",
      "--accent": "#7aa2f7",
      "--accent-light": "#bb9af7",
      "--accent-dim": "rgba(122,162,247,0.15)",
      "--scrollbar-thumb": "rgba(192,202,245,0.1)",
      "--scrollbar-thumb-hover": "rgba(192,202,245,0.2)",
    },
  },
  {
    id: "nord",
    name: "Nord",
    dark: true,
    dots: ["#2e3440", "#88c0d0", "#a3be8c"],
    vars: {
      "--bg-base": "#2e3440",
      "--bg-surface": "#3b4252",
      "--bg-card": "#434c5e",
      "--bg-hover": "#4c566a",
      "--bg-active": "#5e6779",
      "--border": "rgba(236,239,244,0.08)",
      "--border-focus": "rgba(136,192,208,0.5)",
      "--text-primary": "#eceff4",
      "--text-secondary": "#d8dee9",
      "--text-muted": "#616e88",
      "--accent": "#88c0d0",
      "--accent-light": "#81a1c1",
      "--accent-dim": "rgba(136,192,208,0.15)",
      "--scrollbar-thumb": "rgba(236,239,244,0.1)",
      "--scrollbar-thumb-hover": "rgba(236,239,244,0.2)",
    },
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    dark: true,
    dots: ["#282828", "#fe8019", "#fabd2f"],
    vars: {
      "--bg-base": "#282828",
      "--bg-surface": "#3c3836",
      "--bg-card": "#504945",
      "--bg-hover": "#665c54",
      "--bg-active": "#7c6f64",
      "--border": "rgba(235,219,178,0.08)",
      "--border-focus": "rgba(254,128,25,0.5)",
      "--text-primary": "#ebdbb2",
      "--text-secondary": "#d5c4a1",
      "--text-muted": "#928374",
      "--accent": "#fe8019",
      "--accent-light": "#fabd2f",
      "--accent-dim": "rgba(254,128,25,0.15)",
      "--scrollbar-thumb": "rgba(235,219,178,0.1)",
      "--scrollbar-thumb-hover": "rgba(235,219,178,0.2)",
    },
  },
  // ── Light ──
  {
    id: "light",
    name: "Light",
    dark: false,
    dots: ["#f8f8fc", "#6366f1", "#818cf8"],
    vars: {
      "--bg-base": "#f8f8fc",
      "--bg-surface": "#f0f0f6",
      "--bg-card": "#ffffff",
      "--bg-hover": "#ebebf3",
      "--bg-active": "#e0e0ec",
      "--border": "rgba(0,0,0,0.08)",
      "--border-focus": "rgba(99,102,241,0.4)",
      "--text-primary": "#18181b",
      "--text-secondary": "#52525b",
      "--text-muted": "#a1a1aa",
      "--accent": "#6366f1",
      "--accent-light": "#4f46e5",
      "--accent-dim": "rgba(99,102,241,0.1)",
      "--scrollbar-thumb": "rgba(0,0,0,0.12)",
      "--scrollbar-thumb-hover": "rgba(0,0,0,0.2)",
    },
  },
  {
    id: "github-light",
    name: "GitHub Light",
    dark: false,
    dots: ["#ffffff", "#0969da", "#8250df"],
    vars: {
      "--bg-base": "#ffffff",
      "--bg-surface": "#f6f8fa",
      "--bg-card": "#ffffff",
      "--bg-hover": "#eaeef2",
      "--bg-active": "#dde3ea",
      "--border": "rgba(31,35,40,0.1)",
      "--border-focus": "rgba(9,105,218,0.4)",
      "--text-primary": "#1f2328",
      "--text-secondary": "#656d76",
      "--text-muted": "#8c959f",
      "--accent": "#0969da",
      "--accent-light": "#8250df",
      "--accent-dim": "rgba(9,105,218,0.1)",
      "--scrollbar-thumb": "rgba(0,0,0,0.12)",
      "--scrollbar-thumb-hover": "rgba(0,0,0,0.2)",
    },
  },
  {
    id: "rose-pine-dawn",
    name: "Rosé Pine",
    dark: false,
    dots: ["#faf4ed", "#d7827e", "#907aa9"],
    vars: {
      "--bg-base": "#faf4ed",
      "--bg-surface": "#f2e9de",
      "--bg-card": "#fffaf3",
      "--bg-hover": "#ede2d5",
      "--bg-active": "#e4d8cc",
      "--border": "rgba(87,82,121,0.1)",
      "--border-focus": "rgba(144,122,169,0.4)",
      "--text-primary": "#575279",
      "--text-secondary": "#797593",
      "--text-muted": "#9893a5",
      "--accent": "#d7827e",
      "--accent-light": "#907aa9",
      "--accent-dim": "rgba(215,130,126,0.12)",
      "--scrollbar-thumb": "rgba(87,82,121,0.12)",
      "--scrollbar-thumb-hover": "rgba(87,82,121,0.22)",
    },
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    dark: false,
    dots: ["#eff1f5", "#8839ef", "#dc8a78"],
    vars: {
      "--bg-base": "#eff1f5",
      "--bg-surface": "#dce0e8",
      "--bg-card": "#ffffff",
      "--bg-hover": "#ccd0da",
      "--bg-active": "#bcc0cc",
      "--border": "rgba(76,79,105,0.1)",
      "--border-focus": "rgba(136,57,239,0.4)",
      "--text-primary": "#4c4f69",
      "--text-secondary": "#5c5f77",
      "--text-muted": "#8c8fa1",
      "--accent": "#8839ef",
      "--accent-light": "#7287fd",
      "--accent-dim": "rgba(136,57,239,0.1)",
      "--scrollbar-thumb": "rgba(76,79,105,0.12)",
      "--scrollbar-thumb-hover": "rgba(76,79,105,0.22)",
    },
  },
];

interface ThemeContextType {
  themeId: string;
  setTheme: (id: string) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: "default",
  setTheme: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<string>(
    () => localStorage.getItem("newslens-theme") || "default"
  );

  const currentTheme = themes.find((t) => t.id === themeId) || themes[0];

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(currentTheme.vars)) {
      root.style.setProperty(key, value);
    }
  }, [currentTheme]);

  const setTheme = (id: string) => {
    setThemeId(id);
    localStorage.setItem("newslens-theme", id);
  };

  return (
    <ThemeContext.Provider value={{ themeId, setTheme, isDark: currentTheme.dark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
