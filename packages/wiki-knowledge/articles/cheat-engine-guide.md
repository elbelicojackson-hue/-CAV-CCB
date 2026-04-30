---
title: "Cheat Engine 7.5 使用指南"
tags: ["cheat-engine", "reverse-engineering", "memory", "debugging"]
created: "2026-04-30T00:00:00.000Z"
updated: "2026-04-30T00:00:00.000Z"
---

# Cheat Engine 7.5 使用指南

## 概述

Cheat Engine (CE) 是一款开源的内存扫描器和调试工具，主要用于游戏修改和逆向工程。源码位于 `vendor/cheat-engine/`。

## 核心功能

### 内存扫描
- **精确值扫描**: 查找特定数值（如血量、金币）
- **模糊扫描**: 查找变化/未变化的值
- **AOB 扫描**: 搜索字节模式（Array of Bytes）
- **指针扫描**: 找到稳定的多级指针路径

### 调试器
- **软件断点**: INT3 断点
- **硬件断点**: CPU 硬件级别的断点
- **内存断点**: 内存访问/写入断点
- **VEH 调试**: 不依赖驱动的调试方式

### Auto Assembler (AA)
CE 的汇编级脚本语言，用于：
- 代码注入（code injection）
- 内存补丁
- Speedhack
- 创建可启用/禁用的作弊表

## 目录结构

```
vendor/cheat-engine/
├── Cheat Engine/          # 主源码目录（Delphi）
│   ├── bin/              # 编译后的二进制
│   ├── ceserver/         # 远程内存服务器
│   ├── lua/              # Lua 脚本引擎
│   ├── help/             # 帮助文档
│   └── *.pas             # Delphi 源文件
├── DBKKernel/            # 内核驱动
├── DBVM UEFI/            # UEFI 虚拟机
├── lua/                  # Lua 源码
└── README.md
```

## ceserver

ceserver 是 CE 的无头远程服务器，允许通过网络访问远程进程内存。

### 编译 Linux 版本
```bash
cd vendor/cheat-engine/Cheat\ Engine/ceserver/
make -f gcc/Makefile
```

### 编译 Android 版本
```bash
# 使用 NDK 交叉编译
cd vendor/cheat-engine/Cheat\ Engine/ceserver/Release-android/
```

### 使用方法
```bash
# 启动 ceserver（监听 52736 端口）
./ceserver -p 52736

# 从 CE GUI 连接
# Network > Connect to ceserver > 输入 IP:端口
```

## Lua 脚本 API

CE 内置 Lua 引擎，常用函数：

```lua
-- 进程操作
openProcess("game.exe")
getProcessID("game.exe")
getProcessList()

-- 内存读写
readInteger(address)
writeInteger(address, value)
readFloat(address)
writeFloat(address, value)
readString(address, length)

-- AOB 扫描
AOBScanModule("48 8B 0D ?? ?? ?? ??", "game.exe")

-- 汇编/反汇编
autoAssemble(script)
disassemble(address)
assemble(address, "nop")

-- Speedhack
speedhack_setSpeed(2.0)
```

## 常见工作流

1. **附加进程**: 打开 CE → 选择进程
2. **首次扫描**: 输入初始值 → 首次扫描
3. **筛选**: 游戏中数值变化 → 回 CE 输入新值 → 再次扫描
4. **定位地址**: 找到目标地址 → "Find out what accesses this address"
5. **指针扫描**: 右键地址 → Pointer scan
6. **创建脚本**: 生成 AA 脚本或 Lua 脚本
