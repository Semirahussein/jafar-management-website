export const REPORT_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE || "Africa/Addis_Ababa";

export function reportToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function resolveReportPeriod(mode, anchor) {
  if (mode === "CUSTOM") return { periodStart: "", periodEnd: "" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) {
    throw new RangeError("A valid reference date is required");
  }

  const [year, month, day] = anchor.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const format = value => value.toISOString().slice(0, 10);
  if (format(date) !== anchor) throw new RangeError("A valid reference date is required");
  if (mode === "DAILY") return { periodStart: anchor, periodEnd: anchor };
  if (mode === "WEEKLY") {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    const start = new Date(date);
    start.setUTCDate(date.getUTCDate() - mondayOffset);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { periodStart: format(start), periodEnd: format(end) };
  }
  if (mode === "MONTHLY") {
    return {
      periodStart: format(new Date(Date.UTC(year, month - 1, 1))),
      periodEnd: format(new Date(Date.UTC(year, month, 0))),
    };
  }
  throw new RangeError("Unsupported reporting period");
}
