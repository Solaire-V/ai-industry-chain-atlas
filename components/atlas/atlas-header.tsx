import type { RelationshipMode } from "@/lib/atlas/graph";

const relationshipControls: ReadonlyArray<{
  mode: RelationshipMode;
  label: string;
}> = [
  { mode: "supply", label: "直接关系" },
  { mode: "value", label: "包含关系" },
  { mode: "all", label: "全部关系" },
];

interface AtlasHeaderProps {
  mode: RelationshipMode;
  search: string;
  onModeChange: (mode: RelationshipMode) => void;
  onSearchChange: (search: string) => void;
  onToggleLayers: () => void;
  layersExpanded: boolean;
}

export function AtlasHeader({
  mode,
  search,
  onModeChange,
  onSearchChange,
  onToggleLayers,
  layersExpanded,
}: AtlasHeaderProps) {
  return (
    <header className="atlas-header">
      <div className="atlas-brand">AI INDUSTRY ATLAS</div>
      <div className="atlas-update">产业内容 · 2026-06-30</div>
      <button
        className="layer-filter-button"
        type="button"
        aria-expanded={layersExpanded}
        aria-controls="atlas-layer-nav"
        onClick={onToggleLayers}
      >
        产业层级
      </button>
      <label className="atlas-search">
        <span className="visually-hidden">搜索节点、公司或代码</span>
        <input
          type="search"
          aria-label="搜索节点、公司或代码"
          placeholder="搜索节点、公司或代码"
          value={search}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
        />
      </label>
      <div className="relationship-controls" aria-label="关系模式">
        <span className="relationship-label">关系模式</span>
        {relationshipControls.map((control) => (
          <button
            key={control.mode}
            type="button"
            aria-pressed={mode === control.mode}
            onClick={() => onModeChange(control.mode)}
          >
            {control.label}
          </button>
        ))}
      </div>
    </header>
  );
}
