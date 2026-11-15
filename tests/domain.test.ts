import { describe, it, expect } from "vitest";
import {
  summarize,
  accountInput,
  transactionInput,
  insights,
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
  it("derives recommendations from current accounts", () =>
    expect(insights([{ status: "Готов" }], [])[0]).toContain("1"));
});
