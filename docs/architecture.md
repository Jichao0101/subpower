# subpower architecture

subpower is a subagent-first orchestration runtime for three-side workflows:

- knowledge side: context, planning, writeback readiness
- repo side: implementation, verification, review readiness
- board side: target binding, execution, evidence collection, pass/fail state

The main agent acts as workflow composer and routing decision owner. Subagents produce bounded artifacts. Runtime gates enforce structural legality.

Runtime gates do not make business judgments. They check roles, phases, artifacts, schemas, independence, board target binding, evidence, routes, closure, and writeback preconditions.

External orchestration projects may be used as design references only. No source-level, runtime-level, schema-level, or artifact-level dependency is allowed.

`.subpower/run/<session_id>/` is runtime state and must not be versioned or packaged.
