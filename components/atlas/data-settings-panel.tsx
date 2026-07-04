import { useMemo, useState } from "react";

import { buildAtlasDataFreshness } from "@/lib/atlas/data-freshness";
import type {
  AtlasCompany,
  AtlasMarketSnapshot,
  AtlasSource,
  AtlasSupplyRelation,
  SubnodeCompanyCoverage,
} from "@/lib/atlas/schema";

interface DataSettingsPanelProps {
  companies: readonly AtlasCompany[];
  marketSnapshots: readonly AtlasMarketSnapshot[];
  supplyRelations: readonly AtlasSupplyRelation[];
  subnodeCompanyCoverages: readonly SubnodeCompanyCoverage[];
  sources: readonly AtlasSource[];
}

type RefreshAction = "dry-run" | "live";

type RefreshRequestState = "idle" | "checking" | "refreshing";

interface RefreshPayload {
  status?: string;
  code?: string;
  provider?: string;
  trigger?: string;
  companyCount?: number;
  rowsRead?: number;
  rowsWritten?: number;
  wouldWrite?: boolean;
  errorMessage?: string | null;
  missingEnv?: readonly string[];
  error?: {
    code?: string;
    message?: string;
  };
}

interface RefreshResult {
  action: RefreshAction;
  ok: boolean;
  httpStatus: number;
  payload: RefreshPayload;
}

const refreshEndpoint = (action: RefreshAction) =>
  action === "dry-run"
    ? "/api/atlas/admin/refresh-market?dryRun=1"
    : "/api/atlas/admin/refresh-market";

const displayDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("zh-CN");
};

const statusLabel = (result: RefreshResult | null) => {
  if (!result) return "等待操作";
  const code = result.payload.code ?? result.payload.error?.code;
  if (code) return code;
  return result.payload.status ?? (result.ok ? "succeeded" : "failed");
};

const resultMessage = (result: RefreshResult | null) => {
  if (!result) return "输入刷新密钥后，可先检查配置，再执行写库刷新。";
  const message = result.payload.error?.message ?? result.payload.errorMessage;
  if (message) return message;
  if (result.action === "dry-run") return "配置检查完成，未写入数据库。";
  if (result.ok) return "刷新请求完成，页面展示数据可能受接口缓存影响。";
  return `刷新失败，HTTP ${result.httpStatus}`;
};

const rowsLabel = (result: RefreshResult | null) => {
  if (!result || result.payload.rowsRead === undefined) return "—";
  return `${result.payload.rowsRead} / ${result.payload.rowsWritten ?? 0}`;
};

export function DataSettingsPanel({
  companies,
  marketSnapshots,
  supplyRelations,
  subnodeCompanyCoverages,
  sources,
}: DataSettingsPanelProps) {
  const [refreshSecret, setRefreshSecret] = useState("");
  const [requestState, setRequestState] = useState<RefreshRequestState>("idle");
  const [refreshResult, setRefreshResult] = useState<RefreshResult | null>(null);
  const dataFreshness = useMemo(
    () => buildAtlasDataFreshness({ companies, marketSnapshots }),
    [companies, marketSnapshots],
  );
  const trimmedSecret = refreshSecret.trim();
  const canRefresh = trimmedSecret.length > 0 && requestState === "idle";

  const runRefresh = async (action: RefreshAction) => {
    if (!canRefresh) return;

    setRequestState(action === "dry-run" ? "checking" : "refreshing");
    setRefreshResult(null);

    try {
      const response = await fetch(refreshEndpoint(action), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${trimmedSecret}`,
          Accept: "application/json",
        },
      });
      const payload = (await response.json().catch(() => ({}))) as RefreshPayload;
      setRefreshResult({
        action,
        ok: response.ok,
        httpStatus: response.status,
        payload,
      });
    } catch (error) {
      setRefreshResult({
        action,
        ok: false,
        httpStatus: 0,
        payload: {
          code: "network_error",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      setRequestState("idle");
    }
  };

  return (
    <section className="workspace-data-panel workspace-rich-panel" aria-label="数据设置">
      <header>
        <h1>数据设置</h1>
        <p>查看数据状态，手动触发行情刷新；密钥只随本次请求发送，不保存。</p>
      </header>

      <div className="workspace-status-grid" aria-label="本地数据状态">
        <article>
          <strong>本地展示数据</strong>
          <small>{companies.length} 公司 · {subnodeCompanyCoverages.length} 节点公司映射</small>
        </article>
        <article>
          <strong>Supabase 可切换</strong>
          <small>设置 ATLAS_DATA_SOURCE=supabase 后由服务端读取数据库</small>
        </article>
        <article data-state={dataFreshness.status === "missing" ? "partial" : "ready"}>
          <strong>{dataFreshness.label}</strong>
          <small>
            {dataFreshness.companiesWithMarketData} / {dataFreshness.companyCount} 公司有行情
          </small>
        </article>
        <article>
          <strong>/api/atlas/status</strong>
          <small>公开只读状态接口，用于检查数据新鲜度</small>
        </article>
      </div>

      <section className="data-refresh-panel" aria-label="行情刷新控制台">
        <header>
          <div>
            <h2>行情刷新</h2>
            <p>先检查配置，再执行写库。刷新后页面数据可能等待接口缓存更新。</p>
          </div>
          <span data-state={dataFreshness.status}>{dataFreshness.label}</span>
        </header>

        <div className="data-refresh-grid" aria-label="行情刷新状态">
          <article>
            <strong>{marketSnapshots.length}</strong>
            <small>行情快照</small>
          </article>
          <article>
            <strong>{displayDateTime(dataFreshness.latestFetchedAt)}</strong>
            <small>最近抓取</small>
          </article>
          <article>
            <strong>{displayDateTime(dataFreshness.latestTradedAt)}</strong>
            <small>最新交易</small>
          </article>
        </div>

        <label className="data-refresh-secret">
          <span>刷新密钥</span>
          <input
            aria-label="刷新密钥"
            type="password"
            value={refreshSecret}
            placeholder="CRON_SECRET / ATLAS_CRON_SECRET"
            autoComplete="off"
            onChange={(event) => setRefreshSecret(event.target.value)}
          />
        </label>

        <div className="data-refresh-actions">
          <button
            type="button"
            disabled={!canRefresh}
            onClick={() => void runRefresh("dry-run")}
          >
            {requestState === "checking" ? "检查中" : "检查配置"}
          </button>
          <button
            type="button"
            disabled={!canRefresh}
            data-variant="primary"
            onClick={() => void runRefresh("live")}
          >
            {requestState === "refreshing" ? "刷新中" : "刷新写库"}
          </button>
        </div>

        <div className="data-refresh-result" aria-live="polite">
          <dl>
            <div>
              <dt>状态</dt>
              <dd>{statusLabel(refreshResult)}</dd>
            </div>
            <div>
              <dt>来源</dt>
              <dd>{refreshResult?.payload.provider ?? "服务端配置"}</dd>
            </div>
            <div>
              <dt>读 / 写</dt>
              <dd>{rowsLabel(refreshResult)}</dd>
            </div>
          </dl>
          <p>{resultMessage(refreshResult)}</p>
        </div>
      </section>

      <div className="workspace-status-grid" aria-label="证据数据状态">
        <article>
          <strong>{supplyRelations.length} 条供需关系</strong>
          <small>高可信关系优先人工维护</small>
        </article>
        <article>
          <strong>{sources.length} 条证据来源</strong>
          <small>节点、公司和供需关系共用来源表</small>
        </article>
      </div>
    </section>
  );
}
