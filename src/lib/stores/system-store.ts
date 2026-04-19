"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { config } from "@/lib/config";

interface SystemState {
  notificationsEnabled: boolean;
  reminderTime: string;
  lastReminderDate: string | null;
  themeMode: "light" | "dark";
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  markReminderSent: (date: string) => void;
  setThemeMode: (mode: "light" | "dark") => void;
  toggleThemeMode: () => void;
}

export const useSystemStore = create<SystemState>()(
  persist(
    (set) => ({
      notificationsEnabled: false,
      reminderTime: config.reminders.defaultTime,
      lastReminderDate: null,
      themeMode: "light",
      setNotificationsEnabled(enabled) {
        set({ notificationsEnabled: enabled });
      },
      setReminderTime(time) {
        set({ reminderTime: time });
      },
      markReminderSent(date) {
        set({ lastReminderDate: date });
      },
      setThemeMode(mode) {
        set({ themeMode: mode });
      },
      toggleThemeMode() {
        set((state) => ({
          themeMode: state.themeMode === "light" ? "dark" : "light",
        }));
      },
    }),
    { name: "solo-leveling-system-settings" },
  ),
);
