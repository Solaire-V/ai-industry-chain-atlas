import {
  isRelationshipMode,
  type RelationshipMode,
} from "@/lib/atlas/graph";
import { layerSchema, type AtlasNode } from "@/lib/atlas/schema";
import {
  atlasStageById,
  defaultStageId,
  type AtlasStageId,
} from "@/lib/atlas/stage-map";

export type AtlasQueryMode = RelationshipMode;
export type AtlasWorkspaceView =
  | "canvas"
  | "nodes"
  | "companies"
  | "markets"
  | "supply"
  | "settings";

export interface AtlasQueryState {
  view: AtlasWorkspaceView;
  layer: AtlasNode["layer"];
  mode: AtlasQueryMode;
  stage: AtlasStageId;
  node: string | null;
  company: string | null;
  search: string;
}

export const DEFAULT_ATLAS_QUERY: Readonly<AtlasQueryState> = Object.freeze({
  view: "canvas",
  layer: "interconnect",
  mode: "supply",
  stage: defaultStageId,
  node: null,
  company: null,
  search: "",
});

interface SearchParamsReader {
  get(name: string): string | null;
}

const normalizeText = (value: string | null, maxLength: number) =>
  [...(value ?? "").trim()].slice(0, maxLength).join("").trim();

const normalizeOptionalText = (value: string | null, maxLength: number) =>
  normalizeText(value, maxLength) || null;

const normalizeLayer = (value: string | null): AtlasQueryState["layer"] => {
  const result = layerSchema.safeParse(value);
  return result.success ? result.data : DEFAULT_ATLAS_QUERY.layer;
};

const normalizeMode = (value: string | null): AtlasQueryMode =>
  isRelationshipMode(value) ? value : DEFAULT_ATLAS_QUERY.mode;

const workspaceViews = new Set<AtlasWorkspaceView>([
  "canvas",
  "nodes",
  "companies",
  "markets",
  "supply",
  "settings",
]);

const normalizeView = (value: string | null): AtlasWorkspaceView =>
  value && workspaceViews.has(value as AtlasWorkspaceView)
    ? (value as AtlasWorkspaceView)
    : DEFAULT_ATLAS_QUERY.view;

const normalizeStage = (value: string | null): AtlasStageId =>
  value && atlasStageById.has(value as AtlasStageId)
    ? (value as AtlasStageId)
    : DEFAULT_ATLAS_QUERY.stage;

export const parseAtlasQuery = (
  params: SearchParamsReader,
): AtlasQueryState => ({
  view: normalizeView(params.get("view")),
  layer: normalizeLayer(params.get("layer")),
  mode: normalizeMode(params.get("mode")),
  stage: normalizeStage(params.get("stage")),
  node: normalizeOptionalText(params.get("node"), 100),
  company: normalizeOptionalText(params.get("company"), 100),
  search: normalizeText(params.get("q"), 80),
});

export const serializeAtlasQuery = (state: AtlasQueryState) => {
  const params = new URLSearchParams();
  const node = normalizeOptionalText(state.node, 100);
  const company = normalizeOptionalText(state.company, 100);
  const search = normalizeText(state.search, 80);

  params.set("view", normalizeView(state.view));
  params.set("layer", normalizeLayer(state.layer));
  params.set("mode", normalizeMode(state.mode));
  params.set("stage", normalizeStage(state.stage));
  if (node) params.set("node", node);
  if (company) params.set("company", company);
  if (search) params.set("q", search);

  return params;
};
