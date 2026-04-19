import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/lib/db/storage";
import { usePlayerStore } from "@/lib/stores/player-store";

describe("player store", () => {
  beforeEach(async () => {
    await storage.clear();
    usePlayerStore.setState({ profile: null, xpLog: [], loaded: false });
  });

  it("loads default profile", async () => {
    await usePlayerStore.getState().load();
    const { profile } = usePlayerStore.getState();
    expect(profile?.name).toBe("Hunter");
    expect(profile?.level).toBe(1);
  });

  it("adds xp and persists", async () => {
    await usePlayerStore.getState().load();
    await usePlayerStore.getState().addXp(50, "Test reward", "test");
    const { profile } = usePlayerStore.getState();
    expect(profile?.xp).toBe(50);

    const stored = await storage.getProfile();
    expect(stored.xp).toBe(50);
  });

  it("levels up when xp threshold crossed", async () => {
    await usePlayerStore.getState().load();
    await usePlayerStore.getState().addXp(150, "Big reward", "test");
    const { profile } = usePlayerStore.getState();
    expect(profile?.level).toBeGreaterThanOrEqual(2);
  });
});
