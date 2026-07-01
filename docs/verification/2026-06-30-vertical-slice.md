# AI 产业链图谱 vertical slice 验证记录

验证日期：2026-07-01  
本地地址：`http://127.0.0.1:3000`  
验证视口：桌面 `1440×900`，手机 `390×844`  
概念稿：`docs/design/2026-06-30-atlas-primary-screen-concept.png`  

## 截图证据

- 桌面 CPO 节点：[2026-06-30-desktop-cpo.png](./screenshots/2026-06-30-desktop-cpo.png)
- 桌面公司详情：[2026-06-30-desktop-company.png](./screenshots/2026-06-30-desktop-company.png)
- 手机 CPO 底部抽屉：[2026-06-30-mobile-cpo.png](./screenshots/2026-06-30-mobile-cpo.png)

## 自动化结果

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| Unit / component tests | PASS | `npm test`：8 files / 93 tests |
| TypeScript | PASS | `npm run typecheck` |
| Production build | PASS | `npm run build`，包含 `/api/atlas` 路由 |
| E2E | PASS | `npm run test:e2e`：桌面公司详情、手机层级筛选和 CPO 底部抽屉 |
| SQL migration replay | NOT RUN | 本机缺少 `psql`、`docker`、`supabase` CLI；部署前需在 Supabase/local Postgres 回放迁移 |

## 浏览器 QA

| 检查 | 桌面结果 | 手机结果 |
| --- | --- | --- |
| Page identity | PASS：标题 `AI Industry Atlas`，URL 为 CPO 分享链接 | PASS：URL 更新为 `?layer=interconnect&mode=supply&node=cpo` |
| 非空页面 | PASS：产业层级、关系图、CPO 抽屉均可见 | PASS：图谱背景和底部抽屉均可见 |
| Framework overlay | PASS：未见 Next.js 错误覆盖层 | PASS：未见 Next.js 错误覆盖层 |
| Console health | PASS：无 warn/error | PASS：无 warn/error |
| Interaction proof | PASS：点击 `博通 AVGO` 后打开公司详情，显示市场数据和供需关系 | PASS：展开层级、选择高速互联、点击 CPO 后打开底部抽屉 |

## Fidelity ledger

| comparison point | concept evidence | render evidence | mismatch | fix / decision |
| --- | --- | --- | --- | --- |
| 首屏层级 | 概念稿左侧为 7 层垂直产业导航 | 桌面截图显示 01-07 导航，`04 高速互联` 高亮 | 无明显偏差 | 保持 |
| 深蓝底色与琥珀高亮 | 概念稿使用深蓝画布和琥珀关系路径 | 桌面截图中画布深蓝、选中路径和节点边框为琥珀色 | 无明显偏差 | 保持 |
| 关系图密度 | 概念稿强调上下游箭头与节点连接 | 桌面截图显示材料/器件/PCB/交换 ASIC 到 CPO 的方向关系 | 部分右侧节点被详情抽屉遮挡，这是当前交互式抽屉布局的取舍 | 接受；图谱可横向滚动，E2E 覆盖核心路径 |
| CPO 图片位置 | 用户确认 AI 生成模拟图只放右上介绍区 | 桌面和手机截图均显示 CPO AI 技术图在节点详情顶部 | 无明显偏差 | 保持；公司和供需关系继续用 HTML 数据区 |
| 公司信息可更新 | 设计要求公司、行情、供需关系可动态更新 | 公司详情截图显示市场数据、角色、公开供需关系为代码渲染 | 当前 fixture 无实时行情，显示 `N/A` | 接受；Task 8 已加数据库/API 边界，后续接行情 provider |
| 手机访问 | 用户要求未来手机能访问 | 手机截图显示 390×844 下底部抽屉可读，层级筛选可展开/收起 | 页头品牌在底部抽屉截图中不在首屏，因抽屉覆盖主画布 | 接受；核心阅读和操作可用 |

## 备注

- Browser 插件首次连接截图时超时，按插件故障说明重新连接后完成验证；最终截图和控制台结果来自 in-app Browser。
- Playwright webServer 在默认沙箱内监听 3000 端口会触发 `EPERM`，已用批准的 `npm run test:e2e` 非沙箱运行完成。
