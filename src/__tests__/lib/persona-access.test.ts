import { describe, expect, it } from "vitest";
import { canAccessPersona, getAllowedPersonas } from "@/lib/persona-access";

describe("persona access", () => {
  it("limits Mouli's login to only Mouli's page", () => {
    expect(getAllowedPersonas("mouli@improve.com")).toEqual(["mouli"]);
    expect(canAccessPersona("mouli", "mouli@improve.com")).toBe(true);
    expect(canAccessPersona("mani", "mouli@improve.com")).toBe(false);
    expect(canAccessPersona("harti", "mouli@improve.com")).toBe(false);
  });

  it("keeps the existing project personas together for other logins", () => {
    expect(getAllowedPersonas("mani@example.com")).toEqual(["mani", "harti"]);
    expect(canAccessPersona("mouli", "mani@example.com")).toBe(false);
  });
});
