import type { Command } from '../../commands.js'

/**
 * `/ccb-pev <targetBinary> [goal]` — Plan-Execute-Verify loop for reverse
 * engineering tasks.
 *
 * Differs from `/ccb-arena` in that the inner loop is **assumption
 * driven** rather than **belief driven**:
 *   - `/ccb-arena` runs a CAV consensus arena where agents converge on
 *     an opinion via ∇H ≤ 0 fixed-point detection.
 *   - `/ccb-pev` runs a typed Hypothesis-bank loop where agents propose
 *     {`packer`, `compiler`, `algorithm`, …} hypotheses, the runner
 *     dispatches canonical RE tools (DiE, UPX, IDA headless, etc.), and
 *     the verdict engine auto-judges confirms / falsifies.
 *
 * The actual UI lives in `ccb-pev.tsx` (lazy-loaded so the slash command
 * registration stays cheap when no one types `/ccb-pev`). The command
 * load entry-point is identical to `/ccb-arena` for consistency.
 *
 * Cross-references:
 *   - .kiro/specs/ccb-pev-re-execution-loop/design.md → Component 10
 *   - .kiro/specs/ccb-pev-re-execution-loop/requirements.md → R11, R13-2
 */
const ccbPev = {
  type: 'local-jsx',
  name: 'ccb-pev',
  aliases: ['pev', 're-pev'],
  description:
    'PEV (Plan-Execute-Verify) loop for reverse engineering — typed hypothesis bank + canonical RE tools',
  load: () => import('./ccb-pev.js'),
} satisfies Command

export default ccbPev
