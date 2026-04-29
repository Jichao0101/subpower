# bugfix board failure rework fixture

Scenario: board-side fusion target jumps after a timestamp alignment bug fix. Local review approves the first patch, but board validation still fails in high yaw-rate scenes.

This is a synthetic structural fixture. Its board session and validation artifacts are degraded examples only; they are not real board execution evidence and must not be used to claim workflow completion.

The fixture includes two valid reviewer assessments:

- `implementation_defect` routes to `coder_rework`
- `plan_mismatch` routes to `planner_rework`

`closure_matrix.blocked.json` intentionally blocks close.
