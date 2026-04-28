Use `contracts/` as the active orchestration truth source for subpower.

Hard stops:

- Do not treat `agents/*.toml` as policy truth. They are thin subagent skeletons.
- Do not let a coder produce a passing `review_decision`.
- Do not let a reviewer modify repository code.
- Do not execute board validation without `board_target.json`.
- Do not route from a failed board validation without `board_failure_review.json`.
- Do not close without `evidence_manifest.json` and `closure_matrix.json`.
- Do not write back knowledge without reviewed closure evidence.
- Do not import runtime state from another orchestration system.
- External orchestration projects may be used as design references only.
- No source-level, runtime-level, schema-level, or artifact-level dependency is allowed.
