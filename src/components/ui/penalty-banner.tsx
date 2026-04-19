import { Panel } from "@/components/ui/panel";

interface PenaltyBannerProps {
  date: string;
}

export function PenaltyBanner({ date }: PenaltyBannerProps) {
  return (
    <Panel glow="red" className="border border-red-400/20">
      <p className="font-mono text-xs tracking-[0.25em] text-red-600">PENALTY NOTICE</p>
      <p className="mt-2 text-sm text-[var(--text-primary)]">
        Daily log missing for <span className="font-mono text-red-600">{date}</span>. XP
        has been deducted and your streak was reset.
      </p>
    </Panel>
  );
}
