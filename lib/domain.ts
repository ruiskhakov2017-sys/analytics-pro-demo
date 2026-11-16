import { z } from "zod";
export const statuses = ["Прогрев", "Готов", "В работе", "Проверка", "Бан"] as const;
export const accountInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    geo: z.string().trim().min(2).max(40),
    owner: z.string().trim().min(2).max(40),
    dailyLimit: z.number().int().min(0).max(100_000_000).default(0),
    quality: z
      .enum(["Не оценено", "Высокое", "Стандартное", "Риск"])
      .default("Не оценено"),
    proxyProvider: z.string().trim().max(60).default(""),
    cardBin: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{6,8}$/.test(value), {
        message: "BIN должен содержать от 6 до 8 цифр",
      })
      .default(""),
    warmupScheme: z.string().trim().max(100).default(""),
    additionalFarming: z.boolean().default(false),
  })
  .strict();
export const statusInput = z
  .object({ id: z.string().min(1).max(100), status: z.enum(statuses) })
  .strict();
export const limitInput = z
  .object({
    id: z.string().min(1).max(100),
    dailyLimit: z.number().int().min(0).max(100_000_000),
  })
  .strict();
export const farmerRenameInput = z
  .object({
    from: z.string().trim().min(2).max(40),
    to: z.string().trim().min(2).max(40),
  })
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

export function farmingFunnel(
  accounts: {
    status: string;
    history: { status: string; previousStatus: string | null }[];
  }[],
) {
  const reachedVerification = accounts.filter((account) => {
    const states = [
      account.status,
      ...account.history.flatMap((event) => [event.status, event.previousStatus]),
    ];
    return states.some((status) =>
      ["Проверка", "Готов", "В работе"].includes(status ?? ""),
    );
  }).length;
  const passedVerification = accounts.filter((account) => {
    const states = [
      account.status,
      ...account.history.flatMap((event) => [event.status, event.previousStatus]),
    ];
    return states.some((status) => ["Готов", "В работе"].includes(status ?? ""));
  }).length;
  const transferred = accounts.filter((account) => {
    const states = [
      account.status,
      ...account.history.flatMap((event) => [event.status, event.previousStatus]),
    ];
    return states.includes("В работе");
  }).length;
  const rate = (count: number, total: number) =>
    total ? Math.round((count / total) * 1000) / 10 : 0;
  return [
    { stage: "Создано", count: accounts.length, conversion: 100 },
    {
      stage: "Дошли до проверки",
      count: reachedVerification,
      conversion: rate(reachedVerification, accounts.length),
    },
    {
      stage: "Проверку прошли",
      count: passedVerification,
      conversion: rate(passedVerification, reachedVerification),
    },
    {
      stage: "Переданы в медиабаинг",
      count: transferred,
      conversion: rate(transferred, passedVerification),
    },
  ];
}

type LimitAccount = {
  id: string;
  proxyProvider: string;
  warmupScheme: string;
  additionalFarming: boolean;
  createdAt: Date | string;
  limitHistory: { limit: number; createdAt: Date | string }[];
};

export function farmingLimitAnalytics(accounts: LimitAccount[]) {
  const threshold = (cents: number) => ({ count: 0, avgDays: 0 });
  const timeToLimit = { gt250: threshold(25000), gt1000: threshold(100000) };
  const sums = { gt250: 0, gt1000: 0 };
  const steps = {
    "50to250": { count: 0, avgDays: 0, sum: 0 },
    "250to1000": { count: 0, avgDays: 0, sum: 0 },
    "1000to5000": { count: 0, avgDays: 0, sum: 0 },
  };
  const bundles = new Map<
    string,
    { proxy: string; scheme: string; additionalFarming: boolean; count: number; sum: number }
  >();

  for (const account of accounts) {
    const created = new Date(account.createdAt).getTime();
    const events = [...account.limitHistory]
      .filter((event) => Number.isFinite(new Date(event.createdAt).getTime()))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const firstRecordedAt = (cents: number) =>
      events.find((event) => event.limit >= cents);
    const firstMilestone = (cents: number) =>
      events.find((event) => event.limit === cents);
    for (const [key, cents] of [["gt250", 25000], ["gt1000", 100000]] as const) {
      const reached = firstRecordedAt(cents);
      if (!reached || !Number.isFinite(created)) continue;
      const days = Math.max(0, (new Date(reached.createdAt).getTime() - created) / 86400000);
      timeToLimit[key].count += 1;
      sums[key] += days;
    }
    const milestones = [
      ["50to250", 5000, 25000],
      ["250to1000", 25000, 100000],
      ["1000to5000", 100000, 500000],
    ] as const;
    for (const [key, fromLimit, toLimit] of milestones) {
      const from = firstMilestone(fromLimit);
      const to = firstMilestone(toLimit);
      if (!from || !to) continue;
      const fromAt = new Date(from.createdAt).getTime();
      const toAt = new Date(to.createdAt).getTime();
      if (toAt < fromAt) continue;
      steps[key].count += 1;
      steps[key].sum += (toAt - fromAt) / 86400000;
    }
    const latest = events.at(-1);
    if (!latest) continue;
    const proxy = account.proxyProvider || "Не указан";
    const scheme = account.warmupScheme || "Не указана";
    const key = JSON.stringify([proxy, scheme, account.additionalFarming]);
    const bundle = bundles.get(key) ?? {
      proxy,
      scheme,
      additionalFarming: account.additionalFarming,
      count: 0,
      sum: 0,
    };
    bundle.count += 1;
    bundle.sum += latest.limit;
    bundles.set(key, bundle);
  }

  for (const key of ["gt250", "gt1000"] as const) {
    if (timeToLimit[key].count)
      timeToLimit[key].avgDays = Math.round((sums[key] / timeToLimit[key].count) * 10) / 10;
  }
  for (const row of Object.values(steps))
    if (row.count) row.avgDays = Math.round((row.sum / row.count) * 10) / 10;
  return {
    timeToLimit,
    stepDurations: Object.fromEntries(
      Object.entries(steps).map(([key, row]) => [key, { count: row.count, avgDays: row.avgDays }]),
    ),
    bundles: [...bundles.values()]
      .map(({ sum, ...row }) => ({ ...row, avgLimit: Math.round(sum / row.count) }))
      .sort((a, b) => b.avgLimit - a.avgLimit || b.count - a.count),
    historyCount: accounts.reduce((sum, account) => sum + account.limitHistory.length, 0),
  };
}
