"use client";

import { useEffect, useState } from "react";

import { AtlasHeader } from "@/components/atlas/atlas-header";
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
  replace: (url: string) => void;
}

interface AtlasAppProps {
  initialSnapshot: AtlasSnapshot;
  initialQuery?: URLSearchParams | AtlasQueryState;
  historyAdapter?: AtlasHistoryAdapter;
}

const defaultHistoryAdapter: AtlasHistoryAdapter = {
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
  const [layersExpanded, setLayersExpanded] = useState(false);

  useEffect(() => {
    if (!query.node) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setQuery((current) => {
        const next = { ...current, node: null, company: null };
        historyAdapter.replace(`?${serializeAtlasQuery(next).toString()}`);
        return next;
      });
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [historyAdapter, query.node]);

  const companyById = new Map(
    initialSnapshot.companies.map((company) => [company.id, company]),
  );
  const nodeById = new Map(initialSnapshot.nodes.map((node) => [node.id, node]));
  const layer = LAYERS.find(({ id }) => id === query.layer) ?? LAYERS[3];
  const modeEdges = filterEdgesByMode(initialSnapshot.industryEdges, query.mode);
  const currentLayerIds = new Set(
    initialSnapshot.nodes
      .filter((node) => node.layer === query.layer)
      .map(({ id }) => id),
  );
  const canvasNodeIds = new Set(currentLayerIds);
  for (const edge of modeEdges) {
    if (currentLayerIds.has(edge.from)) canvasNodeIds.add(edge.to);
    if (currentLayerIds.has(edge.to)) canvasNodeIds.add(edge.from);
  }

  const normalizedSearch = query.search.toLocaleLowerCase();
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
    if (!normalizedSearch) return canvasNodeIds.has(node.id);
    const matchesNode = [node.name, node.englishName ?? "", node.summary]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedSearch);
    const matchesCompany = node.companyIds.some((companyId) =>
      matchingCompanyIds.has(companyId),
    );
    return matchesNode || matchesCompany;
  });
  const selectedNode = query.node ? nodeById.get(query.node) : undefined;

  const updateQuery = (patch: Partial<AtlasQueryState>) => {
    setQuery((current) => {
      const next = parseAtlasQuery(
        serializeAtlasQuery({ ...current, ...patch }),
      );
      historyAdapter.replace(`?${serializeAtlasQuery(next).toString()}`);
      return next;
    });
  };

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
        search={query.search}
        onModeChange={(mode) => updateQuery({ mode })}
        onSearchChange={(search) => updateQuery({ search, node: null, company: null })}
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
        edges={modeEdges}
        mode={query.mode}
        selectedNodeId={selectedNode?.id ?? null}
        empty={canvasNodes.length === 0}
        onSelectNode={(node) => updateQuery({ node, company: null })}
        onResetSearch={() => updateQuery({ search: "", node: null, company: null })}
      />
      {selectedNode ? (
        <NodeDrawer
          node={selectedNode}
          companies={initialSnapshot.companies}
          roles={roles}
          sources={sources}
          selectedCompanyId={
            query.company && companyById.has(query.company) ? query.company : null
          }
          onSelectCompany={(company) => updateQuery({ company })}
          onClose={() => updateQuery({ node: null, company: null })}
        />
      ) : null}
    </div>
  );
}
