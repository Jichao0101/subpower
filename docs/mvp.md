# MVP

The first subpower slice validates:

```text
task_profile
 -> workflow_plan: bug_fix + board_validation
 -> repo-implementer handoff
 -> repo-reviewer review_decision
 -> board-runner board_validation_result failed
 -> repo-reviewer board_failure_review
 -> main_route_decision
 -> route_gate accepts/rejects
 -> closure_gate blocks until evidence complete
```

This proves the core separation between implementer, reviewer, board runner, and main-agent route ownership.

