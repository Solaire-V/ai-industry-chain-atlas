import { useEffect, useRef, useState } from "react";
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
  onSelectCompany: (companyId: string) => void;
  onClose: () => void;
}

export function NodeDrawer({
  node,
  companies,
  roles,
  sources,
  onSelectCompany,
  onClose,
}: NodeDrawerProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const titleId = `node-drawer-title-${node.id}`;

  useEffect(() => {
    closeButtonRef.current?.focus();
    setImageUnavailable(false);
  }, [node.id]);

  return (
    <aside
      className="node-drawer"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <button ref={closeButtonRef} className="drawer-close" type="button" aria-label="关闭详情" onClick={onClose}>
        ×
      </button>
      {node.id === "cpo" ? (
        <figure className="drawer-media">
          {imageUnavailable ? (
            <div className="drawer-media-fallback" role="status">
              技术示意图暂不可用
            </div>
          ) : (
            <Image
              src="/images/cpo-technical-cutaway.png"
              alt="CPO 技术剖面示意图"
              width={1672}
              height={941}
              sizes="(max-width: 640px) 100vw, (max-width: 1200px) 40vw, 440px"
              priority
              onError={() => setImageUnavailable(true)}
            />
          )}
          <figcaption>AI 生成技术示意图</figcaption>
        </figure>
      ) : null}

      <div className="drawer-content">
        <header className="drawer-title-block">
          <h2 id={titleId}>
            {node.id === "cpo" ? <><span aria-hidden="true">CPO / </span>{node.name}</> : node.name}
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
                  onClick={() => onSelectCompany(company.id)}
                >
                  <span><strong>{company.name}</strong> {company.ticker}</span>
                  <small>{role.role} · {role.product}</small>
                </button>
              );
            })}
          </div>
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
