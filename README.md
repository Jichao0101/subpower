# subpower

> Agent setup note:
> Before using this repository as a Codex plugin source, read [INSTALL.md](./INSTALL.md) for installation and staging commands.
> This repository is a development source, not an installed runtime plugin.
> Do not treat it as an installed plugin until install and staging checks pass.

subpower is a subagent-first orchestration runtime for three-side workflows across knowledge, repository, and board execution state.

subpower governs subagent handoff, side-state synchronization, independent review, board evidence, decision points, and route legality.

An explicit user instruction such as `use subpower` or `按 subpower 处理` authorizes subagent-first orchestration. The host agent is orchestration-only: it composes the workflow, delegates to role-specific subagents, and records routes. Host-only fallback is degraded/non-complete and must be labeled that way.

Complete subpower execution claims require auditable role execution evidence in `subagent_execution_status.json` and `agent_invocation_manifest.json`. Declared role names, host-only fallback, synthetic fixtures, demo materialization, reports, or structural gate success are not enough to claim complete subagent-first execution.

Full-flow agent entry:

```text
skills/using-subpower/SKILL.md
```

There is no `subpower run` command. Scripts provide validation, reports, gates, installation staging, and demos only. Structural script success is not workflow completion.

The runtime model is:

```text
workflow patterns + decision points + runtime gates + run artifacts
```

Workflows are reusable patterns, not rigid end-to-end scripts.

## Runtime Boundary

- This repository is the development source.
- `.codex-plugin/plugin.json` is plugin metadata, not proof of installation.
- `scripts/install-plugin.js` is a staging utility, not a marketplace release tool.
- `.subpower/run/<session_id>/` is runtime state and is not versioned.
- External orchestration projects may be used as design references only.
- No source-level, runtime-level, schema-level, or artifact-level dependency is allowed.

## Core Assets

- `agents/`: thin subagent skeletons.
- `contracts/`: active orchestration truth source.
- `schemas/`: contract and run artifact schemas.
- `scripts/`: validation, gates, staging, demo, and tests.
- `fixtures/`: structural demo artifacts and regression fixtures. Synthetic fixture pass/fail artifacts are degraded examples unless backed by real execution evidence.
- `docs/`: architecture, installation, demo, and operational notes.

## Install

Read [INSTALL.md](./INSTALL.md) before staging this repository as a plugin.

```bash
node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower
node scripts/install-plugin.js --scope personal --target ~/.codex/plugins/subpower
node scripts/install-plugin.js --scope repo --target /tmp/subpower-plugin --dry-run
node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower --force
node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower --verify
node scripts/test-all.js
```

## Unified CLI

```bash
node scripts/subpower.js validate
node scripts/subpower.js test
node scripts/subpower.js gate route .subpower/run/demo-bugfix-board-failure
node scripts/subpower.js install --scope repo --target ./.codex/plugins/subpower
node scripts/subpower.js demo bugfix-board-failure-rework --to .subpower/run/demo-bugfix-board-failure
node scripts/subpower.js report .subpower/run/demo-bugfix-board-failure
```

The CLI intentionally has no `run` subcommand. Full business workflow execution is started by the `using-subpower` skill, then composed by the host agent through role-specific subagents. A host-only reconstruction may document structure, but it is not a complete subpower run.

## Validation

```bash
node scripts/validate-contracts.js
node scripts/test-runtime-gates.js
node scripts/test-decision-points.js
node scripts/test-agent-boundaries.js
node scripts/test-run-artifacts.js
node scripts/test-schema-validator.js
node scripts/test-install-plugin.js
node scripts/test-install-docs.js
node scripts/test-fixtures.js
node scripts/test-demo.js
node scripts/test-run-artifact-lifecycle.js
node scripts/test-schema-diagnostics.js
node scripts/test-runtime-report.js
node scripts/test-subagent-execution.js
node scripts/test-no-external-runtime-dependency.js
node scripts/test-no-cutepower-dependency.js
node scripts/test-contract-schema-consistency.js
node scripts/test-full-flow-fixture.js
node scripts/test-incident-bugfix-board-writeback-fixture.js
node scripts/test-no-auto-run-engine.js
node scripts/test-all.js
```
