import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "dark" | "light";

interface ThemeStore {
  theme: ThemeMode;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "dark",
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
    }),
    { name: "solo-theme" }
  )
);
