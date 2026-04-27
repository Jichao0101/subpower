# cutepower compatibility

subpower is independent by default.

`.subpower/run/<session_id>/` is authoritative. `.cutepower/run/<session_id>/` may be read only by an optional adapter and copied into `upstream_cutepower_context.json`.

Shared concepts are acceptable for:

- `task_profile`
- `evidence_manifest`
- `review_decision`

Subpower independently defines orchestration artifacts such as `agent_invocation_manifest`, `side_state`, `handoff_packet`, `board_failure_review`, `main_route_decision`, and `closure_matrix`.

Adapter entry:

```bash
node scripts/cutepower-adapter.js .cutepower/run/<session_id> .subpower/run/<session_id>
```
