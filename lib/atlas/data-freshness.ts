import type {
  AtlasCompany,
  AtlasMarketSnapshot,
  AtlasSnapshot,
} from "@/lib/atlas/schema";

export type AtlasDataFreshnessStatus = "fresh" | "stale" | "missing";

export interface AtlasDataFreshness {
  status: AtlasDataFreshnessStatus;
  label: string;
  companyCount: number;
  marketSnapshotCount: number;
  companiesWithMarketData: number;
  companiesMissingMarketData: number;
  coverageRatio: number;
  latestTradedAt: string | null;
  latestFetchedAt: string | null;
}

interface BuildFreshnessInput {
  companies: readonly AtlasCompany[];
  marketSnapshots: readonly AtlasMarketSnapshot[];
}

const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

const epoch = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

export const selectLatestMarketSnapshots = (
  marketSnapshots: readonly AtlasMarketSnapshot[],
) => {
  const latestByCompanyId = new Map<string, AtlasMarketSnapshot>();

  for (const snapshot of marketSnapshots) {
    const existing = latestByCompanyId.get(snapshot.companyId);
    if (!existing || epoch(snapshot.tradedAt) > epoch(existing.tradedAt)) {
      latestByCompanyId.set(snapshot.companyId, snapshot);
    }
  }

  return latestByCompanyId;
};

export const buildAtlasDataFreshness = (
  input: BuildFreshnessInput | AtlasSnapshot,
  now = new Date(),
): AtlasDataFreshness => {
  const latestByCompanyId = selectLatestMarketSnapshots(input.marketSnapshots);
  const latestSnapshots = [...latestByCompanyId.values()];
  const latestTradedAt = latestSnapshots.toSorted(
    (left, right) => epoch(right.tradedAt) - epoch(left.tradedAt),
  )[0]?.tradedAt ?? null;
  const latestFetchedAt = latestSnapshots.toSorted(
    (left, right) => epoch(right.fetchedAt) - epoch(left.fetchedAt),
  )[0]?.fetchedAt ?? null;
  const companyCount = input.companies.length;
  const companiesWithMarketData = input.companies.filter(({ id }) =>
    latestByCompanyId.has(id),
  ).length;
  const companiesMissingMarketData = companyCount - companiesWithMarketData;

  if (!latestFetchedAt || companiesWithMarketData === 0) {
    return {
      status: "missing",
      label: "行情未接入",
      companyCount,
      marketSnapshotCount: input.marketSnapshots.length,
      companiesWithMarketData,
      companiesMissingMarketData,
      coverageRatio: companyCount === 0 ? 0 : companiesWithMarketData / companyCount,
      latestTradedAt: null,
      latestFetchedAt: null,
    };
  }

  const ageMs = now.getTime() - epoch(latestFetchedAt);
  const status: AtlasDataFreshnessStatus =
    ageMs > STALE_AFTER_MS ? "stale" : "fresh";

  return {
    status,
    label: status === "fresh" ? "行情已更新" : "行情需更新",
    companyCount,
    marketSnapshotCount: input.marketSnapshots.length,
    companiesWithMarketData,
    companiesMissingMarketData,
    coverageRatio: companyCount === 0 ? 0 : companiesWithMarketData / companyCount,
    latestTradedAt,
    latestFetchedAt,
  };
};
