import { z } from "zod";
export const statuses = ["Прогрев", "Готов", "В работе", "Проверка"] as const;
export const accountInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    geo: z.string().trim().min(2).max(40),
    owner: z.string().trim().min(2).max(40),
    dailyLimit: z.number().int().min(0).max(100_000_000).default(0),
    quality: z
      .enum(["Не оценено", "Высокое", "Стандартное", "Риск"])
      .default("Не оценено"),
  })
  .strict();
export const statusInput = z
  .object({ id: z.string().min(1).max(100), status: z.enum(statuses) })
  .strict();
export const transactionInput = z
  .object({
    title: z.string().trim().min(2).max(100),
    kind: z.enum(["income", "expense"]),
    department: z
      .enum(["GENERAL", "FARMING", "MEDIABUYING"])
      .default("GENERAL"),
    amount: z.number().int().min(1).max(100_000_000),
  })
  .strict();
export function summarize(rows: { kind: string; amount: number }[]) {
  const income = rows
    .filter((r) => r.kind === "income")
    .reduce((s, r) => s + r.amount, 0);
  const expense = rows
    .filter((r) => r.kind === "expense")
    .reduce((s, r) => s + r.amount, 0);
  return {
    income,
    expense,
    profit: income - expense,
    roi: expense ? Math.round(((income - expense) / expense) * 100) : null,
  };
}
export function insights(
  accounts: { status: string }[],
  rows: { kind: string; amount: number }[],
) {
  const ready = accounts.filter((a) => a.status === "Готов").length;
  const check = accounts.filter((a) => a.status === "Проверка").length;
  const s = summarize(rows);
  return [
    `Готовы к передаче в медиабаинг: ${ready}.`,
    `Требуют проверки: ${check}.`,
    s.profit >= 0
      ? "Доход покрывает расходы за выбранный период."
      : "Расходы превышают доход. Проверьте структуру затрат.",
  ];
}
