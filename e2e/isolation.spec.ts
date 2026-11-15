import { test, expect } from "@playwright/test";
test("foreign workspace cannot mutate account or delete financial operation", async ({
  browser,
}) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  try {
    const a = await first.newPage();
    const b = await second.newPage();
    for (const p of [a, b]) {
      await p.goto("/");
      await expect(p.getByText("Nord / Search", { exact: true })).toBeVisible();
    }
    const data = await a.evaluate(async () => {
      const r = await fetch("/api/demo");
      return r.json();
    });
    const statuses = await b.evaluate(
      async ({ account, transaction }) => {
        const result = [];
        for (const body of [
          { action: "status", data: { id: account, status: "Готов" } },
          { action: "transaction-delete", data: { id: transaction } },
        ]) {
          const r = await fetch("/api/demo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          result.push(r.status);
        }
        return result;
      },
      { account: data.accounts[0].id, transaction: data.transactions[0].id },
    );
    expect(statuses).toEqual([404, 404]);
    const after = await a.evaluate(async () => {
      const r = await fetch("/api/demo");
      return r.json();
    });
    expect(after.accounts).toEqual(data.accounts);
    expect(after.transactions).toEqual(data.transactions);
  } finally {
    await first.close();
    await second.close();
  }
});
