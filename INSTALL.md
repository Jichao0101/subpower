# Install subpower

subpower is currently a development source for a Codex plugin. Stage it before treating it as an installed runtime plugin.

After staging, agents should read `skills/using-subpower/SKILL.md` as the full-flow entry for complex tasks. Installation only makes skills, agents, contracts, schemas, and scripts available; it does not automatically execute real board tasks.

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

## Staging With Verification

```bash
node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower --verify
```

`--verify` runs `node scripts/subpower.js validate` and `node scripts/subpower.js test` inside the staged copy. It validates the installed plugin structure only; it does not execute real workflow tasks, access an external board, or write an external Knowledge-Base.

## Post-Install Validation

```bash
node scripts/test-all.js
node scripts/subpower.js test
node scripts/subpower.js validate
```

There is no `subpower run` command. Full business workflow execution is started by the `using-subpower` skill and composed by the host agent.

## Boundaries

- install-plugin.js is a staging utility, not a marketplace publisher.
- scripts provide structural validation, runtime gates, runtime reports, install staging, and demo fixture support only.
- .codex-plugin/plugin.json is plugin metadata, not proof of installation.
- .subpower/run/<session_id>/ is runtime state and is not copied into plugin staging targets.
- External orchestration projects may be used as design references only.
- No source-level, runtime-level, schema-level, or artifact-level dependency is allowed.
