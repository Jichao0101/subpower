# subpower for Codex

subpower is an installable orchestration plugin source for subagent-first workflows across knowledge, repository, and board-side validation.

Agents should read [INSTALL.md](./INSTALL.md) before attempting to use subpower as an installed plugin.

This repository is the development source. Runtime use should come from an installed or staged plugin copy after install checks pass.

## Runtime Boundary

- `contracts/` is the active orchestration truth source.
- `agents/` contains thin subagent skeletons, not policy truth.
- `skills/` contains usage discipline and entry points.
- `scripts/` contains validation, artifact IO, runtime gates, staging install, demo, reports, and regression tests.
- `.subpower/run/<session_id>/` is runtime state and is not versioned.
- External orchestration projects may be used as design references only.
- No source-level, runtime-level, schema-level, or artifact-level dependency is allowed.

## Installability

The plugin metadata lives in `.codex-plugin/plugin.json`. It is metadata, not proof that the plugin is installed.

Use the staging commands in [INSTALL.md](./INSTALL.md). `scripts/install-plugin.js` is a staging utility for local testing and does not represent formal plugin publication.

## Validation

Run from the staged plugin copy or development root:

```bash
node scripts/subpower.js validate
node scripts/subpower.js test
node scripts/test-all.js
```
