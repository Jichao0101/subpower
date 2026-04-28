# demo: bugfix board failure rework

This demo turns the `fixtures/bugfix-board-failure-rework/` fixture into a runnable `.subpower/run/<session_id>/` directory.

Create the default implementation-defect route:

```bash
node scripts/subpower.js demo bugfix-board-failure-rework --route coder_rework --to .subpower/run/demo-bugfix-board-failure
node scripts/subpower.js gate route .subpower/run/demo-bugfix-board-failure
node scripts/subpower.js report .subpower/run/demo-bugfix-board-failure
```

Create the planning-mismatch route:

```bash
node scripts/subpower.js demo bugfix-board-failure-rework --route planner_rework --to .subpower/run/demo-planner-rework
node scripts/subpower.js gate route .subpower/run/demo-planner-rework
```

The two supported routes are:

- `implementation_defect -> coder_rework`
- `plan_mismatch -> planner_rework`

The demo does not execute a real board. It materializes already captured artifacts and runs structural gates against them.
