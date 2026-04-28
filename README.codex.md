# subpower for Codex

subpower is an installable orchestration plugin for subagent-first workflows across knowledge, repository, and board-side validation.

This repository is the development source. Runtime use should come from an installed or staged plugin copy, not from ad hoc references to a host workspace.

## Runtime Boundary

- `contracts/` is the active orchestration truth source.
- `agents/` contains thin subagent skeletons, not policy truth.
- `skills/` contains usage discipline and entry points.
- `scripts/` contains validation, artifact IO, runtime gates, staging install, and regression tests.
- `.subpower/run/<session_id>/` is runtime state and is not versioned.

## Installability

The plugin metadata lives in:

```text
.codex-plugin/plugin.json
```

The staging installer copies plugin files into a user or repo plugin directory while excluding local runtime state:

```bash
node scripts/install-plugin.js --scope personal --target ~/.codex/plugins/subpower
node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower
node scripts/install-plugin.js --scope repo --target /tmp/subpower-plugin --dry-run
```

`scripts/install-plugin.js` is a staging utility for local testing and does not represent formal plugin publication.

## Validation

Run from the staged plugin copy or development root:

```bash
node scripts/validate-contracts.js
node scripts/test-runtime-gates.js
node scripts/test-decision-points.js
node scripts/test-agent-boundaries.js
node scripts/test-run-artifacts.js
node scripts/test-all.js
```
