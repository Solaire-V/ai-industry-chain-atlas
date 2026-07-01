interface AtlasHeaderProps {
  search: string;
  onSearchChange: (search: string) => void;
  onSearchBlur: () => void;
}

export function AtlasHeader({
  search,
  onSearchChange,
  onSearchBlur,
}: AtlasHeaderProps) {
  return (
    <header className="atlas-header">
      <div className="atlas-brand">AI INDUSTRY ATLAS</div>
      <div className="atlas-update">产业内容 · 2026-06-30</div>
      <label className="atlas-search">
        <span className="visually-hidden">搜索节点、公司或代码</span>
        <input
          type="search"
          aria-label="搜索节点、公司或代码"
          placeholder="搜索节点、公司或代码"
          value={search}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          onBlur={onSearchBlur}
        />
      </label>
    </header>
  );
}
