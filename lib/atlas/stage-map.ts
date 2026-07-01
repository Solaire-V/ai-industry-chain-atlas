export type AtlasStageId =
  | "materials"
  | "equipment"
  | "ai-chip"
  | "hbm-memory"
  | "advanced-packaging"
  | "board-system"
  | "optical-interconnect"
  | "server-network"
  | "compute-applications";

export type StageTone =
  | "material"
  | "equipment"
  | "chip"
  | "memory"
  | "packaging"
  | "board"
  | "optical"
  | "infrastructure"
  | "application";

export type StageConnectionKind = "flow" | "enable";
export type StageSubnodeKind =
  | "material"
  | "equipment"
  | "component"
  | "system"
  | "software"
  | "application";

export interface StageSubnode {
  id: string;
  label: string;
  description: string;
  kind: StageSubnodeKind;
  realNodeId?: string;
}

export interface StageGroup {
  id: string;
  title: string;
  summary: string;
  nodes: readonly StageSubnode[];
}

export interface StageDiagramNode {
  id: string;
  label: string;
  detail: string;
  kind: StageSubnodeKind;
  realNodeId?: string;
}

export interface StageDiagram {
  title: string;
  summary: string;
  inputs: readonly StageDiagramNode[];
  core: readonly StageDiagramNode[];
  outputs: readonly StageDiagramNode[];
}

export interface StageConnection {
  id: string;
  label: string;
  kind: StageConnectionKind;
}

export interface AtlasStage {
  id: AtlasStageId;
  order: number;
  name: string;
  shortName: string;
  role: string;
  input: string;
  output: string;
  summary: string;
  tone: StageTone;
  representativeNodeIds: readonly string[];
  diagram: StageDiagram;
  groups: readonly StageGroup[];
  internalConnections: readonly StageConnection[];
}

export interface MainChainConnection {
  id: string;
  from: AtlasStageId;
  to: AtlasStageId;
  kind: StageConnectionKind;
  label: string;
  summary: string;
}

export const atlasStages: readonly AtlasStage[] = [
  {
    id: "materials",
    order: 1,
    name: "材料",
    shortName: "材料",
    role: "为芯片、HBM、先进封装、板级系统和光互联提供实体物料输入。",
    input: "基础资源、化工、金属加工、晶体生长、玻璃与高分子体系",
    output: "电子材料、封装材料、PCB 材料、光通信材料、热管理材料",
    summary: "材料拆到最小子节点后，后续才能逐一挂公司、产能、价格和供需关系。",
    tone: "material",
    representativeNodeIds: [
      "inp-material",
      "silicon-photonics-material",
      "optical-fiber-preform",
      "low-loss-ccl",
    ],
    diagram: {
      title: "材料输入层",
      summary: "从基础资源和化工/金属加工开始，输出到电子、封装、PCB、光通信和热管理材料。",
      inputs: [
        {
          id: "base-resources",
          label: "基础资源 / 化工",
          detail: "化工品、金属、晶体生长、玻璃和高分子体系。",
          kind: "material",
        },
        {
          id: "processing-capability",
          label: "提纯 / 加工",
          detail: "把基础资源转化为可进入半导体和光通信工艺的材料。",
          kind: "equipment",
        },
      ],
      core: [
        {
          id: "wafer-substrate-core",
          label: "晶圆 / 衬底",
          detail: "硅片、SOI、InP、GaAs 等底层材料平台。",
          kind: "material",
        },
        {
          id: "patterning-core",
          label: "图形化材料",
          detail: "光刻胶、显影液、剥离液、掩膜版。",
          kind: "material",
        },
        {
          id: "deposition-core",
          label: "薄膜 / 沉积材料",
          detail: "电子气体、前驱体和靶材。",
          kind: "material",
        },
        {
          id: "wet-cmp-core",
          label: "CMP / 湿电子",
          detail: "抛光、清洗和湿法处理所需材料。",
          kind: "material",
        },
        {
          id: "packaging-pcb-optical-core",
          label: "封装 / PCB / 光通信 / 热管理",
          detail: "ABF、低损耗 CCL、光纤预制棒、液冷液等进入下游阶段。",
          kind: "material",
        },
      ],
      outputs: [
        {
          id: "semiconductor-materials",
          label: "电子材料",
          detail: "进入 AI 芯片与 HBM 前道制造。",
          kind: "material",
        },
        {
          id: "packaging-materials-output",
          label: "封装材料",
          detail: "进入 HBM、CoWoS、2.5D/3D 和封装基板。",
          kind: "material",
        },
        {
          id: "pcb-materials-output",
          label: "PCB 材料",
          detail: "进入高速板、服务器主板和交换机板卡。",
          kind: "material",
        },
        {
          id: "optical-materials-output",
          label: "光通信材料",
          detail: "进入光芯片、光模块和光连接。",
          kind: "material",
        },
        {
          id: "thermal-materials-output",
          label: "热管理材料",
          detail: "进入板级系统、服务器和机柜散热。",
          kind: "material",
        },
      ],
    },
    groups: [
      {
        id: "wafer-substrate",
        title: "晶圆 / 衬底",
        summary: "决定前道芯片、存储与光电器件的底层材料平台。",
        nodes: [
          {
            id: "silicon-wafer",
            label: "硅片",
            description: "AI 芯片与 HBM 前道制造的基础晶圆材料。",
            kind: "material",
          },
          {
            id: "soi",
            label: "SOI",
            description: "硅光芯片常用衬底平台。",
            kind: "material",
            realNodeId: "silicon-photonics-material",
          },
          {
            id: "inp",
            label: "InP",
            description: "激光器、EML 等高速光源器件的重要化合物半导体材料。",
            kind: "material",
            realNodeId: "inp-material",
          },
          {
            id: "gaas",
            label: "GaAs",
            description: "部分光电与射频器件使用的化合物半导体材料。",
            kind: "material",
          },
        ],
      },
      {
        id: "patterning-materials",
        title: "图形化材料",
        summary: "负责把电路图形稳定转移到晶圆上。",
        nodes: [
          {
            id: "photoresist",
            label: "光刻胶",
            description: "图形转移核心材料。",
            kind: "material",
          },
          {
            id: "developer",
            label: "显影液",
            description: "显影光刻胶图形。",
            kind: "material",
          },
          {
            id: "stripper",
            label: "剥离液",
            description: "去除残余光刻胶或牺牲层。",
            kind: "material",
          },
          {
            id: "photomask",
            label: "掩膜版",
            description: "承载晶圆制造所需版图。",
            kind: "material",
          },
        ],
      },
      {
        id: "thin-film-deposition-materials",
        title: "薄膜 / 沉积材料",
        summary: "用于沉积介质层、金属层与阻挡层。",
        nodes: [
          {
            id: "electronic-gases",
            label: "电子气体",
            description: "刻蚀、清洗、沉积等环节通用。",
            kind: "material",
          },
          {
            id: "precursors",
            label: "前驱体",
            description: "ALD/CVD 薄膜沉积材料。",
            kind: "material",
          },
          {
            id: "targets",
            label: "靶材",
            description: "PVD 金属薄膜材料。",
            kind: "material",
          },
        ],
      },
      {
        id: "cmp-wet-chemicals",
        title: "CMP / 湿电子",
        summary: "控制晶圆平坦化、清洗和湿法处理良率。",
        nodes: [
          {
            id: "cmp-slurry",
            label: "CMP 抛光液",
            description: "化学机械抛光消耗材料。",
            kind: "material",
          },
          {
            id: "cmp-pad",
            label: "CMP 抛光垫",
            description: "与抛光液共同决定平坦化效果。",
            kind: "material",
          },
          {
            id: "wet-electronic-chemicals",
            label: "高纯湿电子化学品",
            description: "清洗、刻蚀、剥离等湿法工艺材料。",
            kind: "material",
          },
        ],
      },
      {
        id: "packaging-materials",
        title: "封装材料",
        summary: "进入 HBM、CoWoS、2.5D/3D 与高端封装结构。",
        nodes: [
          {
            id: "abf",
            label: "ABF",
            description: "高端封装载板核心材料。",
            kind: "material",
          },
          {
            id: "bt",
            label: "BT",
            description: "封装基板常用树脂材料。",
            kind: "material",
          },
          {
            id: "underfill",
            label: "Underfill",
            description: "提升芯片与基板连接可靠性。",
            kind: "material",
          },
          {
            id: "emc",
            label: "EMC",
            description: "封装塑封保护材料。",
            kind: "material",
          },
          {
            id: "solder-balls-paste",
            label: "锡球 / 锡膏",
            description: "封装互连焊接材料。",
            kind: "material",
          },
          {
            id: "tim",
            label: "TIM",
            description: "把芯片热量传导到散热系统。",
            kind: "material",
          },
        ],
      },
      {
        id: "pcb-materials",
        title: "PCB 材料",
        summary: "决定高速板卡、交换机和服务器主板的插损与可靠性。",
        nodes: [
          {
            id: "low-loss-ccl",
            label: "低损耗 CCL",
            description: "高速 PCB 的低介电损耗基材。",
            kind: "material",
            realNodeId: "low-loss-ccl",
          },
          {
            id: "copper-foil",
            label: "铜箔",
            description: "高速线路导体材料。",
            kind: "material",
          },
          {
            id: "glass-fabric",
            label: "玻纤布",
            description: "PCB 结构增强材料。",
            kind: "material",
          },
          {
            id: "resin",
            label: "树脂",
            description: "影响介电性能、热可靠性与加工窗口。",
            kind: "material",
          },
        ],
      },
      {
        id: "optical-communication-materials",
        title: "光通信材料",
        summary: "进入光纤、连接器、光模块和光路耦合。",
        nodes: [
          {
            id: "optical-fiber-preform",
            label: "光纤预制棒",
            description: "光纤拉丝前的核心材料。",
            kind: "material",
            realNodeId: "optical-fiber-preform",
          },
          {
            id: "optical-fiber",
            label: "光纤",
            description: "数据中心光链路传输介质。",
            kind: "material",
          },
          {
            id: "ceramic-ferrule",
            label: "陶瓷插芯",
            description: "光连接器精密对准部件。",
            kind: "material",
          },
          {
            id: "mt-ferrule",
            label: "MT Ferrule",
            description: "多芯光纤连接器中的精密对准部件。",
            kind: "material",
          },
          {
            id: "lens",
            label: "透镜",
            description: "光路耦合与准直元件。",
            kind: "material",
          },
          {
            id: "optical-adhesive",
            label: "光学胶",
            description: "光器件封装和耦合固定材料。",
            kind: "material",
          },
        ],
      },
      {
        id: "thermal-management-materials",
        title: "热管理材料",
        summary: "支撑高功耗芯片、板卡和服务器的散热路径。",
        nodes: [
          {
            id: "coolant",
            label: "液冷液",
            description: "液冷系统的循环冷却介质。",
            kind: "material",
          },
          {
            id: "thermal-pad",
            label: "导热垫",
            description: "填充器件与散热结构之间的间隙。",
            kind: "material",
          },
          {
            id: "thermal-gel",
            label: "导热凝胶",
            description: "高贴合度热界面材料。",
            kind: "material",
          },
          {
            id: "phase-change-material",
            label: "相变材料",
            description: "利用相变吸热平滑热峰值。",
            kind: "material",
          },
        ],
      },
    ],
    internalConnections: [
      { id: "substrate-to-chip", label: "硅片 / SOI / InP → 芯片与光电器件", kind: "flow" },
      { id: "gases-to-fab", label: "电子气体 / 前驱体 / 靶材 → 晶圆制造", kind: "flow" },
      { id: "abf-to-packaging", label: "ABF / Underfill / TIM → 先进封装", kind: "flow" },
      { id: "ccl-to-board", label: "低损耗 CCL / 铜箔 / 玻纤布 → 高速 PCB", kind: "flow" },
      { id: "preform-to-optical", label: "光纤预制棒 / 光纤 / 透镜 → 光互联", kind: "flow" },
    ],
  },
  {
    id: "equipment",
    order: 2,
    name: "设备",
    shortName: "设备",
    role: "作为工艺、产能和良率约束，决定芯片、HBM、封装、PCB 与光互联能否稳定量产。",
    input: "机床、光学、真空、运动控制、检测与自动化",
    output: "制造能力、良率、产能和工艺窗口",
    summary: "设备不进入最终产品，但以使能关系持续约束多个下游阶段。",
    tone: "equipment",
    representativeNodeIds: [],
    diagram: {
      title: "制造设备使能层",
      summary: "设备把制造能力输入到芯片、HBM、封装、PCB 和光互联阶段。",
      inputs: [
        {
          id: "equipment-foundation",
          label: "光学 / 真空 / 运动控制",
          detail: "高精度制造设备的底层能力。",
          kind: "equipment",
        },
        {
          id: "automation-test",
          label: "自动化 / 检测",
          detail: "把工艺窗口转化为量产稳定性。",
          kind: "equipment",
        },
      ],
      core: [
        {
          id: "front-end-equipment-core",
          label: "前道设备",
          detail: "光刻、刻蚀、薄膜沉积、离子注入、CMP、清洗、量测检测。",
          kind: "equipment",
        },
        {
          id: "packaging-equipment-core",
          label: "封装设备",
          detail: "切割、贴片、键合、塑封、底填和封装检测。",
          kind: "equipment",
        },
        {
          id: "test-equipment-core",
          label: "测试设备",
          detail: "探针台、测试机、老化设备和高速测试。",
          kind: "equipment",
        },
        {
          id: "pcb-optical-equipment-core",
          label: "PCB / 光模块设备",
          detail: "钻孔、电镀、压合、光耦合、主动对准和可靠性测试。",
          kind: "equipment",
        },
      ],
      outputs: [
        {
          id: "chip-manufacturing-capability",
          label: "芯片制造能力",
          detail: "先进制程良率和产能。",
          kind: "equipment",
        },
        {
          id: "memory-packaging-capability",
          label: "HBM / 封装量产能力",
          detail: "堆叠、键合、封装和测试能力。",
          kind: "equipment",
        },
        {
          id: "board-optical-capability",
          label: "PCB / 光互联良率",
          detail: "高速板和光模块量产窗口。",
          kind: "equipment",
        },
      ],
    },
    groups: [
      {
        id: "front-end-equipment",
        title: "前道设备",
        summary: "作用在 AI 芯片、存储与光芯片晶圆制造。",
        nodes: [
          { id: "lithography", label: "光刻", description: "图形化核心设备。", kind: "equipment" },
          { id: "etch", label: "刻蚀", description: "形成精细结构。", kind: "equipment" },
          { id: "deposition", label: "薄膜沉积", description: "沉积介质、金属与阻挡层。", kind: "equipment" },
          { id: "ion-implantation", label: "离子注入", description: "改变半导体掺杂分布。", kind: "equipment" },
          { id: "cmp-equipment", label: "CMP", description: "晶圆平坦化设备。", kind: "equipment" },
          { id: "cleaning", label: "清洗", description: "去除颗粒与残留污染。", kind: "equipment" },
          { id: "metrology-inspection", label: "量测检测", description: "控制关键尺寸、缺陷和良率。", kind: "equipment" },
        ],
      },
      {
        id: "packaging-equipment",
        title: "封装设备",
        summary: "作用在 HBM、先进封装和高端器件封装。",
        nodes: [
          { id: "dicing", label: "切割", description: "晶圆切割成裸片。", kind: "equipment" },
          { id: "die-attach", label: "贴片", description: "把裸片贴装到封装结构。", kind: "equipment" },
          { id: "bonding", label: "键合", description: "芯片到芯片或芯片到基板互连。", kind: "equipment" },
          { id: "hybrid-bonding", label: "混合键合", description: "高密度垂直互连工艺。", kind: "equipment" },
          { id: "molding", label: "塑封", description: "保护芯片和互连结构。", kind: "equipment" },
          { id: "underfill-equipment", label: "底填", description: "完成芯片底部填充工艺。", kind: "equipment" },
          { id: "package-inspection", label: "封装检测", description: "检查封装缺陷和可靠性风险。", kind: "equipment" },
        ],
      },
      {
        id: "test-equipment",
        title: "测试设备",
        summary: "覆盖晶圆级、成品级和高速信号测试。",
        nodes: [
          { id: "prober", label: "探针台", description: "晶圆级电性测试设备。", kind: "equipment" },
          { id: "tester", label: "测试机", description: "成品和高速芯片测试平台。", kind: "equipment" },
          { id: "burn-in-equipment", label: "老化设备", description: "筛选长期可靠性风险。", kind: "equipment" },
          { id: "high-speed-test", label: "高速测试", description: "验证高速电/光信号指标。", kind: "equipment" },
        ],
      },
      {
        id: "pcb-equipment",
        title: "PCB 设备",
        summary: "作用在高多层板、高速背板和交换机板卡。",
        nodes: [
          { id: "drilling", label: "钻孔", description: "形成通孔与微孔。", kind: "equipment" },
          { id: "plating", label: "电镀", description: "形成铜互连。", kind: "equipment" },
          { id: "lamination", label: "压合", description: "多层板层压成型。", kind: "equipment" },
          { id: "exposure", label: "曝光", description: "把线路图形转移到 PCB 制程中。", kind: "equipment" },
          { id: "aoi", label: "AOI", description: "自动光学检测缺陷。", kind: "equipment" },
        ],
      },
      {
        id: "optical-module-equipment",
        title: "光模块设备",
        summary: "作用在光引擎和高速光模块量产。",
        nodes: [
          { id: "optical-coupling", label: "光耦合", description: "完成芯片与光纤/透镜高精度耦合。", kind: "equipment" },
          { id: "precision-assembly", label: "精密贴装", description: "贴装激光器、透镜和光电芯片。", kind: "equipment" },
          { id: "active-alignment", label: "主动对准", description: "用信号反馈完成高精度光路对准。", kind: "equipment" },
          { id: "optical-high-speed-test", label: "高速测试", description: "验证光模块高速指标。", kind: "equipment" },
          { id: "optical-burn-in", label: "老化测试", description: "筛选光模块可靠性风险。", kind: "equipment" },
        ],
      },
    ],
    internalConnections: [
      { id: "front-end-to-chip", label: "前道设备 ⇢ AI 芯片 / HBM / 光芯片", kind: "enable" },
      { id: "packaging-tools-to-packaging", label: "封装设备 ⇢ HBM / 先进封装", kind: "enable" },
      { id: "test-tools-to-yield", label: "测试设备 ⇢ 良率筛选 / 量产爬坡", kind: "enable" },
      { id: "pcb-tools-to-board", label: "PCB 设备 ⇢ 高速板级系统", kind: "enable" },
      { id: "optical-tools-to-modules", label: "光模块设备 ⇢ 光引擎 / 光模块", kind: "enable" },
    ],
  },
  {
    id: "ai-chip",
    order: 3,
    name: "AI 芯片",
    shortName: "AI 芯片",
    role: "提供训练、推理和网络交换所需的核心计算与控制芯片。",
    input: "EDA/IP、芯片架构、硅片、电子材料和前道设备",
    output: "GPU、ASIC、NPU、CPU、交换 ASIC 和裸 Die",
    summary: "AI 芯片从设计验证到流片制造，再与 HBM 和先进封装接口协同。",
    tone: "chip",
    representativeNodeIds: ["switch-asic"],
    diagram: {
      title: "AI 芯片设计与制造",
      summary: "从 EDA/IP 和芯片架构开始，经过设计、验证、流片和晶圆制造，输出计算芯片或裸 Die。",
      inputs: [
        {
          id: "eda-ip-input",
          label: "EDA / IP",
          detail: "设计工具、接口 IP、验证环境和基础模块。",
          kind: "software",
        },
        {
          id: "semiconductor-materials-input",
          label: "硅片 / 电子材料",
          detail: "硅片、电子气体、前驱体、光刻胶等进入前道制造。",
          kind: "material",
        },
        {
          id: "front-end-equipment-input",
          label: "前道设备",
          detail: "光刻、刻蚀、沉积、CMP 和量测检测决定良率。",
          kind: "equipment",
        },
      ],
      core: [
        {
          id: "architecture-design-core",
          label: "架构设计",
          detail: "确定 GPU、ASIC、NPU 或 CPU 的算力结构。",
          kind: "component",
        },
        {
          id: "design-verification-core",
          label: "设计 / 验证 / 流片",
          detail: "把芯片架构变成可制造版图并进入晶圆厂。",
          kind: "software",
        },
        {
          id: "wafer-fab-core",
          label: "晶圆制造",
          detail: "先进制程制造计算芯片和网络芯片。",
          kind: "equipment",
        },
      ],
      outputs: [
        {
          id: "compute-chip-output",
          label: "GPU / ASIC / NPU / CPU",
          detail: "训练和推理所需的计算芯片。",
          kind: "component",
        },
        {
          id: "switch-asic-output",
          label: "交换 ASIC",
          detail: "AI 集群网络交换芯片。",
          kind: "component",
          realNodeId: "switch-asic",
        },
        {
          id: "bare-die-output",
          label: "裸 Die",
          detail: "进入先进封装并与 HBM 集成。",
          kind: "component",
        },
      ],
    },
    groups: [
      {
        id: "design-stack",
        title: "设计与架构",
        summary: "从工具、IP 和架构方案定义芯片能力边界。",
        nodes: [
          { id: "eda-ip", label: "EDA/IP", description: "芯片设计工具和基础 IP。", kind: "software" },
          { id: "architecture-design", label: "架构设计", description: "定义计算、缓存、互联和接口架构。", kind: "component" },
        ],
      },
      {
        id: "compute-chip-types",
        title: "计算与网络芯片",
        summary: "训练、推理和集群网络的核心芯片类别。",
        nodes: [
          { id: "gpu", label: "GPU", description: "训练和推理的通用并行计算核心。", kind: "component" },
          { id: "asic", label: "ASIC", description: "面向特定工作负载优化的专用芯片。", kind: "component" },
          { id: "npu", label: "NPU", description: "面向神经网络加速的处理器。", kind: "component" },
          { id: "cpu", label: "CPU", description: "服务器通用控制和调度处理器。", kind: "component" },
          {
            id: "switch-asic-node",
            label: "交换 ASIC",
            description: "AI 网络交换机中的核心转发芯片。",
            kind: "component",
            realNodeId: "switch-asic",
          },
        ],
      },
      {
        id: "manufacturing-interface",
        title: "制造与封装接口",
        summary: "从晶圆制造输出裸 Die，并为 HBM 与先进封装预留接口。",
        nodes: [
          { id: "wafer-fabrication", label: "晶圆制造", description: "把芯片版图制造成晶圆。", kind: "equipment" },
          { id: "bare-die", label: "裸 Die", description: "切割后进入封装的芯片裸片。", kind: "component" },
          { id: "hbm-interface", label: "HBM 接口", description: "为高带宽存储靠近计算芯片做接口准备。", kind: "component" },
          { id: "packaging-interface", label: "先进封装接口", description: "连接 Interposer、封装基板和高速互联。", kind: "component" },
        ],
      },
    ],
    internalConnections: [
      { id: "eda-to-architecture", label: "EDA/IP → 架构设计", kind: "flow" },
      { id: "architecture-to-fab", label: "架构设计 → 验证 / 流片 / 晶圆制造", kind: "flow" },
      { id: "die-to-packaging", label: "裸 Die → 先进封装", kind: "flow" },
      { id: "switch-asic-to-optical", label: "交换 ASIC → 光互联近端电接口", kind: "flow" },
    ],
  },
  {
    id: "hbm-memory",
    order: 4,
    name: "HBM 存储",
    shortName: "HBM",
    role: "提供靠近计算芯片的高带宽内存，并通过先进封装释放算力性能。",
    input: "DRAM Die、TSV、减薄、堆叠、键合、测试设备和电子材料",
    output: "HBM 模组以及补充存储系统",
    summary: "HBM 通过 TSV、堆叠和测试形成模组，再进入先进封装与 AI 芯片集成。",
    tone: "memory",
    representativeNodeIds: ["hbm"],
    diagram: {
      title: "HBM 堆叠与测试",
      summary: "从 DRAM Die 开始，经过 TSV、减薄、堆叠、键合和测试，输出 HBM 模组。",
      inputs: [
        {
          id: "dram-die-input",
          label: "DRAM Die",
          detail: "HBM 的存储裸片来源。",
          kind: "component",
        },
        {
          id: "hbm-materials-equipment-input",
          label: "电子材料 / 堆叠设备",
          detail: "硅片、电子材料、键合、减薄和测试设备。",
          kind: "equipment",
        },
      ],
      core: [
        {
          id: "tsv-core",
          label: "TSV",
          detail: "实现垂直互连的硅通孔。",
          kind: "component",
        },
        {
          id: "thinning-stacking-core",
          label: "减薄 / 堆叠 / 键合",
          detail: "把多层 DRAM Die 形成高密度堆叠。",
          kind: "equipment",
        },
        {
          id: "hbm-test-core",
          label: "HBM 测试",
          detail: "筛选容量、带宽、功耗和可靠性。",
          kind: "equipment",
        },
      ],
      outputs: [
        {
          id: "hbm-module-output",
          label: "HBM 模组",
          detail: "进入先进封装并靠近 AI 计算芯片。",
          kind: "component",
          realNodeId: "hbm",
        },
        {
          id: "ssd-storage-output",
          label: "SSD / 存储系统",
          detail: "作为训练数据和集群存储的补充链路。",
          kind: "system",
        },
      ],
    },
    groups: [
      {
        id: "hbm-stack",
        title: "HBM 堆叠链路",
        summary: "DRAM Die 通过 TSV、减薄、堆叠和键合形成高带宽内存。",
        nodes: [
          { id: "dram-die", label: "DRAM Die", description: "HBM 的存储裸片。", kind: "component" },
          { id: "tsv", label: "TSV", description: "垂直互连硅通孔。", kind: "component" },
          { id: "wafer-thinning", label: "Wafer thinning", description: "减薄晶圆以支持多层堆叠。", kind: "equipment" },
          { id: "stacking-bonding", label: "堆叠与键合", description: "把多层 DRAM Die 可靠连接。", kind: "equipment" },
          { id: "hbm-test", label: "HBM 测试", description: "验证带宽、容量、功耗和可靠性。", kind: "equipment" },
          {
            id: "hbm-module",
            label: "HBM 模组",
            description: "进入先进封装的高带宽内存产品形态。",
            kind: "component",
            realNodeId: "hbm",
          },
        ],
      },
      {
        id: "storage-extension",
        title: "补充存储链路",
        summary: "SSD 和存储系统支撑训练数据、缓存和集群数据吞吐。",
        nodes: [
          { id: "ssd", label: "SSD", description: "AI 训练数据和缓存的高速存储介质。", kind: "system" },
          { id: "storage-system", label: "存储系统", description: "支撑集群数据管理和吞吐。", kind: "system" },
        ],
      },
    ],
    internalConnections: [
      { id: "dram-to-tsv", label: "DRAM Die → TSV", kind: "flow" },
      { id: "tsv-to-stack", label: "TSV → 减薄 / 堆叠 / 键合", kind: "flow" },
      { id: "stack-to-test", label: "堆叠与键合 → HBM 测试", kind: "flow" },
      { id: "hbm-to-packaging", label: "HBM 模组 → 先进封装", kind: "flow" },
    ],
  },
  {
    id: "advanced-packaging",
    order: 5,
    name: "先进封装",
    shortName: "先进封装",
    role: "把 AI 芯片 Die、HBM、Interposer、封装基板和封装材料集成为加速器模组。",
    input: "AI Die、HBM、Interposer、封装基板、ABF、Underfill、EMC、TIM 和封装设备",
    output: "CoWoS、2.5D/3D 封装、封装基板和加速器模组",
    summary: "先进封装是 AI 芯片性能释放的物理互联层，让计算芯片与 HBM 靠近。",
    tone: "packaging",
    representativeNodeIds: ["hbm"],
    diagram: {
      title: "先进封装集成",
      summary: "从 AI 芯片 Die、HBM、Interposer、封装基板和封装材料输入开始，输出加速器模组。",
      inputs: [
        {
          id: "ai-die-input",
          label: "AI Die",
          detail: "来自 AI 芯片阶段的计算裸片。",
          kind: "component",
        },
        {
          id: "hbm-input",
          label: "HBM",
          detail: "来自 HBM 存储阶段的高带宽内存。",
          kind: "component",
          realNodeId: "hbm",
        },
        {
          id: "packaging-material-input",
          label: "ABF / Underfill / TIM",
          detail: "来自材料阶段的高端封装材料。",
          kind: "material",
        },
      ],
      core: [
        {
          id: "silicon-interposer-core",
          label: "Silicon Interposer",
          detail: "连接 AI Die 与 HBM 的高密度互联层。",
          kind: "component",
        },
        {
          id: "cowos-core",
          label: "CoWoS",
          detail: "典型 2.5D 高端封装能力。",
          kind: "component",
        },
        {
          id: "package-substrate-core",
          label: "封装基板",
          detail: "连接封装模组与板级系统。",
          kind: "component",
        },
      ],
      outputs: [
        {
          id: "accelerator-module-output",
          label: "加速器模组",
          detail: "进入 PCB、主板和服务器板级系统。",
          kind: "component",
        },
        {
          id: "two-five-three-d-output",
          label: "2.5D / 3D 封装",
          detail: "高密度封装产品形态。",
          kind: "component",
        },
      ],
    },
    groups: [
      {
        id: "package-inputs",
        title: "封装输入",
        summary: "计算芯片、HBM 和封装材料共同进入先进封装。",
        nodes: [
          { id: "ai-die", label: "AI Die", description: "计算芯片裸片。", kind: "component" },
          { id: "hbm-package-input", label: "HBM", description: "靠近计算芯片的高带宽内存。", kind: "component", realNodeId: "hbm" },
          { id: "underfill-emc-tim", label: "Underfill / EMC / TIM", description: "底填、塑封和导热材料。", kind: "material" },
        ],
      },
      {
        id: "package-structures",
        title: "封装结构",
        summary: "中介层、CoWoS、2.5D/3D 和封装基板承担高密度互联。",
        nodes: [
          { id: "silicon-interposer", label: "Silicon Interposer", description: "硅中介层。", kind: "component" },
          { id: "cowos", label: "CoWoS", description: "高端 2.5D 封装技术路线。", kind: "component" },
          { id: "two-five-d", label: "2.5D 封装", description: "用中介层或重布线层横向集成多颗芯片。", kind: "component" },
          { id: "three-d-packaging", label: "3D 封装", description: "垂直堆叠与高密度互连。", kind: "component" },
          { id: "package-substrate", label: "封装基板", description: "芯片与 PCB 之间的高密度连接层。", kind: "component" },
          { id: "accelerator-module", label: "加速器模组", description: "封装完成后进入板级系统的模块。", kind: "component" },
        ],
      },
    ],
    internalConnections: [
      { id: "ai-die-hbm-to-interposer", label: "AI Die + HBM → Silicon Interposer", kind: "flow" },
      { id: "interposer-to-cowos", label: "Silicon Interposer → CoWoS / 2.5D", kind: "flow" },
      { id: "package-substrate-to-module", label: "封装基板 → 加速器模组", kind: "flow" },
      { id: "module-to-board", label: "加速器模组 → 板级系统", kind: "flow" },
    ],
  },
  {
    id: "board-system",
    order: 6,
    name: "板级系统",
    shortName: "板级系统",
    role: "把加速器模组、PCB、连接器、电源和散热结构组织为服务器板级硬件。",
    input: "加速器模组、PCB、低损耗 CCL、连接器、电源和散热材料",
    output: "加速卡、主板、服务器板级系统和整机结构件",
    summary: "板级系统承接封装模组，并把高速电连接、电源和散热压力传导到服务器网络。",
    tone: "board",
    representativeNodeIds: ["high-layer-pcb", "low-loss-ccl"],
    diagram: {
      title: "板级系统集成",
      summary: "从加速器模组、PCB、连接器、电源和散热材料输入开始，输出加速卡、主板和服务器板级系统。",
      inputs: [
        {
          id: "accelerator-module-input",
          label: "加速器模组",
          detail: "来自先进封装阶段的计算模组。",
          kind: "component",
        },
        {
          id: "pcb-material-input",
          label: "低损耗 CCL / 铜箔 / 玻纤布",
          detail: "高速板所需的关键 PCB 材料。",
          kind: "material",
          realNodeId: "low-loss-ccl",
        },
        {
          id: "power-cooling-input",
          label: "电源 / 液冷 / TIM",
          detail: "高功耗板卡所需供电和散热输入。",
          kind: "component",
        },
      ],
      core: [
        {
          id: "high-speed-board-core",
          label: "PCB / HDI / 高速板",
          detail: "承载高速信号、电源和器件装配。",
          kind: "component",
          realNodeId: "high-layer-pcb",
        },
        {
          id: "connector-power-core",
          label: "高速连接器 / VRM",
          detail: "实现板间连接和局部供电。",
          kind: "component",
        },
        {
          id: "liquid-cooling-core",
          label: "液冷板 / 散热结构",
          detail: "带走高功耗器件热量。",
          kind: "component",
        },
      ],
      outputs: [
        {
          id: "accelerator-card-output",
          label: "加速卡",
          detail: "进入 AI 服务器的计算板卡。",
          kind: "component",
        },
        {
          id: "motherboard-output",
          label: "主板",
          detail: "服务器系统的承载板。",
          kind: "component",
        },
        {
          id: "server-board-system-output",
          label: "服务器板级系统",
          detail: "进入服务器和交换机整机集成。",
          kind: "system",
        },
      ],
    },
    groups: [
      {
        id: "board-interconnect",
        title: "高速板级互联",
        summary: "PCB、连接器和高速通道承载芯片、板卡和交换设备连接。",
        nodes: [
          {
            id: "high-layer-pcb-node",
            label: "PCB / HDI / 高速板",
            description: "AI 服务器与交换机中的高多层高速 PCB。",
            kind: "component",
            realNodeId: "high-layer-pcb",
          },
          {
            id: "low-loss-ccl-board-node",
            label: "低损耗 CCL",
            description: "高速 PCB 的低损耗基材。",
            kind: "material",
            realNodeId: "low-loss-ccl",
          },
          { id: "high-speed-connector", label: "高速连接器", description: "板间或线缆高速连接。", kind: "component" },
        ],
      },
      {
        id: "power-cooling-structure",
        title: "电源、散热与结构",
        summary: "高功耗 AI 板卡必须同时解决供电、散热和机械结构。",
        nodes: [
          { id: "vrm-power-module", label: "VRM / 电源模块", description: "为加速器和高速芯片稳定供电。", kind: "component" },
          { id: "liquid-cold-plate", label: "液冷板 / 冷却液 / TIM", description: "液冷和热界面材料形成散热路径。", kind: "component" },
          { id: "accelerator-card", label: "加速卡", description: "承载 AI 加速器模组的板卡。", kind: "component" },
          { id: "motherboard", label: "主板", description: "服务器系统的核心承载板。", kind: "component" },
          { id: "mechanical-structure", label: "整机结构件", description: "机箱、固定件和导流结构。", kind: "component" },
        ],
      },
    ],
    internalConnections: [
      { id: "module-to-pcb", label: "加速器模组 → PCB / HDI / 高速板", kind: "flow" },
      { id: "pcb-to-card", label: "高速板 + 连接器 + 电源 → 加速卡 / 主板", kind: "flow" },
      { id: "cooling-to-system", label: "液冷板 / 冷却液 / TIM → 服务器板级系统", kind: "flow" },
      { id: "board-to-server-network", label: "板级系统 → AI 服务器 / 交换机", kind: "flow" },
    ],
  },
  {
    id: "optical-interconnect",
    order: 7,
    name: "光互联",
    shortName: "光互联",
    role: "把高速电信号转换成光信号，支撑 AI 集群横向扩展和低功耗互联。",
    input: "InP、SOI、光纤、透镜、光芯片、电子芯片、光耦合和高速测试设备",
    output: "光引擎、CPO、可插拔光模块、OCS 和交换机连接能力",
    summary: "光互联把光材料、光电器件、光引擎和模块产品连接起来，解决集群网络带宽与功耗瓶颈。",
    tone: "optical",
    representativeNodeIds: [
      "optical-chip",
      "laser",
      "modulator",
      "tia-driver",
      "optical-dsp",
      "fa-mpo",
      "optical-engine",
      "cpo",
      "pluggable-optics",
    ],
    diagram: {
      title: "光互联内部图",
      summary: "从光材料、光芯片、电子芯片和光耦合设备开始，输出 CPO、可插拔光模块、OCS 和交换机连接能力。",
      inputs: [
        {
          id: "inp-soi-input",
          label: "InP / SOI",
          detail: "激光器、硅光芯片和高速光电器件的材料平台。",
          kind: "material",
        },
        {
          id: "fiber-lens-input",
          label: "光纤 / 透镜",
          detail: "完成光路传输、耦合和准直。",
          kind: "material",
        },
        {
          id: "optical-coupling-test-input",
          label: "光耦合 / 高速测试设备",
          detail: "决定光引擎和高速光模块的量产良率。",
          kind: "equipment",
        },
        {
          id: "switch-asic-electrical-input",
          label: "交换 ASIC / 高速电信号",
          detail: "交换芯片近端高速电信号进入光电转换。",
          kind: "component",
        },
      ],
      core: [
        {
          id: "optical-chip-core",
          label: "光芯片",
          detail: "硅光或 III-V 光电芯片。",
          kind: "component",
          realNodeId: "optical-chip",
        },
        {
          id: "laser-core",
          label: "激光器",
          detail: "数据中心高速光源。",
          kind: "component",
          realNodeId: "laser",
        },
        {
          id: "modulator-core",
          label: "调制器",
          detail: "把电信号调制到光载波。",
          kind: "component",
          realNodeId: "modulator",
        },
        {
          id: "tia-driver-core",
          label: "TIA / Driver",
          detail: "接收放大与发射驱动芯片。",
          kind: "component",
          realNodeId: "tia-driver",
        },
        {
          id: "dsp-core",
          label: "DSP",
          detail: "高速 PAM4 或相干信号处理。",
          kind: "component",
          realNodeId: "optical-dsp",
        },
        {
          id: "fa-mpo-core",
          label: "FA / MPO / 连接器",
          detail: "光纤阵列、连接器和阵列化输出。",
          kind: "component",
          realNodeId: "fa-mpo",
        },
        {
          id: "optical-engine-core",
          label: "光引擎",
          detail: "靠近交换芯片的光电转换单元。",
          kind: "component",
          realNodeId: "optical-engine",
        },
      ],
      outputs: [
        {
          id: "cpo-output",
          label: "CPO",
          detail: "共封装光学产品形态。",
          kind: "system",
          realNodeId: "cpo",
        },
        {
          id: "pluggable-output",
          label: "可插拔光模块",
          detail: "OSFP/QSFP 等标准化光模块。",
          kind: "system",
          realNodeId: "pluggable-optics",
        },
        {
          id: "ocs-output",
          label: "OCS",
          detail: "光电路交换能力。",
          kind: "system",
        },
        {
          id: "switch-cluster-output",
          label: "交换机 / AI 集群",
          detail: "光模块和 CPO 支撑服务器网络横向扩展。",
          kind: "system",
        },
      ],
    },
    groups: [
      {
        id: "optoelectronic-devices",
        title: "光电芯片与器件",
        summary: "完成高速光电转换所需的核心芯片与器件。",
        nodes: [
          { id: "optical-chip-node", label: "光芯片", description: "硅光或 III-V 光电芯片。", kind: "component", realNodeId: "optical-chip" },
          { id: "laser-node", label: "激光器", description: "数据中心高速光源。", kind: "component", realNodeId: "laser" },
          { id: "modulator-node", label: "调制器", description: "把电信号调制到光载波。", kind: "component", realNodeId: "modulator" },
          { id: "tia-driver-node", label: "TIA / Driver", description: "接收放大与驱动芯片。", kind: "component", realNodeId: "tia-driver" },
          { id: "optical-dsp-node", label: "DSP", description: "高速 PAM4 或相干信号处理芯片。", kind: "component", realNodeId: "optical-dsp" },
        ],
      },
      {
        id: "optical-engine-and-connectors",
        title: "连接与光引擎",
        summary: "把光电芯片、光纤阵列和连接器组合成可装配单元。",
        nodes: [
          { id: "fa-mpo-node", label: "FA / MPO / 连接器", description: "光纤阵列、MPO 和连接器。", kind: "component", realNodeId: "fa-mpo" },
          { id: "optical-engine-node", label: "光引擎", description: "靠近交换芯片的光电转换单元。", kind: "component", realNodeId: "optical-engine" },
        ],
      },
      {
        id: "optical-products",
        title: "产品形态",
        summary: "光引擎进入共封装、可插拔模块和光交换系统。",
        nodes: [
          { id: "cpo-node", label: "CPO", description: "共封装光学。", kind: "system", realNodeId: "cpo" },
          { id: "pluggable-optics-node", label: "可插拔光模块", description: "OSFP/QSFP 等标准化模块。", kind: "system", realNodeId: "pluggable-optics" },
          { id: "ocs-node", label: "OCS", description: "光电路交换系统。", kind: "system" },
          { id: "switch-near-package", label: "交换 ASIC 近端互联", description: "缩短交换芯片到光引擎的高速电连接。", kind: "component" },
        ],
      },
    ],
    internalConnections: [
      { id: "materials-to-optoelectronics", label: "InP / SOI / 光纤 / 透镜 → 光芯片与光路", kind: "flow" },
      { id: "devices-to-engine", label: "光芯片 + 激光器 + 调制器 + TIA + DSP → 光引擎", kind: "flow" },
      { id: "engine-to-cpo", label: "光引擎 → CPO", kind: "flow" },
      { id: "engine-to-pluggable", label: "光引擎 → 可插拔光模块", kind: "flow" },
      { id: "optical-products-to-network", label: "CPO / 可插拔光模块 / OCS → 交换机 / AI 集群", kind: "flow" },
    ],
  },
  {
    id: "server-network",
    order: 8,
    name: "服务器网络",
    shortName: "服务器网络",
    role: "把加速卡、主板、光模块、电源、液冷和交换设备组织成 AI 服务器与集群网络。",
    input: "加速卡、主板、光模块、电源、液冷和交换设备",
    output: "AI 服务器、交换机、机柜、集群网络和数据中心基础设施",
    summary: "服务器网络把板级系统和光互联连接为可调度的 AI 集群基础设施。",
    tone: "infrastructure",
    representativeNodeIds: ["ai-server", "ethernet-switch", "ai-cluster"],
    diagram: {
      title: "服务器与集群网络",
      summary: "从加速卡、主板、光模块、电源、液冷和交换设备输入开始，输出 AI 服务器、交换机和集群网络。",
      inputs: [
        {
          id: "accelerator-board-input",
          label: "加速卡 / 主板",
          detail: "来自板级系统阶段的服务器核心硬件。",
          kind: "component",
        },
        {
          id: "optical-module-input",
          label: "光模块 / CPO 链路",
          detail: "来自光互联阶段的高速网络连接能力。",
          kind: "system",
        },
        {
          id: "power-cooling-rack-input",
          label: "电源 / 液冷 / 机柜",
          detail: "支撑服务器和交换网络部署。",
          kind: "system",
        },
      ],
      core: [
        {
          id: "ai-server-core",
          label: "AI 服务器",
          detail: "承载加速器、主板、电源和散热。",
          kind: "system",
          realNodeId: "ai-server",
        },
        {
          id: "ethernet-switch-core",
          label: "交换机",
          detail: "训练集群横向扩展网络。",
          kind: "system",
          realNodeId: "ethernet-switch",
        },
        {
          id: "nic-dpu-core",
          label: "NIC / DPU",
          detail: "服务器网络接入、卸载和数据处理。",
          kind: "component",
        },
      ],
      outputs: [
        {
          id: "rack-output",
          label: "机柜 / 液冷系统",
          detail: "承载服务器、交换机和散热基础设施。",
          kind: "system",
        },
        {
          id: "cluster-network-output",
          label: "集群网络",
          detail: "可调度的训练和推理网络基础设施。",
          kind: "system",
          realNodeId: "ai-cluster",
        },
        {
          id: "data-center-infra-output",
          label: "数据中心基础设施",
          detail: "电力、冷却、机柜和运维环境。",
          kind: "system",
        },
      ],
    },
    groups: [
      {
        id: "server-systems",
        title: "服务器系统",
        summary: "AI 服务器把加速器板卡、电源、液冷和整机结构集成起来。",
        nodes: [
          { id: "ai-server-node", label: "AI 服务器", description: "承载加速器和高速板卡。", kind: "system", realNodeId: "ai-server" },
          { id: "accelerator-board", label: "GPU / 加速器板卡", description: "服务器内部核心计算板卡。", kind: "component" },
          { id: "nic-dpu", label: "NIC / DPU", description: "网络接入、卸载和数据处理。", kind: "component" },
          { id: "rack", label: "机柜", description: "部署服务器和交换设备的物理载体。", kind: "system" },
          { id: "liquid-cooling-system", label: "液冷系统", description: "支撑高功耗服务器散热。", kind: "system" },
        ],
      },
      {
        id: "network-systems",
        title: "网络系统",
        summary: "交换机、光链路和集群网络把服务器组织成可训练、可推理的基础设施。",
        nodes: [
          { id: "ethernet-switch-node", label: "交换机", description: "AI 以太网交换系统。", kind: "system", realNodeId: "ethernet-switch" },
          { id: "optical-link", label: "光模块接入", description: "把服务器和交换机用高速光链路连接。", kind: "system" },
          { id: "cluster-network", label: "集群网络", description: "可调度的训练/推理网络。", kind: "system", realNodeId: "ai-cluster" },
          { id: "data-center-infrastructure", label: "数据中心基础设施", description: "电力、冷却、机柜和运维环境。", kind: "system" },
        ],
      },
    ],
    internalConnections: [
      { id: "board-to-server", label: "加速卡 / 主板 → AI 服务器", kind: "flow" },
      { id: "optical-to-switch", label: "光模块 / CPO 链路 → 交换机", kind: "flow" },
      { id: "server-switch-to-cluster", label: "AI 服务器 + 交换机 → 集群网络", kind: "flow" },
      { id: "cluster-to-infra", label: "集群网络 → 数据中心基础设施", kind: "flow" },
    ],
  },
  {
    id: "compute-applications",
    order: 9,
    name: "算力应用",
    shortName: "算力应用",
    role: "把 AI 集群、数据中心和云平台转化为算力服务、模型能力与行业应用。",
    input: "AI 集群、AIDC、云平台和调度软件",
    output: "算力服务、训练/推理平台、基础模型、Agent 工具链和行业应用",
    summary: "算力应用是产业链最下游，把硬件集群能力转化为可售卖、可使用的 AI 能力。",
    tone: "application",
    representativeNodeIds: ["ai-cluster"],
    diagram: {
      title: "算力服务与应用层",
      summary: "从 AI 集群和 AIDC 开始，输出算力服务、训练/推理平台、模型能力和行业应用。",
      inputs: [
        {
          id: "ai-cluster-input",
          label: "AI 集群",
          detail: "来自服务器网络阶段的可调度算力基础设施。",
          kind: "system",
          realNodeId: "ai-cluster",
        },
        {
          id: "aidc-input",
          label: "AIDC",
          detail: "承载电力、冷却、机柜和运维的数据中心。",
          kind: "system",
        },
      ],
      core: [
        {
          id: "cloud-compute-core",
          label: "云厂商 / 算力租赁",
          detail: "把集群能力包装成可售卖算力服务。",
          kind: "application",
        },
        {
          id: "training-inference-core",
          label: "训练平台 / 推理平台",
          detail: "调度训练、微调、推理和评测工作负载。",
          kind: "software",
        },
        {
          id: "model-agent-core",
          label: "基础模型 / Agent 工具链",
          detail: "把算力转化为模型能力和工具化应用能力。",
          kind: "software",
        },
      ],
      outputs: [
        {
          id: "compute-service-output",
          label: "算力服务",
          detail: "云算力、租赁和行业算力供给。",
          kind: "application",
        },
        {
          id: "model-capability-output",
          label: "模型能力",
          detail: "基础模型、垂直模型和推理服务。",
          kind: "software",
        },
        {
          id: "industry-application-output",
          label: "行业应用",
          detail: "把 AI 能力落到具体业务场景。",
          kind: "application",
        },
      ],
    },
    groups: [
      {
        id: "compute-supply",
        title: "算力供给",
        summary: "数据中心、云厂商和租赁平台把 AI 集群能力商品化。",
        nodes: [
          { id: "aidc", label: "AIDC", description: "AI 数据中心，承载电力、冷却、机柜和运维。", kind: "system" },
          { id: "cloud-provider", label: "云厂商", description: "把集群能力包装成云算力服务。", kind: "application" },
          { id: "compute-rental", label: "算力租赁", description: "按需提供训练和推理算力。", kind: "application" },
          { id: "ai-cluster-node", label: "AI 集群", description: "可调度的训练/推理基础设施。", kind: "system", realNodeId: "ai-cluster" },
        ],
      },
      {
        id: "platform-model-apps",
        title: "平台、模型与应用",
        summary: "训练/推理平台、基础模型和工具链把算力转化为应用能力。",
        nodes: [
          { id: "training-platform", label: "训练平台", description: "调度训练、微调和评测任务。", kind: "software" },
          { id: "inference-platform", label: "推理平台", description: "承载在线推理、批量推理和服务治理。", kind: "software" },
          { id: "foundation-model", label: "基础模型", description: "算力训练出的通用或垂直模型能力。", kind: "software" },
          { id: "agent-toolchain", label: "Agent / 工具链", description: "把模型能力组织成可执行工作流。", kind: "software" },
          { id: "industry-apps", label: "行业应用", description: "面向办公、工业、金融、医疗等场景的 AI 应用。", kind: "application" },
        ],
      },
    ],
    internalConnections: [
      { id: "cluster-to-cloud", label: "AI 集群 → 云厂商 / 算力租赁", kind: "flow" },
      { id: "compute-to-platform", label: "算力服务 → 训练平台 / 推理平台", kind: "flow" },
      { id: "platform-to-model", label: "训练平台 / 推理平台 → 基础模型", kind: "flow" },
      { id: "model-to-apps", label: "基础模型 + Agent / 工具链 → 行业应用", kind: "flow" },
    ],
  },
];

export const defaultStageId: AtlasStageId = "optical-interconnect";

export const atlasStageById = new Map<AtlasStageId, AtlasStage>(
  atlasStages.map((stage) => [stage.id, stage]),
);

export const mainChainConnections: readonly MainChainConnection[] = [
  { id: "materials-to-ai-chip", from: "materials", to: "ai-chip", kind: "flow", label: "材料 → AI 芯片", summary: "硅片、电子气体、前驱体、湿电子化学品进入芯片制造。" },
  { id: "materials-to-hbm", from: "materials", to: "hbm-memory", kind: "flow", label: "材料 → HBM", summary: "硅片、电子材料和封装材料进入 DRAM 与 HBM 制造。" },
  { id: "materials-to-packaging", from: "materials", to: "advanced-packaging", kind: "flow", label: "材料 → 先进封装", summary: "ABF、Underfill、TIM 等进入 2.5D/3D 封装。" },
  { id: "materials-to-board", from: "materials", to: "board-system", kind: "flow", label: "材料 → 板级系统", summary: "低损耗 CCL、铜箔、玻纤布、树脂和热管理材料进入板级系统。" },
  { id: "materials-to-optical", from: "materials", to: "optical-interconnect", kind: "flow", label: "材料 → 光互联", summary: "InP、SOI、光纤、透镜和光胶进入光模块和 CPO。" },
  { id: "equipment-to-ai-chip", from: "equipment", to: "ai-chip", kind: "enable", label: "设备 ⇢ AI 芯片", summary: "前道设备决定先进制程良率和产能。" },
  { id: "equipment-to-hbm", from: "equipment", to: "hbm-memory", kind: "enable", label: "设备 ⇢ HBM", summary: "前道、堆叠和测试设备约束 HBM 量产。" },
  { id: "equipment-to-packaging", from: "equipment", to: "advanced-packaging", kind: "enable", label: "设备 ⇢ 先进封装", summary: "封装和测试设备决定 CoWoS、2.5D、3D 封装量产能力。" },
  { id: "equipment-to-board", from: "equipment", to: "board-system", kind: "enable", label: "设备 ⇢ 板级系统", summary: "PCB 设备和检测设备决定高速板良率。" },
  { id: "equipment-to-optical", from: "equipment", to: "optical-interconnect", kind: "enable", label: "设备 ⇢ 光互联", summary: "光耦合、精密贴装和高速测试决定 CPO 和光模块良率。" },
  { id: "ai-chip-to-packaging", from: "ai-chip", to: "advanced-packaging", kind: "flow", label: "AI 芯片 → 先进封装", summary: "GPU/ASIC 与 HBM 在先进封装中集成。" },
  { id: "hbm-to-packaging", from: "hbm-memory", to: "advanced-packaging", kind: "flow", label: "HBM → 先进封装", summary: "HBM 通过 2.5D/3D 封装靠近计算芯片。" },
  { id: "packaging-to-board", from: "advanced-packaging", to: "board-system", kind: "flow", label: "先进封装 → 板级系统", summary: "加速器模组进入 PCB、主板和服务器板级系统。" },
  { id: "board-to-server", from: "board-system", to: "server-network", kind: "flow", label: "板级系统 → 服务器网络", summary: "板卡、电源和散热系统进入 AI 服务器和交换机。" },
  { id: "optical-to-server", from: "optical-interconnect", to: "server-network", kind: "flow", label: "光互联 → 服务器网络", summary: "光模块、CPO 和 OCS 支撑 AI 集群网络。" },
  { id: "server-to-apps", from: "server-network", to: "compute-applications", kind: "flow", label: "服务器网络 → 算力应用", summary: "AI 集群输出训练、推理、云和行业应用能力。" },
];

export function getStageRealNodeIds(stage: AtlasStage): ReadonlySet<string> {
  const nodeIds = new Set(stage.representativeNodeIds);
  for (const group of stage.groups) {
    for (const node of group.nodes) {
      if (node.realNodeId) nodeIds.add(node.realNodeId);
    }
  }
  for (const section of [stage.diagram.inputs, stage.diagram.core, stage.diagram.outputs]) {
    for (const node of section) {
      if (node.realNodeId) nodeIds.add(node.realNodeId);
    }
  }
  return nodeIds;
}

export function getStageIdForNode(nodeId: string): AtlasStageId | null {
  for (const stage of atlasStages) {
    if (getStageRealNodeIds(stage).has(nodeId)) return stage.id;
  }
  return null;
}

const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase();

export function findStageBySearch(search: string): AtlasStage | null {
  const normalized = normalizeSearch(search);
  if (!normalized) return null;
  for (const stage of atlasStages) {
    const haystack = [
      stage.id,
      stage.name,
      stage.shortName,
      stage.role,
      stage.input,
      stage.output,
      stage.summary,
      stage.diagram.title,
      stage.diagram.summary,
      ...stage.representativeNodeIds,
      ...stage.groups.flatMap((group) => [
        group.title,
        group.summary,
        ...group.nodes.flatMap((node) => [
          node.id,
          node.label,
          node.description,
          node.realNodeId ?? "",
        ]),
      ]),
      ...stage.internalConnections.map((connection) => connection.label),
    ]
      .join(" ")
      .toLocaleLowerCase();
    if (haystack.includes(normalized)) return stage;
  }
  return null;
}
