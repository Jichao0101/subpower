# subpower for Codex

subpower is an installable orchestration plugin for subagent-first workflows across knowledge, repository, and board-side validation.

This repository is the development source. Runtime use should come from an installed or staged plugin copy, not from ad hoc references to a host workspace.

## Runtime Boundary

- `contracts/` is the active orchestration truth source.
- `agents/` contains thin subagent skeletons, not policy truth.
- `skills/` contains usage discipline and entry points.
- `scripts/` contains validation, artifact IO, runtime gates, and optional adapter utilities.
- `.subpower/run/<session_id>/` is runtime state and is not versioned.

## Installability

The plugin metadata lives in:

```text
.codex-plugin/plugin.json
```

Future staging scripts should copy the repository contents into a user or repo plugin directory while excluding local runtime state:

```text
.git/
.subpower/run/
node_modules/
coverage/
*.log
```

After staging, install `subpower` from `/plugins`.

## Validation

Run from the staged plugin copy or development root:

```bash
node scripts/validate-contracts.js
node scripts/test-runtime-gates.js
node scripts/test-decision-points.js
node scripts/test-agent-boundaries.js
node scripts/test-run-artifacts.js
```

## cutepower Compatibility

subpower is independent by default. If a cutepower session exists, import it as optional upstream context:

```bash
node scripts/cutepower-adapter.js .cutepower/run/<session_id> .subpower/run/<session_id>
```

The imported file is context only. `.subpower/run/<session_id>/` remains authoritative.

