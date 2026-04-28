# plugin installation

This repository is the development source for subpower. `.codex-plugin/plugin.json` is future plugin distribution metadata, not proof of installation.

`scripts/install-plugin.js` is a local staging utility. It copies plugin files into a target directory for testing; it is not a formal marketplace publication process.

After staging, the full-flow entry is `skills/using-subpower/SKILL.md`. There is no `subpower run` command; scripts provide validation, reports, gates, installation staging, and demos only.

Core commands match [../INSTALL.md](../INSTALL.md):

```bash
node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower
node scripts/install-plugin.js --scope personal --target ~/.codex/plugins/subpower
node scripts/install-plugin.js --scope repo --target /tmp/subpower-plugin --dry-run
node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower --force
node scripts/test-all.js
node scripts/subpower.js test
node scripts/subpower.js validate
```

The installer checks required plugin directories and excludes runtime or generated paths such as `.subpower/run/`, `node_modules/`, `coverage/`, `logs/`, and `tmp/`.

Existing targets are not overwritten unless `--force` is provided.
