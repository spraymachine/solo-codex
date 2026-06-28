"use client";

import { useState } from "react";
import { useGymStore } from "@/lib/stores/gym-store";
import { SmartInput } from "./smart-input";
import { LastRecordCard } from "./last-record-card";
import { DayPicker } from "./day-picker";
import { SessionView } from "./session-view";
import { SplitEditor } from "./split-editor";
import { HistoryList } from "./history-list";

export function GymPage() {
  const sessions = useGymStore((s) => s.sessions);
  const currentSessionId = useGymStore((s) => s.currentSessionId);
  const [editing, setEditing] = useState(false);
  const session = sessions.find((s) => s.id === currentSessionId) ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-12">
      <SmartInput />
      <LastRecordCard />
      {editing ? (
        <SplitEditor onClose={() => setEditing(false)} />
      ) : session ? (
        <SessionView session={session} />
      ) : (
        <DayPicker onManage={() => setEditing(true)} />
      )}
      <HistoryList />
    </div>
  );
}
