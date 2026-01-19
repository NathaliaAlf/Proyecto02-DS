import Colors from "@/constants/Colors";
import React, { createContext, useContext, useMemo, useState } from "react";
import { ColorSchemeName } from "react-native";

type ThemeContextType = {
  theme: ColorSchemeName;
  colors: typeof Colors.light;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ColorSchemeName>("light");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const colors = useMemo(
    () => (theme === "dark" ? Colors.dark : Colors.light),
    [theme]
  );

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}