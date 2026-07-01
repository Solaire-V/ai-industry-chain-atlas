import { layerSchema, type AtlasNode } from "@/lib/atlas/schema";

export type AtlasQueryMode = "supply" | "value" | "all";

export interface AtlasQueryState {
  layer: AtlasNode["layer"];
  mode: AtlasQueryMode;
  node: string | null;
  company: string | null;
  search: string;
}

export const DEFAULT_ATLAS_QUERY: Readonly<AtlasQueryState> = Object.freeze({
  layer: "interconnect",
  mode: "supply",
  node: null,
  company: null,
  search: "",
});

interface SearchParamsReader {
  get(name: string): string | null;
}

const queryModes = new Set<AtlasQueryMode>(["supply", "value", "all"]);

const normalizeText = (value: string | null, maxLength: number) =>
  (value ?? "").trim().slice(0, maxLength);

const normalizeOptionalText = (value: string | null, maxLength: number) =>
  normalizeText(value, maxLength) || null;

const normalizeLayer = (value: string | null): AtlasQueryState["layer"] => {
  const result = layerSchema.safeParse(value);
  return result.success ? result.data : DEFAULT_ATLAS_QUERY.layer;
};

const normalizeMode = (value: string | null): AtlasQueryMode =>
  queryModes.has(value as AtlasQueryMode)
    ? (value as AtlasQueryMode)
    : DEFAULT_ATLAS_QUERY.mode;

export const parseAtlasQuery = (
  params: SearchParamsReader,
): AtlasQueryState => ({
  layer: normalizeLayer(params.get("layer")),
  mode: normalizeMode(params.get("mode")),
  node: normalizeOptionalText(params.get("node"), 100),
  company: normalizeOptionalText(params.get("company"), 100),
  search: normalizeText(params.get("q"), 80),
});

export const serializeAtlasQuery = (state: AtlasQueryState) => {
  const params = new URLSearchParams();
  const node = normalizeOptionalText(state.node, 100);
  const company = normalizeOptionalText(state.company, 100);
  const search = normalizeText(state.search, 80);

  params.set("layer", normalizeLayer(state.layer));
  params.set("mode", normalizeMode(state.mode));
  if (node) params.set("node", node);
  if (company) params.set("company", company);
  if (search) params.set("q", search);

  return params;
};
