"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AtlasHeader } from "@/components/atlas/atlas-header";
import { CompanyDrawer } from "@/components/atlas/company-drawer";
import { LayerNav, LAYERS } from "@/components/atlas/layer-nav";
import { NodeDrawer } from "@/components/atlas/node-drawer";
import { RelationshipCanvas } from "@/components/atlas/relationship-canvas";
import { filterEdgesByMode } from "@/lib/atlas/graph";
import {
  DEFAULT_ATLAS_QUERY,
  parseAtlasQuery,
  serializeAtlasQuery,
  type AtlasQueryState,
} from "@/lib/atlas/query-state";
import type { AtlasNode, AtlasSnapshot } from "@/lib/atlas/schema";

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
  const [layersExpanded, setLayersExpanded] = useState(false);
  const queryRef = useRef(query);
  const nodeTriggerRef = useRef<HTMLElement | null>(null);

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
    updateQuery({ node: null, company: null });
    nodeTriggerRef.current?.focus();
  };

  const closeCompanyDrawer = () => updateQuery({ company: null });

  useEffect(() => {
    if (!query.node && !query.company) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (queryRef.current.company) closeCompanyDrawer();
      else closeNodeDrawer();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [historyAdapter, query.company, query.node]);

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
  const layer = LAYERS.find(({ id }) => id === query.layer) ?? LAYERS[3];
  const modeEdges = filterEdgesByMode(initialSnapshot.industryEdges, query.mode);
  const canvasEdgeById = new Map(modeEdges.map((edge) => [edge.id, edge]));
  if (selectedNode) {
    for (const edge of initialSnapshot.industryEdges) {
      if (edge.from === selectedNode.id || edge.to === selectedNode.id) {
        canvasEdgeById.set(edge.id, edge);
      }
    }
  }
  const canvasEdges = [...canvasEdgeById.values()];
  const currentLayerIds = new Set(
    initialSnapshot.nodes
      .filter((node) => node.layer === query.layer)
      .map(({ id }) => id),
  );
  const canvasNodeIds = new Set(currentLayerIds);
  for (const edge of canvasEdges) {
    if (currentLayerIds.has(edge.from)) canvasNodeIds.add(edge.to);
    if (currentLayerIds.has(edge.to)) canvasNodeIds.add(edge.from);
    if (selectedNode && (edge.from === selectedNode.id || edge.to === selectedNode.id)) {
      canvasNodeIds.add(edge.from);
      canvasNodeIds.add(edge.to);
    }
  }

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

  const canvasNodes = initialSnapshot.nodes.filter((node) => {
    if (!canvasNodeIds.has(node.id)) return false;
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
  const selectLayer = (selectedLayer: AtlasNode["layer"]) => {
    setLayersExpanded(false);
    updateQuery({ layer: selectedLayer, node: null, company: null });
  };

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
        mode={query.mode}
        search={searchInput}
        onModeChange={(mode) => updateQuery({ mode })}
        onSearchChange={setSearchInput}
        onSearchBlur={() =>
          updateQuery(
            { search: searchInput, node: null, company: null },
            "replace",
          )
        }
        onToggleLayers={() => setLayersExpanded((expanded) => !expanded)}
        layersExpanded={layersExpanded}
      />
      <LayerNav
        selected={query.layer}
        expanded={layersExpanded}
        onSelect={selectLayer}
      />
      <RelationshipCanvas
        title={`${layer?.label ?? "高速互联"} · 产业关系图`}
        nodes={canvasNodes}
        edges={canvasEdges}
        mode={query.mode}
        selectedNodeId={selectedNode?.id ?? null}
        empty={canvasNodes.length === 0}
        onSelectNode={(node) => {
          nodeTriggerRef.current = document.activeElement as HTMLElement;
          updateQuery({ node, company: null });
        }}
        onResetSearch={() => {
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
          onSelectNode={(node) =>
            updateQuery({ layer: node.layer, node: node.id, company: null })
          }
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
