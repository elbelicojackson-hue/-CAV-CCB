# CCB-PEV Demo Case — Packed PE Binary Analysis

> This document walks through a representative 4-round PEV session analysing a UPX-packed Windows PE binary. All tool outputs are redacted/synthesised for documentation purposes — the actual binary is not included in the repository.

## Setup

```bash
# Ensure at least 2 providers are configured
cat .env.ccb-arena
# CCB_ARENA_GPT_API_KEY=sk-...
# CCB_ARENA_CLAUDE_API_KEY=sk-ant-...
# CCB_ARENA_DEEPSEEK_API_KEY=sk-...
# CCB_ARENA_QWEN_API_KEY=sk-...

# Launch PEV
/ccb-pev e:/samples/payload.exe "判断加壳类型 + 主体编译器 + 是否有反调试"
```

## Round 0 — Initial Hypothesis Creation

Each of the 4 agents creates one root hypothesis based on the binary metadata visible in the system prompt:

| Agent | Hypothesis | Kind | Confidence |
|-------|-----------|------|------------|
| gpt | H1: "PE32+ executable, 64-bit Windows binary" | file-class | 0.95 |
| claude | H2: "Binary appears packed (high entropy sections)" | packer | 0.70 |
| deepseek | H3: "Likely MSVC C++ runtime present" | compiler | 0.60 |
| qwen | H4: "Possible TLS callback anti-debug check" | anti-analysis | 0.40 |

**Scheduler**: All agents → `observe_only` (no evidence yet to act on).

## Round 1 — First Tool Dispatch

The scheduler assigns tool plans based on highest-confidence untested hypotheses:

| Agent | Directive | Plan |
|-------|-----------|------|
| claude | test H2 | `packer::diec` |
| deepseek | test H3 | `compiler::diec-probe` |
| gpt | observe | — |
| qwen | test H4 | `anti-analysis::strings-grep` |

**Tool results**:

```
E1: packer::diec → stdout: "Packer: UPX(4.0)[NRV,brute]"
    verdict: confirms (matched /UPX/)
    
E2: compiler::diec-probe → stdout: "Compiler: Microsoft Visual C/C++(14.0)"
    verdict: confirms (matched /Microsoft Visual C/)
    
E3: anti-analysis::strings-grep → stdout: ""  (empty)
    verdict: falsifies (matched /^\s*$/)
```

**Ledger after round 1**:
- H2 evidence trail: [E1] — confirms
- H3 evidence trail: [E2] — confirms  
- H4 evidence trail: [E3] — falsifies

## Round 2 — Promote + Stale Cascade + Derivation

Based on the evidence:

| Agent | Action |
|-------|--------|
| claude | `promote H2` (UPX confirmed) + `tool_call H2.1 packer::upx-test` |
| deepseek | `promote H3` (MSVC confirmed) |
| qwen | `falsify H4` (no anti-debug strings) → triggers stale cascade (no children) |
| gpt | `confidence_adjust H1` to 0.99 (PE confirmed by diec output) |

**Propagator** pushes E1 (confirms packer) to deepseek + qwen (cross-kind: packer → compiler, capability). Derives sub-hypothesis hints:
- H2.1: "After UPX unpack, inner binary may be .NET" (kind: compiler, parent: H2)

**Tool result**:
```
E4: packer::upx-test → stdout: "upx 4.0 - tested ok"
    verdict: confirms (matched /tested\s+ok/)
```

## Round 3 — Convergence

| Agent | Action |
|-------|--------|
| claude | `declare_done` (packer slice finished) |
| deepseek | `declare_done` (compiler slice finished) |
| qwen | `observe_only` (H4 falsified, no new work) |
| gpt | `promote H1` + `declare_done` |

**Stop condition**: `all-resolved` — no `open` hypotheses remain.

## Final Ledger Summary

```
Hypothesis tree:
● H1 [evidence] (file-class) "PE32+ executable, 64-bit Windows binary" conf=0.99
● H2 [evidence] (packer) "Binary appears packed (high entropy sections)" conf=0.70
  ○ H2.1 [open] (compiler) "After UPX unpack, inner binary may be .NET" conf=0.30
● H3 [evidence] (compiler) "Likely MSVC C++ runtime present" conf=0.60
✗ H4 [falsified] (anti-analysis) "Possible TLS callback anti-debug check" conf=0.00

Evidence log:
E1 [✓] packer::diec → confirms H2
E2 [✓] compiler::diec-probe → confirms H3
E3 [✗] anti-analysis::strings-grep → falsifies H4
E4 [✓] packer::upx-test → confirms H2

Stop reason: all-resolved (4 rounds)
Parse stats: L1=16 L2=0 L3=0 failed=0
```

## .pev.json Excerpt

```json
{
  "schemaVersion": "1.0",
  "sessionId": "sess-demo-001",
  "profileId": "reverse",
  "targetBinary": {
    "path": "e:/samples/payload.exe",
    "sha256": "a3f1b2c4...",
    "size": 245760
  },
  "stopReason": "all-resolved",
  "finalLedger": {
    "hypotheses": [
      { "id": "H1", "status": "evidence", "kind": "file-class", "confidence": 0.99 },
      { "id": "H2", "status": "evidence", "kind": "packer", "confidence": 0.70 },
      { "id": "H2.1", "status": "open", "kind": "compiler", "confidence": 0.30 },
      { "id": "H3", "status": "evidence", "kind": "compiler", "confidence": 0.60 },
      { "id": "H4", "status": "falsified", "kind": "anti-analysis", "confidence": 0.00 }
    ],
    "evidenceLog": [
      { "id": "E1", "verdict": "confirms", "testedHypothesis": "H2", "toolName": "ReverseCli" },
      { "id": "E2", "verdict": "confirms", "testedHypothesis": "H3", "toolName": "ReverseCli" },
      { "id": "E3", "verdict": "falsifies", "testedHypothesis": "H4", "toolName": "Bash" },
      { "id": "E4", "verdict": "confirms", "testedHypothesis": "H2", "toolName": "ReverseCli" }
    ],
    "parseStats": { "layer1Hits": 16, "layer2Hits": 0, "layer3Hits": 0, "parseFailures": 0 }
  }
}
```

## Observations

1. **Attention stability**: The ledger held 5 hypotheses across 4 rounds without any model confusion about which were open vs falsified — the state machine owns status, not the model.
2. **Tool efficiency**: 4 tool calls total (budget was 24). The scheduler's "highest confidence + untested plan" heuristic converged quickly.
3. **Cross-agent propagation**: E1 (packer confirms) was pushed to deepseek's inbox in round 2, which informed its decision to declare_done rather than re-test the compiler hypothesis.
4. **Stale cascade**: H4 falsification had no children to cascade, but the mechanism is exercised in deeper trees (e.g., if H4 had spawned H4.1 "dynamic anti-debug", it would auto-stale).
5. **Parse reliability**: 100% Layer-1 hit rate — all 16 agent outputs (4 agents × 4 rounds) parsed on the first try with no repair needed.
