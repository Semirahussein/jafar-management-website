import { test, expect } from "vitest";
import { reportToday, resolveReportPeriod } from "./report-period.mjs";

test("daily period is one inclusive date", () => {
  expect(resolveReportPeriod("DAILY", "2026-10-27")).toEqual({
    periodStart: "2026-10-27", periodEnd: "2026-10-27",
  });
});

test("weekly periods use Monday through Sunday across month boundaries", () => {
  expect(resolveReportPeriod("WEEKLY", "2026-11-01")).toEqual({
    periodStart: "2026-10-26", periodEnd: "2026-11-01",
  });
});

test("monthly periods include the complete month including leap day", () => {
  expect(resolveReportPeriod("MONTHLY", "2024-02-14")).toEqual({
    periodStart: "2024-02-01", periodEnd: "2024-02-29",
  });
});

test("custom periods remain user selected", () => {
  expect(resolveReportPeriod("CUSTOM", "2026-10-27")).toEqual({
    periodStart: "", periodEnd: "",
  });
});

test("today uses the configured report time zone", () => {
  expect(reportToday(new Date("2026-10-26T22:00:00.000Z"))).toBe("2026-10-27");
});
