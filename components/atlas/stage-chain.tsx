import {
  atlasStages,
  mainChainConnections,
  type AtlasStageId,
} from "@/lib/atlas/stage-map";

interface StageChainProps {
  selectedStageId: AtlasStageId;
  onSelectStage: (stageId: AtlasStageId) => void;
}

const stageConnectionKindLabels = {
  flow: "物料 / 产品流",
  enable: "工艺 / 产能约束",
} as const;

export function StageChain({ selectedStageId, onSelectStage }: StageChainProps) {
  return (
    <section className="stage-chain-section" aria-label="AI 产业链 9 段主链">
      <header className="three-layer-section-heading">
        <span>1</span>
        <div>
          <h2>9 段主链</h2>
          <p>从材料、设备一路读到服务器网络和算力应用；点击任一阶段查看完整内部图。</p>
        </div>
      </header>

      <div className="stage-chain">
        {atlasStages.map((stage) => (
          <button
            key={stage.id}
            type="button"
            className="stage-card"
            data-tone={stage.tone}
            aria-label={stage.name}
            aria-pressed={stage.id === selectedStageId}
            onClick={() => onSelectStage(stage.id)}
          >
            <span>{String(stage.order).padStart(2, "0")}</span>
            <strong>{stage.name}</strong>
            <small>
              {stage.shortName} · {stage.role}
            </small>
          </button>
        ))}
      </div>

      <div className="main-chain-connections" aria-label="主链连接">
        {mainChainConnections.map((connection) => (
          <article
            key={connection.id}
            className="main-chain-connection"
            data-kind={connection.kind}
          >
            <strong>{connection.label}</strong>
            <small>{stageConnectionKindLabels[connection.kind]}</small>
            <p>{connection.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
