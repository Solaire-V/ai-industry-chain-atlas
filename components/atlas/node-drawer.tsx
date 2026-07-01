import Image from "next/image";

import type {
  AtlasCompany,
  AtlasNode,
  AtlasSource,
  CompanyNodeRole,
} from "@/lib/atlas/schema";

interface NodeDrawerProps {
  node: AtlasNode;
  companies: readonly AtlasCompany[];
  roles: readonly CompanyNodeRole[];
  sources: readonly AtlasSource[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
  onClose: () => void;
}

export function NodeDrawer({
  node,
  companies,
  roles,
  sources,
  selectedCompanyId,
  onSelectCompany,
  onClose,
}: NodeDrawerProps) {
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const selectedCompany = selectedCompanyId
    ? companyById.get(selectedCompanyId)
    : undefined;
  const titleId = `node-drawer-title-${node.id}`;

  return (
    <aside
      className="node-drawer"
      role="dialog"
      aria-modal="false"
      aria-label={node.name}
    >
      <button className="drawer-close" type="button" aria-label="关闭详情" onClick={onClose}>
        ×
      </button>
      {node.id === "cpo" ? (
        <figure className="drawer-media">
          <Image
            src="/images/cpo-technical-cutaway.png"
            alt="CPO 技术剖面示意图"
            width={1672}
            height={941}
            priority
          />
          <figcaption>AI 生成技术示意图</figcaption>
        </figure>
      ) : null}

      <div className="drawer-content">
        <header className="drawer-title-block">
          <h2 id={titleId}>
            {node.id === "cpo" ? "CPO / 共封装光学" : node.name}
          </h2>
          {node.englishName ? <p>{node.englishName}</p> : null}
        </header>

        <section>
          <h3>技术解释</h3>
          <p>{node.summary}</p>
          <p>{node.technology}</p>
        </section>

        <section>
          <h3>核心壁垒</h3>
          <dl className="research-factors">
            <div><dt>壁垒</dt><dd>{node.barriers.join("；")}</dd></div>
            <div><dt>驱动</dt><dd>{node.drivers.join("；")}</dd></div>
            <div><dt>风险</dt><dd>{node.risks.join("；")}</dd></div>
          </dl>
        </section>

        <section>
          <h3>代表公司</h3>
          <div className="company-list">
            {roles.map((role) => {
              const company = companyById.get(role.companyId);
              if (!company) return null;
              return (
                <button
                  key={role.id}
                  type="button"
                  aria-pressed={selectedCompanyId === company.id}
                  onClick={() => onSelectCompany(company.id)}
                >
                  <span><strong>{company.name}</strong> {company.ticker}</span>
                  <small>{role.role} · {role.product}</small>
                </button>
              );
            })}
          </div>
          {selectedCompany ? (
            <p className="selected-company-placeholder">
              已选择公司，行情与供需详情将在公司面板加载：{selectedCompany.name}（{selectedCompany.ticker}）
            </p>
          ) : null}
        </section>

        <section>
          <h3>主要来源</h3>
          <ul className="source-list">
            {sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <small>{source.publisher} · 核验于 {source.checkedAt.slice(0, 10)}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
