import { presentMarketSnapshot, type PresentedMarketSnapshot } from "@/lib/atlas/market";
import type {
  AtlasCompany,
  AtlasMarketSnapshot,
  AtlasSupplyRelation,
  SubnodeCompanyCoverage,
} from "@/lib/atlas/schema";
import {
  atlasStageById,
  type AtlasStageId,
} from "@/lib/atlas/stage-map";

export type CompanyMarketFilter = "all" | "ashare" | "other";

export interface CompanyResearchPosition {
  coverage: SubnodeCompanyCoverage;
  stageId: AtlasStageId;
  stageName: string;
  stageOrder: number;
  groupId: string;
  groupTitle: string;
  subnodeId: string;
  subnodeLabel: string;
}

export interface CompanyResearchRow {
  company: AtlasCompany;
  tickerLabel: string;
  marketLabel: string;
  isAshare: boolean;
  marketGroup: Exclude<CompanyMarketFilter, "all">;
  positions: readonly CompanyResearchPosition[];
  primaryPosition: CompanyResearchPosition | null;
  roleLabel: string;
  priority: SubnodeCompanyCoverage["priority"] | "none";
  relatedNodeCount: number;
  latestMarketSnapshot: AtlasMarketSnapshot | null;
  market: PresentedMarketSnapshot;
  supplierCount: number;
  customerCount: number;
  verifiedRelationCount: number;
  supplyRelations: readonly AtlasSupplyRelation[];
  sourceIds: readonly string[];
  searchableText: string;
}

export interface BuildCompanyResearchRowsInput {
  companies: readonly AtlasCompany[];
  subnodeCompanyCoverages: readonly SubnodeCompanyCoverage[];
  marketSnapshots: readonly AtlasMarketSnapshot[];
  supplyRelations: readonly AtlasSupplyRelation[];
}

const ASHARE_TICKER_PATTERN = /\.(SH|SZ|BJ)$/;

const PRIORITY_ORDER: Record<SubnodeCompanyCoverage["priority"] | "none", number> = {
  leader: 0,
  important: 1,
  supplementary: 2,
  watch: 3,
  none: 4,
};

const RELATION_STATUS_ORDER: Record<AtlasSupplyRelation["status"], number> = {
  company_confirmed: 0,
  counterparty_confirmed: 1,
  regulatory_disclosure: 2,
  multi_source_report: 3,
  market_speculation: 4,
};

const announcedEpoch = (value: string | undefined) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const epoch = Date.parse(value);
  return Number.isNaN(epoch) ? Number.NEGATIVE_INFINITY : epoch;
};

export const isAshareCompany = (company: AtlasCompany | undefined) =>
  company?.market === "CN" && ASHARE_TICKER_PATTERN.test(company.ticker);

export const getCompanyMarketLabel = (company: AtlasCompany | undefined) => {
  if (!company) return "其他";
  if (isAshareCompany(company)) return "A股";
  if (company.market === "US") return "美股";
  if (company.market === "HK") return "港股";
  if (company.market === "TW") return "台股";
  if (company.market === "JP") return "日股";
  if (company.market === "KR") return "韩股";
  if (company.market === "EU") return "欧股";
  if (company.market === "PRIVATE") return "非上市";
  return "其他";
};

export const getCompanyTickerLabel = (company: AtlasCompany | undefined) => {
  if (!company) return "";
  return company.exchange && company.exchange !== "PRIVATE"
    ? `${company.ticker} · ${company.exchange}`
    : company.ticker;
};

const getCoveragePosition = (
  coverage: SubnodeCompanyCoverage,
): CompanyResearchPosition | null => {
  const stage = atlasStageById.get(coverage.stageId as AtlasStageId);
  const group = stage?.groups.find(({ id }) => id === coverage.groupId);
  const subnode = group?.nodes.find(({ id }) => id === coverage.subnodeId);
  if (!stage || !group || !subnode) return null;

  return {
    coverage,
    stageId: stage.id,
    stageName: stage.name,
    stageOrder: stage.order,
    groupId: group.id,
    groupTitle: group.title,
    subnodeId: subnode.id,
    subnodeLabel: subnode.label,
  };
};

const coveragePriority = (coverage: SubnodeCompanyCoverage | undefined) =>
  coverage ? PRIORITY_ORDER[coverage.priority] : PRIORITY_ORDER.none;

const comparePositions = (
  left: CompanyResearchPosition,
  right: CompanyResearchPosition,
) =>
  coveragePriority(left.coverage) - coveragePriority(right.coverage) ||
  left.coverage.rank - right.coverage.rank ||
  left.stageOrder - right.stageOrder ||
  left.groupTitle.localeCompare(right.groupTitle, "zh-CN") ||
  left.subnodeLabel.localeCompare(right.subnodeLabel, "zh-CN");

const getLatestSnapshot = (
  companyId: string,
  marketSnapshots: readonly AtlasMarketSnapshot[],
) => {
  let latest: AtlasMarketSnapshot | null = null;
  let latestEpoch = Number.NEGATIVE_INFINITY;
  for (const snapshot of marketSnapshots) {
    if (snapshot.companyId !== companyId) continue;
    const epoch = Date.parse(snapshot.tradedAt);
    if (Number.isNaN(epoch) || epoch <= latestEpoch) continue;
    latest = snapshot;
    latestEpoch = epoch;
  }
  return latest;
};

const getCompanyRelations = (
  companyId: string,
  supplyRelations: readonly AtlasSupplyRelation[],
) =>
  supplyRelations
    .filter(
      ({ supplierId, customerId }) =>
        supplierId === companyId || customerId === companyId,
    )
    .toSorted(
      (left, right) =>
        RELATION_STATUS_ORDER[left.status] - RELATION_STATUS_ORDER[right.status] ||
        announcedEpoch(right.announcedAt) - announcedEpoch(left.announcedAt),
    );

const unique = (values: Iterable<string>) => [...new Set(values)];

export const buildCompanyResearchRows = ({
  companies,
  subnodeCompanyCoverages,
  marketSnapshots,
  supplyRelations,
}: BuildCompanyResearchRowsInput): readonly CompanyResearchRow[] => {
  const positionsByCompanyId = new Map<string, CompanyResearchPosition[]>();
  for (const coverage of subnodeCompanyCoverages) {
    const position = getCoveragePosition(coverage);
    if (!position) continue;
    positionsByCompanyId.set(coverage.companyId, [
      ...(positionsByCompanyId.get(coverage.companyId) ?? []),
      position,
    ]);
  }

  return companies
    .map((company) => {
      const positions = (positionsByCompanyId.get(company.id) ?? [])
        .toSorted(comparePositions);
      const primaryPosition = positions[0] ?? null;
      const latestMarketSnapshot = getLatestSnapshot(company.id, marketSnapshots);
      const relations = getCompanyRelations(company.id, supplyRelations);
      const supplierCount = new Set(
        relations
          .filter(({ customerId }) => customerId === company.id)
          .map(({ supplierId }) => supplierId),
      ).size;
      const customerCount = new Set(
        relations
          .filter(({ supplierId }) => supplierId === company.id)
          .map(({ customerId }) => customerId),
      ).size;
      const verifiedRelationCount = relations.filter(
        ({ status }) => status !== "market_speculation",
      ).length;
      const isAshare = isAshareCompany(company);
      const sourceIds = unique([
        ...positions.flatMap(({ coverage }) => coverage.sourceIds),
        ...relations.flatMap(({ evidenceSourceIds }) => evidenceSourceIds),
      ]);
      const searchableText = [
        company.name,
        company.ticker,
        company.exchange,
        company.market,
        getCompanyMarketLabel(company),
        ...positions.flatMap((position) => [
          position.stageName,
          position.groupTitle,
          position.subnodeLabel,
          position.coverage.role,
        ]),
      ]
        .join(" ")
        .toLocaleLowerCase();

      return {
        company,
        tickerLabel: getCompanyTickerLabel(company),
        marketLabel: getCompanyMarketLabel(company),
        isAshare,
        marketGroup: isAshare ? "ashare" : "other",
        positions,
        primaryPosition,
        roleLabel: primaryPosition?.coverage.role ?? "待映射",
        priority: primaryPosition?.coverage.priority ?? "none",
        relatedNodeCount: new Set(positions.map(({ subnodeId }) => subnodeId)).size,
        latestMarketSnapshot,
        market: presentMarketSnapshot(latestMarketSnapshot),
        supplierCount,
        customerCount,
        verifiedRelationCount,
        supplyRelations: relations,
        sourceIds,
        searchableText,
      } satisfies CompanyResearchRow;
    })
    .toSorted(
      (left, right) =>
        Number(right.isAshare) - Number(left.isAshare) ||
        PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority] ||
        (left.primaryPosition?.coverage.rank ?? Number.POSITIVE_INFINITY) -
          (right.primaryPosition?.coverage.rank ?? Number.POSITIVE_INFINITY) ||
        left.company.name.localeCompare(right.company.name, "zh-CN"),
    );
};
