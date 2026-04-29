# runtime gates

subpower runtime gates enforce structural legality:

- `role_gate`: role/action compatibility
- `phase_gate`: phase/action compatibility
- `artifact_gate`: required artifacts exist
- `schema_gate`: JSON artifact shape is valid for the supported schema subset
- `independence_gate`: implementer and reviewer are separate invocations
- `subagent_execution_gate`: explicit subpower invocation has subagent execution status, role separation evidence, or degraded host-only fallback
- `board_target_gate`: board execution has prompt/context-derived board target material
- `evidence_gate`: closure and review have evidence
- `route_gate`: route is allowed for the decision point and assessor artifacts exist
- `closure_gate`: closure matrix is satisfiable
- `writeback_gate`: writeback has closure, approved review, evidence, candidate, plan, and terminal receipt or decline

They do not decide root cause correctness or business acceptance.

The gate layer only checks structural legality. It does not judge whether an implementation is correct, whether a root cause is true, or whether acceptance criteria are sufficient.

`subagent_execution_gate` enforces the subagent-first contract:

- explicit `use subpower` / `按 subpower 处理` requires `subagent_execution_status.json`
- `spawned_subagents` can claim complete subagent-first execution only when role separation evidence exists
- `host_only_fallback` must be degraded and must not claim complete subpower execution
- missing actor metadata is treated as insufficient independence evidence, not silent success

`board_target_gate` checks minimum structural readiness only:

- `board_target.json` must include at least one of `target_id`, `log_paths`, or `collect_paths`.
- `board_target.json` must include either `expected_behavior` or `validation_criteria`.
- `executor_type: manual` may have an empty `run_commands` array.
- If `board_target.json` is missing, prompt board context may support a "draft target next" report state, but it does not satisfy readiness for real board validation.

Hard stop: real board validation must not execute without `board_target.json`.

Route and closure gates can require `board_failure_review.json`, `main_route_decision.json`, and `route_history.json`, but they do not select the business route.

`writeback_gate` checks structure and boundaries only:

- closure must already be ready
- review must be approved
- candidate and plan must include evidence refs
- current knowledge candidates cannot contain unverified claims
- writeback refs must not be external absolute knowledge-base paths
- receipt must state that subpower did not perform the external write
