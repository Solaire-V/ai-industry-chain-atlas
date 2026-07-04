import { describe, expect, it } from "vitest";

import { verticalSlice } from "@/content/seed/vertical-slice";
import { buildSeedSyncPlan, seedSyncConflictKeys } from "@/scripts/sync-supabase-seed";

describe("sync Supabase seed script", () => {
  it("summarizes the static atlas rows that will be synced without market snapshots", () => {
    const plan = buildSeedSyncPlan(verticalSlice);

    expect(plan.tables.market_snapshots).toBe(0);
    expect(plan.tables.companies).toBe(verticalSlice.companies.length);
    expect(plan.tables.subnode_company_coverages).toBe(
      verticalSlice.subnodeCompanyCoverages.length,
    );
    expect(plan.tables.subnode_company_coverage_sources).toBe(
      verticalSlice.subnodeCompanyCoverages.reduce(
        (total, coverage) => total + coverage.sourceIds.length,
        0,
      ),
    );
    expect(plan.tables.supply_relations).toBeGreaterThanOrEqual(3);
  });

  it("keeps subnode company coverage rows compatible with database unique constraints", () => {
    const byPositionRank = new Set<string>();
    const byPositionCompany = new Set<string>();

    for (const coverage of verticalSlice.subnodeCompanyCoverages) {
      const positionRankKey = [
        coverage.stageId,
        coverage.groupId,
        coverage.subnodeId,
        coverage.rank,
      ].join("\u0000");
      const positionCompanyKey = [
        coverage.stageId,
        coverage.groupId,
        coverage.subnodeId,
        coverage.companyId,
      ].join("\u0000");

      expect(byPositionRank.has(positionRankKey)).toBe(false);
      expect(byPositionCompany.has(positionCompanyKey)).toBe(false);

      byPositionRank.add(positionRankKey);
      byPositionCompany.add(positionCompanyKey);
    }
  });

  it("uses the database natural key for subnode coverage upserts only", () => {
    expect(seedSyncConflictKeys.sources).toBe("slug");
    expect(seedSyncConflictKeys.companies).toBe("slug");
    expect(seedSyncConflictKeys.industryNodes).toBe("slug");
    expect(seedSyncConflictKeys.subnodeCompanyCoverages).toBe(
      "stage_id,group_id,subnode_id,rank",
    );
  });
});
