# GATES

Gate lines for The Hush, written only by the spec session or the phase-3 producer, quoting the owner's words from the chat. `node tools/gates.mjs --check <GATE> <scope>` is the only reader; nobody greps this file for a prefix. Each gate line sits at column 0 in one anchored form: the gate name, a colon and one scope token, then ` | ` and an ISO-8601 time with offset, then ` | ` and the owner's words as one JSON string, then ` | redacted: yes` or ` | redacted: no`. A withdrawal line starts with `REVOKED: ` followed by the gate name and the scope it withdraws. For every JHON gate, the quoted message begins with the gate name and scope.

