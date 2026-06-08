import { describe, expect, it } from "vitest";
import { canAccessPersona, getAllowedPersonas } from "@/lib/persona-access";

describe("persona access", () => {
  it("gives Mani and Harti to maniha@improve.com (and unknown emails)", () => {
    expect(getAllowedPersonas("maniha@improve.com")).toEqual(["mani", "harti"]);
    expect(getAllowedPersonas("other@example.com")).toEqual(["mani", "harti"]);
    expect(canAccessPersona("mani", "maniha@improve.com")).toBe(true);
    expect(canAccessPersona("harti", "maniha@improve.com")).toBe(true);
  });

  it("scopes demo@improve.com to Hunter and Rahul only", () => {
    expect(getAllowedPersonas("demo@improve.com")).toEqual(["hunter", "rahul"]);
    expect(canAccessPersona("mani", "demo@improve.com")).toBe(false);
    expect(canAccessPersona("harti", "demo@improve.com")).toBe(false);
    expect(canAccessPersona("hunter", "demo@improve.com")).toBe(true);
    expect(canAccessPersona("rahul", "demo@improve.com")).toBe(true);
  });
});
