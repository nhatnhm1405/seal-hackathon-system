import { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from "react";

type Theme = "dark" | "light";

// Module-level counter: khi > 0, ThemeProvider không được override data-theme
let forceDarkCount = 0;

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/** Ép trang luôn dùng dark mode — dùng useLayoutEffect để không flash trước paint. */
export function useForceDark() {
  useLayoutEffect(() => {
    forceDarkCount++;
    applyTheme("dark");
    return () => {
      forceDarkCount--;
      if (forceDarkCount === 0) {
        const saved = (localStorage.getItem("seal-theme") as Theme) ?? "dark";
        applyTheme(saved);
      }
    };
  }, []);
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("seal-theme") as Theme) ?? "dark";
  });

  useEffect(() => {
    localStorage.setItem("seal-theme", theme);
    // Chỉ áp dụng lên DOM khi không có trang nào đang force dark
    if (forceDarkCount === 0) {
      applyTheme(theme);
    }
  }, [theme]);

  function toggleTheme() {
    document.documentElement.classList.add("theme-transitioning");
    setTheme(t => (t === "dark" ? "light" : "dark"));
    setTimeout(() => document.documentElement.classList.remove("theme-transitioning"), 400);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
