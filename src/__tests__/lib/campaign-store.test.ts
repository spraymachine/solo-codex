import { beforeEach, describe, expect, it } from "vitest";
import { useCampaignStore } from "@/lib/stores/campaign-store";

describe("campaign store", () => {
  beforeEach(() => {
    useCampaignStore.setState({
      startDate: "2026-04-20",
      totalDays: 22,
      currentDate: "2026-04-20",
      selectedDate: "2026-04-20",
    });
  });

  it("builds the default 22-day campaign starting on 2026-04-20", () => {
    const dates = useCampaignStore.getState().getDates();
    expect(dates[0]).toBe("2026-04-20");
    expect(dates.at(-1)).toBe("2026-05-11");
    expect(dates).toHaveLength(22);
  });

  it("marks only the current campaign day as editable", () => {
    const store = useCampaignStore.getState();
    expect(store.isEditableDate("2026-04-20")).toBe(true);
    expect(store.isEditableDate("2026-04-19")).toBe(false);
    expect(store.isEditableDate("2026-04-21")).toBe(false);
  });

  it("advances to the next campaign day and selects it", () => {
    useCampaignStore.getState().advanceDay();
    const store = useCampaignStore.getState();
    expect(store.currentDate).toBe("2026-04-21");
    expect(store.selectedDate).toBe("2026-04-21");
  });

  it("keeps the challenge locked to May 11 even if an extension is requested", () => {
    useCampaignStore.getState().extendCampaign(7);
    const store = useCampaignStore.getState();
    const dates = store.getDates();
    expect(store.totalDays).toBe(22);
    expect(dates.at(-1)).toBe("2026-05-11");
  });
});
