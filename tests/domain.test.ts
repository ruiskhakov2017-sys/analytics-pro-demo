import { describe, it, expect } from "vitest";
import {
  summarize,
  accountInput,
  transactionInput,
  insights,
  farmingFunnel,
  farmingLimitAnalytics,
  limitInput,
  farmerRenameInput,
} from "../lib/domain";
describe("money in integer cents", () => {
  it("calculates profit and ROI", () => {
    expect(
      summarize([
        { kind: "income", amount: 2712000 },
        { kind: "expense", amount: 1640000 },
      ]),
    ).toEqual({ income: 2712000, expense: 1640000, profit: 1072000, roi: 65 });
  });
  it("does not invent ROI without expenses", () =>
    expect(summarize([]).roi).toBeNull());
  it("rejects negative and fractional cents", () => {
    for (const amount of [-1, 0, 0.5, 100000001])
      expect(
        transactionInput.safeParse({ title: "Test", kind: "expense", amount })
          .success,
      ).toBe(false);
  });
  it("rejects injected workspace ownership", () =>
    expect(
      accountInput.safeParse({
        name: "Demo",
        geo: "DE",
        owner: "AA",
        workspaceId: "other",
      }).success,
    ).toBe(false));
  it("accepts farming metadata and applies safe defaults", () => {
    expect(
      accountInput.parse({
        name: "Demo",
        geo: "DE",
        owner: "AA",
        cardBin: "412345",
        additionalFarming: true,
      }),
    ).toMatchObject({
      cardBin: "412345",
      proxyProvider: "",
      warmupScheme: "",
      additionalFarming: true,
    });
  });
  it("rejects invalid farming metadata", () => {
    expect(
      accountInput.safeParse({
        name: "Demo",
        geo: "DE",
        owner: "AA",
        cardBin: "12-3456",
      }).success,
    ).toBe(false);
    expect(
      accountInput.safeParse({
        name: "Demo",
        geo: "DE",
        owner: "AA",
        proxyProvider: "x".repeat(61),
      }).success,
    ).toBe(false);
  });
  it("validates daily limit updates in integer cents", () => {
    expect(limitInput.safeParse({ id: "acc-1", dailyLimit: 12345 }).success).toBe(true);
    expect(limitInput.safeParse({ id: "acc-1", dailyLimit: 1.5 }).success).toBe(false);
    expect(limitInput.safeParse({ id: "acc-1", dailyLimit: -1 }).success).toBe(false);
  });
  it("validates farmer renames without allowing empty or injected data", () => {
    expect(farmerRenameInput.parse({ from: "Farmer A", to: "Farmer B" })).toEqual({
      from: "Farmer A",
      to: "Farmer B",
    });
    expect(
      farmerRenameInput.safeParse({ from: "A", to: "Farmer B" }).success,
    ).toBe(false);
    expect(
      farmerRenameInput.safeParse({
        from: "Farmer A",
        to: "Farmer B",
        workspaceId: "another-workspace",
      }).success,
    ).toBe(false);
  });
  it("derives recommendations from current accounts", () =>
    expect(insights([{ status: "Готов" }], [])[0]).toContain("1"));
  it("builds funnel from current state and status history", () => {
    expect(
      farmingFunnel([
        { status: "Прогрев", history: [{ status: "Прогрев", previousStatus: null }] },
        { status: "Готов", history: [{ status: "Проверка", previousStatus: "Прогрев" }] },
        { status: "В работе", history: [{ status: "Готов", previousStatus: "Проверка" }] },
        { status: "Бан", history: [{ status: "Бан", previousStatus: "Прогрев" }] },
        { status: "Бан", history: [{ status: "Бан", previousStatus: "Готов" }] },
      ]),
    ).toEqual([
      { stage: "Создано", count: 5, conversion: 100 },
      { stage: "Дошли до проверки", count: 3, conversion: 60 },
      { stage: "Проверку прошли", count: 3, conversion: 100 },
      { stage: "Переданы в медиабаинг", count: 1, conversion: 33.3 },
    ]);
  });
  it("calculates limit milestone durations and bundle averages from recorded events", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const accounts = [
      {
        id: "one", proxyProvider: "Proxy A", warmupScheme: "A", additionalFarming: true,
        createdAt,
        limitHistory: [
          { limit: 5000, createdAt: new Date("2026-01-02T00:00:00Z") },
          { limit: 25000, createdAt: new Date("2026-01-04T00:00:00Z") },
          { limit: 100000, createdAt: new Date("2026-01-09T00:00:00Z") },
        ],
      },
      {
        id: "two", proxyProvider: "Proxy A", warmupScheme: "A", additionalFarming: true,
        createdAt,
        limitHistory: [{ limit: 25000, createdAt: new Date("2026-01-06T00:00:00Z") }],
      },
      {
        id: "three", proxyProvider: "Proxy B", warmupScheme: "B", additionalFarming: false,
        createdAt,
        limitHistory: [],
      },
    ];
    const result = farmingLimitAnalytics(accounts);
    expect(result.timeToLimit.gt250).toEqual({ count: 2, avgDays: 4 });
    expect(result.timeToLimit.gt1000).toEqual({ count: 1, avgDays: 8 });
    expect(result.stepDurations["50to250"]).toEqual({ count: 1, avgDays: 2 });
    expect(result.stepDurations["250to1000"]).toEqual({ count: 1, avgDays: 5 });
    expect(result.historyCount).toBe(4);
    expect(result.bundles[0]).toMatchObject({ count: 2, avgLimit: 62500 });
  });
});
