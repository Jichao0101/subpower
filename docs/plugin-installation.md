# plugin installation

This repository is the development source for subpower. `.codex-plugin/plugin.json` is future plugin distribution metadata.

`scripts/install-plugin.js` is a local staging utility. It copies plugin files into a target directory for testing; it is not a formal publication process.

Examples:

```bash
node scripts/install-plugin.js --scope personal --target ~/.codex/plugins/subpower
node scripts/install-plugin.js --scope repo --target ./.codex/plugins/subpower
node scripts/install-plugin.js --scope repo --target /tmp/subpower-plugin --dry-run
```

The installer checks required plugin directories and excludes runtime or generated paths such as `.subpower/run/`, `node_modules/`, `coverage/`, `logs/`, and `tmp/`.

Existing targets are not overwritten unless `--force` is provided.
