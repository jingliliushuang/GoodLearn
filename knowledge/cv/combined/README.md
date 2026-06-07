# CV 组合节点（架构预留）

本目录用于存放 **组合节点（Combined Node）** —— 将两个或多个叶子节点的方法论按策略融合，例如：

- `denoise_super_resolution`：先去噪再超分（cascade）
- 并行融合、特征融合等（parallel / fusion）

## 目标结构（尚未实现）

```
combined/
└── {combined_node_id}/
    ├── metadata.json      # type: "combined", parents: [...]
    ├── strategy.json      # strategy: cascade | parallel | fusion
    ├── README.md
    └── runtime/
        ├── combiner.py    # 通过引用母节点动态调用，不复制代码
        └── config.py
```

## 当前状态

- **未实现**：尚无组合节点示例与运行 API
- **后端占位**：`backend/core/combiner.py` 已预留接口与 TODO
- **不影响现有功能**：denoise / super_resolution 叶子节点可独立运行

## 设计原则

1. 组合节点为轻量文件夹 + 配置引用
2. `metadata.json` 通过 `parents` 引用母叶子节点
3. `runtime/combiner.py` 动态 import 母节点的 `model.py`，禁止复制算法代码
4. 由 `backend/core/combiner.py` 负责创建组合节点目录与生成模板

## 后续优先级

P2 — 在叶子节点与运行器稳定后，再实现组合节点生成与评测流程。
