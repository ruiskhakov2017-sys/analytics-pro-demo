import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const legacy = require("./legacy/farmingAnalytics.cjs") as {
  buildBanCorrelation: (input: {
    accounts: Record<string, unknown>[];
    rangeStart: Date;
    rangeEnd: Date;
    archivedStatuses: Set<string>;
  }) => {
    bins: Record<string, number>;
    proxies: Record<string, number>;
    toxicProxies: { proxy: string; banned: number }[];
    topBins: { bin: string; banned: number }[];
  };
  buildMediaBuyingOverview: (input: {
    accounts: Record<string, unknown>[];
    rangeStart: Date;
    rangeEnd: Date;
  }) => {
    total: number;
    limits: { withLimit: number; withoutLimit: number; highLimit: number };
    problematic: { count: number };
    byFarmer: Record<string, number>;
  };
};
type FarmingInput = {
  id: string;
  cardBin: string;
  proxyProvider: string;
  createdAt: Date;
  history: { status: string; createdAt: Date }[];
};
type Input = {
  id: string;
  name: string;
  owner: string;
  status: string;
  dailyLimit: number;
  createdAt: Date;
};
export function mediaOverview(accounts: Input[]) {
  return legacy.buildMediaBuyingOverview({
    accounts: accounts.map((a) => ({
      profileName: a.id,
      farmerName: a.owner,
      farmerTag: a.owner,
      sourceTab: a.status === "В работе" ? "Media_Buying" : "Work",
      status: a.status === "В работе" ? "Active" : a.status,
      dailyLimit: a.dailyLimit > 0 ? a.dailyLimit / 100 : null,
      createdAt: a.createdAt,
    })),
    rangeStart: new Date(0),
    rangeEnd: new Date("9999-01-01"),
  });
}

export function banCorrelation(accounts: FarmingInput[]) {
  const start = new Date(0);
  const end = new Date("9999-01-01");
  return legacy.buildBanCorrelation({
    accounts: accounts.map((account) => ({
      profileName: account.id,
      cardBin: account.cardBin,
      proxyProvider: account.proxyProvider,
      createdAt: account.createdAt,
      history: account.history.map((event) => ({
        at: event.createdAt,
        to: event.status,
      })),
    })),
    rangeStart: start,
    rangeEnd: end,
    archivedStatuses: new Set(["бан", "ban"]),
  });
}
