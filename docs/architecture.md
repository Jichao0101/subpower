# subpower architecture

subpower is a subagent-first orchestration runtime for three-side workflows:

- knowledge side: context, planning, writeback readiness
- repo side: implementation, verification, review readiness
- board side: target binding, execution, evidence collection, pass/fail state

An explicit user instruction such as `use subpower` or `按 subpower 处理` authorizes subagent-first orchestration.

The main agent acts as workflow composer and routing decision owner only. Subagents produce bounded artifacts. Runtime gates enforce structural legality. Host-only fallback is degraded/non-complete and must be labeled that way.

Runtime gates do not make business judgments. They check roles, phases, artifacts, schemas, independence, board target binding, evidence, routes, closure, and writeback preconditions.

Scripts and gates do not complete workflows. They validate structure, reports, fixtures, and staging support for the host-orchestrated subagent flow.

External orchestration projects may be used as design references only. No source-level, runtime-level, schema-level, or artifact-level dependency is allowed.

`.subpower/run/<session_id>/` is runtime state and must not be versioned or packaged.
