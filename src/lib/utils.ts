export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDate(): string {
  return formatDate(new Date());
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function shiftDate(dateString: string, offsetDays: number): string {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return formatDate(date);
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
