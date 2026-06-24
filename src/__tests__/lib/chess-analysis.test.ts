import { describe, expect, it } from "vitest";
import { classifyMove } from "@/lib/chess/analysis";

describe("classifyMove", () => {
  it("returns good when eval barely changes", () => {
    expect(classifyMove({ cp: 20, mate: null }, { cp: 10, mate: null }, "w")).toBe("good");
  });

  it("returns inaccuracy for a 50-100cp drop", () => {
    expect(classifyMove({ cp: 50, mate: null }, { cp: -20, mate: null }, "w")).toBe("inaccuracy");
  });

  it("returns mistake for a 100-200cp drop", () => {
    expect(classifyMove({ cp: 50, mate: null }, { cp: -80, mate: null }, "w")).toBe("mistake");
  });

  it("returns blunder for a >200cp drop", () => {
    expect(classifyMove({ cp: 50, mate: null }, { cp: -200, mate: null }, "w")).toBe("blunder");
  });

  it("flips perspective for black", () => {
    expect(classifyMove({ cp: 50, mate: null }, { cp: 260, mate: null }, "b")).toBe("blunder");
  });

  it("treats a mate score as a large eval in the mating side's favor", () => {
    expect(classifyMove({ cp: 0, mate: null }, { cp: null, mate: 3 }, "w")).toBe("good");
    expect(classifyMove({ cp: 0, mate: null }, { cp: null, mate: -3 }, "w")).toBe("blunder");
  });
});
