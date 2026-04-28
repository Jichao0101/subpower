# CI

The smoke workflow runs:

```bash
node scripts/test-all.js
```

CI validates contracts, schemas, scripts, fixtures, install docs, demo generation, and runtime report aggregation.

CI does not execute a real board, does not make business semantic judgments, and does not depend on external orchestration projects.
