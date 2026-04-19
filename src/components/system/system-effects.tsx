"use client";

import { useEffect, useRef } from "react";
import { useRecordsStore } from "@/lib/stores/records-store";
import { useSystemStore } from "@/lib/stores/system-store";
import { useTimerStore } from "@/lib/stores/timer-store";
import { todayDate } from "@/lib/utils";

export function SystemEffects() {
  const notificationsEnabled = useSystemStore((state) => state.notificationsEnabled);
  const reminderTime = useSystemStore((state) => state.reminderTime);
  const lastReminderDate = useSystemStore((state) => state.lastReminderDate);
  const markReminderSent = useSystemStore((state) => state.markReminderSent);
  const records = useRecordsStore((state) => state.records);
  const active = useTimerStore((state) => state.active);
  const endTime = useTimerStore((state) => state.endTime);
  const questTitle = useTimerStore((state) => state.questTitle);
  const timerNoticeSent = useRef(false);

  useEffect(() => {
    if (!active || !endTime) {
      timerNoticeSent.current = false;
      return;
    }

    const interval = window.setInterval(() => {
      if (
        notificationsEnabled &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        Date.now() >= endTime &&
        !timerNoticeSent.current
      ) {
        timerNoticeSent.current = true;
        new Notification("Dungeon Cleared", {
          body: questTitle || "Your focus session has ended.",
        });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [active, endTime, notificationsEnabled, questTitle]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (
        !notificationsEnabled ||
        typeof Notification === "undefined" ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      const now = new Date();
      const currentTime = `${`${now.getHours()}`.padStart(2, "0")}:${`${now.getMinutes()}`.padStart(2, "0")}`;
      const hasLoggedToday = records.some(
        (record) => record.date === todayDate() && record.entries.length > 0,
      );

      if (currentTime === reminderTime && !hasLoggedToday && lastReminderDate !== todayDate()) {
        new Notification("Hunter's Record Reminder", {
          body: "You have not logged today's activity yet.",
        });
        markReminderSent(todayDate());
      }
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [lastReminderDate, markReminderSent, notificationsEnabled, records, reminderTime]);

  return null;
}
