import { describe, expect, it } from "vitest";
import { canAccessPersona, getAllowedPersonas } from "@/lib/persona-access";

describe("persona access", () => {
  it("keeps Mani and Harti as the only available personas", () => {
    expect(getAllowedPersonas("mani@example.com")).toEqual(["mani", "harti"]);
    expect(getAllowedPersonas("other@example.com")).toEqual(["mani", "harti"]);
    expect(canAccessPersona("mani", "mani@example.com")).toBe(true);
    expect(canAccessPersona("harti", "mani@example.com")).toBe(true);
  });
});
