import { test, expect } from "vitest";
import { mediaOverview } from "../lib/analytics-adapter";
test("original media calculations receive dollars, not cents, and only transferred accounts", () => {
  const base = {
    name: "Name",
    owner: "Owner",
    createdAt: new Date("2026-01-01"),
  };
  const result = mediaOverview([
    { ...base, id: "a", status: "В работе", dailyLimit: 1000 },
    { ...base, id: "b", status: "Готов", dailyLimit: 100000 },
  ]);
  expect(result.total).toBe(1);
  expect(result.limits.withLimit).toBe(1);
  expect(result.limits.highLimit).toBe(0);
});
