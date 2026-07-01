"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AtlasHeader } from "@/components/atlas/atlas-header";
import { CompanyDrawer } from "@/components/atlas/company-drawer";
import { NodeDrawer } from "@/components/atlas/node-drawer";
import { PosterAtlasCanvas } from "@/components/atlas/poster-atlas-canvas";
import {
  DEFAULT_ATLAS_QUERY,
  parseAtlasQuery,
  serializeAtlasQuery,
  type AtlasQueryState,
} from "@/lib/atlas/query-state";
import type { AtlasSnapshot } from "@/lib/atlas/schema";

export interface AtlasHistoryAdapter {
  push: (url: string) => void;
  replace: (url: string) => void;
}

interface AtlasAppProps {
  initialSnapshot: AtlasSnapshot;
  initialQuery?: URLSearchParams | AtlasQueryState;
  historyAdapter?: AtlasHistoryAdapter;
}

const defaultHistoryAdapter: AtlasHistoryAdapter = {
  push(url) {
    window.history.pushState(window.history.state, "", url);
  },
  replace(url) {
    window.history.replaceState(window.history.state, "", url);
  },
};

const normalizeInitialQuery = (
  initialQuery: AtlasAppProps["initialQuery"],
): AtlasQueryState => {
  if (!initialQuery) return { ...DEFAULT_ATLAS_QUERY };
  return initialQuery instanceof URLSearchParams
    ? parseAtlasQuery(initialQuery)
    : parseAtlasQuery(serializeAtlasQuery(initialQuery));
};

export function AtlasApp({
  initialSnapshot,
  initialQuery,
  historyAdapter = defaultHistoryAdapter,
}: AtlasAppProps) {
  const [query, setQuery] = useState<AtlasQueryState>(() =>
    normalizeInitialQuery(initialQuery),
  );
  const [searchInput, setSearchInput] = useState(() =>
    normalizeInitialQuery(initialQuery).search,
  );
  const [focusAnchorNodeId, setFocusAnchorNodeId] = useState<string | null>(null);
  const queryRef = useRef(query);
  const nodeTriggerRef = useRef<HTMLElement | null>(null);
  const pendingRestoreNodeIdRef = useRef<string | null>(null);
  const companyById = useMemo(
    () => new Map(initialSnapshot.companies.map((company) => [company.id, company])),
    [initialSnapshot.companies],
  );
  const nodeById = useMemo(
    () => new Map(initialSnapshot.nodes.map((node) => [node.id, node])),
    [initialSnapshot.nodes],
  );
  const selectedNode = query.node ? nodeById.get(query.node) : undefined;
  const selectedCompany = query.company
    ? companyById.get(query.company)
    : undefined;

  const updateQuery = (
    patch: Partial<AtlasQueryState>,
    method: "push" | "replace" = "push",
  ) => {
    const next = parseAtlasQuery(
      serializeAtlasQuery({ ...queryRef.current, ...patch }),
    );
    historyAdapter[method](`?${serializeAtlasQuery(next).toString()}`);
    queryRef.current = next;
    setQuery(next);
  };

  const closeNodeDrawer = () => {
    if (selectedNode) setFocusAnchorNodeId(selectedNode.id);
    updateQuery({ node: null, company: null });
    nodeTriggerRef.current?.focus();
  };

  const closeCompanyDrawer = () =>
    updateQuery(
      selectedNode
        ? { company: null }
        : { node: null, company: null },
    );

  useEffect(() => {
    if (!query.node && !query.company) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedCompany) closeCompanyDrawer();
      else closeNodeDrawer();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [historyAdapter, query.company, query.node, selectedCompany]);

  useEffect(() => {
    const restoreQuery = () => {
      const restored = parseAtlasQuery(new URLSearchParams(window.location.search));
      queryRef.current = restored;
      setQuery(restored);
      setSearchInput(restored.search);
    };
    window.addEventListener("popstate", restoreQuery);
    return () => window.removeEventListener("popstate", restoreQuery);
  }, []);

  useEffect(() => {
    const canonicalSearch = parseAtlasQuery(
      serializeAtlasQuery({ ...query, search: searchInput }),
    ).search;
    if (canonicalSearch === query.search) return;
    const timer = window.setTimeout(() => {
      updateQuery(
        { search: searchInput, node: null, company: null },
        "replace",
      );
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query.search, searchInput]);

  const normalizedSearch = searchInput.trim().toLocaleLowerCase();
  const matchingCompanyIds = new Set<string>();
  if (normalizedSearch) {
    for (const company of initialSnapshot.companies) {
      if (
        company.name.toLocaleLowerCase().includes(normalizedSearch) ||
        company.ticker.toLocaleLowerCase().includes(normalizedSearch)
      ) {
        matchingCompanyIds.add(company.id);
      }
    }
  }

  const posterNodes = initialSnapshot.nodes.filter((node) => {
    if (selectedNode?.id === node.id || focusAnchorNodeId === node.id) return true;
    if (!normalizedSearch) return true;
    const matchesNode = [node.name, node.englishName ?? "", node.summary]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedSearch);
    const matchesCompany = node.companyIds.some((companyId) =>
      matchingCompanyIds.has(companyId),
    );
    return matchesNode || matchesCompany;
  });

  useEffect(() => {
    const pendingNodeId = pendingRestoreNodeIdRef.current;
    if (!pendingNodeId || query.company || query.node !== pendingNodeId) return;
    const target = document.getElementById(`atlas-node-${pendingNodeId}`);
    if (!target) return;
    nodeTriggerRef.current = target;
    pendingRestoreNodeIdRef.current = null;
  }, [query.company, query.layer, query.node]);

  const roles = selectedNode
    ? initialSnapshot.companyNodeRoles.filter(
        ({ nodeId }) => nodeId === selectedNode.id,
      )
    : [];
  const sourceIds = new Set(selectedNode?.sourceIds ?? []);
  for (const role of roles) {
    for (const sourceId of role.sourceIds) sourceIds.add(sourceId);
  }
  const sources = initialSnapshot.sources.filter(({ id }) => sourceIds.has(id));

  return (
    <div className="atlas-app">
      <AtlasHeader
        search={searchInput}
        onSearchChange={(nextSearch) => {
          setFocusAnchorNodeId(null);
          setSearchInput(nextSearch);
        }}
        onSearchBlur={() =>
          updateQuery(
            { search: searchInput, node: null, company: null },
            "replace",
          )
        }
      />
      <PosterAtlasCanvas
        nodes={posterNodes}
        companies={initialSnapshot.companies}
        edges={initialSnapshot.industryEdges}
        selectedNodeId={selectedNode?.id ?? null}
        empty={posterNodes.length === 0}
        showSearchResults={Boolean(normalizedSearch)}
        onSelectNode={(node) => {
          setFocusAnchorNodeId(null);
          nodeTriggerRef.current = document.activeElement as HTMLElement;
          updateQuery({ node, company: null });
        }}
        onResetSearch={() => {
          setFocusAnchorNodeId(null);
          setSearchInput("");
          updateQuery({ search: "", node: null, company: null }, "replace");
        }}
      />
      {selectedCompany ? (
        <CompanyDrawer
          company={selectedCompany}
          returnNode={selectedNode ?? null}
          companies={initialSnapshot.companies}
          nodes={initialSnapshot.nodes}
          roles={initialSnapshot.companyNodeRoles}
          marketSnapshots={initialSnapshot.marketSnapshots}
          supplyRelations={initialSnapshot.supplyRelations}
          sources={initialSnapshot.sources}
          onBack={closeCompanyDrawer}
          onSelectNode={(node) => {
            setFocusAnchorNodeId(null);
            pendingRestoreNodeIdRef.current = node.id;
            updateQuery({ layer: node.layer, node: node.id, company: null })
          }}
        />
      ) : selectedNode ? (
        <NodeDrawer
          node={selectedNode}
          companies={initialSnapshot.companies}
          roles={roles}
          sources={sources}
          onSelectCompany={(company) => updateQuery({ company })}
          onClose={closeNodeDrawer}
        />
      ) : null}
    </div>
  );
}
