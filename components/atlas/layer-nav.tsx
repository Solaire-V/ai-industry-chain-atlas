import type { AtlasNode } from "@/lib/atlas/schema";

export const LAYERS: ReadonlyArray<{
  id: AtlasNode["layer"];
  number: string;
  label: string;
}> = [
  { id: "materials", number: "01", label: "原材料" },
  { id: "manufacturing", number: "02", label: "制造设备" },
  { id: "chips", number: "03", label: "核心芯片" },
  { id: "interconnect", number: "04", label: "高速互联" },
  { id: "infrastructure", number: "05", label: "算力设施" },
  { id: "platform", number: "06", label: "AI 平台" },
  { id: "applications", number: "07", label: "AI 应用" },
];

interface LayerNavProps {
  selected: AtlasNode["layer"];
  expanded: boolean;
  onSelect: (layer: AtlasNode["layer"]) => void;
}

export function LayerNav({ selected, expanded, onSelect }: LayerNavProps) {
  return (
    <nav
      id="atlas-layer-nav"
      className="layer-nav"
      aria-label="产业层级"
      data-expanded={expanded}
    >
      {LAYERS.map((layer) => (
        <button
          key={layer.id}
          className="layer-nav-button"
          type="button"
          aria-current={selected === layer.id ? "page" : undefined}
          onClick={() => onSelect(layer.id)}
        >
          <span>{layer.number}</span>
          {layer.label}
        </button>
      ))}
    </nav>
  );
}
