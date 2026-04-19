"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { RankBadge } from "@/components/ui/rank-badge";
import { usePlayerStore } from "@/lib/stores/player-store";
import { useSystemStore } from "@/lib/stores/system-store";

export function ProfilePanel() {
  const profile = usePlayerStore((state) => state.profile);
  const saveProfile = usePlayerStore((state) => state.saveProfile);
  const notificationsEnabled = useSystemStore((state) => state.notificationsEnabled);
  const reminderTime = useSystemStore((state) => state.reminderTime);
  const setNotificationsEnabled = useSystemStore((state) => state.setNotificationsEnabled);
  const setReminderTime = useSystemStore((state) => state.setReminderTime);
  const [name, setName] = useState(profile?.name ?? "");

  if (!profile) return null;

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
  }

  return (
    <Panel glow="violet">
      <div className="flex items-start gap-4">
        <RankBadge rank={profile.rank} size="lg" />
        <div className="flex-1 space-y-4">
          <div>
            <p className="font-mono text-xs tracking-[0.25em] text-[var(--accent-soft)]">PLAYER PROFILE</p>
            <p className="mt-1 text-sm text-slate-400">
              Level {profile.level} • {profile.xp} total XP
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="flex-1 rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            />
            <Button onClick={() => saveProfile({ name: name.trim() || profile.name })}>
              Save
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-[rgba(150,119,89,0.08)] p-3">
              <p className="text-xs text-slate-400">Reminder Time</p>
              <input
                type="time"
                value={reminderTime}
                onChange={(event) => setReminderTime(event.target.value)}
                className="mt-2 rounded-lg border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </div>
            <div className="rounded-xl bg-[rgba(150,119,89,0.08)] p-3">
              <p className="text-xs text-slate-400">Notifications</p>
              <div className="mt-2 flex items-center gap-2">
                <Button variant="secondary" onClick={enableNotifications}>
                  {notificationsEnabled ? "Enabled" : "Request Permission"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                >
                  {notificationsEnabled ? "Disable" : "Keep Off"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
