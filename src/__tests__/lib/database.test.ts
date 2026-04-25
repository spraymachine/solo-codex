import { describe, expect, it } from "vitest";
import { getDatabaseName } from "@/lib/db/database";

describe("persona database names", () => {
  it("keeps mani and harti in different local databases", () => {
    expect(getDatabaseName("mani")).toBe("SoloLevelingDB-mani");
    expect(getDatabaseName("harti")).toBe("SoloLevelingDB-harti");
    expect(getDatabaseName("mouli")).toBe("SoloLevelingDB-mouli");
  });
});
