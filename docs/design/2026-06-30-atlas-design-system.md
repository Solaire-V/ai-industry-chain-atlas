# AI Industry Atlas Design System

## Accepted concept

- Primary screen: `docs/design/2026-06-30-atlas-primary-screen-concept.png`
- Native concept size: 1581 × 995
- Approved refinement: the raster AI illustration is limited to the top of the right detail drawer. Company rows, market snapshots, supply relationships, evidence and timestamps below it must be code-native and database-driven.

## Copy lock for the first viewport

- `AI INDUSTRY ATLAS`
- `产业内容 · 2026-06-30`
- `搜索节点、公司或代码`
- `关系模式`
- `直接关系`, `包含关系`, `全部关系`
- `01 原材料`, `02 制造设备`, `03 核心芯片`, `04 高速互联`, `05 算力设施`, `06 AI 平台`, `07 AI 应用`
- `高速互联 · 产业关系图`
- `InP材料`, `低损耗CCL`, `高多层PCB`, `光芯片`, `光引擎`, `CPO`, `交换ASIC`, `交换系统`, `AI服务器`, `AI集群`
- `CPO / 共封装光学`
- `技术解释`, `核心壁垒`, `代表公司`, `市场快照`, `证据支持的供需关系`

## Layout and containers

- Desktop shell: top header, 200 px left rail, open relationship canvas, 468 px light detail drawer at the 1581 px reference width.
- The graph is an open canvas with directional paths, not a card grid.
- The detail drawer is one continuous paper surface. Section dividers are hairlines; company and evidence rows are lists, not nested cards.
- Mobile: left rail becomes a filter control; the canvas retains a readable minimum width with horizontal panning; the drawer becomes a bottom sheet.

## Tokens

- Canvas: `#0c1822`
- Rail/panel: `#0e1c27`
- Hairline: `#29404d`
- Text on dark: `#eaf0f4`
- Muted on dark: `#78909e`
- Accent/selected path: `#d58b48`
- Drawer paper: `#f1f0ea`
- Ink on paper: `#1c2a33`
- Corner radii: 6 px controls, 8 px nodes and media frame
- Shadows: minimal; only drawer separation and selected-node emphasis

## Typography

- UI chrome: system sans / Chinese system sans, 12–14 px, medium weight, controlled line height.
- Main canvas title: 24–28 px, 750–800 weight.
- Node labels: 15–17 px, 650–750 weight.
- Drawer title: 28–32 px, 800 weight.
- Drawer body: 13–15 px, 1.55–1.7 line height.
- Do not rely on browser-default control typography.

## Image treatment

- The CPO technical cutaway is the only raster media in the vertical slice.
- Production asset: `public/images/cpo-technical-cutaway.png` (1672 × 941).
- It sits at the top of the light drawer in an implementation-stable landscape frame with no color overlay.
- It must be labelled `AI 生成技术示意图` in code outside the image.
- The lower drawer remains live HTML so companies, quotes, PE and supply evidence can update independently.

## Component families

- Quiet header search and three-state relationship control.
- Seven-row layer navigation with one amber selected rail.
- Graph nodes with default, related, selected, hover and keyboard-focus states.
- Directed relationship paths with muted and selected variants.
- Continuous detail drawer with technical image, text sections, company rows, market table and evidence timeline.
- Small outline icons only when they clarify navigation or controls; use one consistent 1.5 px stroke style.

## Interaction and motion

- Selecting a node highlights its first-degree upstream/downstream path and opens the drawer.
- Selecting a company replaces node detail with company detail without losing the node in the URL.
- Use 140–180 ms opacity/color transitions. Do not animate SVG geometry; respect `prefers-reduced-motion`.
