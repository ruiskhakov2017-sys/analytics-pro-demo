const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildKpiAggregation,
  buildTimingAnalytics,
  buildBanCorrelation,
  buildStuckAccounts,
  buildWarehouseStock,
  buildLimitAnalytics,
  buildFunnelAnalytics
} = require("../../lib/legacy/farmingAnalytics.cjs");

test("buildKpiAggregation logic: Created = InProcess + Transferred + Bans", () => {
  const rangeStart = new Date("2025-01-01T00:00:00.000Z");
  const rangeEnd = new Date("2025-01-31T23:59:59.999Z");
  const allowedStatuses = ["Ready", "Active", "Ban", "Suspended"];

  const accounts = [
    // 1. IN PROCESS (Work table, status Ready)
    {
      profileName: "P1",
      farmerTag: "F1",
      createdAt: "2025-01-10T10:00:00.000Z",
      sourceTab: "Work",
      status: "Ready",
      history: []
    },
    // 2. TRANSFERRED (MediaBuying table) -> Success
    {
      profileName: "P2",
      farmerTag: "F1",
      createdAt: "2025-01-12T10:00:00.000Z",
      sourceTab: "Media_Buying", // or Transferred
      status: "Active",
      history: []
    },
    // 3. BANNED ON FARM (Archived table, NEVER in buying) -> Ban
    {
      profileName: "P3",
      farmerTag: "F1",
      createdAt: "2025-01-15T10:00:00.000Z",
      sourceTab: "Archived",
      status: "Ban",
      history: [{ action: "status_changed", newValue: "Ban" }]
    },
    // 4. BANNED IN BUYING (Archived table, BUT was in buying) -> Success (Transferred)
    {
      profileName: "P4",
      farmerTag: "F1",
      createdAt: "2025-01-18T10:00:00.000Z",
      sourceTab: "Archived",
      status: "Ban",
      history: [
        { action: "tab_changed", newValue: "Media_Buying" }, // Was in buying
        { action: "status_changed", newValue: "Ban" } // Then banned
      ]
    }
  ];

  const result = buildKpiAggregation({
    accounts,
    rangeStart,
    rangeEnd,
    allowedStatuses
  });

  // Created: 4
  assert.equal(result.created.total, 4);

  // In Process: 1 (P1)
  assert.equal(result.inProcess.total, 1);

  // Transferred (Success): 2 (P2 + P4)
  // P2 is currently in buying. P4 is archived but was in buying.
  assert.equal(result.transferred.total, 2);

  // Bans (Farm Fault): 1 (P3)
  // P3 is archived and never was in buying.
  assert.equal(result.bans.total, 1);

  // Math check
  assert.equal(
    result.created.total,
    result.inProcess.total + result.transferred.total + result.bans.total,
    "Math should match: Created = InProcess + Transferred + Bans"
  );
});

test("timing analytics averages and counts are computed correctly", () => {
  const rangeStart = new Date("2025-01-01T00:00:00.000Z");
  const rangeEnd = new Date("2025-01-31T23:59:59.999Z");
  const transferredStatuses = new Set(["Verified"]);
  const archivedStatuses = new Set(["Ban"]);
  const accounts = [
    {
      profileName: "A1",
      farmerTag: "F1",
      createdAt: "2024-12-25T00:00:00.000Z",
      history: [
        { at: "2025-01-05T00:00:00.000Z", to: "Verified" },
        { at: "2025-01-20T00:00:00.000Z", to: "Ban" }
      ]
    },
    {
      profileName: "A2",
      farmerTag: "F2",
      createdAt: "2024-12-28T00:00:00.000Z",
      history: [
        { at: "2025-02-10T00:00:00.000Z", to: "Verified" },
        { at: "2025-02-20T00:00:00.000Z", to: "Ban" }
      ]
    }
  ];
  const t = buildTimingAnalytics({
    accounts,
    rangeStart,
    rangeEnd,
    transferredStatuses,
    archivedStatuses
  });
  // A1 contributes to all three metrics within range
  // Prep: 11 days, LTV: 15 days, Lifecycle: 26 days
  assert.equal(t.global.prepDaysAvg, 11);
  assert.equal(t.global.prepCount, 1);
  assert.equal(t.global.ltvDaysAvg, 15);
  assert.equal(t.global.ltvCount, 1);
  assert.equal(t.global.lifecycleDaysAvg, 26);
  assert.equal(t.global.lifecycleCount, 1);
});

test("ban correlation groups by BIN and proxy provider", () => {
  const rangeStart = new Date("2025-01-01T00:00:00.000Z");
  const rangeEnd = new Date("2025-01-31T23:59:59.999Z");
  const archivedStatuses = new Set(["Ban"]);
  const accounts = [
    {
      profileName: "B1",
      cardNumber: "4123 4500 7788 9900",
      proxyProvider: "P1",
      history: [{ at: "2025-01-05T00:00:00.000Z", to: "Ban" }]
    },
    {
      profileName: "B2",
      cardNumber: "4123459999990000",
      proxyProvider: "P2",
      history: [{ at: "2025-01-10T00:00:00.000Z", to: "Ban" }]
    },
    {
      profileName: "B3",
      cardNumber: "4123451234560000",
      proxyProvider: "P1",
      history: [{ at: "2025-02-01T00:00:00.000Z", to: "Ban" }]
    }
  ];
  const corr = buildBanCorrelation({ accounts, rangeStart, rangeEnd, archivedStatuses });
  // B1 and B2 in range share same BIN 412345 -> count 2; P1 and P2 each 1
  assert.equal(corr.bins["412345"], 2);
  assert.equal(corr.proxies.P1, 1);
  assert.equal(corr.proxies.P2, 1);
});

test("stuck accounts detect >5 days in work statuses using last history timestamp", () => {
  const now = new Date("2025-02-10T00:00:00.000Z");
  const workStatuses = ["Created", "Warm-up", "Ready", "Mail Restricted", "Suspended", "In Appeal"];
  const accounts = [
    {
      profileName: "S1",
      status: "Ready",
      createdAt: "2025-01-01T00:00:00.000Z",
      history: [{ at: "2025-02-01T00:00:00.000Z", to: "Ready" }],
      farmerName: "FN1",
      farmerTag: "FT1"
    },
    {
      profileName: "S2",
      status: "Ready",
      createdAt: "2025-01-01T00:00:00.000Z",
      history: [{ at: "2025-02-07T00:00:00.000Z", to: "Ready" }],
      farmerName: "FN2",
      farmerTag: "FT2"
    }
  ];
  const stuck = buildStuckAccounts({ accounts, now, workStatuses, thresholdDays: 5 });
  assert.equal(stuck.length, 1);
  assert.equal(stuck[0].profileName, "S1");
  assert.equal(stuck[0].daysStuck, 9);
});

test("warehouse stock counts Ready only", () => {
  const accounts = [{ status: "Ready" }, { status: "Ready" }, { status: "Warm-up" }];
  assert.equal(buildWarehouseStock({ accounts }), 2);
});

test("limit analytics computes averages and bundles", () => {
  const rangeStart = new Date("2025-01-01T00:00:00.000Z");
  const rangeEnd = new Date("2025-01-31T23:59:59.999Z");
  const accounts = [
    {
      profileName: "L1",
      createdAt: "2024-12-20T00:00:00.000Z",
      limitReachedAt: "2025-01-10T00:00:00.000Z",
      currentLimit: 1000,
      warmupScheme: "A",
      additionalFarming: true,
      proxyProvider: "PX1",
      history: [
        { at: "2024-12-25T00:00:00.000Z", to: "Verified" },
        { at: "2025-01-25T00:00:00.000Z", to: "Ban" }
      ]
    },
    {
      profileName: "L2",
      createdAt: "2024-12-22T00:00:00.000Z",
      limitReachedAt: "2025-01-15T00:00:00.000Z",
      currentLimit: 300,
      warmupScheme: "A",
      additionalFarming: false,
      proxyProvider: "PX1",
      history: [{ at: "2025-01-18T00:00:00.000Z", to: "Verified" }]
    },
    {
      profileName: "L3",
      createdAt: "2024-12-28T00:00:00.000Z",
      limitReachedAt: "2025-01-20T00:00:00.000Z",
      currentLimit: 1200,
      warmupScheme: "B",
      additionalFarming: true,
      proxy: "PX2",
      history: [{ at: "2025-01-22T00:00:00.000Z", to: "Verified" }]
    },
    {
      profileName: "L4",
      createdAt: "2024-12-26T00:00:00.000Z",
      currentLimit: 50,
      warmupScheme: "C",
      additionalFarming: false,
      proxyProvider: "PX3",
      history: [{ at: "2025-01-12T00:00:00.000Z", event: "limit 1000" }]
    }
  ];
  const limits = buildLimitAnalytics({ accounts, rangeStart, rangeEnd });
  assert.ok(limits.limitByWarmupScheme.A > 0);
  assert.ok(limits.limitByWarmupScheme.B > 0);
  assert.equal(limits.timeToLimit.gt250.count, 4);
  assert.equal(limits.timeToLimit.gt1000.count, 3);
  assert.equal(limits.additionalFarmingImpact.true.count, 2);
  assert.equal(limits.additionalFarmingImpact.false.count, 1);
  assert.ok(Array.isArray(limits.idealBundles));
  assert.ok(limits.idealBundles.length >= 1);
});

test("limit step durations compute averages by milestone", () => {
  const rangeStart = new Date("2025-01-01T00:00:00.000Z");
  const rangeEnd = new Date("2025-01-31T23:59:59.999Z");
  const accounts = [
    {
      profileName: "S1",
      createdAt: "2024-12-20T00:00:00.000Z",
      currentLimit: 5000,
      history: [
        { at: "2025-01-02T00:00:00.000Z", event: "limit 50" },
        { at: "2025-01-05T00:00:00.000Z", event: "limit 250" },
        { at: "2025-01-09T00:00:00.000Z", event: "limit 1000" },
        { at: "2025-01-15T00:00:00.000Z", event: "limit 5000" }
      ]
    }
  ];
  const limits = buildLimitAnalytics({ accounts, rangeStart, rangeEnd });
  assert.equal(limits.stepDurations["50to250"].count, 1);
  assert.equal(limits.stepDurations["250to1000"].count, 1);
  assert.equal(limits.stepDurations["1000to5000"].count, 1);
});

test("funnel analytics computes conversion counts and percentages", () => {
  const rangeStart = new Date("2025-01-01T00:00:00.000Z");
  const rangeEnd = new Date("2025-01-31T23:59:59.999Z");
  const accounts = [
    {
      profileName: "F1",
      createdAt: "2025-01-05T00:00:00.000Z",
      history: [{ at: "2025-01-06T00:00:00.000Z", to: "In Appeal" }]
    },
    {
      profileName: "F2",
      createdAt: "2025-01-07T00:00:00.000Z",
      history: [
        { at: "2025-01-08T00:00:00.000Z", to: "Verified" },
        { at: "2025-01-10T00:00:00.000Z", to: "Transferred" }
      ]
    },
    {
      profileName: "F3",
      createdAt: "2025-01-09T00:00:00.000Z",
      history: [{ at: "2025-01-11T00:00:00.000Z", to: "Full Verified" }]
    },
    {
      profileName: "F4",
      createdAt: "2024-12-20T00:00:00.000Z",
      history: [{ at: "2025-01-02T00:00:00.000Z", to: "Verified" }]
    }
  ];
  const funnel = buildFunnelAnalytics({ accounts, rangeStart, rangeEnd });
  assert.equal(funnel.created.count, 3);
  assert.equal(funnel.reachedVerification.count, 3);
  assert.equal(funnel.passedVerification.count, 2);
  assert.equal(funnel.transferred.count, 1);
  assert.equal(funnel.created.percent, 100);
  assert.equal(funnel.reachedVerification.percent, 100);
  assert.equal(funnel.passedVerification.percent, 66.7);
  assert.equal(funnel.transferred.percent, 33.3);
});
