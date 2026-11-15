const normalizeHistory = (value) => (Array.isArray(value) ? value : []);
const normalizeStatus = (value) => value?.toString().trim().toLowerCase() || "";
const normalizeSourceTab = (value) => value?.toString().trim().toLowerCase() || "";
const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const fromNative = new Date(value);
  if (!Number.isNaN(fromNative.getTime())) return fromNative;
  const raw = value?.toString?.().trim?.();
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  const year = Number(m[3]);
  const hours = Number(m[4] || 0);
  const minutes = Number(m[5] || 0);
  const seconds = Number(m[6] || 0);
  const parsed = new Date(year, month, day, hours, minutes, seconds);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const isTransferredSourceTab = (value) => {
  const tab = normalizeSourceTab(value);
  return tab === "transferred" || tab === "media_buying" || tab === "mediabuying" || tab === "buyer";
};
const isArchivedSourceTab = (value) => normalizeSourceTab(value) === "archived";
const maxHistoryTimestamp = (history) => {
  let latest = 0;
  for (const entry of normalizeHistory(history)) {
    const at = parseDateValue(entry?.at)?.getTime?.() || NaN;
    if (Number.isFinite(at) && at > latest) latest = at;
  }
  return latest;
};
const activityTimestamp = (account) => {
  const createdAt = parseDateValue(account?.createdAt)?.getTime?.() || 0;
  const lastActivity = parseDateValue(account?.lastActivity)?.getTime?.() || 0;
  const limitReachedAt = parseDateValue(account?.limitReachedAt)?.getTime?.() || 0;
  const historyAt = maxHistoryTimestamp(account?.history);
  return Math.max(createdAt || 0, lastActivity || 0, limitReachedAt || 0, historyAt || 0);
};
const dedupeAccountsByProfile = (accounts) => {
  const byProfile = new Map();
  for (const account of accounts || []) {
    const profileName = account?.profileName?.toString().trim();
    if (!profileName) continue;
    const existing = byProfile.get(profileName);
    if (!existing) {
      byProfile.set(profileName, account);
      continue;
    }
    const nextTs = activityTimestamp(account);
    const prevTs = activityTimestamp(existing);
    if (nextTs >= prevTs) {
      byProfile.set(profileName, account);
    }
  }
  return Array.from(byProfile.values());
};
const resolveFarmerGroupKey = (account) => {
  const farmerName = account?.farmerName?.toString().trim();
  if (farmerName) return farmerName;
  const farmerTag = account?.farmerTag?.toString().trim();
  if (farmerTag) return farmerTag;
  return "Без фермера";
};
const normalizeFarmerGroupKey = (rawKey, account) => {
  const key = rawKey?.toString?.().trim?.() || "Без фермера";
  const name = account?.farmerName?.toString?.().trim?.().toLowerCase?.() || "";
  const tag = account?.farmerTag?.toString?.().trim?.().toLowerCase?.() || "";
  const keyLower = key.toLowerCase();
  if (name.includes("станислав") || keyLower.includes("станислав") || keyLower.startsWith("st") || tag.startsWith("st")) {
    return "Станислав";
  }
  if (name.includes("дмитрий") || keyLower.includes("дмитрий") || keyLower.startsWith("dm") || keyLower.startsWith("df") || tag.startsWith("dm") || tag.startsWith("df")) {
    return "Дмитрий";
  }
  return key;
};
const isCreatedInRange = (account, rangeStart, rangeEnd) => {
  const createdAt = parseDateValue(account?.createdAt);
  if (!createdAt) return false;
  return createdAt >= rangeStart && createdAt <= rangeEnd;
};
const percent = (num, den) => (den ? Math.round((num / den) * 1000) / 10 : 0);
const DAY_MS = 86400000;
const sanitizeKey = (value, fallback = "unknown") => {
  const raw = value?.toString?.().trim?.();
  return raw ? raw : fallback;
};
const parseLimitValue = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  if (normalized === "безлимит" || normalized === "unlimited" || normalized === "unlimit") {
    return Number.POSITIVE_INFINITY;
  }
  const numberMatch = text.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!numberMatch) return null;
  const parsed = Number(numberMatch[0]);
  return Number.isFinite(parsed) ? parsed : null;
};
const toLimitCategory = (value) => {
  if (value === Number.POSITIVE_INFINITY) return "unlimited";
  if (typeof value !== "number" || !Number.isFinite(value)) return "no_limit";
  if (value <= 10) return "10";
  if (value <= 100) return "100";
  if (value <= 1000) return "1000";
  return "unlimited";
};
const parseArchiveSignal = (account) => {
  let archivedAt = parseDateValue(account?.lastActivity) || parseDateValue(account?.updatedAt) || null;
  let reason = sanitizeKey(account?.status, "");
  let byHistory = false;
  if (isArchivedSourceTab(account?.sourceTab)) {
    return { archived: true, archivedAt, reason, byHistory };
  }
  const history = normalizeHistory(account?.history);
  for (const entry of history) {
    const toValue = entry?.to ?? entry?.status ?? entry?.sourceTab ?? entry?.tab ?? entry?.value;
    const status = normalizeStatus(toValue);
    const isArchiveEvent = isArchivedSourceTab(toValue)
      || status === "ban"
      || status === "архив"
      || status === "archived";
    if (!isArchiveEvent) continue;
    const at = parseDateValue(entry?.at);
    if (at && (!archivedAt || at > archivedAt)) archivedAt = at;
    const rowReason = [entry?.note, entry?.comment, entry?.label, entry?.event, entry?.status, entry?.to]
      .filter(Boolean)
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(" | ");
    if (rowReason) reason = rowReason;
    byHistory = true;
  }
  return { archived: Boolean(archivedAt || byHistory), archivedAt, reason, byHistory };
};
const detectTransferTouch = (account) => {
  if (isTransferredSourceTab(account?.sourceTab)) return true;
  for (const entry of normalizeHistory(account?.history)) {
    const toValue = entry?.to ?? entry?.sourceTab ?? entry?.tab ?? entry?.value;
    if (isTransferredSourceTab(toValue)) return true;
  }
  return false;
};
const detectReworkTouch = (account) => {
  const hasRework = (value) => {
    const text = value?.toString?.().toLowerCase?.() || "";
    if (!text) return false;
    return text.includes("доработ") || text.includes("rework") || text.includes("return");
  };
  if (hasRework(account?.status)) return true;
  for (const entry of normalizeHistory(account?.history)) {
    const payload = [entry?.to, entry?.status, entry?.note, entry?.comment, entry?.label, entry?.event]
      .filter(Boolean)
      .join(" ");
    if (hasRework(payload)) return true;
  }
  return false;
};
const normalizeReason = (value) => {
  const raw = value?.toString?.().trim?.() || "";
  if (!raw) return "unspecified";
  const lowered = raw.toLowerCase();
  if (lowered.includes("policy")) return "policy";
  if (lowered.includes("suspend")) return "suspended";
  if (lowered.includes("mail")) return "mail_restricted";
  if (lowered.includes("verif")) return "verification";
  if (lowered.includes("refund")) return "refund";
  if (lowered.includes("appeal")) return "appeal";
  if (lowered.includes("лимит") || lowered.includes("limit")) return "limit";
  return raw.length > 80 ? `${raw.slice(0, 80)}...` : raw;
};
const weekKey = (date) => {
  if (!date) return "unknown";
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return "unknown";
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dt - yearStart) / DAY_MS) + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};
const isVerificationReachedStatus = (statusRaw) => {
  const status = normalizeStatus(statusRaw);
  return status === "verification"
    || status === "верификация"
    || status === "на верификации"
    || status === "in verification"
    || status === "in appeal"
    || status.includes("appeal");
};
const isVerificationPassedStatus = (statusRaw) => {
  const status = normalizeStatus(statusRaw);
  return status === "ready"
    || status === "готов"
    || status === "готово"
    || status === "verified"
    || status === "full verified"
    || status.includes("verified");
};
const isVerificationLikeStatus = (statusRaw) => {
  const status = normalizeStatus(statusRaw);
  return status.includes("verif") || status.includes("вериф");
};
const reachedVerificationBeforeArchive = (account) => {
  if (!isArchivedSourceTab(account?.sourceTab)) return false;
  const history = normalizeHistory(account?.history)
    .filter((entry) => parseDateValue(entry?.at))
    .sort((a, b) => parseDateValue(a?.at) - parseDateValue(b?.at));
  let sawVerification = false;
  for (const entry of history) {
    const toStatus = entry?.to || entry?.status;
    const note = [entry?.note, entry?.label, entry?.comment, entry?.event].filter(Boolean).join(" ");
    if (isVerificationLikeStatus(toStatus) || isVerificationLikeStatus(note)) {
      sawVerification = true;
    }
    const isBan =
      normalizeStatus(toStatus) === "ban"
      || normalizeStatus(toStatus) === "архив"
      || normalizeStatus(toStatus) === "archived";
    if (isBan && sawVerification) {
      return true;
    }
  }
  return false;
};

const hasEverBeenInMediaBuying = (account) => {
  // 1. Current state
  if (isTransferredSourceTab(account?.sourceTab)) return true;

  // 2. History check
  for (const entry of normalizeHistory(account?.history)) {
    // Check 'to' or 'status' or 'sourceTab' in history
    // Standard format: { type: 'tab_changed', from: '...', to: 'transferred' }
    // Or: { action: '...', newValue: 'transferred' } (if raw audit log passed, but here we have account.history)

    // We check various fields because history format can vary
    const toValue = entry?.to ?? entry?.newValue ?? entry?.status ?? entry?.sourceTab ?? entry?.tab ?? entry?.value;
    const fromValue = entry?.from ?? entry?.oldValue;
    const action = entry?.action ?? entry?.type;

    if (toValue && isTransferredSourceTab(toValue)) return true;

    // Also check if action implies transfer
    if (action && (
      action.includes("transfer") ||
      action.includes("media") ||
      action.includes("buying")
    )) return true;
  }

  return false;
};

const buildKpiAggregation = ({
  accounts,
  rangeStart,
  rangeEnd,
  allowedStatuses
}) => {
  const classifyCohortLocation = (account) => {
    const tab = normalizeSourceTab(account?.sourceTab);

    // 1. If currently in media buying -> Transferred (Success)
    if (isTransferredSourceTab(tab)) return "transferred";

    // 2. If in Archive, check history
    if (isArchivedSourceTab(tab)) {
      if (hasEverBeenInMediaBuying(account)) {
        return "transferred"; // Was in buying, so it's a success (even if banned later)
      }
      return "archived"; // Never in buying -> Ban (Farmer's fault)
    }

    // 3. Otherwise -> In Process
    return "inProcess";
  };
  const profileMap = new Map();
  for (const account of accounts || []) {
    const profileName = account?.profileName?.toString().trim();
    if (!profileName) continue;
    if (!profileMap.has(profileName)) {
      profileMap.set(profileName, {
        profileName,
        accounts: [],
        createdAt: null,
        representative: account
      });
    }
    const bucket = profileMap.get(profileName);
    bucket.accounts.push(account);
    const createdAt = parseDateValue(account?.createdAt);
    if (createdAt && (!bucket.createdAt || createdAt < bucket.createdAt)) {
      bucket.createdAt = createdAt;
    }
    if (activityTimestamp(account) >= activityTimestamp(bucket.representative)) {
      bucket.representative = account;
    }
  }
  const profiles = Array.from(profileMap.values());
  const periodProfiles = profiles.filter((item) => item.createdAt && item.createdAt >= rangeStart && item.createdAt <= rangeEnd);
  const statusSet = new Map(allowedStatuses.map((status) => [status, 0]));
  const createdSet = new Set(periodProfiles.map((item) => item.profileName));
  const transferredSet = new Set();
  const banSet = new Set();
  const inProcessSet = new Set();
  const byFarmer = {};
  const farmerRawSet = new Set();
  const farmerNormalizedSet = new Set();

  for (const item of periodProfiles) {
    const profileName = item.profileName;
    const account = item.representative;
    const currentStatus = account?.status?.toString().trim();
    if (currentStatus && statusSet.has(currentStatus)) {
      statusSet.set(currentStatus, statusSet.get(currentStatus) + 1);
    }
    const rawFarmerKey = resolveFarmerGroupKey(account);
    const farmerKey = normalizeFarmerGroupKey(rawFarmerKey, account);
    farmerRawSet.add(rawFarmerKey);
    farmerNormalizedSet.add(farmerKey);
    if (!byFarmer[farmerKey]) {
      byFarmer[farmerKey] = {
        created: new Set(),
        inProcess: new Set(),
        transferred: new Set(),
        bans: new Set(),
        statusTransitions: new Map(allowedStatuses.map((status) => [status, 0]))
      };
    }
    const bucket = byFarmer[farmerKey];
    bucket.created.add(profileName);
    const status = account?.status?.toString().trim();
    if (status && bucket.statusTransitions.has(status)) {
      bucket.statusTransitions.set(status, bucket.statusTransitions.get(status) + 1);
    }
    const location = classifyCohortLocation(account);
    if (location === "transferred") {
      transferredSet.add(profileName);
      bucket.transferred.add(profileName);
    } else if (location === "archived") {
      banSet.add(profileName);
      bucket.bans.add(profileName);
    } else {
      inProcessSet.add(profileName);
      bucket.inProcess.add(profileName);
    }
  }

  const statusTransitions = Object.fromEntries(Array.from(statusSet.entries()));
  const createdByFarmer = {};
  const inProcessByFarmer = {};
  const transferredByFarmer = {};
  const bansByFarmer = {};
  const efficiencyByFarmer = {};
  const statusTransitionsByFarmer = {};
  for (const [farmerKey, bucket] of Object.entries(byFarmer)) {
    const createdCount = bucket.created.size;
    const inProcessCount = bucket.inProcess.size;
    const transferredCount = bucket.transferred.size;
    const bansCount = bucket.bans.size;
    createdByFarmer[farmerKey] = createdCount;
    inProcessByFarmer[farmerKey] = inProcessCount;
    transferredByFarmer[farmerKey] = transferredCount;
    bansByFarmer[farmerKey] = bansCount;
    efficiencyByFarmer[farmerKey] = percent(transferredCount, createdCount);
    statusTransitionsByFarmer[farmerKey] = Object.fromEntries(Array.from(bucket.statusTransitions.entries()));
  }
  const createdTotal = createdSet.size;
  const inProcessTotal = inProcessSet.size;
  const transferredTotal = transferredSet.size;
  const bansTotal = banSet.size;
  const efficiencyTotal = percent(transferredTotal, createdTotal);
  const byFarmerKpi = {};
  for (const farmerKey of Object.keys(byFarmer)) {
    byFarmerKpi[farmerKey] = {
      created: createdByFarmer[farmerKey] || 0,
      inProcess: inProcessByFarmer[farmerKey] || 0,
      transferred: transferredByFarmer[farmerKey] || 0,
      bans: bansByFarmer[farmerKey] || 0,
      efficiencyPercent: efficiencyByFarmer[farmerKey] || 0
    };
  }

  return {
    created: { total: createdTotal, byFarmer: createdByFarmer },
    inProcess: { total: inProcessTotal, byFarmer: inProcessByFarmer },
    transferred: { total: transferredTotal, byFarmer: transferredByFarmer, efficiencyPercent: efficiencyTotal },
    bans: { total: bansTotal, byFarmer: bansByFarmer },
    efficiency: { totalPercent: efficiencyTotal, byFarmer: efficiencyByFarmer },
    byFarmer: byFarmerKpi,
    statusTransitions,
    statusTransitionsByFarmer
  };
};

const buildTimingAnalytics = ({
  accounts,
  rangeStart,
  rangeEnd,
  transferredStatuses,
  archivedStatuses
}) => {
  const normalizeSet = (setLike) => {
    if (!(setLike instanceof Set)) return new Set();
    return new Set(Array.from(setLike).map((v) => normalizeStatus(v)));
  };
  const transferred = normalizeSet(transferredStatuses);
  const archived = normalizeSet(archivedStatuses);
  const findFirstStatusAt = (history, set) => {
    if (!set || set.size === 0) return null;
    let first = null;
    for (const entry of normalizeHistory(history)) {
      const at = parseDateValue(entry?.at);
      if (!at) continue;
      const toValue = entry?.to ?? entry?.status ?? entry?.newValue ?? entry?.value;
      if (!toValue) continue;
      if (!set.has(normalizeStatus(toValue))) continue;
      if (!first || at < first) first = at;
    }
    return first;
  };

  const uniqueAccounts = dedupeAccountsByProfile(accounts);
  const global = {
    prepSum: 0,
    prepCount: 0,
    ltvSum: 0,
    ltvCount: 0,
    lifecycleSum: 0,
    lifecycleCount: 0
  };
  const byFarmer = {};

  for (const account of uniqueAccounts) {
    const createdAt = parseDateValue(account?.createdAt);
    if (!createdAt) continue;
    const farmerKey = normalizeFarmerGroupKey(resolveFarmerGroupKey(account), account);
    if (!byFarmer[farmerKey]) {
      byFarmer[farmerKey] = {
        prepSum: 0,
        prepCount: 0,
        ltvSum: 0,
        ltvCount: 0,
        lifecycleSum: 0,
        lifecycleCount: 0
      };
    }
    const bucket = byFarmer[farmerKey];
    const transferAt = findFirstStatusAt(account?.history, transferred);
    const archiveAt = findFirstStatusAt(account?.history, archived);

    if (transferAt && transferAt >= rangeStart && transferAt <= rangeEnd) {
      const prepDays = Math.round(((transferAt - createdAt) / DAY_MS) * 10) / 10;
      if (prepDays >= 0) {
        global.prepSum += prepDays;
        global.prepCount += 1;
        bucket.prepSum += prepDays;
        bucket.prepCount += 1;
      }
    }
    if (transferAt && archiveAt && transferAt >= rangeStart && transferAt <= rangeEnd && archiveAt >= rangeStart && archiveAt <= rangeEnd) {
      const ltvDays = Math.round(((archiveAt - transferAt) / DAY_MS) * 10) / 10;
      if (ltvDays >= 0) {
        global.ltvSum += ltvDays;
        global.ltvCount += 1;
        bucket.ltvSum += ltvDays;
        bucket.ltvCount += 1;
      }
    }
    if (archiveAt && archiveAt >= rangeStart && archiveAt <= rangeEnd) {
      const lifecycleDays = Math.round(((archiveAt - createdAt) / DAY_MS) * 10) / 10;
      if (lifecycleDays >= 0) {
        global.lifecycleSum += lifecycleDays;
        global.lifecycleCount += 1;
        bucket.lifecycleSum += lifecycleDays;
        bucket.lifecycleCount += 1;
      }
    }
  }

  const avg = (sum, count) => (count ? Math.round((sum / count) * 10) / 10 : 0);
  const globalResult = {
    prepDaysAvg: avg(global.prepSum, global.prepCount),
    prepCount: global.prepCount,
    ltvDaysAvg: avg(global.ltvSum, global.ltvCount),
    ltvCount: global.ltvCount,
    lifecycleDaysAvg: avg(global.lifecycleSum, global.lifecycleCount),
    lifecycleCount: global.lifecycleCount
  };
  const byFarmerResult = {};
  for (const [farmerKey, row] of Object.entries(byFarmer)) {
    byFarmerResult[farmerKey] = {
      prepDaysAvg: avg(row.prepSum, row.prepCount),
      prepCount: row.prepCount,
      ltvDaysAvg: avg(row.ltvSum, row.ltvCount),
      ltvCount: row.ltvCount,
      lifecycleDaysAvg: avg(row.lifecycleSum, row.lifecycleCount),
      lifecycleCount: row.lifecycleCount
    };
  }

  return { global: globalResult, byFarmer: byFarmerResult };
};

const extractBin = (value) => {
  if (!value) return null;
  const digits = value.toString().replace(/\D/g, "");
  if (digits.length < 6) return null;
  return digits.slice(0, 6);
};
const resolveCardValueFromAccount = (account) => {
  if (!account || typeof account !== "object") return null;
  const metadata = account?.metadata && typeof account.metadata === "object" ? account.metadata : {};
  const fields = account?.fields && typeof account.fields === "object" ? account.fields : {};
  return account?.cardNumber
    ?? account?.card
    ?? account?.["Карта"]
    ?? account?.card_number
    ?? metadata?.["Карта"]
    ?? metadata?.card
    ?? metadata?.cardNumber
    ?? fields?.["Карта"]
    ?? fields?.card
    ?? fields?.cardNumber
    ?? null;
};

const buildBanCorrelation = ({ accounts, rangeStart, rangeEnd, archivedStatuses }) => {
  const archived = archivedStatuses instanceof Set
    ? new Set(Array.from(archivedStatuses).map((v) => normalizeStatus(v)))
    : new Set(["ban"]);
  const findFirstBannedAt = (history) => {
    let first = null;
    for (const entry of normalizeHistory(history)) {
      const at = parseDateValue(entry?.at);
      if (!at) continue;
      const toValue = entry?.to ?? entry?.status ?? entry?.newValue ?? entry?.value;
      if (!toValue) continue;
      if (!archived.has(normalizeStatus(toValue))) continue;
      if (!first || at < first) first = at;
    }
    return first;
  };

  const proxyStats = new Map();
  const binStats = new Map();

  for (const account of accounts || []) {
    const bannedAt = findFirstBannedAt(account?.history);
    if (!bannedAt) continue;
    if (bannedAt < rangeStart || bannedAt > rangeEnd) continue;

    const provider = (account?.proxyProvider || account?.proxy)?.toString?.().trim?.() || "";
    if (provider) {
      proxyStats.set(provider, (proxyStats.get(provider) || 0) + 1);
    }

    const bin = extractBin(resolveCardValueFromAccount(account) || account?.cardBin);
    if (bin) {
      binStats.set(bin, (binStats.get(bin) || 0) + 1);
    }
  }

  const bins = Object.fromEntries(Array.from(binStats.entries()));
  const proxies = Object.fromEntries(Array.from(proxyStats.entries()));

  const toxicProxies = Array.from(proxyStats.entries())
    .map(([proxy, banned]) => ({ proxy, banned }))
    .sort((a, b) => b.banned - a.banned || a.proxy.localeCompare(b.proxy))
    .slice(0, 3);

  const topBins = Array.from(binStats.entries())
    .map(([bin, banned]) => ({ bin, banned }))
    .sort((a, b) => b.banned - a.banned || a.bin.localeCompare(b.bin))
    .slice(0, 3);

  return { bins, proxies, toxicProxies, topBins };
};

const buildQualityAnalytics = ({ accounts, rangeStart, rangeEnd, now }) => {
  const source = dedupeAccountsByProfile(accounts);
  const periodAccounts = source.filter((account) => isCreatedInRange(account, rangeStart, rangeEnd));
  const referenceNow = parseDateValue(now) || new Date();
  const byFarmerMap = new Map();
  const reasonMap = new Map();
  const stageMap = new Map();
  const timelineMap = new Map();
  const factorMaps = {
    proxy: new Map(),
    bin: new Map(),
    warmupScheme: new Map(),
    geo: new Map(),
    additionalFarming: new Map()
  };
  const totals = {
    accounts: 0,
    alive: 0,
    banned: 0,
    lifetimeAliveSum: 0,
    lifetimeBannedSum: 0,
    lifetimeAllSum: 0
  };
  const lifetimeBuckets = new Map([
    ["0-3", { bucket: "0-3", total: 0, banned: 0, alive: 0 }],
    ["4-7", { bucket: "4-7", total: 0, banned: 0, alive: 0 }],
    ["8-14", { bucket: "8-14", total: 0, banned: 0, alive: 0 }],
    ["15-30", { bucket: "15-30", total: 0, banned: 0, alive: 0 }],
    ["31+", { bucket: "31+", total: 0, banned: 0, alive: 0 }]
  ]);
  const resolveLifeBucket = (days) => {
    if (days <= 3) return "0-3";
    if (days <= 7) return "4-7";
    if (days <= 14) return "8-14";
    if (days <= 30) return "15-30";
    return "31+";
  };
  const upsertFactor = (map, key, isBanned, lifetimeDays) => {
    const normalizedKey = sanitizeKey(key, "unknown");
    if (!map.has(normalizedKey)) {
      map.set(normalizedKey, { factor: normalizedKey, total: 0, banned: 0, alive: 0, lifetimeDaysSum: 0 });
    }
    const row = map.get(normalizedKey);
    row.total += 1;
    row.lifetimeDaysSum += lifetimeDays;
    if (isBanned) row.banned += 1;
    else row.alive += 1;
  };

  for (const account of periodAccounts) {
    const createdAt = parseDateValue(account?.createdAt);
    if (!createdAt) continue;
    totals.accounts += 1;
    const farmerKey = normalizeFarmerGroupKey(resolveFarmerGroupKey(account), account);
    if (!byFarmerMap.has(farmerKey)) {
      byFarmerMap.set(farmerKey, {
        farmer: farmerKey,
        total: 0,
        alive: 0,
        banned: 0,
        lifetimeDaysSum: 0,
        lifetimeBannedSum: 0,
        lifetimeAliveSum: 0
      });
    }
    const archiveSignal = parseArchiveSignal(account);
    const endAt = archiveSignal.archivedAt || referenceNow;
    const lifetimeDays = Math.max(0, Math.round(((endAt - createdAt) / DAY_MS) * 10) / 10);
    const isBanned = archiveSignal.archived;
    const byFarmer = byFarmerMap.get(farmerKey);
    byFarmer.total += 1;
    byFarmer.lifetimeDaysSum += lifetimeDays;
    totals.lifetimeAllSum += lifetimeDays;
    if (isBanned) {
      totals.banned += 1;
      totals.lifetimeBannedSum += lifetimeDays;
      byFarmer.banned += 1;
      byFarmer.lifetimeBannedSum += lifetimeDays;
      const reason = normalizeReason(archiveSignal.reason);
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
      const stage = detectReworkTouch(account)
        ? "after_rework"
        : detectTransferTouch(account)
          ? "after_transfer"
          : "before_transfer";
      stageMap.set(stage, (stageMap.get(stage) || 0) + 1);
      const week = weekKey(archiveSignal.archivedAt || endAt);
      timelineMap.set(week, (timelineMap.get(week) || 0) + 1);
    } else {
      totals.alive += 1;
      totals.lifetimeAliveSum += lifetimeDays;
      byFarmer.alive += 1;
      byFarmer.lifetimeAliveSum += lifetimeDays;
    }
    const bucket = resolveLifeBucket(lifetimeDays);
    const bucketRow = lifetimeBuckets.get(bucket);
    bucketRow.total += 1;
    if (isBanned) bucketRow.banned += 1;
    else bucketRow.alive += 1;

    const binValue = extractBin(resolveCardValueFromAccount(account) || account?.cardBin) || "unknown";
    const proxyValue = account?.proxy || account?.proxyProvider || "unknown";
    const scheme = account?.warmupScheme || "unknown";
    const geo = account?.geo || "unknown";
    const additional = account?.additionalFarming === true ? "true" : account?.additionalFarming === false ? "false" : "unknown";
    upsertFactor(factorMaps.proxy, proxyValue, isBanned, lifetimeDays);
    upsertFactor(factorMaps.bin, binValue, isBanned, lifetimeDays);
    upsertFactor(factorMaps.warmupScheme, scheme, isBanned, lifetimeDays);
    upsertFactor(factorMaps.geo, geo, isBanned, lifetimeDays);
    upsertFactor(factorMaps.additionalFarming, additional, isBanned, lifetimeDays);
  }

  const factors = Object.fromEntries(
    Object.entries(factorMaps).map(([key, map]) => [
      key,
      Array.from(map.values())
        .map((row) => ({
          factor: row.factor,
          total: row.total,
          alive: row.alive,
          banned: row.banned,
          avgLifetimeDays: row.total ? Math.round((row.lifetimeDaysSum / row.total) * 10) / 10 : 0,
          successRate: percent(row.alive, row.total),
          banRate: percent(row.banned, row.total)
        }))
        .sort((a, b) => b.successRate - a.successRate || b.avgLifetimeDays - a.avgLifetimeDays || b.total - a.total)
    ])
  );
  const combinedFactorRows = [
    ...factors.proxy.slice(0, 20).map((item) => ({ group: `proxy:${item.factor}`, ...item })),
    ...factors.bin.slice(0, 20).map((item) => ({ group: `bin:${item.factor}`, ...item })),
    ...factors.warmupScheme.slice(0, 20).map((item) => ({ group: `scheme:${item.factor}`, ...item }))
  ].filter((item) => item.total >= 2);
  const bestGroups = [...combinedFactorRows]
    .sort((a, b) => b.successRate - a.successRate || b.avgLifetimeDays - a.avgLifetimeDays)
    .slice(0, 5);
  const worstGroups = [...combinedFactorRows]
    .sort((a, b) => b.banRate - a.banRate || a.avgLifetimeDays - b.avgLifetimeDays)
    .slice(0, 5);

  return {
    survival: {
      rule: "lifetime_days = createdAt -> archivedAt; если не архивирован, до текущего момента",
      totalAccounts: totals.accounts,
      aliveAccounts: totals.alive,
      bannedAccounts: totals.banned,
      avgLifetimeDays: totals.accounts ? Math.round((totals.lifetimeAllSum / totals.accounts) * 10) / 10 : 0,
      avgLifetimeDaysAlive: totals.alive ? Math.round((totals.lifetimeAliveSum / totals.alive) * 10) / 10 : 0,
      avgLifetimeDaysBanned: totals.banned ? Math.round((totals.lifetimeBannedSum / totals.banned) * 10) / 10 : 0,
      byFarmer: Array.from(byFarmerMap.values())
        .map((row) => ({
          farmer: row.farmer,
          total: row.total,
          alive: row.alive,
          banned: row.banned,
          successRate: percent(row.alive, row.total),
          avgLifetimeDays: row.total ? Math.round((row.lifetimeDaysSum / row.total) * 10) / 10 : 0,
          avgLifetimeDaysAlive: row.alive ? Math.round((row.lifetimeAliveSum / row.alive) * 10) / 10 : 0,
          avgLifetimeDaysBanned: row.banned ? Math.round((row.lifetimeBannedSum / row.banned) * 10) / 10 : 0
        }))
        .sort((a, b) => b.successRate - a.successRate || b.total - a.total),
      distribution: Array.from(lifetimeBuckets.values())
    },
    bans: {
      total: totals.banned,
      reasons: Object.fromEntries(Array.from(reasonMap.entries()).sort((a, b) => b[1] - a[1])),
      byStage: Object.fromEntries(Array.from(stageMap.entries()).sort((a, b) => b[1] - a[1])),
      timelineByWeek: Array.from(timelineMap.entries())
        .map(([week, banned]) => ({ week, banned }))
        .sort((a, b) => a.week.localeCompare(b.week))
    },
    factors,
    bestGroups,
    worstGroups
  };
};

const buildStuckAccounts = ({ accounts, now, workStatuses, thresholdDays }) => {
  const workSet = new Set(workStatuses);
  const list = [];
  const baseNow = now || new Date();
  const threshold = typeof thresholdDays === "number" ? thresholdDays : 5;

  for (const account of accounts) {
    if (!workSet.has(account?.status)) continue;
    const history = normalizeHistory(account?.history);
    let lastAt = account?.createdAt ? new Date(account.createdAt) : null;
    for (const entry of history) {
      const at = entry?.at ? new Date(entry.at) : null;
      if (!at || Number.isNaN(at.getTime())) continue;
      if (!lastAt || at > lastAt) lastAt = at;
    }
    if (!lastAt || Number.isNaN(lastAt.getTime())) continue;
    const daysStuck = Math.floor((baseNow - lastAt) / 86400000);
    if (daysStuck <= threshold) continue;
    list.push({
      profileName: account?.profileName,
      status: account?.status,
      daysStuck,
      farmerName: account?.farmerName || "",
      farmerTag: account?.farmerTag || ""
    });
  }

  return list.sort((a, b) => b.daysStuck - a.daysStuck);
};

const buildWarehouseStock = ({ accounts }) =>
  accounts.reduce((count, account) => (account?.status === "Ready" ? count + 1 : count), 0);

const parseLimitFromString = (s) => {
  if (!s) return null;
  const text = String(s).toLowerCase();
  if (!/limit|threshold|лимит|порог/.test(text)) return null;
  const m = text.match(/(\d{2,6})(?:\s*\$)?/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
};

const extractLimitEvents = (history) => {
  const events = [];
  const list = normalizeHistory(history);
  for (const entry of list) {
    const at = entry?.at ? new Date(entry.at) : null;
    if (!at || Number.isNaN(at.getTime())) continue;
    let limit = null;
    if (typeof entry?.limit === "number") limit = entry.limit;
    else if (typeof entry?.valueLimit === "number") limit = entry.valueLimit;
    else if (entry?.event && /limit/i.test(String(entry.event))) {
      limit = parseLimitFromString(entry?.label || entry?.to || entry?.event);
    } else if (entry?.to) {
      limit = parseLimitFromString(entry.to);
    }
    if (limit !== null && Number.isFinite(limit)) {
      events.push({ at, limit });
    }
  }
  // normalize: keep earliest occurrence for each unique limit value
  const firstByValue = new Map();
  for (const e of events) {
    if (!firstByValue.has(e.limit) || e.at < firstByValue.get(e.limit)) {
      firstByValue.set(e.limit, e.at);
    }
  }
  return Array.from(firstByValue.entries()).map(([limit, at]) => ({ at, limit }));
};

const lifeBucket = (createdAt, now) => {
  if (!createdAt) return "unknown";
  const days = Math.floor(((now || new Date()) - createdAt) / 86400000);
  if (days < 0) return "unknown";
  if (days < 60) return "0-60";
  if (days < 120) return "60-120";
  if (days < 360) return "120-360";
  return "120-360";
};

const buildLimitAnalytics = ({ accounts, rangeStart, rangeEnd, filters }) => {
  const isTransferredProfile = (profileAccounts) => {
    for (const account of profileAccounts) {
      if (isTransferredSourceTab(account?.sourceTab)) return true;
      for (const entry of normalizeHistory(account?.history)) {
        const toValue = entry?.to ?? entry?.sourceTab ?? entry?.tab ?? entry?.value;
        if (isTransferredSourceTab(toValue)) return true;
      }
    }
    return false;
  };
  const profileMap = new Map();
  for (const account of accounts || []) {
    const profileName = account?.profileName?.toString().trim();
    if (!profileName) continue;
    if (!profileMap.has(profileName)) {
      profileMap.set(profileName, {
        profileName,
        accounts: [],
        representative: account,
        createdAt: null
      });
    }
    const item = profileMap.get(profileName);
    item.accounts.push(account);
    const createdAt = parseDateValue(account?.createdAt);
    if (createdAt && (!item.createdAt || createdAt < item.createdAt)) {
      item.createdAt = createdAt;
    }
    if (activityTimestamp(account) >= activityTimestamp(item.representative)) {
      item.representative = account;
    }
  }
  const periodProfiles = Array.from(profileMap.values()).filter((item) =>
    item.createdAt && item.createdAt >= rangeStart && item.createdAt <= rangeEnd
  );
  const transferredProfiles = periodProfiles.filter((item) => isTransferredProfile(item.accounts));
  const bucketMap = new Map();
  const comboMaps = {
    proxyBin: new Map(),
    proxyCard: new Map(),
    farmerProxy: new Map()
  };
  const categoryTotals = { 10: 0, 100: 0, 1000: 0, unlimited: 0, no_limit: 0 };
  const highLimitCategorySet = new Set(["1000", "unlimited"]);
  const resolveLimitSnapshot = (account) => {
    const current = parseLimitValue(account?.dailyLimit ?? account?.currentLimit);
    if (current !== null) return current;
    const events = extractLimitEvents(account?.history);
    if (events.length === 0) return null;
    return events.sort((a, b) => b.at - a.at)[0]?.limit ?? null;
  };
  const makeComboRow = (comboName) => ({
    combo: comboName,
    accounts: 0,
    limitValueSum: 0,
    finiteLimitCount: 0,
    highLimitCount: 0,
    weakLimitCount: 0,
    noLimitCount: 0,
    categories: { 10: 0, 100: 0, 1000: 0, unlimited: 0, no_limit: 0 }
  });
  const pushCombo = (map, comboName, category, limitValue) => {
    if (!map.has(comboName)) map.set(comboName, makeComboRow(comboName));
    const row = map.get(comboName);
    row.accounts += 1;
    row.categories[category] += 1;
    if (category === "no_limit") {
      row.noLimitCount += 1;
      return;
    }
    if (Number.isFinite(limitValue)) {
      row.limitValueSum += limitValue;
      row.finiteLimitCount += 1;
    }
    if (highLimitCategorySet.has(category)) row.highLimitCount += 1;
    if (category === "10" || category === "100") row.weakLimitCount += 1;
  };

  for (const item of transferredProfiles) {
    const representative = item.representative;
    const geo = sanitizeKey(representative?.geo, "Н/У");
    const cardBin = extractBin(resolveCardValueFromAccount(representative) || representative?.cardBin) || "Н/У";
    const farmer = sanitizeKey(representative?.farmerTag || representative?.farmerName, "Н/У");
    const scheme = sanitizeKey(representative?.warmupScheme, "Н/У");
    const additionalFarming = representative?.additionalFarming === true
      ? "Да"
      : representative?.additionalFarming === false ? "Нет" : "Н/У";
    const proxy = sanitizeKey(representative?.proxy || representative?.proxyProvider, "Н/У");
    const cardKey = sanitizeKey(resolveCardValueFromAccount(representative), "Н/У");
    const limitValue = resolveLimitSnapshot(representative);
    const category = toLimitCategory(limitValue);
    categoryTotals[category] += 1;

    const legacyKey = [geo, cardBin, farmer, scheme, additionalFarming].join("|");
    if (!bucketMap.has(legacyKey)) {
      bucketMap.set(legacyKey, {
        bundle: `${geo} / ${cardBin} / ${farmer} / ${scheme} / ${additionalFarming}`,
        issuedTotal: 0,
        over100Count: 0,
        spend: null,
        limit10: 0,
        limit100: 0,
        limit1000: 0,
        limitUnlimited: 0
      });
    }
    const row = bucketMap.get(legacyKey);
    row.issuedTotal += 1;
    if (category === "10") row.limit10 += 1;
    if (category === "100") row.limit100 += 1;
    if (category === "1000") row.limit1000 += 1;
    if (category === "unlimited") row.limitUnlimited += 1;
    if (highLimitCategorySet.has(category)) row.over100Count += 1;

    pushCombo(comboMaps.proxyBin, `proxy:${proxy} | bin:${cardBin}`, category, limitValue);
    pushCombo(comboMaps.proxyCard, `proxy:${proxy} | card:${cardKey}`, category, limitValue);
    pushCombo(comboMaps.farmerProxy, `farmer:${farmer} | proxy:${proxy}`, category, limitValue);
  }

  const bundleEfficiencyTable = Array.from(bucketMap.values())
    .map((row) => ({
      ...row,
      winRate: row.issuedTotal ? Math.round((row.over100Count / row.issuedTotal) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.winRate - a.winRate || b.over100Count - a.over100Count || b.issuedTotal - a.issuedTotal);

  const normalizeComboRows = (map) =>
    Array.from(map.values())
      .map((row) => ({
        combo: row.combo,
        accounts: row.accounts,
        avgLimit: row.finiteLimitCount ? Math.round((row.limitValueSum / row.finiteLimitCount) * 10) / 10 : null,
        highLimitCount: row.highLimitCount,
        highLimitShare: percent(row.highLimitCount, row.accounts),
        weakLimitShare: percent(row.weakLimitCount, row.accounts),
        noLimitCount: row.noLimitCount,
        categories: row.categories
      }))
      .sort((a, b) => b.highLimitShare - a.highLimitShare || b.avgLimit - a.avgLimit || b.accounts - a.accounts);
  const combos = {
    proxyBin: normalizeComboRows(comboMaps.proxyBin),
    proxyCard: normalizeComboRows(comboMaps.proxyCard),
    farmerProxy: normalizeComboRows(comboMaps.farmerProxy)
  };
  const allComboRows = [...combos.proxyBin, ...combos.proxyCard, ...combos.farmerProxy].filter((row) => row.accounts >= 2);
  const topBest = [...allComboRows]
    .sort((a, b) => b.highLimitShare - a.highLimitShare || b.accounts - a.accounts)
    .slice(0, 10);
  const topWorst = [...allComboRows]
    .sort((a, b) => b.weakLimitShare - a.weakLimitShare || b.accounts - a.accounts)
    .slice(0, 10);
  const dynamicBase = {
    hasLimitHistory: false,
    missing: [
      "Нужны снимки/изменения лимита по аккаунту во времени (event log c previous/new limit и timestamp)"
    ],
    note: "Сейчас доступен только текущий срез лимита + частичные события из history"
  };

  const periodByLimitReachedAt = (accounts || []).filter((account) => {
    const at = parseDateValue(account?.limitReachedAt);
    return at && at >= rangeStart && at <= rangeEnd;
  });

  const schemeAgg = new Map();
  for (const account of periodByLimitReachedAt) {
    const scheme = sanitizeKey(account?.warmupScheme, "unknown");
    const limitValue = parseLimitValue(account?.currentLimit ?? account?.dailyLimit);
    if (!schemeAgg.has(scheme)) schemeAgg.set(scheme, { sum: 0, count: 0 });
    const row = schemeAgg.get(scheme);
    if (typeof limitValue === "number" && Number.isFinite(limitValue)) {
      row.sum += limitValue;
      row.count += 1;
    } else {
      row.count += 1;
    }
  }
  const limitByWarmupScheme = Object.fromEntries(
    Array.from(schemeAgg.entries()).map(([scheme, row]) => [
      scheme,
      row.count ? Math.round(((row.sum || 0) / row.count) * 10) / 10 : 0
    ])
  );

  const additionalFarmingImpact = {
    true: { count: 0 },
    false: { count: 0 }
  };
  for (const account of periodByLimitReachedAt) {
    if (account?.additionalFarming === true) additionalFarmingImpact.true.count += 1;
    if (account?.additionalFarming === false) additionalFarmingImpact.false.count += 1;
  }

  const resolveReachedAt = (account, threshold) => {
    const createdAt = parseDateValue(account?.createdAt);
    if (!createdAt) return null;
    const currentLimit = parseLimitValue(account?.currentLimit ?? account?.dailyLimit);
    const reachedAt = parseDateValue(account?.limitReachedAt);
    if (reachedAt && typeof currentLimit === "number" && Number.isFinite(currentLimit) && currentLimit >= threshold) {
      return reachedAt;
    }
    const events = extractLimitEvents(account?.history).sort((a, b) => a.at - b.at);
    const hit = events.find((e) => typeof e.limit === "number" && Number.isFinite(e.limit) && e.limit >= threshold);
    return hit?.at || null;
  };

  const timeToLimit = {
    gt250: { count: 0, avgDays: 0 },
    gt1000: { count: 0, avgDays: 0 }
  };
  const timeSums = { gt250: 0, gt1000: 0 };
  for (const account of accounts || []) {
    const createdAt = parseDateValue(account?.createdAt);
    if (!createdAt) continue;
    const at250 = resolveReachedAt(account, 250);
    if (at250 && at250 >= rangeStart && at250 <= rangeEnd) {
      timeToLimit.gt250.count += 1;
      timeSums.gt250 += Math.max(0, (at250 - createdAt) / DAY_MS);
    }
    const at1000 = resolveReachedAt(account, 1000);
    if (at1000 && at1000 >= rangeStart && at1000 <= rangeEnd) {
      timeToLimit.gt1000.count += 1;
      timeSums.gt1000 += Math.max(0, (at1000 - createdAt) / DAY_MS);
    }
  }
  timeToLimit.gt250.avgDays = timeToLimit.gt250.count ? Math.round((timeSums.gt250 / timeToLimit.gt250.count) * 10) / 10 : 0;
  timeToLimit.gt1000.avgDays = timeToLimit.gt1000.count ? Math.round((timeSums.gt1000 / timeToLimit.gt1000.count) * 10) / 10 : 0;

  const makeStep = () => ({ count: 0, avgDays: 0 });
  const stepDurations = {
    "50to250": makeStep(),
    "250to1000": makeStep(),
    "1000to5000": makeStep()
  };
  const stepSums = { "50to250": 0, "250to1000": 0, "1000to5000": 0 };
  const pushStep = (key, fromAt, toAt) => {
    if (!fromAt || !toAt) return;
    if (fromAt < rangeStart || fromAt > rangeEnd) return;
    if (toAt < rangeStart || toAt > rangeEnd) return;
    const days = Math.max(0, (toAt - fromAt) / DAY_MS);
    stepDurations[key].count += 1;
    stepSums[key] += days;
  };
  for (const account of accounts || []) {
    const events = extractLimitEvents(account?.history);
    if (!events || events.length === 0) continue;
    const byLimit = new Map(events.map((e) => [e.limit, e.at]));
    pushStep("50to250", byLimit.get(50), byLimit.get(250));
    pushStep("250to1000", byLimit.get(250), byLimit.get(1000));
    pushStep("1000to5000", byLimit.get(1000), byLimit.get(5000));
  }
  for (const key of Object.keys(stepDurations)) {
    stepDurations[key].avgDays = stepDurations[key].count ? Math.round((stepSums[key] / stepDurations[key].count) * 10) / 10 : 0;
  }

  const bundleMap = new Map();
  for (const account of periodByLimitReachedAt) {
    const proxy = sanitizeKey(account?.proxyProvider || account?.proxy, "unknown");
    const scheme = sanitizeKey(account?.warmupScheme, "unknown");
    const additional = account?.additionalFarming === true ? "true" : account?.additionalFarming === false ? "false" : "unknown";
    const key = `${proxy}|${scheme}|${additional}`;
    if (!bundleMap.has(key)) {
      bundleMap.set(key, { proxy, scheme, additionalFarming: additional, count: 0, limitSum: 0, finite: 0 });
    }
    const row = bundleMap.get(key);
    row.count += 1;
    const limitValue = parseLimitValue(account?.currentLimit ?? account?.dailyLimit);
    if (typeof limitValue === "number" && Number.isFinite(limitValue)) {
      row.limitSum += limitValue;
      row.finite += 1;
    }
  }
  const idealBundles = Array.from(bundleMap.values())
    .map((row) => ({
      proxy: row.proxy,
      warmupScheme: row.scheme,
      additionalFarming: row.additionalFarming,
      count: row.count,
      avgLimit: row.finite ? Math.round((row.limitSum / row.finite) * 10) / 10 : null
    }))
    .sort((a, b) => (b.avgLimit || 0) - (a.avgLimit || 0) || b.count - a.count)
    .slice(0, 10);

  return {
    bundleEfficiencyTable,
    limitCategories: categoryTotals,
    combos,
    topBest,
    topWorst,
    dynamicBase,
    limitByWarmupScheme,
    additionalFarmingImpact,
    timeToLimit,
    stepDurations,
    idealBundles,
    lifeBuckets: [],
    leaderboard: []
  };
};

const buildFunnelAnalytics = ({ accounts, rangeStart, rangeEnd }) => {
  const profileMap = new Map();
  for (const account of accounts || []) {
    const profileName = account?.profileName?.toString().trim();
    if (!profileName) continue;
    if (!profileMap.has(profileName)) {
      profileMap.set(profileName, {
        profileName,
        accounts: [],
        createdAt: null
      });
    }
    const bucket = profileMap.get(profileName);
    bucket.accounts.push(account);
    const createdAt = parseDateValue(account?.createdAt);
    if (createdAt && (!bucket.createdAt || createdAt < bucket.createdAt)) {
      bucket.createdAt = createdAt;
    }
  }
  const periodProfiles = Array.from(profileMap.values()).filter((item) =>
    item.createdAt && item.createdAt >= rangeStart && item.createdAt <= rangeEnd
  );
  const hasVerificationTouch = (profileAccounts) => {
    for (const account of profileAccounts) {
      if (isVerificationReachedStatus(account?.status) || isVerificationLikeStatus(account?.status)) return true;
      for (const entry of normalizeHistory(account?.history)) {
        const toValue = entry?.to ?? entry?.status ?? entry?.value;
        const fromValue = entry?.from;
        const note = [entry?.note, entry?.label, entry?.comment, entry?.event].filter(Boolean).join(" ");
        if (
          isVerificationReachedStatus(toValue)
          || isVerificationReachedStatus(fromValue)
          || isVerificationLikeStatus(toValue)
          || isVerificationLikeStatus(fromValue)
          || isVerificationLikeStatus(note)
        ) return true;
      }
    }
    return false;
  };
  const hasPassedVerification = (profileAccounts) => {
    const isTransferredLike = (value) => isTransferredSourceTab(value) || normalizeStatus(value) === "transferred";
    for (const account of profileAccounts) {
      if (isVerificationPassedStatus(account?.status) || isTransferredLike(account?.sourceTab) || isTransferredLike(account?.status)) return true;
      for (const entry of normalizeHistory(account?.history)) {
        const toValue = entry?.to ?? entry?.status ?? entry?.sourceTab ?? entry?.tab ?? entry?.value;
        if (isVerificationPassedStatus(toValue) || isTransferredLike(toValue)) return true;
      }
    }
    return false;
  };
  const hasTransferred = (profileAccounts) => {
    const isTransferredLike = (value) => isTransferredSourceTab(value) || normalizeStatus(value) === "transferred";
    for (const account of profileAccounts) {
      if (isTransferredLike(account?.sourceTab) || isTransferredLike(account?.status)) return true;
      for (const entry of normalizeHistory(account?.history)) {
        const toValue = entry?.to ?? entry?.status ?? entry?.sourceTab ?? entry?.tab ?? entry?.value;
        if (isTransferredLike(toValue)) return true;
      }
    }
    return false;
  };
  const step1 = new Set();
  const step2 = new Set();
  const step3 = new Set();
  const step4 = new Set();

  for (const item of periodProfiles) {
    const profileName = item.profileName;
    step1.add(profileName);
    let reached = hasVerificationTouch(item.accounts);
    const passed = hasPassedVerification(item.accounts);
    if (passed) reached = true;
    if (reached) step2.add(profileName);
    if (reached && passed) step3.add(profileName);
    if (hasTransferred(item.accounts)) step4.add(profileName);
  }

  const c1 = step1.size;
  const c2 = step2.size;
  const c3 = step3.size;
  const c4 = step4.size;
  const pct = (num, den) => (den ? Math.round((num / den) * 1000) / 10 : 0);
  return {
    created: { count: c1, percent: 100 },
    reachedVerification: { count: c2, percent: pct(c2, c1) },
    passedVerification: { count: c3, percent: pct(c3, c2) },
    transferred: { count: c4, percent: pct(c4, c1) }
  };
};

const buildMediaBuyingOverview = ({ accounts, rangeStart, rangeEnd }) => {
  const mediaStateRows = (accounts || []).filter((account) => isTransferredSourceTab(account?.sourceTab));
  const profileMap = new Map();
  for (const row of mediaStateRows) {
    const profile = row?.profileName?.toString?.().trim?.();
    if (!profile) continue;
    if (!profileMap.has(profile)) profileMap.set(profile, row);
  }
  const list = Array.from(profileMap.values());
  const periodRows = list.filter((account) => isCreatedInRange(account, rangeStart, rangeEnd));
  const baseRows = periodRows.length > 0 ? periodRows : list;
  const statusMap = new Map();
  const farmerMap = new Map();
  const limits = { withLimit: 0, withoutLimit: 0, highLimit: 0 };
  let problematic = 0;

  for (const row of baseRows) {
    const status = sanitizeKey(row?.status, "unknown");
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
    const farmer = sanitizeKey(row?.farmerTag || row?.farmerName, "unknown");
    farmerMap.set(farmer, (farmerMap.get(farmer) || 0) + 1);
    const limitValue = parseLimitValue(row?.dailyLimit ?? row?.currentLimit);
    const category = toLimitCategory(limitValue);
    if (category === "no_limit") limits.withoutLimit += 1;
    else limits.withLimit += 1;
    if (category === "1000" || category === "unlimited") limits.highLimit += 1;
    const staleDays = parseDateValue(row?.lastActivity)
      ? Math.floor((new Date() - parseDateValue(row?.lastActivity)) / DAY_MS)
      : null;
    const hasProblem =
      category === "no_limit"
      || normalizeStatus(row?.status).includes("reject")
      || normalizeStatus(row?.status).includes("problem")
      || (typeof staleDays === "number" && staleDays > 5);
    if (hasProblem) problematic += 1;
  }

  return {
    total: baseRows.length,
    statuses: Object.fromEntries(Array.from(statusMap.entries()).sort((a, b) => b[1] - a[1])),
    limits: {
      ...limits,
      withLimitShare: percent(limits.withLimit, baseRows.length),
      withoutLimitShare: percent(limits.withoutLimit, baseRows.length),
      highLimitShare: percent(limits.highLimit, baseRows.length)
    },
    problematic: {
      count: problematic,
      share: percent(problematic, baseRows.length)
    },
    byFarmer: Object.fromEntries(Array.from(farmerMap.entries()).sort((a, b) => b[1] - a[1]))
  };
};

module.exports = {
  buildKpiAggregation,
  buildTimingAnalytics,
  buildBanCorrelation,
  buildQualityAnalytics,
  buildStuckAccounts,
  buildWarehouseStock,
  buildLimitAnalytics,
  buildFunnelAnalytics,
  buildMediaBuyingOverview
};
