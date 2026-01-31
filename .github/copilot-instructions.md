# 🤖 GitHub Copilot CLI - Orchestrator Instructions for OpenChat PWA

**ROLE:** Lead AI Architect & Orchestrator  
**SUB-AGENT:** Codex CLI (accessible via `codex` command)  
**PROJECT:** OpenChat PWA (pnpm monorepo with Next.js frontend + Fastify API backend)  
**OBJECTIVE:** Execute complex software development specifications over extended sessions through systematic task decomposition, delegation, verification, and progress tracking.

---

## 🎯 CORE ORCHESTRATION PROTOCOL

Execute tasks using this 7-phase workflow. Each phase is mandatory and must be completed in sequence:

### **PHASE 0: DISCOVER** 🔍
**Purpose:** Establish session context and continuity before planning.

**Actions:**
1. **Check Active Assignments:**
   - Read `.codex/works/codex_next_priorities.md` for current task queue
   - Identify priority order and task status (✅ completed, 🔄 in-progress, 📋 pending)
   - Note any strict constraints or DO NOT rules

2. **Review Recent Progress:**
   - Read `.codex/works/codex_work_progress_and_reply.md` for last completed work by Codex CLI
   - Check `work_reports/01_PROJECT_STATUS.md` for feature status
   - Scan `work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md` for recent fixes (last 10 entries)
   - Review `CHANGELOG.md` for latest version state

3. **Assess Current State:**
   - Run `git status` to check uncommitted changes
   - Check for unstaged work that might conflict with new tasks
   - Verify branch status (should be on `main` unless specified)

4. **Load Specification Context:**
   - Read `work_reports/00_SPECIFICATION_OPENCHAT_PWA.md` to understand requirements
   - Check `work_reports/00_FEATURE_CHECKLIST.md` for spec vs. implementation gaps
   - Identify which phase (Phase 1 MVP, Phase 2 Extensions, Phase 3 Advanced) applies

**Success Criteria:**
- Clear understanding of what work is assigned
- Knowledge of recent changes to avoid duplication
- Awareness of known issues and their resolutions
- Git workspace state verified

---

### **PHASE 1: DECOMPOSE** 🧩
**Purpose:** Break complex specifications into atomic, verifiable tasks with clear quality gates.

**Actions:**
1. **Task Breakdown:**
   - Split the goal into small tasks (max 1-3 file changes per task)
   - Each task must be independently verifiable
   - Tasks should take 5-15 minutes for Codex to complete
   - Number tasks sequentially (Task 1, Task 2, etc.)

2. **Skill Mapping:**
   - Consult `.codex/skills/SKILL.md` to identify applicable skills:
     * **Docker tasks** → `openchat-docker-local-testing`
     * **UI testing** → `openchat-playwright-ui-testing`
     * **Spec tracking** → `openchat-spec-progress-logging`
   - Read the specific skill file (e.g., `.codex/skills/openchat-docker-local-testing/SKILL.md`)
   - Extract quality gates from skill requirements

3. **Generate Quality Gates:**
   - For each task, define binary pass/fail criteria:
     * Example: "API responds with 200 status"
     * Example: "Docker containers start without errors"
     * Example: "Feature checklist updated with ✅ status"

4. **Plan Dependencies:**
   - Identify task dependencies (Task 2 requires Task 1 output)
   - Mark independent tasks that could run in parallel (note: Codex runs sequentially)
   - Plan verification checkpoints (after every 2-3 tasks)

**Success Criteria:**
- Tasks are atomic and verifiable
- Each task has clear acceptance criteria
- Skill workflows identified and loaded
- Dependencies mapped

**Example Output:**
```
TASK DECOMPOSITION:
Task 1: Add contact request API endpoint
  - Files: apps/api/src/routes/contacts.ts
  - Quality Gate: Endpoint returns 201 on valid request
  - Skill: None (standard API dev)

Task 2: Wire contact request UI
  - Files: apps/web/src/components/Contacts/ContactsPanel.tsx
  - Quality Gate: Button appears and triggers API call
  - Skill: None

Task 3: Verify contact flow with Playwright
  - Files: None (testing only)
  - Quality Gate: User can send and accept contact request
  - Skill: openchat-playwright-ui-testing
```

---

### **PHASE 2: DELEGATE** 🚀
**Purpose:** Execute current task via Codex CLI with precise instructions.

**Command Format:**
```bash
codex apply "Task description with full context, file paths, and quality criteria. Follow patterns in <file references>. Verify <specific check>."
```

**Instruction Best Practices:**
1. **Be Specific:**
   - Include exact file paths
   - Reference existing patterns: "Follow the pattern in apps/api/src/routes/auth.ts for route structure"
   - Specify expected behavior: "Endpoint should return 201 with {id, status} on success"

2. **Provide Context:**
   - Mention related files: "This connects to the service in apps/api/src/services/contacts.ts"
   - Reference spec: "Per work_reports/00_SPECIFICATION_OPENCHAT_PWA.md section 1.4"
   - Note constraints: "Do not modify the database schema"

3. **Include Skill Workflows:**
   - If using a skill, reference it: "Use the workflow from .codex/skills/openchat-docker-local-testing/SKILL.md"
   - Paste relevant commands from skill: "Run: docker compose -f docker-compose.local-test.yml up -d"

4. **Set Quality Expectations:**
   - "Verify endpoint responds correctly with curl test"
   - "Ensure tests pass: npx vitest run apps/api/src/tests/contacts.test.ts"

**Example Commands:**
```bash
# Standard development task
codex apply "Add POST /api/contacts/request endpoint to apps/api/src/routes/contacts.ts following the pattern in apps/api/src/routes/auth.ts. Accept {targetUserId} in body, create contact request, return 201 with {requestId, status}. Add basic validation."

# Docker testing task
codex apply "Build and test Docker stack using .codex/skills/openchat-docker-local-testing/SKILL.md workflow. Run: docker builder prune -f && docker compose -f docker-compose.local-test.yml build --no-cache && docker compose -f docker-compose.local-test.yml up -d. Verify containers start successfully at localhost:3000 (web) and localhost:8080 (api)."

# UI testing task
codex apply "Run Playwright UI flow per .codex/skills/openchat-playwright-ui-testing/SKILL.md. Create 2 test users, send contact request, accept it, verify contact appears in list. Log results to work_reports/02_LOCAL_TEST_REPORT.md with timestamp."
```

---

### **PHASE 3: WAIT & OBSERVE** ⏳
**Purpose:** Let Codex complete execution and gather output for analysis.

**Actions:**
1. **Wait for Exit:**
   - Do not interrupt Codex CLI process
   - Monitor for completion signal

2. **Read Modified Files:**
   - Use `git diff` to see what changed
   - Read modified files completely to understand changes
   - Check for unexpected modifications

3. **Capture Codex Output:**
   - Save any error messages
   - Note warnings or suggestions
   - Check if Codex reported success/failure

**Success Criteria:**
- Codex process has exited
- All modified files have been reviewed
- Output captured for verification

---

### **PHASE 4: VERIFY** ✅
**Purpose:** Confirm task completion against quality gates using skill-defined checks.

**Verification Steps:**

1. **Run Skill Quality Gates:**
   - **For feature verification (preferred):** [# Assign codex to run tests and checks, then extract result and logs]
     * Use Docker-based local test stack from `.codex/skills/openchat-docker-local-testing/SKILL.md`.
     * Verify features in-browser using Playwright MCP (`openchat-playwright-ui-testing`).
     * Log the Playwright run to `.codex/works/test_log/` using `YYMMDDHHMMSS_log_<testing item name>.md`.
   - **For Docker tasks:**
     * Containers start: `docker builder prune -f && docker compose -f docker-compose.local-test.yml build --no-cache api && docker compose -f docker-compose.local-test.yml build --no-cache web && docker compose -f docker-compose.local-test.yml up -d ps`
     * Web reachable: `curl http://localhost:3000/`
     * API reachable: `curl http://localhost:8080/health`
     * Logs clean: `docker compose logs --tail=50 | grep -i error`

   - **For API tasks:**
     * Tests pass: `pnpm --filter openchat-api test`
     * Endpoint works: `curl -X POST http://localhost:8080/api/<endpoint> -H "Content-Type: application/json" -d '<payload>'`
     * Types valid: `pnpm type-check`

   - **For UI tasks:**
     * Build succeeds: `pnpm --filter openchat-web build`
     * No console errors: Check browser console during manual test
     * Responsive: Test mobile viewport

   - **For Playwright tasks:**
     * Flow completes without errors
     * Expected elements visible
     * State changes persisted
     * **Log required:** When Codex uses Playwright, it must write a log file to `.codex/works/test_log/` using the naming format `YYMMDDHHMMSS_log_<testing item name>.md`.

2. **Extract Artifacts:**
   - **Files Updated:** List all modified files
   - **Test Results:** Pass/fail counts, coverage changes
   - **Performance:** Build times, API response times
   - **Errors:** Any warnings or failures

3. **Document Changes:**
   - Create timestamped entry in `work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md`:
     ```markdown
     ## ✅ Latest Progress Update (January 31, 2026 14:30 JST)
     - ✅ <Task description>
     - ✅ <Verification result>
     
     ### Files Updated (January 31, 2026 14:30 JST)
     - `apps/api/src/routes/contacts.ts` (description)
     - `apps/web/src/components/ContactsPanel.tsx` (description)
     ```

4. **Update Progress Tracking when task delegate a task to codex cli:**
   - Mark task complete in `.codex/works/codex_next_priorities.md`
   - Instruct Codex cli to update `.codex/works/codex_work_progress_and_reply.md` with summary
   - If spec-related, update `work_reports/00_FEATURE_CHECKLIST.md` status (✅/⚠️/❌)
   - For overall progress, Update `work_reports/01_PROJECT_STATUS.md` progress
   - For Playwright tests, ensure log file created in `.codex/works/test_log/` with proper naming format
   - For local testing/fixing related logs, update `work_reports/02_LOCAL_TEST_REPORT.md` with results
   !!Important: Don't change the 00_SPECIFICATION_OPENCHAT_PWA.md file without permission!!

**Success Criteria:**
- All quality gates pass
- Artifacts extracted and documented
- Progress logs updated with timestamp
- Ready for next task or commit

---

### **PHASE 5: LOOP OR FIX** 🔄
**Purpose:** Handle failures intelligently by learning from known issues before retrying.

**On Success:**
- Proceed to PHASE 6 (CHECKPOINT)

**On Failure:**

1. **Analyze Error:**
   - Read error message carefully
   - Identify error type (syntax, runtime, logic, config, dependency)
   - Extract relevant error line numbers and stack traces

2. **Search Known Issues:**
   - Search `work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md` for similar error patterns
   - Use keywords from error message: `grep -i "error_keyword" work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md`
   - Check recent entries (last 10) for context

3. **Apply Known Fix or Refine:**
   - **If known issue found:**
     * Extract the documented solution
     * Apply fix directly (don't delegate to Codex)
     * Re-run verification
     * Document in fix log: "Applied known fix from [date entry]"
   
   - **If novel issue:**
     * Refine Codex instruction with specific fix guidance
     * Example: "Previous attempt failed with 'prisma: not found'. Use npx prisma generate instead of npm run db:generate"
     * Re-run PHASE 2 (DELEGATE) with refined instruction

4. **Failure Threshold:**
   - **After 3 consecutive failures on same task:**
     * STOP execution loop
     * Document failure in `work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md`
     * Report to user with:
       - Task description
       - 3 attempts and their errors
       - Suspected root cause
       - Recommendation for manual intervention
     * DO NOT PROCEED to next task

**Error Pattern Examples:**
```markdown
Common Patterns to Search:
- "prisma: not found" → Known fix: Use `npx prisma generate`
- "COPY failed: no source files" → Known fix: Add to .dockerignore
- "Module not found" → Known fix: Run pnpm install in correct workspace
- "P3005: schema not empty" → Known fix: Use prisma db push in tests
```

**Success Criteria:**
- Issue resolved and task verified, OR
- 3-failure threshold reached and user notified

---

### **PHASE 6: CHECKPOINT** 💾
**Purpose:** Save progress incrementally with proper documentation and git commits.

**Actions:**

1. **Update Progress Documents:**
   - **codex_work_progress_and_reply.md:**
     ```markdown
     ## Summary of Work Completed
     - <Task description with outcome>
     
     ## Manual Verification Performed
     - <Quality gate results>
     
     ## Known Behavior / Notes
     - <Any caveats or implementation notes>
     ```

   - **codex_next_priorities.md:**
     ```markdown
     **✅ TASK N: <Task Name> - COMPLETED**
     - ✅ <Subtask 1>
     - ✅ <Subtask 2>
     ```

   - **00_FEATURE_CHECKLIST.md** (if spec-related):
     ```markdown
     | Feature | Spec | Implementation | Status | Gap | Checklist |
     | Contact requests | ✅ | ✅ | ✅ Working |  | [x] |
     ```

2. **Commit Changes:**
   - Use conventional commit format:
     ```bash
     git add <modified files>
     git commit -m "<prefix>: <description>
     
     - <change 1>
     - <change 2>
     
     Verified: <quality gate results>"
     ```
   
   - **Commit Prefixes:**
     * `feat:` - New features or enhancements
     * `fix:` - Bug fixes
     * `docs:` - Documentation updates
     * `test:` - Test additions or fixes
     * `refactor:` - Code restructuring
     * `chore:` - Build, deps, config changes

   - **Example:**
     ```bash
     git add apps/api/src/routes/contacts.ts apps/web/src/components/ContactsPanel.tsx
     git commit -m "feat: Add contact request flow with accept/decline

     - Add POST /api/contacts/request endpoint
     - Wire UI for sending and managing requests
     - Update contact list to show pending requests
     
     Verified: API tests pass (36/36), UI flow tested with Playwright"
     ```

3. **Update CHANGELOG (Optional):**
   - Only update `CHANGELOG.md` when user explicitly requests it
   - Or when completing a major milestone (full feature, phase, version)

**Success Criteria:**
- Progress documents updated
- Changes committed with descriptive message
- Ready for next task or handoff

---

### **PHASE 7: CONTINUITY** ♾️
**Purpose:** Maintain autonomous execution until specification complete or blocked.

**Decision Tree:**

```
Are there more tasks in current assignment?
├─ YES → Return to PHASE 2 (DELEGATE) with next task
└─ NO → Check completion status
    ├─ Specification fully implemented? → REPORT SUCCESS
    ├─ Blocked by 3+ failures? → REPORT BLOCKER
    ├─ All assigned tasks done? → REPORT COMPLETION + AWAIT NEW ASSIGNMENT
    └─ Partial completion? → REPORT PROGRESS + SUGGEST NEXT STEPS
```

**Termination Conditions:**

1. **SUCCESS - Specification Complete:**
   - All features in `work_reports/00_FEATURE_CHECKLIST.md` marked ✅
   - All tests passing
   - Documentation updated
   - Report: "✅ Specification fully implemented. Ready for production deployment."

2. **BLOCKED - Critical Failure:**
   - 3+ consecutive failures on same task
   - Dependency issue (missing service, external API down)
   - Report: "🚫 Blocked on [issue]. Manual intervention required: [details]"

3. **PAUSED - Assignment Complete:**
   - All tasks in `codex_next_priorities.md` completed
   - Some spec items remain
   - Report: "✅ Current assignment complete. [N] features remaining. Suggest next priorities: [list]"

4. **USER INTERRUPT:**
   - User requests stop
   - Checkpoint current progress
   - Report: "⏸️ Paused by user. Last completed: [task]. Next: [task]"

**Final Report Format:**
```markdown
# 🎯 Session Summary

**Duration:** <start time> - <end time>
**Tasks Completed:** X/Y
**Commits Made:** N
**Tests Passing:** X/Y

## ✅ Completed
- Task 1: <description> (commit: <hash>)
- Task 2: <description> (commit: <hash>)

## ⚠️ Partial/Blocked
- Task N: <description> - <blocker details>

## 📊 Progress
- Feature checklist: X% complete
- Test coverage: X%
- Documentation: Updated/Not updated

## 🔜 Next Steps
1. <Next priority task>
2. <Recommendation>

## 📝 Files Modified
- <file 1>
- <file 2>
```

---

## 🎯 SPECIAL WORKFLOWS

### **Multi-Skill Task Orchestration**
When a task requires multiple skills (e.g., Docker setup + Playwright validation):

1. **Sequential Execution:**
   - Task 1: Use `openchat-docker-local-testing` to set up environment
   - Verify: Containers running
   - Task 2: Use `openchat-playwright-ui-testing` to validate UI
   - Verify: Tests pass

2. **Explicit Handoff:**
   - Document in Codex instruction: "After Docker setup verified, proceed with Playwright validation per skill workflow"

### **Spec-Driven Development**
When implementing features from specification:

1. **Before starting:**
   - Read spec section from `work_reports/00_SPECIFICATION_OPENCHAT_PWA.md`
   - Check current status in `work_reports/00_FEATURE_CHECKLIST.md`
   - Identify gaps (❌ Not implemented, ⚠️ Partial)

2. **During implementation:**
   - Reference spec requirements in Codex instructions
   - Implement exactly as specified (no over-engineering)

3. **After verification:**
   - Update checklist: ❌ → ⚠️ or ⚠️ → ✅
   - Document any deviations in "Gap" column
   - Use `openchat-spec-progress-logging` skill for tracking

### **Error Recovery with Fix Log**
When encountering errors:

1. **Search fix log:**
   ```bash
   grep -A 5 "error_keyword" work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md
   ```

2. **If found:**
   - Read the dated entry
   - Extract the solution
   - Apply it directly
   - Document: "Applied known fix from [date]"

3. **If novel:**
   - Debug with Codex
   - Once fixed, add entry:
     ```markdown
     ## ✅ Latest Progress Update (January 31, 2026 14:45 JST)
     - ✅ Fixed <error>: <solution>
     
     ### Root Cause
     <explanation>
     
     ### Files Updated
     - <files>
     ```

---

## 🚫 STRICT CONSTRAINTS

**NEVER:**
- Skip the DISCOVER phase (leads to duplicate work)
- Proceed past 3 failures without user intervention
- Modify working code unrelated to current task
- Commit directly to GitHub (leave changes for user review)
- Update CHANGELOG.md unless explicitly requested
- Change database schema without explicit task
- Install dependencies without task requirement
- Skip verification steps to "save time"
- Batch multiple unrelated tasks in one commit

**ALWAYS:**
- Read skill files when task type matches
- Document timestamped entries in fix logs
- Update progress tracking after each task
- Run quality gates before marking task complete
- Search fix log before retrying failed tasks
- Use conventional commit prefixes
- Maintain existing code patterns and styles
- Verify tests pass before checkpoint

---

## � SESSION MANAGEMENT

### **Multi-Agent Session Tracking**

OpenChat uses **multiple concurrent agent sessions** for different workflows, tracked in `.terminal` file:

**Session Types:**
1. **Master Copilot Agent** - Main orchestrator for development
2. **Local Test/Fix Agent** - Testing and bug fixing workflows
3. **CI/CD Agent** - Deployment and continuous integration
4. **Documentation Agent** - Documentation updates
5. **Codex Sub-Agent** - Code execution delegated by Copilot 
Use [.github/skills/codex-cli.skill.md] for codex cli commands.

### **Session Resume Commands**

**Copilot Sessions:**
```bash
# Main development orchestrator (current session)
copilot --allow-all-tools --resume=33ac3779-f1d3-4059-9309-22abcc2d77e0

# Testing and bug fixes [create new session then update the test-session-id for test agent]
copilot --allow-all-tools --resume=<test-session-id>

# CI/CD workflows
copilot --allow-all-tools --resume=0879fa61-6b2e-46ba-8777-ae92a98e1adb

# Documentation updates
copilot --allow-all-tools --resume=f75c6ebf-b03f-469f-af04-d101401cc52e
```

**Codex Sessions:**
```bash
# Resume Codex sub-agent session
codex resume 019bf9c5-71ca-7471-9468-36409a237607
```

### **Session Management Best Practices**

1. **Update `.terminal` After Each Session:**
   - Record session ID when starting new work
   - Label session purpose clearly (development, testing, docs, etc.)
   - Keep active session IDs for continuity

2. **Session Handoff Protocol:**
   ```bash
   # When pausing work:
   1. Checkpoint progress (PHASE 6)
   2. Note session ID in .terminal
   3. Update progress documents
   
   # When resuming work:
   1. Resume session from .terminal
   2. Execute PHASE 0 (DISCOVER)
   3. Continue from last checkpoint
   ```

3. **Session Isolation:**
   - **Master Agent:** Complex feature development, orchestration
   - **Test Agent:** Bug fixes, test execution, verification
   - **CI/CD Agent:** Deployment, pipeline fixes, production issues
   - **Documentation Agent:** README, guides, changelog updates
   - **Codex Sub-Agent:** Delegated code execution from any Copilot session

4. **Cross-Session Context:**
   - All sessions read from same progress files (`.codex/works/`, `work_reports/`)
   - Sessions can pick up where others left off via DISCOVER phase
   - Commit messages link work across sessions

### **Session Startup Template**

```bash
# Start new Copilot session
copilot --allow-all-tools

# Resume existing session (from .terminal)
copilot --allow-all-tools --resume=<session-id>

# Delegate to Codex (within Copilot session)
codex apply "Task description"

# Resume Codex session (for continued work)
codex resume <codex-session-id>
```

### **Updating `.terminal` File**

When starting new sessions or updating existing ones:

```bash
# Add entry to .terminal
echo "# New session: <purpose>
<agent-type>: <command-with-session-id>" >> .terminal

# Example:
echo "# Feature: Message search implementation
master copilot agent: copilot --allow-all-tools --resume=<new-id>" >> .terminal
```

---

## 📚 KEY FILE REFERENCES

**Planning & Context:**
- `.codex/works/codex_next_priorities.md` - Current task queue
- `.codex/works/codex_work_progress_and_reply.md` - Session progress
- `work_reports/00_SPECIFICATION_OPENCHAT_PWA.md` - Requirements
- `work_reports/00_FEATURE_CHECKLIST.md` - Spec vs. implementation

**Skills:**
- `.codex/skills/SKILL.md` - Skill mapper
- `.codex/skills/openchat-docker-local-testing/SKILL.md` - Docker workflows
- `.codex/skills/openchat-playwright-ui-testing/SKILL.md` - UI testing
- `.codex/skills/openchat-spec-progress-logging/SKILL.md` - Progress tracking

**Logging:**
- `work_reports/01_PROJECT_STATUS.md` - Overall status
- `work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md` - Fix history
- `work_reports/02_LOCAL_TEST_REPORT.md` - Test results
- `CHANGELOG.md` - Version history

**Session Management:**
- `.terminal` - Active session IDs and resume commands

**Repository Guidelines:**
- `AGENTS.md` - Development workflow and commands
- `.github/copilot-instructions.md` - This file

---

## 🎓 EXECUTION EXAMPLE

**User Request:** "Implement contact blocking feature per spec section 1.4"

**PHASE 0: DISCOVER**
- Read `codex_next_priorities.md`: No blocking task assigned
- Check `00_FEATURE_CHECKLIST.md`: Contact blocking marked ❌
- Read spec section 1.4: Block/unblock users required
- Check `02_LOCAL_TEST_THEN_FIX_LOG.md`: No recent blocking-related fixes

**PHASE 1: DECOMPOSE**
```
Task 1: Add block/unblock API endpoints
  - Files: apps/api/src/routes/contacts.ts
  - Quality Gate: POST /api/contacts/block returns 200
  
Task 2: Wire block/unblock UI
  - Files: apps/web/src/components/Contacts/ContactsPanel.tsx
  - Quality Gate: Block button appears and works
  
Task 3: Test blocking behavior
  - Skill: openchat-playwright-ui-testing
  - Quality Gate: Blocked user cannot send messages
```

**PHASE 2: DELEGATE (Task 1)**
```bash
codex "Add POST /api/contacts/block and POST /api/contacts/unblock endpoints to apps/api/src/routes/contacts.ts following the pattern in that file. Block creates a contact request with type BLOCK. Accept {targetUserId} in body, return 200 with {success: true}. Add to existing router." --apply
```

**PHASE 3: WAIT & OBSERVE**
- Codex completes
- Read modified `apps/api/src/routes/contacts.ts`
- Changes look correct

**PHASE 4: VERIFY**
```bash
# Run API tests
pnpm --filter openchat-api test
# Output: 37/37 tests passing ✅

# Manual endpoint test
curl -X POST http://localhost:8080/api/contacts/block \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"targetUserId": "user-123"}'
# Output: {"success": true} ✅
```

**PHASE 6: CHECKPOINT**
```bash
# Update progress
echo "## ✅ Latest Progress Update (January 31, 2026 15:00 JST)
- ✅ Added block/unblock API endpoints

### Files Updated
- apps/api/src/routes/contacts.ts" >> work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md

# Commit
git add apps/api/src/routes/contacts.ts
git commit -m "feat: Add contact block/unblock API endpoints

- Add POST /api/contacts/block endpoint
- Add POST /api/contacts/unblock endpoint
- Store block status in contact messages

Verified: API tests pass (37/37), endpoint tested with curl"
```

**PHASE 7: CONTINUITY**
- Return to PHASE 2 with Task 2
- Continue until all 3 tasks complete
- Update `00_FEATURE_CHECKLIST.md`: Contact blocking ❌ → ✅
- Report completion

---

**🚀 This orchestration system enables extended autonomous execution while maintaining quality, tracking progress, and learning from failures. Execute with discipline, verify thoroughly, and document comprehensively.**
