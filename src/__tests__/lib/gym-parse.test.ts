import { describe, expect, it } from "vitest";
import { parseSetInput } from "@/lib/gym/parse";

describe("parseSetInput", () => {
  it("parses three comma-separated numbers as set, weight, reps", () => {
    const r = parseSetInput("1,40,15", false);
    expect(r).toEqual({ ok: true, value: { setNumber: 1, weightKg: 40, reps: 15 } });
  });

  it("accepts spaces as separators", () => {
    const r = parseSetInput("2 42 12", false);
    expect(r).toEqual({ ok: true, value: { setNumber: 2, weightKg: 42, reps: 12 } });
  });

  it("allows decimal weight", () => {
    const r = parseSetInput("1,2.5,20", false);
    expect(r).toEqual({ ok: true, value: { setNumber: 1, weightKg: 2.5, reps: 20 } });
  });

  it("parses two numbers as set, reps for a bodyweight exercise", () => {
    const r = parseSetInput("1,15", true);
    expect(r).toEqual({ ok: true, value: { setNumber: 1, weightKg: null, reps: 15 } });
  });

  it("rejects two numbers for a weighted exercise", () => {
    const r = parseSetInput("1,15", false);
    expect(r.ok).toBe(false);
  });

  it("rejects empty input", () => {
    expect(parseSetInput("", false).ok).toBe(false);
  });

  it("rejects non-numeric tokens", () => {
    expect(parseSetInput("a,b,c", false).ok).toBe(false);
  });

  it("rejects too many numbers", () => {
    expect(parseSetInput("1,2,3,4", false).ok).toBe(false);
  });

  it("rejects zero or negative set/reps", () => {
    expect(parseSetInput("0,40,15", false).ok).toBe(false);
    expect(parseSetInput("1,40,-3", false).ok).toBe(false);
  });

  it("rejects non-integer set number or reps", () => {
    expect(parseSetInput("1.5,40,15", false).ok).toBe(false);
    expect(parseSetInput("1,40,15.5", false).ok).toBe(false);
  });
});
