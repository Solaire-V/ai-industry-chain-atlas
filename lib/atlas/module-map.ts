export type AtlasModuleId =
  | "materials"
  | "equipment"
  | "chips-memory"
  | "advanced-packaging"
  | "pcb-interconnect"
  | "optical-cpo"
  | "infrastructure-apps";

export type ModuleConnectionKind = "flow" | "enable";

export interface ModuleSubnode {
  id: string;
  label: string;
  description: string;
  realNodeId?: string;
}

export interface ModuleGroup {
  id: string;
  title: string;
  summary: string;
  nodes: readonly ModuleSubnode[];
}

export interface InternalConnection {
  id: string;
  label: string;
  kind: ModuleConnectionKind;
}

export interface AtlasModule {
  id: AtlasModuleId;
  order: number;
  name: string;
  shortName: string;
  role: string;
  input: string;
  output: string;
  summary: string;
  tone: "amber" | "olive" | "blue" | "violet" | "green" | "slate";
  representativeNodeIds: readonly string[];
  groups: readonly ModuleGroup[];
  internalConnections: readonly InternalConnection[];
}

export interface ModuleConnection {
  id: string;
  from: AtlasModuleId;
  to: AtlasModuleId;
  label: string;
  kind: ModuleConnectionKind;
  summary: string;
}

export const defaultModuleId: AtlasModuleId = "materials";

export const atlasModules: readonly AtlasModule[] = [
  {
    id: "materials",
    order: 1,
    name: "半导体材料",
    shortName: "材料",
    role: "进入芯片、封装、PCB 与光通信器件的物料输入层。",
    input: "上游化工、金属、晶体生长、玻璃与高分子体系",
    output: "AI 芯片 / 存储、先进封装、PCB、光通信 / CPO",
    summary: "先把材料拆到最小节点，后续才能逐一挂公司、产能、价格和供需关系。",
    tone: "amber",
    representativeNodeIds: [
      "inp-material",
      "silicon-photonics-material",
      "low-loss-ccl",
      "optical-fiber-preform",
    ],
    groups: [
      {
        id: "wafer-substrate",
        title: "晶圆 / 衬底",
        summary: "决定前道芯片与光电器件的底层材料平台。",
        nodes: [
          {
            id: "silicon-wafer",
            label: "硅片",
            description: "AI 芯片与存储前道制造的基础晶圆材料。",
          },
          {
            id: "soi",
            label: "SOI",
            description: "硅光芯片常用衬底平台。",
            realNodeId: "silicon-photonics-material",
          },
          {
            id: "inp-substrate",
            label: "InP 衬底",
            description: "激光器、EML 等高速光源器件的重要化合物半导体衬底。",
            realNodeId: "inp-material",
          },
          {
            id: "gaas-substrate",
            label: "GaAs 衬底",
            description: "部分光电与射频器件使用的化合物半导体衬底。",
          },
        ],
      },
      {
        id: "lithography-patterning",
        title: "光刻 / 图形化材料",
        summary: "负责把电路图形稳定转移到晶圆上。",
        nodes: [
          { id: "photoresist", label: "光刻胶", description: "图形转移核心材料。" },
          { id: "developer", label: "显影液", description: "显影光刻胶图形。" },
          { id: "stripper", label: "剥离液", description: "去除残余光刻胶或牺牲层。" },
          {
            id: "photomask",
            label: "光掩模 / 掩膜版",
            description: "承载晶圆制造所需版图。",
          },
        ],
      },
      {
        id: "thin-film-deposition",
        title: "薄膜 / 沉积材料",
        summary: "用于沉积介质层、金属层与阻挡层。",
        nodes: [
          { id: "electronic-gases", label: "电子特气", description: "刻蚀、清洗、沉积等环节通用。" },
          { id: "precursors", label: "前驱体", description: "ALD/CVD 薄膜沉积材料。" },
          { id: "sputtering-targets", label: "溅射靶材", description: "PVD 金属薄膜材料。" },
        ],
      },
      {
        id: "cmp-wet-chemicals",
        title: "CMP / 湿电子化学品",
        summary: "控制晶圆平坦化、清洗和湿法处理良率。",
        nodes: [
          { id: "cmp-slurry", label: "CMP 抛光液", description: "化学机械抛光消耗材料。" },
          { id: "cmp-pad", label: "CMP 抛光垫", description: "与抛光液共同决定平坦化效果。" },
          { id: "wet-chemicals", label: "高纯湿化学品", description: "清洗、刻蚀、剥离等湿法工艺材料。" },
        ],
      },
      {
        id: "packaging-materials",
        title: "封装材料",
        summary: "进入 CoWoS、2.5D/3D、HBM 与高端封装结构。",
        nodes: [
          { id: "abf-substrate", label: "ABF 载板材料", description: "高端封装载板核心材料。" },
          { id: "underfill", label: "底填胶", description: "提升芯片与基板连接可靠性。" },
          { id: "solder-balls-paste", label: "焊球 / 锡膏", description: "封装互连焊接材料。" },
          { id: "tim", label: "TIM 导热材料", description: "把芯片热量传导到散热系统。" },
        ],
      },
      {
        id: "pcb-materials",
        title: "PCB 材料",
        summary: "决定高速板卡、交换机和服务器主板的插损与可靠性。",
        nodes: [
          {
            id: "low-loss-ccl-node",
            label: "低损耗 CCL",
            description: "高速 PCB 的低介电损耗基材。",
            realNodeId: "low-loss-ccl",
          },
          { id: "copper-foil", label: "铜箔", description: "高速线路导体材料。" },
          { id: "glass-fabric", label: "玻纤布", description: "PCB 结构增强材料。" },
          { id: "resin-system", label: "树脂体系", description: "影响介电性能、热可靠性与加工窗口。" },
        ],
      },
      {
        id: "optical-materials",
        title: "光通信材料",
        summary: "进入光纤、连接器、光模块和 CPO 光路。",
        nodes: [
          {
            id: "preform-node",
            label: "光纤预制棒",
            description: "光纤拉丝前的核心材料。",
            realNodeId: "optical-fiber-preform",
          },
          { id: "fiber", label: "光纤", description: "数据中心光链路传输介质。" },
          {
            id: "ceramic-ferrule",
            label: "陶瓷插芯 / MT Ferrule",
            description: "光连接器精密对准部件。",
          },
          { id: "lens-isolator", label: "透镜 / 隔离器", description: "光路耦合与隔离元件。" },
        ],
      },
    ],
    internalConnections: [
      { id: "inp-to-laser", label: "InP 衬底 → 激光器 / EML", kind: "flow" },
      { id: "soi-to-silicon-photonics", label: "SOI → 硅光芯片", kind: "flow" },
      { id: "gases-to-fab", label: "电子特气 / 前驱体 → 晶圆制造", kind: "flow" },
      { id: "abf-to-packaging", label: "ABF 载板材料 → 先进封装", kind: "flow" },
      { id: "ccl-to-pcb", label: "低损耗 CCL / 铜箔 / 玻纤布 → 高速 PCB", kind: "flow" },
      { id: "preform-to-optics", label: "光纤预制棒 → 光纤 / 光连接", kind: "flow" },
    ],
  },
  {
    id: "equipment",
    order: 2,
    name: "半导体设备",
    shortName: "设备",
    role: "不进入最终产品，但决定芯片、封装、PCB 与光模块能否稳定量产。",
    input: "机床、光学、真空、运动控制、检测与自动化",
    output: "制造能力、良率、产能、工艺窗口",
    summary: "设备是制造使能层，应该用虚线语义连接到被它约束的产品模块。",
    tone: "olive",
    representativeNodeIds: [],
    groups: [
      {
        id: "front-end-equipment",
        title: "前道设备",
        summary: "作用在 AI 芯片、存储、光芯片晶圆制造。",
        nodes: [
          { id: "lithography-equipment", label: "光刻", description: "图形化核心设备。" },
          { id: "etch-equipment", label: "刻蚀", description: "形成精细结构。" },
          { id: "deposition-equipment", label: "薄膜沉积", description: "沉积介质、金属与阻挡层。" },
          { id: "ion-implantation", label: "离子注入", description: "改变半导体掺杂分布。" },
          { id: "cmp-equipment", label: "CMP", description: "晶圆平坦化设备。" },
          { id: "clean-equipment", label: "清洗", description: "去除颗粒与残留污染。" },
          { id: "metrology-inspection", label: "量测检测", description: "控制关键尺寸、缺陷和良率。" },
        ],
      },
      {
        id: "packaging-test-equipment",
        title: "封装 / 测试设备",
        summary: "作用在先进封装、HBM、CPO 与最终器件测试。",
        nodes: [
          { id: "dicing", label: "切割", description: "晶圆切割成裸片。" },
          { id: "bonding", label: "键合", description: "芯片到芯片或芯片到基板互连。" },
          { id: "die-attach", label: "贴片", description: "把裸片贴装到封装结构。" },
          { id: "prober-tester", label: "探针台 / 测试机", description: "晶圆级与成品电性测试。" },
        ],
      },
      {
        id: "pcb-equipment",
        title: "PCB 制造设备",
        summary: "作用在高多层板、高速背板和交换机板卡。",
        nodes: [
          { id: "pcb-drilling", label: "钻孔", description: "形成通孔与微孔。" },
          { id: "pcb-plating", label: "电镀", description: "形成铜互连。" },
          { id: "pcb-lamination", label: "压合", description: "多层板层压成型。" },
          { id: "pcb-aoi", label: "AOI 检测", description: "自动光学检测缺陷。" },
        ],
      },
      {
        id: "optical-equipment",
        title: "光模块 / CPO 设备",
        summary: "作用在光引擎、CPO 与高速光模块量产。",
        nodes: [
          { id: "optical-coupling", label: "光耦合", description: "完成芯片与光纤/透镜高精度耦合。" },
          { id: "precision-assembly", label: "精密贴装", description: "贴装激光器、透镜和光电芯片。" },
          { id: "high-speed-test", label: "高速测试", description: "验证高速电/光信号指标。" },
          { id: "burn-in", label: "老化测试", description: "筛选可靠性风险。" },
        ],
      },
    ],
    internalConnections: [
      { id: "front-end-to-chip", label: "前道设备 ⇢ AI 芯片 / 光芯片", kind: "enable" },
      { id: "pkg-to-packaging", label: "封装 / 测试设备 ⇢ 先进封装 / HBM", kind: "enable" },
      { id: "pcb-tools-to-pcb", label: "PCB 制造设备 ⇢ 高速 PCB", kind: "enable" },
      { id: "optical-tools-to-cpo", label: "光模块 / CPO 设备 ⇢ 光引擎 / CPO / 光模块", kind: "enable" },
    ],
  },
  {
    id: "chips-memory",
    order: 3,
    name: "AI 芯片 / 存储",
    shortName: "芯片存储",
    role: "算力和高带宽内存的核心来源。",
    input: "硅片、电子特气、前道设备、EDA/IP、先进制程",
    output: "GPU/AI 加速器、交换 ASIC、HBM",
    summary: "训练和推理性能从这里开始，但它必须和封装、存储、网络协同。",
    tone: "blue",
    representativeNodeIds: ["hbm", "switch-asic"],
    groups: [
      {
        id: "compute-memory",
        title: "计算与存储芯片",
        summary: "AI 服务器与交换网络的核心芯片。",
        nodes: [
          { id: "gpu-accelerator", label: "GPU / AI 加速器", description: "训练与推理算力核心。" },
          { id: "hbm-node", label: "HBM", description: "高带宽内存。", realNodeId: "hbm" },
          { id: "switch-asic-node", label: "交换 ASIC", description: "AI 网络交换芯片。", realNodeId: "switch-asic" },
        ],
      },
    ],
    internalConnections: [
      { id: "gpu-hbm-packaging", label: "GPU / AI 加速器 + HBM → 先进封装", kind: "flow" },
      { id: "switch-to-optics", label: "交换 ASIC → 光引擎 / CPO", kind: "flow" },
    ],
  },
  {
    id: "advanced-packaging",
    order: 4,
    name: "先进封装 / 载板",
    shortName: "先进封装",
    role: "把计算芯片、HBM 与高速互联在封装层拉近。",
    input: "ABF、底填胶、焊球/TIM、封装设备",
    output: "GPU+HBM 模组、2.5D/3D 封装、封装基板",
    summary: "先进封装是 AI 芯片性能释放的物理互联层。",
    tone: "violet",
    representativeNodeIds: ["hbm"],
    groups: [
      {
        id: "package-structure",
        title: "封装结构",
        summary: "把多颗芯片和高带宽存储整合为可用模组。",
        nodes: [
          { id: "cowos", label: "CoWoS / 2.5D", description: "硅中介层或重布线层封装。" },
          { id: "three-d-packaging", label: "3D 封装", description: "垂直堆叠与高密度互连。" },
          { id: "package-substrate", label: "封装载板", description: "芯片与 PCB 之间的高密度连接层。" },
        ],
      },
    ],
    internalConnections: [
      { id: "hbm-to-package", label: "HBM + GPU → CoWoS / 2.5D", kind: "flow" },
      { id: "package-to-pcb", label: "封装载板 → 高速 PCB", kind: "flow" },
    ],
  },
  {
    id: "pcb-interconnect",
    order: 5,
    name: "PCB / 高速电连接",
    shortName: "PCB互联",
    role: "承载服务器、交换机和板卡内的高速电连接。",
    input: "低损耗 CCL、铜箔、玻纤布、树脂、PCB 制造设备",
    output: "高多层高速 PCB、连接器、板级 SerDes 通道",
    summary: "在 CPO 之前，电连接距离、插损和功耗是核心瓶颈之一。",
    tone: "green",
    representativeNodeIds: ["high-layer-pcb", "low-loss-ccl"],
    groups: [
      {
        id: "board-interconnect",
        title: "板级互联",
        summary: "让芯片、加速卡、网卡和交换 ASIC 在系统内连接。",
        nodes: [
          { id: "high-layer-pcb-node", label: "高多层高速 PCB", description: "AI 服务器与交换机板卡。", realNodeId: "high-layer-pcb" },
          { id: "high-speed-connector", label: "高速连接器", description: "板间或线缆高速连接。" },
          { id: "serdes-channel", label: "SerDes 通道", description: "高速串行电信号通道。" },
        ],
      },
    ],
    internalConnections: [
      { id: "pcb-to-server", label: "高速 PCB → AI 服务器 / 交换机", kind: "flow" },
      { id: "electric-bottleneck", label: "电连接距离 / 插损 / 功耗 → 光互联需求", kind: "flow" },
    ],
  },
  {
    id: "optical-cpo",
    order: 6,
    name: "光通信 / CPO",
    shortName: "光互联",
    role: "把电信号转换成光信号，支撑 AI 集群横向扩展。",
    input: "InP/SOI、光纤、光电芯片、精密耦合与高速测试",
    output: "光引擎、CPO、可插拔光模块、数据中心光链路",
    summary: "CPO 的核心价值是缩短交换 ASIC 到光引擎的电走线，降低功耗和延迟。",
    tone: "blue",
    representativeNodeIds: ["optical-engine", "cpo", "pluggable-optics", "fa-mpo"],
    groups: [
      {
        id: "optoelectronic-devices",
        title: "光电器件",
        summary: "完成高速光电转换所需的核心芯片与器件。",
        nodes: [
          { id: "optical-chip-node", label: "光芯片", description: "硅光或 III-V 光电芯片。", realNodeId: "optical-chip" },
          { id: "laser-node", label: "激光器", description: "数据中心高速光源。", realNodeId: "laser" },
          { id: "modulator-node", label: "调制器", description: "把电信号调制到光载波。", realNodeId: "modulator" },
          { id: "tia-driver-node", label: "TIA / Driver", description: "接收放大与驱动芯片。", realNodeId: "tia-driver" },
          { id: "optical-dsp-node", label: "光模块 DSP", description: "高速 PAM4/相干等信号处理。", realNodeId: "optical-dsp" },
        ],
      },
      {
        id: "optical-system",
        title: "光引擎与模块",
        summary: "把光电器件组合成靠近交换 ASIC 或面板侧的产品形态。",
        nodes: [
          { id: "optical-engine-node", label: "光引擎", description: "靠近交换芯片的光电转换单元。", realNodeId: "optical-engine" },
          { id: "cpo-node", label: "CPO", description: "共封装光学。", realNodeId: "cpo" },
          { id: "pluggable-node", label: "可插拔光模块", description: "OSFP/QSFP 等标准化模块。", realNodeId: "pluggable-optics" },
          { id: "fa-mpo-node", label: "光纤阵列 / MPO", description: "光连接与阵列化输出。", realNodeId: "fa-mpo" },
        ],
      },
    ],
    internalConnections: [
      { id: "devices-to-engine", label: "光芯片 + 激光器 + 调制器 + TIA + DSP → 光引擎", kind: "flow" },
      { id: "engine-to-cpo", label: "光引擎 → CPO", kind: "flow" },
      { id: "engine-to-pluggable", label: "光引擎 → 可插拔光模块", kind: "flow" },
      { id: "cpo-to-switch", label: "CPO / 光模块 → 交换机 / AI 集群", kind: "flow" },
    ],
  },
  {
    id: "infrastructure-apps",
    order: 7,
    name: "服务器 / 网络 / AIDC / 应用",
    shortName: "算力落地",
    role: "把硬件、网络、电力和软件调度组织成可售卖、可使用的算力。",
    input: "AI 服务器、以太网交换机、光互联、电力和冷却",
    output: "训练、推理、云服务和 AI 应用",
    summary: "最下游不是单个应用，而是算力集群、云平台和模型应用共同落地。",
    tone: "slate",
    representativeNodeIds: ["ai-server", "ethernet-switch", "ai-cluster"],
    groups: [
      {
        id: "deployment",
        title: "算力落地",
        summary: "服务器、网络、电力和冷却共同形成可用集群。",
        nodes: [
          { id: "ai-server-node", label: "AI 服务器", description: "承载加速器和高速板卡。", realNodeId: "ai-server" },
          { id: "ethernet-switch-node", label: "AI 以太网交换机", description: "训练集群横向扩展网络。", realNodeId: "ethernet-switch" },
          { id: "ai-cluster-node", label: "AI 计算集群", description: "可调度的训练/推理基础设施。", realNodeId: "ai-cluster" },
          { id: "aidc", label: "AIDC / 数据中心", description: "电力、冷却、机柜和运维载体。" },
          { id: "model-application", label: "模型训练 / 推理 / AI 应用", description: "算力最终变成模型服务和应用价值。" },
        ],
      },
    ],
    internalConnections: [
      { id: "servers-switches-cluster", label: "AI 服务器 + AI 以太网交换机 → AI 计算集群", kind: "flow" },
      { id: "cluster-to-app", label: "AI 计算集群 → 训练 / 推理 / AI 应用", kind: "flow" },
    ],
  },
];

export const atlasModuleById = new Map<AtlasModuleId, AtlasModule>(
  atlasModules.map((module) => [module.id, module]),
);

export const moduleConnections: readonly ModuleConnection[] = [
  {
    id: "materials-to-chips",
    from: "materials",
    to: "chips-memory",
    label: "半导体材料 → AI 芯片 / 存储",
    kind: "flow",
    summary: "硅片、特气、前驱体、湿化学品进入芯片和存储制造。",
  },
  {
    id: "materials-to-packaging",
    from: "materials",
    to: "advanced-packaging",
    label: "半导体材料 → 先进封装 / 载板",
    kind: "flow",
    summary: "ABF、底填胶、焊球、TIM 等进入高端封装。",
  },
  {
    id: "materials-to-pcb",
    from: "materials",
    to: "pcb-interconnect",
    label: "半导体材料 → PCB / 高速电连接",
    kind: "flow",
    summary: "低损耗 CCL、铜箔、玻纤布和树脂体系进入高速 PCB。",
  },
  {
    id: "materials-to-optical",
    from: "materials",
    to: "optical-cpo",
    label: "半导体材料 → 光通信 / CPO",
    kind: "flow",
    summary: "InP、SOI、光纤与光连接材料进入光电器件和光链路。",
  },
  {
    id: "equipment-to-chips",
    from: "equipment",
    to: "chips-memory",
    label: "半导体设备 ⇢ AI 芯片 / 存储",
    kind: "enable",
    summary: "前道设备决定先进制程与存储良率。",
  },
  {
    id: "equipment-to-packaging",
    from: "equipment",
    to: "advanced-packaging",
    label: "半导体设备 ⇢ 先进封装 / 载板",
    kind: "enable",
    summary: "封装和测试设备决定高端封装量产能力。",
  },
  {
    id: "equipment-to-pcb",
    from: "equipment",
    to: "pcb-interconnect",
    label: "半导体设备 ⇢ PCB / 高速电连接",
    kind: "enable",
    summary: "PCB 设备决定高多层高速板的加工和检测能力。",
  },
  {
    id: "equipment-to-optical",
    from: "equipment",
    to: "optical-cpo",
    label: "半导体设备 ⇢ 光通信 / CPO",
    kind: "enable",
    summary: "光耦合、精密贴装和高速测试决定光模块/CPO 良率。",
  },
  {
    id: "chips-to-packaging",
    from: "chips-memory",
    to: "advanced-packaging",
    label: "AI 芯片 / 存储 → 先进封装 / 载板",
    kind: "flow",
    summary: "GPU/AI 加速器与 HBM 在先进封装中集成。",
  },
  {
    id: "packaging-to-pcb",
    from: "advanced-packaging",
    to: "pcb-interconnect",
    label: "先进封装 / 载板 → PCB / 高速电连接",
    kind: "flow",
    summary: "封装模组通过载板和 PCB 进入服务器系统。",
  },
  {
    id: "pcb-to-optical",
    from: "pcb-interconnect",
    to: "optical-cpo",
    label: "PCB / 高速电连接 → 光通信 / CPO",
    kind: "flow",
    summary: "电连接瓶颈推动光互联靠近交换芯片。",
  },
  {
    id: "optical-to-infra",
    from: "optical-cpo",
    to: "infrastructure-apps",
    label: "光通信 / CPO → 服务器 / 网络 / AIDC / 应用",
    kind: "flow",
    summary: "光链路把服务器和交换机组织成 AI 集群。",
  },
];
