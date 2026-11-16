import { test, expect } from "vitest";
import { banCorrelation, mediaOverview } from "../lib/analytics-adapter";
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

test("ban correlation counts BINs and proxy providers from ban history", () => {
  const date = new Date("2026-01-10T12:00:00Z");
  const result = banCorrelation([
    {
      id: "account-1",
      cardBin: "412345",
      proxyProvider: "Proxy A",
      createdAt: date,
      history: [{ status: "Бан", createdAt: date }],
    },
    {
      id: "account-2",
      cardBin: "412345",
      proxyProvider: "Proxy B",
      createdAt: date,
      history: [{ status: "Бан", createdAt: date }],
    },
    {
      id: "account-3",
      cardBin: "545454",
      proxyProvider: "Proxy A",
      createdAt: date,
      history: [{ status: "Готов", createdAt: date }],
    },
  ]);

  expect(result.bins["412345"]).toBe(2);
  expect(result.proxies["Proxy A"]).toBe(1);
  expect(result.proxies["Proxy B"]).toBe(1);
  expect(result.topBins[0]).toEqual({ bin: "412345", banned: 2 });
});
