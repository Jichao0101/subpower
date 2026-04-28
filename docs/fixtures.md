# fixtures

`fixtures/bugfix-board-failure-rework/` demonstrates a board-required bug fix where local review passes but board validation fails.

The fixture models a target jump in a high yaw-rate scene after a timestamp alignment change. It includes two legal failure assessments:

- `implementation_defect` routes to `coder_rework`
- `plan_mismatch` routes to `planner_rework`

The blocked closure matrix confirms that failed board validation cannot close without a legal route and resolved blockers.
