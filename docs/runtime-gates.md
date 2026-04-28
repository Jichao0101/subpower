# runtime gates

subpower runtime gates enforce structural legality:

- `role_gate`: role/action compatibility
- `phase_gate`: phase/action compatibility
- `artifact_gate`: required artifacts exist
- `schema_gate`: JSON artifact shape is valid for the supported schema subset
- `independence_gate`: implementer and reviewer are separate invocations
- `board_target_gate`: board execution has prompt/context-derived board target material
- `evidence_gate`: closure and review have evidence
- `route_gate`: route is allowed for the decision point and assessor artifacts exist
- `closure_gate`: closure matrix is satisfiable
- `writeback_gate`: writeback has review, evidence, and closure

They do not decide root cause correctness or business acceptance.

The gate layer only checks structural legality. It does not judge whether an implementation is correct, whether a root cause is true, or whether acceptance criteria are sufficient.

`board_target_gate` checks minimum structural readiness only:

- `board_target.json` must include at least one of `target_id`, `log_paths`, or `collect_paths`.
- `board_target.json` must include either `expected_behavior` or `validation_criteria`.
- `executor_type: manual` may have an empty `run_commands` array.
- If `board_target.json` is missing, `prompt_context.board_context` may satisfy the structural gate when prompt/context provided enough board material.

Route and closure gates can require `board_failure_review.json`, `main_route_decision.json`, and `route_history.json`, but they do not select the business route.
