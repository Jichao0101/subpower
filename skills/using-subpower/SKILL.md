---
name: using-subpower
description: Start and drive subpower's agent-facing full workflow for complex three-side tasks without using an automatic workflow runner.
---

# using-subpower

## Purpose

Use subpower as the agent-facing entry point for complex tasks that require structured handoff between investigation, planning, implementation, review, board validation, failure assessment, routing, and closure.

The host agent composes the workflow dynamically. Subagents execute role contracts. Scripts only validate structure, gates, reports, fixtures, and installation staging.

## When to use

Use this skill when a task involves any of these conditions:

- Board logs, board-side symptoms, target behavior, replay evidence, or validation evidence.
- Root-cause hypotheses that need evidence tracking before code changes.
- Code changes that must be independently reviewed before validation.
- Failed board validation that requires reviewer or failure-analyst assessment before rework.
- Multi-round rework where route history must be preserved.
- Closure that must be gated by evidence, review status, board state, and route history.

## Non-goals

- Do not run a fixed end-to-end business workflow script.
- Do not expect `node scripts/subpower.js run`; that command is not part of subpower.
- Do not infer business root cause in scripts.
- Do not automatically modify repository code from scripts.
- Do not automatically execute real board validation from scripts.
- Do not import runtime state from another orchestration system.
- Do not hardcode board targets, board IPs, log paths, validation commands, project metrics, or project log formats in subpower.

## Required operating model

The full workflow is driven by this skill and the host agent:

- `skills/using-subpower/SKILL.md` is the full-flow entry point.
- `agents/*.toml` define thin role boundaries.
- `contracts/*.yaml` define structural obligations and legal routes.
- `schemas/run-artifacts/*.schema.json` define artifact shape.
- `scripts/` provide validation, runtime gates, runtime reports, installation staging, and demo fixture support.
- Scripts do not execute the full workflow. Scripts only validate artifacts, gates, reports, fixtures, and installation staging.
- The host agent remains responsible for workflow composition and subagent orchestration.

## Full-flow procedure

1. Decide whether the task needs subpower. Prefer subpower when board evidence, independent review, side-state synchronization, decision-point routing, or closure gates are required.
2. Extract from the user prompt and current task context:
   - observed symptom
   - board target, if provided
   - log paths, if provided
   - expected behavior
   - validation criteria
   - constraints
   - repo scope
3. If necessary context is missing, ask only the minimum blocking question. Do not ask again for information already present in prompt or artifacts.
4. Create or update early artifacts:
   - `prompt_context.json`
   - `task_profile.json`
   - `workflow_plan.json`
   - `workflow_state.json`
   - `side_state.json`
   - `handoff_packet.json`
5. Select the workflow pattern:
   - `incident_investigation`
   - `bug_fix`
   - `board_validation`
   - `functional_review`
   - `knowledge_writeback`
6. For board logs or observed board-side phenomena, enter `incident_investigation` before implementation unless the user explicitly provides an already reviewed plan.
7. `incident_investigation` should produce:
   - `incident_report.json`
   - `root_cause_hypotheses.json`
   - `evidence_manifest.json`
   - `next_workflow_recommendation.json`
8. If `next_workflow_recommendation.json` points to `bug_fix`:
   - planner creates `implementation_plan.json`
   - implementer changes code and creates `code_change_manifest.json`
   - reviewer creates `review_decision.json`
9. If board validation is required:
   - create `board_target.json` from prompt/context/project-local configuration/run artifacts
   - board-runner executes or guides validation and creates `board_session.json`, `board_validation_result.json`, and `evidence_manifest.json`
10. If board validation failed:
   - do not directly rework
   - repo-reviewer or failure-analyst must create `board_failure_review.json`
   - workflow-orchestrator must create `main_route_decision.json`
11. Route only according to `main_route_decision.json`:
   - `coder_rework`
   - `planner_rework`
   - `collect_more_evidence`
   - `rerun_board_validation`
   - `escalate_to_user`
   - `close_as_environment_issue`
12. Preserve every round in `route_history.json`; do not overwrite prior route decisions or evidence references.
13. Close only after `closure_matrix.json` passes the closure gate. Enter `knowledge_writeback` only after closure is structurally allowed.

## Prompt-provided context extraction

Create `prompt_context.json` early. It records context; it does not invent defaults.

Board target, log paths, validation commands, expected behavior, and project-specific metrics must come from the user prompt, current task context, project-local configuration, or run artifacts. Subpower only defines the artifact contract and gates. Subpower must not hardcode board paths, IPs, commands, or log formats.

When `prompt_context.board_context.provided` is `false`, incident investigation can still proceed. When a workflow enters real `board_validation`, `board_target_gate` must block unless enough board target or prompt board context exists.

## Artifact creation order

Recommended order:

1. `prompt_context.json`
2. `task_profile.json`
3. `workflow_plan.json`
4. `workflow_state.json`
5. `side_state.json`
6. `handoff_packet.json`
7. Investigation artifacts: `incident_report.json`, `root_cause_hypotheses.json`, `evidence_manifest.json`, `next_workflow_recommendation.json`
8. Implementation artifacts: `implementation_plan.json`, `code_change_manifest.json`
9. Review artifacts: `review_decision.json`
10. Board artifacts: `board_target.json`, `board_session.json`, `board_validation_result.json`, `evidence_manifest.json`
11. Failure-routing artifacts: `board_failure_review.json`, `main_route_decision.json`, `route_history.json`
12. Closure artifacts: `closure_matrix.json`

## Role orchestration

- `workflow-orchestrator`: owns workflow plan, workflow state, main route decision, route history, and closure request.
- `knowledge-planner`: owns investigation planning, implementation planning, board target drafting from provided context, and next workflow recommendation.
- `repo-implementer`: owns code changes and local verification evidence.
- `repo-reviewer`: owns independent code review and may assess failed board validation.
- `board-runner`: owns board session execution or manual execution guidance and board validation result.
- `failure-analyst`: owns failure classification when board evidence needs independent assessment.
- `verification-manager`: owns read-only verification coverage analysis.
- `knowledge-closer`: owns writeback only after closure gates allow it.

## Decision points

Use `contracts/decision-points.yaml` as the legal route source. Common points:

- `board_validation_failed`: requires failed `board_validation_result.json`, `evidence_manifest.json`, and `board_failure_review.json`.
- `code_review_failed`: requires reviewer findings before rework.
- `evidence_insufficient`: routes to more evidence, rerun validation, planning rework, or escalation.
- `requirement_ambiguous`: routes to planner rework, functional review, or escalation.
- `closure_blocked`: routes to more evidence, rework, writeback declined, or escalation.

## Board validation failure handling

After `board_validation_result.status == failed`:

1. Stop direct rework.
2. Ask repo-reviewer or failure-analyst to create `board_failure_review.json`.
3. Ask workflow-orchestrator to create `main_route_decision.json`.
4. Append the decision to `route_history.json`.
5. Continue only through the selected route.

The structural report may recommend the next missing artifact, but it must not decide the business route.

## Closure rules

Closure requires:

- sufficient `evidence_manifest.json`
- `closure_matrix.json`
- reviewed code if repo changes were made
- board pass, terminal environment route, or documented not-required board state
- `route_history.json` if any decision point was traversed

Do not close when a failed board validation lacks reviewer/failure-analyst assessment, route decision, or route history.

## Minimal questions policy

- If the user already provided log paths, board target, or expected behavior, do not repeat the question.
- If only non-blocking details are missing, begin incident investigation with available evidence.
- If board target is missing but the current phase is log analysis, do not block.
- If real board validation is required and there is no board target or validation criteria, ask the minimum blocking question.
- If business semantics cannot be determined, provide the smallest verifiable path and avoid fabricated conclusions.

## Safety / stop conditions

Stop or escalate when:

- A role is being asked to perform a denied action.
- A board validation route is requested without the required assessor artifact.
- A closure request lacks evidence, route history after decision points, or a closure matrix.
- The task requires real board execution but no board target, validation criteria, or execution authority is available.
- The only way to continue would require hardcoded board paths, IPs, commands, log formats, or external runtime state.
