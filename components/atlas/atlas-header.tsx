import { useEffect, useRef, useState } from "react";

export interface AtlasGlobalSearchResult {
  id: string;
  typeLabel: string;
  title: string;
  description: string;
  onSelect: () => void;
}

interface AtlasHeaderProps {
  search: string;
  onSearchChange: (search: string) => void;
  onSearchBlur: () => void;
  searchResults: readonly AtlasGlobalSearchResult[];
}

export function AtlasHeader({
  search,
  onSearchChange,
  onSearchBlur,
  searchResults,
}: AtlasHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!searchOpen) return;
    inputRef.current?.focus();
  }, [searchOpen]);

  return (
    <header className="atlas-header">
      <div className="atlas-brand">AI INDUSTRY ATLAS</div>
      <div className="atlas-update">产业内容 · 2026-06-30</div>
      <div className="atlas-search">
        <button
          type="button"
          className="atlas-search-trigger"
          aria-expanded={searchOpen}
          onClick={() => setSearchOpen((open) => !open)}
        >
          <span>全局搜索</span>
          <small>公司 / 节点 / 模块</small>
        </button>

        {searchOpen ? (
          <div className="atlas-search-popover" role="dialog" aria-label="全局搜索面板">
            <label>
              <span className="visually-hidden">全局搜索</span>
              <input
                ref={inputRef}
                type="search"
                aria-label="全局搜索"
                placeholder="搜公司 / 节点 / 产业环节"
                value={search}
                onChange={(event) => onSearchChange(event.currentTarget.value)}
                onBlur={onSearchBlur}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                }}
              />
            </label>
            <p>选择结果后跳转到对应页面</p>
            <div className="atlas-search-results" aria-label="全局搜索结果">
              {searchResults.length ? (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      result.onSelect();
                      setSearchOpen(false);
                    }}
                  >
                    <span>{result.typeLabel}</span>
                    <strong>{result.title}</strong>
                    <small>{result.description}</small>
                  </button>
                ))
              ) : (
                <small className="atlas-search-empty">
                  输入关键词后显示公司、节点和产业环节
                </small>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
