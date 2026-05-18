# -CAV-CCB

基于CAV唯一公民协议的CCB

## 概述

CAV/CCB 是一套多智能体逆向工程协同框架，包含三个核心子系统：

| 命令 | 用途 | 核心机制 |
|------|------|----------|
| `/ccb-arena` | 多 LLM 信念共识 | ∇H ≤ 0 不动点收敛检测 |
| `/ccbteam` | 4 链 prompt 协议 | 角色分工 + 主模型执行 |
| `/ccb-pev` | 假设驱动执行循环 | Typed Hypothesis Bank + Canonical Tool Plans |

## 核心算法

- **CAV (Calibrated Adversarial Verification)** — 多智能体校准对抗验证协议
- **PEV (Plan-Execute-Verify)** — 假设驱动的计划-执行-验证循环
- **SharedLedger** — 不可变纯函数 reducer 状态机
- **VerdictEngine** — 纯正则确定性判定引擎（无 LLM judge）
- **Stale Cascade** — 单向假设失效传播算法
- **Cross-agent Propagator** — 跨智能体证据推送 + 子假设派生
- **Three-layer Parser** — 三层容错解析管线（strict → repair → retry）

## 架构

```
src/services/cav/pev/     ← PEV 核心层（纯函数叶子模块）
  protocol.ts             zod schema + 类型定义
  validator.ts            跨字段语义校验
  parser.ts               三层容错解析
  ledger.ts               不可变 reducer（假设 + 证据）
  canonicalTests.ts       24+ 工具计划 const 表
  verdict.ts              正则判定引擎
  scheduler.ts            每轮调度器
  propagator.ts           跨 agent 推送
  promptBuilder.ts        prompt 组装
  pevRunner.ts            主循环 async generator
  persistence.ts          .pev.json 原子写入

src/commands/ccb-pev/     ← 命令层 + UI
  index.ts                命令注册
  ccb-pev.tsx             入口 + adapter
  PevSession.tsx          Ink 状态组件
  HypothesisTreeView.tsx  假设树渲染
  EvidenceLogView.tsx     证据日志渲染
  AgentStatusBar.tsx      agent 状态条
```

## 使用

```bash
# 启动 PEV 循环
/ccb-pev e:/samples/payload.exe "判断加壳类型 + 编译器 + 反调试"

# 可选参数
/ccb-pev target.exe --max-rounds=4 --max-tools=12 --max-wallclock-min=10
```

## 测试

```bash
bun test src/services/cav/pev/__tests__/    # PEV 核心 (429 tests)
bun test src/commands/ccb-pev/__tests__/    # 命令层 (20 tests)
```

## 许可证

**⚠️ 专有许可 — 所有权利保留**

本仓库中的所有底层算法、协议和技术实现均为版权所有者的独占知识产权。未经版权所有者明确书面同意，不得以任何形式使用、复制、修改或分发本软件。

公开可见仅用于展示、作品集和学术审查目的。公开可见**不构成**任何许可授予。

详见 [LICENSE](./LICENSE)。

## 联系

如需使用许可，请通过 GitHub 联系：[@elbelicojackson-hue](https://github.com/elbelicojackson-hue)
