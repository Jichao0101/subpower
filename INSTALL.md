# Install subpower

subpower is currently a development source for a Codex plugin. Stage it before treating it as an installed runtime plugin.

## Repo Scoped Staging

```bash
node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower
```

## Personal Scoped Staging

```bash
node scripts/install-plugin.js --scope personal --target ~/.codex/plugins/subpower
```

## Dry Run

```bash
node scripts/install-plugin.js --scope repo --target /tmp/subpower-plugin --dry-run
```

## Force Overwrite

```bash
node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower --force
```

## Post-Install Validation

```bash
node scripts/test-all.js
node scripts/subpower.js test
node scripts/subpower.js validate
```

## Boundaries

- install-plugin.js is a staging utility, not a marketplace publisher.
- .codex-plugin/plugin.json is plugin metadata, not proof of installation.
- .subpower/run/<session_id>/ is runtime state and is not copied into plugin staging targets.
- External orchestration projects may be used as design references only.
- No source-level, runtime-level, schema-level, or artifact-level dependency is allowed.
