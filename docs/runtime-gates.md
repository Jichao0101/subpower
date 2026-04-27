# runtime gates

subpower runtime gates enforce structural legality:

- `role_gate`: role/action compatibility
- `phase_gate`: phase/action compatibility
- `artifact_gate`: required artifacts exist
- `schema_gate`: required fields exist
- `independence_gate`: implementer and reviewer are separate invocations
- `board_target_gate`: board execution has board target
- `evidence_gate`: closure and review have evidence
- `route_gate`: route is allowed for the decision point and assessor artifacts exist
- `closure_gate`: closure matrix is satisfiable
- `writeback_gate`: writeback has review, evidence, and closure

They do not decide root cause correctness or business acceptance.

