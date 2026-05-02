# runtime gates

subpower runtime gates enforce structural legality:

- `role_gate`: role/action compatibility
- `phase_gate`: phase/action compatibility
- `artifact_gate`: required artifacts exist
- `schema_gate`: JSON artifact shape is valid for the supported schema subset
- `independence_gate`: implementer and reviewer are separate invocations
- `subagent_execution_gate`: explicit subpower invocation has execution status plus either concrete role execution evidence for complete claims or an explicitly degraded fallback/non-complete state
- `board_target_gate`: board execution has prompt/context-derived board target material
- `evidence_gate`: closure and review have evidence
- `route_gate`: route is allowed for the decision point and assessor artifacts exist
- `closure_gate`: closure matrix is satisfiable
- `writeback_gate`: writeback has closure, approved review, evidence, candidate, plan, and terminal receipt or decline

They do not decide root cause correctness or business acceptance.

The gate layer only checks structural legality. It does not judge whether an implementation is correct, whether a root cause is true, or whether acceptance criteria are sufficient.

`subagent_execution_gate` enforces the subagent-first contract:

- explicit `use subpower` / `按 subpower 处理` requires `subagent_execution_status.json`
- `prompt_context`, `task_profile`, and `workflow_plan` subpower markers are cross-checked against `subagent_execution_status.subpower_invoked`
- `spawned_subagents` can claim complete subagent-first execution only when role separation evidence and concrete invocation evidence exist
- `host_only_fallback` must be degraded and must not claim complete subpower execution
- `declared_only`, `synthetic_fixture`, and `host_only` invocation evidence cannot support a complete execution claim
- undisclosed host participation in implementation, review, verification, board execution, failure analysis, or writeback assessment blocks the gate
- disclosed host participation in critical role work also blocks a complete subagent-first execution claim
- complete claims and `execution_evidence_status: complete` require critical actor separation for implementation, review, verification, board execution, and writeback roles
- missing actor metadata is treated as insufficient independence evidence, not silent success

Runtime reports distinguish structural readiness from complete execution support:

- fixture and declared-only evidence may be structurally useful for gate/report regression tests
- `execution_claim.structural_subagent_gate_ready` reports structural gate readiness
- `execution_claim.complete_execution_supported` and `execution_claim.complete_subpower_execution_allowed` are false for `synthetic_fixture`, `declared_only`, `host_only`, `insufficient`, and `host_only_fallback` evidence
- non-complete execution support is labeled with `execution_classification` and `degraded_execution`

`board_target_gate` checks minimum structural readiness only:

- `board_target.json` must include at least one of `target_id`, `log_paths`, or `collect_paths`.
- `board_target.json` must include either `expected_behavior` or `validation_criteria`.
- `executor_type: manual` may have an empty `run_commands` array.
- If `board_target.json` is missing, prompt board context may support a "draft target next" report state, but it does not satisfy readiness for real board validation.

Hard stop: real board validation must not execute without `board_target.json`.

If `board_validation_result.json` exists, closure and writeback also require `board_session.json`. Complete execution claims require concrete producer evidence for both the board session and board result.

Route and closure gates can require `board_failure_review.json`, `main_route_decision.json`, and `route_history.json`, but they do not select the business route.

`writeback_gate` checks structure and boundaries only:

- closure must already be ready
- review must be approved
- candidate and plan must include evidence refs
- current knowledge candidates cannot contain unverified claims
- writeback refs must not be external absolute knowledge-base paths
- receipt must state that subpower did not perform the external write
