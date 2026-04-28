# subpower

subpower is a subagent-first orchestration runtime for three-side workflows across knowledge, repository, and board execution state.

subpower governs subagent handoff, side-state synchronization, independent review, board evidence, decision points, and route legality.

The runtime model is:

```text
workflow patterns + decision points + runtime gates + run artifacts
```

Workflows are reusable patterns, not rigid end-to-end scripts.

## MVP Scope

Initial workflows:

- `incident_investigation`
- `bug_fix`
- `board_validation`

Initial agents:

- `workflow-orchestrator`
- `knowledge-planner`
- `repo-implementer`
- `repo-reviewer`
- `board-runner`

Initial run state lives under:

```text
.subpower/run/<session_id>/
```

## Plugin Distribution

This repository is the development source for an installable Codex plugin.

- plugin metadata: `.codex-plugin/plugin.json`
- install/runtime guidance: `README.codex.md`
- distributable runtime assets: `agents/`, `contracts/`, `schemas/`, `scripts/`, `skills/`, `docs/`
- local runtime state: `.subpower/run/` is ignored and must not be packaged as session truth
- `scripts/install-plugin.js` is a staging utility, not a formal release process

## Validation

```bash
node scripts/validate-contracts.js
node scripts/test-runtime-gates.js
node scripts/test-decision-points.js
node scripts/test-agent-boundaries.js
node scripts/test-run-artifacts.js
node scripts/test-all.js
```
