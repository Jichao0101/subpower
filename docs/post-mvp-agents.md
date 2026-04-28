# post-MVP agents

`failure-analyst` is an optional assessor for complex incidents or multi-round failures. It can inspect evidence, produce hypotheses, classify failures, and recommend evidence collection. It cannot write repo changes, approve review, execute board validation, close sessions, or write current knowledge.

`verification-manager` is an optional participant for complex verification matrices. It can design verification coverage and recommend gaps. It does not replace the reviewer and cannot execute board validation, write repo changes, approve review, or close sessions.

`knowledge-closer` is an optional writeback role after closure gates pass. It can emit writeback receipts or declines. It cannot promote unreviewed conclusions, modify the repository, approve review, or execute board validation.
