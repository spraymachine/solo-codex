export interface ParsedSet {
  setNumber: number;
  weightKg: number | null;
  reps: number;
}

export type ParseResult =
  | { ok: true; value: ParsedSet }
  | { ok: false; error: string };

function isPositiveInt(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

export function parseSetInput(raw: string, isBodyweight: boolean): ParseResult {
  const tokens = raw.trim().split(/[\s,]+/).filter(Boolean);

  if (tokens.length === 0) {
    return { ok: false, error: "Enter set, weight, reps (e.g. 1,40,15)" };
  }

  const nums = tokens.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) {
    return { ok: false, error: "Numbers only (e.g. 1,40,15)" };
  }

  if (tokens.length === 3) {
    const [setNumber, weightKg, reps] = nums;
    if (!isPositiveInt(setNumber)) return { ok: false, error: "Set number must be a positive whole number" };
    if (weightKg < 0) return { ok: false, error: "Weight cannot be negative" };
    if (!isPositiveInt(reps)) return { ok: false, error: "Reps must be a positive whole number" };
    return { ok: true, value: { setNumber, weightKg, reps } };
  }

  if (tokens.length === 2) {
    if (!isBodyweight) {
      return { ok: false, error: "Weighted exercise needs set, weight, reps (3 numbers)" };
    }
    const [setNumber, reps] = nums;
    if (!isPositiveInt(setNumber)) return { ok: false, error: "Set number must be a positive whole number" };
    if (!isPositiveInt(reps)) return { ok: false, error: "Reps must be a positive whole number" };
    return { ok: true, value: { setNumber, weightKg: null, reps } };
  }

  return { ok: false, error: "Enter 2 numbers (bodyweight) or 3 (set, weight, reps)" };
}
