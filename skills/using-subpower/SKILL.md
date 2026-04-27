---
name: using-subpower
description: Enter subpower orchestration runtime and enforce subagent-first three-side workflow boundaries.
---

# Goal

Use subpower as the orchestration runtime for subagent handoff, side-state tracking, board evidence, failure assessment, and legal route decisions.

# Contracts

- `contracts/role-contracts.yaml`
- `contracts/workflow-patterns.yaml`
- `contracts/decision-points.yaml`
- `contracts/gate-matrix.yaml`

# Hard Stops

- Do not treat a workflow pattern as a fixed script.
- Do not bypass reviewer assessment after failed board validation.
- Do not close without evidence and closure artifacts.
- Do not use `.cutepower/run/<session_id>/` as authoritative state.

