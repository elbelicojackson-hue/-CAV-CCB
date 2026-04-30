---
title: "CE-MCP 集成指南"
tags: ["cheat-engine", "mcp", "ai", "integration"]
created: "2026-04-30T00:00:00.000Z"
updated: "2026-04-30T00:00:00.000Z"
---

# CE-MCP 集成指南

## 概述

CE-MCP 是一个 Cheat Engine 插件，实现了 Model Context Protocol (MCP) 标准，让 AI 助手可以直接控制 Cheat Engine 进行逆向工程和内存调试。

源码位于 `vendor/ce-mcp/`，来自 [Fredhardycnm/CE-MCP](https://github.com/Fredhardycnm/CE-MCP)。

## 架构

```
┌─────────────┐    stdio/JSON-RPC    ┌──────────────────┐    TCP:8888    ┌──────────────┐
│  AI Client  │ ◄──────────────────► │ bridge_server.py │ ◄────────────► │  CE Plugin   │
│ (Claude/HL) │                      │  (Python 桥接器)  │               │ (Rust DLL)   │
└─────────────┘                      └──────────────────┘               └──────────────┘
```

- **bridge_server.py**: Python MCP 服务器，通过 stdin/stdout 接收 MCP 请求，转发到 CE 插件
- **rust_ce_mcp_plugin_x64.dll**: CE 的 Rust 插件，监听 TCP 8888 端口，执行实际的内存操作

## 安装步骤

### 1. 安装 CE 插件
将 `vendor/ce-mcp/rust_ce_mcp_plugin_x64.dll` 复制到 CE 安装目录的 `autorun/` 文件夹。

### 2. 启动 Cheat Engine
CE 启动时会自动加载插件，显示 "Rust Plugin Initialized!" 提示。

### 3. MCP 配置
在项目的 `.mcp.json` 中已注册：
```json
{
  "cheat-engine": {
    "command": "python",
    "args": ["E:\\claude-code-main\\vendor\\ce-mcp\\bridge_server.py",
             "--host", "127.0.0.1", "--port", "8888"]
  }
}
```

## MCP 工具列表

### 基础操作
| 工具 | 描述 |
|------|------|
| `show_message` | 在 CE 中显示消息框 |
| `open_process` | 按 PID 附加进程 |
| `get_process_id` | 按名称获取进程 ID |
| `pause_process` | 暂停目标进程 |
| `unpause_process` | 恢复目标进程 |
| `debug_process` | 附加调试器 |

### 内存操作
| 工具 | 描述 |
|------|------|
| `read_memory` | 读取内存值 |
| `write_memory` | 写入内存值 |

### 汇编操作
| 工具 | 描述 |
|------|------|
| `assemble` | 汇编指令 |
| `disassemble` | 反汇编指令 |
| `auto_assemble` | 执行 Auto Assembler 脚本 |

### 高级操作
| 工具 | 描述 |
|------|------|
| `change_register` | 修改寄存器值 |
| `inject_dll` | 注入 DLL |
| `speedhack` | 设置加速/减速 |
| `address_to_name` | 地址转符号名 |
| `name_to_address` | 符号名转地址 |
| `get_address_from_pointer` | 从指针链获取地址 |
| `previous_opcode` | 获取上一条指令地址 |
| `next_opcode` | 获取下一条指令地址 |

## 使用示例

### AI 读取内存
```
用户: "读取 game.exe 的 0x12345678 地址的浮点值"
AI: 调用 read_memory(address="0x12345678", type="float")
```

### AI 注入代码
```
用户: "在 0x00401000 处 NOP 掉 6 个字节"
AI: 调用 assemble(address="0x00401000", instruction="nop")
```

### AI 执行 AA 脚本
```
用户: "写一个无限血量脚本"
AI: 生成 AA 脚本 → 调用 auto_assemble(script=...)
```

## Lua 联动

在 CE 的 Lua 脚本窗口中可以调用 `aiSendCommand("消息")` 向 AI 发送消息，实现双向通信。

## 故障排除

- **EDotNetException**: DLL 架构不匹配，64 位 CE 用 x64.dll
- **CE not connected**: 确保 CE 已启动且插件已加载
- **中文乱码**: 插件已处理 UTF-8，确保系统字体支持中文
