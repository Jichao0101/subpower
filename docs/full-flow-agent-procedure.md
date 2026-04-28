# Full-flow agent procedure

## Overview

The full subpower workflow is executed by the host agent using `skills/using-subpower/SKILL.md` as the entry point. No `subpower run` command is required or allowed for full business execution.

Subpower defines contracts, schemas, gates, reports, install staging, and demo fixtures. It does not automate root-cause judgment, code repair, or real board execution.

## Full-flow lifecycle

1. Extract prompt-provided context.
2. Create early artifacts: `prompt_context.json`, `task_profile.json`, `workflow_plan.json`, `workflow_state.json`, `side_state.json`, and `handoff_packet.json`.
3. Enter `incident_investigation` for board logs or observed board-side symptoms.
4. Produce `incident_report.json`, `root_cause_hypotheses.json`, `evidence_manifest.json`, and `next_workflow_recommendation.json`.
5. If the recommendation points to `bug_fix`, create `implementation_plan.json`, modify code through the implementer role, and produce `code_change_manifest.json`.
6. Require independent `review_decision.json` before board validation or closure.
7. If board validation is needed, bind board context into `board_target.json` or use equivalent prompt board context for the structural target gate.
8. Produce `board_session.json`, `board_validation_result.json`, and updated `evidence_manifest.json`.
9. If board validation failed, produce `board_failure_review.json`, `main_route_decision.json`, and append `route_history.json`.
10. Continue through the selected route until `closure_matrix.json` can pass closure.
11. After closure passes, enter `knowledge_writeback` and create `knowledge_writeback_candidate.json`, `writeback_plan.json`, and either `writeback_receipt.json` or `writeback_declined.json`.

## Prompt-provided context

Board target, log paths, validation commands, expected behavior, and project-specific metrics must come from the user prompt, current task context, project-local configuration, or run artifacts.

`prompt_context.json` records that extracted material. `board_target.json` is prompt/context derived and must not contain repository-coded defaults.

## Artifact sequence

```text
prompt_context
  -> task_profile
  -> workflow_plan
  -> workflow_state
  -> side_state
  -> handoff_packet
  -> incident_report/root_cause_hypotheses/evidence_manifest/next_workflow_recommendation
  -> implementation_plan/code_change_manifest/review_decision
  -> board_target/board_session/board_validation_result/evidence_manifest
  -> board_failure_review/main_route_decision/route_history
  -> closure_matrix
  -> knowledge_writeback_candidate/writeback_plan/writeback_receipt-or-writeback_declined
```

`workflow_state.json` is optional but recommended. `route_history.json` is required when decision points were traversed and closure is requested.

## Role handoff model

- `workflow-orchestrator` owns plan, state, route, route history, and closure request.
- `knowledge-planner` owns investigation planning, implementation planning, and prompt-derived board target drafting.
- `repo-implementer` owns repo changes and local verification evidence.
- `repo-reviewer` owns independent review and can assess failed board validation.
- `failure-analyst` classifies board validation failure when reviewer assessment is not enough.
- `board-runner` executes or guides board validation and records board artifacts.
- `knowledge-closer` prepares writeback artifacts only after closure is allowed.

## Board validation failure routing

When `board_validation_result.status` is `failed`, direct rework is blocked.

```text
board_validation_result.failed
  -> board_failure_review
  -> main_route_decision
  -> route_history append
  -> selected route
```

Allowed routes include `coder_rework`, `planner_rework`, `collect_more_evidence`, `rerun_board_validation`, `escalate_to_user`, and `close_as_environment_issue`.

## Multi-round rework

Each rework round must preserve failed evidence references, the assessor artifact, the route decision, the route reason, the round number, and the timestamp.

Do not overwrite previous route decisions or evidence. Append to `route_history.json`.

## What scripts do

Scripts provide structural support:

- validate contracts and schemas
- evaluate runtime gates
- produce runtime reports and next structural actions
- stage plugin installation
- copy demo fixtures
- run regression tests

## What scripts do not do

Scripts do not:

- execute the full business workflow
- decide business root cause
- choose whether code or plan should be fixed
- modify repository code as an automatic workflow engine
- execute real board validation
- hardcode board targets, board IPs, log paths, replay commands, or project log formats
- write external Knowledge-Base files
- read or depend on external knowledge-base paths
- promote unverified claims into current knowledge

## Knowledge writeback

Knowledge writeback is a closure-after phase. Subpower only records and validates artifacts:

```text
closure_matrix.passed
  -> knowledge_writeback_candidate
  -> writeback_plan
  -> writeback_receipt or writeback_declined
```

`current_knowledge` candidates must contain only verified claims with evidence refs. Unverified claims are kept out of current knowledge and should be declined or routed to a lower-confidence scope by the host workflow.

`writeback_plan.destination_ref` and receipt refs are logical references for host action. They must not be external absolute paths.

## Example: board log to closure

1. User reports `fusion target jump under high yaw-rate` and provides `/logs/example/fusion/high_yaw_rate.log`.
2. Host agent creates `prompt_context.json` and enters `incident_investigation`.
3. Investigation artifacts record evidence and recommend `bug_fix`.
4. Planner creates a timestamp alignment plan.
5. Implementer changes the scoped code and records local verification.
6. Reviewer approves.
7. Board-runner records a board session; validation fails.
8. Failure assessment classifies the failure as `plan_mismatch`.
9. Workflow-orchestrator routes to `planner_rework` and appends `route_history.json`.
10. Planner extends the plan to ego-motion compensation.
11. Implementer changes the scoped code; reviewer approves.
12. Board validation passes.
13. `closure_matrix.json` sets `close_allowed` to `true`, references route history, and closure gate allows close.
14. Knowledge-closer prepares a verified writeback candidate and a host-action writeback plan.
15. Host action is recorded as a receipt, or the writeback is declined with blockers.
