---
name: parallel-task-delegation
description: "Execute multiple analysis or development tasks simultaneously using codex/copilot in separate terminals. Use when you need to delegate 4+ independent tasks that can run in parallel to maximize efficiency and reduce total execution time."
version: "1.0.0"
tags: ["agentic-workflow", "parallel-execution", "task-delegation", "efficiency"]
---

# Parallel Task Delegation Skill for Codex/Copilot CLI

## Overview

This skill enables efficient parallel execution of multiple independent analysis or development tasks using separate terminal windows. Instead of running tasks sequentially, this approach launches multiple codex/copilot instances simultaneously to dramatically reduce total execution time.

## When to Use This Skill

✅ **Use this skill when:**
- You have 4+ independent tasks that don't depend on each other
- Tasks are analysis, documentation, or investigation-focused
- Each task would take 5-15 minutes to complete individually
- You want to maximize efficiency and minimize total wait time
- Tasks involve different aspects of the same codebase (features, infrastructure, deployment, etc.)

❌ **Don't use this skill when:**
- Tasks have dependencies on each other (Task B needs Task A results)
- Tasks modify the same files simultaneously
- You only have 1-2 tasks to complete
- Tasks require interactive input or approval

## Prerequisites

- macOS with iTerm2 installed (for AppleScript automation)
- Codex CLI installed and authenticated (if using Codex)
- Copilot CLI installed and authenticated (if using Copilot)
- Project directory accessible and ready for analysis

## Step-by-Step Workflow

### Phase 1: Task Planning and Preparation

1. **Define Tasks Clearly**
   ```markdown
   Task 1: [Specific analysis goal with clear scope]
   Task 2: [Different analysis focus, no overlap with Task 1]
   Task 3: [Independent investigation, separate domain]
   Task 4: [Distinct objective, standalone execution]
   ```

2. **Validate Task Independence**
   - Ensure tasks don't modify the same files
   - Confirm no task depends on another's output
   - Verify each task has clear success criteria

3. **Prepare Output Strategy**
   - Define specific output file names for each task
   - Plan how results will be consolidated
   - Set up session ID tracking for future reference

### Phase 2: Terminal Setup and Task Delegation

1. **Open Multiple Terminals**
   ```bash
   # Script to open 4 iTerm terminals
   osascript << 'EOF'
   tell application "iTerm"
       create window with default profile
       tell current session of current tab of current window
           write text "cd /path/to/project"
       end tell
   end tell
   
   # Repeat for each additional terminal (terminals 2, 3, 4)
   EOF
   ```

2. **Delegate Tasks via AppleScript**
   ```bash
   # Terminal 1 - Task Assignment
   osascript -e 'tell application "iTerm"
       tell session 1 of tab 1 of window 1
           write text "codex exec \"[DETAILED_TASK_1_PROMPT_WITH_OUTPUT_FILE_INSTRUCTION]\""
       end tell
   end tell'
   
   # Terminal 2 - Task Assignment  
   osascript -e 'tell application "iTerm"
       tell session 1 of tab 1 of window 2
           write text "codex exec \"[DETAILED_TASK_2_PROMPT_WITH_OUTPUT_FILE_INSTRUCTION]\""
       end tell
   end tell'
   
   # Continue for terminals 3 and 4...
   ```

3. **Task Prompt Template**
   ```
   "Analyze [SPECIFIC_SCOPE] in [PROJECT_NAME]. 
   Examine [LIST_OF_FILES_OR_PATTERNS] and [ANALYSIS_FOCUS]. 
   Create a detailed [REPORT_TYPE] covering: 
   1) [ASPECT_1], 
   2) [ASPECT_2], 
   3) [ASPECT_3]. 
   Provide [SPECIFIC_DELIVERABLE] with [FORMAT_REQUIREMENTS]. 
   Save results to [OUTPUT_FILENAME]."
   ```

### Phase 3: Monitoring and Progress Tracking

1. **Monitor Task Execution**
   ```bash
   # Check for output files being created
   echo "Monitoring task progress..."
   while [ ! -f task1_output.md ] || [ ! -f task2_output.md ] || [ ! -f task3_output.md ] || [ ! -f task4_output.md ]; do
       sleep 30
       echo "Tasks still running... $(date)"
       ls -la *_analysis.md *_output.md 2>/dev/null || echo "No output files yet"
   done
   echo "All tasks completed!"
   ```

2. **Track Active Sessions**
   ```bash
   # Monitor codex processes
   ps aux | grep "codex exec" | grep -v grep | wc -l | xargs echo "Active codex processes:"
   ```

### Phase 4: Session Management and Cleanup

1. **Capture Session IDs**
   ```bash
   # Send Ctrl+C to each terminal to get session IDs
   osascript -e 'tell application "iTerm"
       tell session 1 of tab 1 of window 1
           write text ""  # Sends Ctrl+C
       end tell
   end tell'
   
   # Repeat for each terminal
   # Session IDs will be displayed in terminal output
   ```

2. **Document Session Information**
   ```bash
   # Create session summary
   cat > parallel_session_log.md << EOF
   # Parallel Codex Session Log
   **Date**: $(date)
   **Tasks**: 4 parallel analysis tasks
   
   ## Session IDs
   - Terminal 1: [SESSION_ID_1]
   - Terminal 2: [SESSION_ID_2]
   - Terminal 3: [SESSION_ID_3]  
   - Terminal 4: [SESSION_ID_4]
   
   ## Output Files
   $(ls -la *_analysis.md *_output.md)
   EOF
   ```

3. **Terminal Cleanup**
   ```bash
   # Close all iTerm windows
   osascript -e 'tell application "iTerm"
       repeat with w in windows
           close w
       end repeat
   end tell'
   ```

## Best Practices

### Task Design
- **Scope Limitation**: Keep each task to 1-3 files or specific domain
- **Clear Objectives**: Define exactly what analysis or deliverable is expected
- **Output Specification**: Always specify output filename and format
- **Context Inclusion**: Provide sufficient context so tasks can run independently

### Prompt Engineering
- **Be Specific**: Include exact file paths, analysis focus, and output requirements
- **Provide Examples**: Reference similar files or patterns to follow
- **Set Constraints**: Specify word limits, format requirements, or scope boundaries
- **Include Validation**: Ask for specific checks or quality gates

### Monitoring Strategy
- **File-Based Tracking**: Monitor output file creation for completion detection
- **Process Monitoring**: Track active codex processes to detect failures
- **Time Limits**: Set reasonable expectations (5-15 minutes per task)
- **Error Handling**: Plan for partial completion or task failures

## Example Implementation

### Real-World Example: OpenChat PWA Analysis

```bash
# Task 1: Features Analysis
codex exec "Analyze work_reports/00_SPECIFICATION_OPENCHAT_PWA.md and count total features. 
Create detailed breakdown by category (auth, messaging, media, etc.). 
Provide exact feature count with complete list. Save to features_analysis.md."

# Task 2: Docker Configuration Analysis  
codex exec "Analyze Docker-based local testing setup. Examine docker-compose files, 
Dockerfiles in docker/ directory. Explain testing workflow, container orchestration, 
port mappings. Include commands and troubleshooting. Save to docker_testing_analysis.md."

# Task 3: Logging System Analysis
codex exec "Analyze agentic work log management. Examine .codex/ and work_reports/ 
structure, logging patterns, progress tracking. Explain AI agent coordination workflow 
and file management. Save to agentic_logs_analysis.md."

# Task 4: Deployment Pipeline Analysis
codex exec "Analyze production deployment technologies. Examine railway.toml, 
CI/CD workflows, environment configs. Explain deployment pipeline from dev to prod, 
platforms used, scaling strategies. Save to deployment_analysis.md."
```

**Results:**
- **Execution Time**: 7 minutes for all 4 tasks (vs 28 minutes sequentially)  
- **Output Generated**: 31,085 bytes of detailed analysis
- **Success Rate**: 100% task completion
- **Efficiency Gain**: 4x faster execution

## Troubleshooting

### Common Issues

1. **Terminal Focus Problems**
   ```bash
   # Solution: Add delays between commands
   osascript -e 'tell application "iTerm" to ...' && sleep 2
   ```

2. **Task Dependencies Discovered**
   ```bash
   # Solution: Redesign tasks or run dependent ones later
   # Never run dependent tasks in parallel
   ```

3. **Resource Conflicts**
   ```bash
   # Solution: Monitor system resources
   top -l 1 | head -10  # Check CPU/Memory
   ```

4. **Session ID Collection Issues**
   ```bash
   # Solution: Manual collection from terminal windows
   # Or use codex resume --last to find recent sessions
   ```

## Output Documentation

### Session Log Template
```markdown
# Parallel Task Execution Log
**Date**: [DATE_TIME]
**Project**: [PROJECT_NAME]  
**Total Tasks**: [NUMBER]
**Execution Time**: [DURATION]

## Task Summary
- Task 1: [DESCRIPTION] → [OUTPUT_FILE] ([FILE_SIZE])
- Task 2: [DESCRIPTION] → [OUTPUT_FILE] ([FILE_SIZE])  
- Task 3: [DESCRIPTION] → [OUTPUT_FILE] ([FILE_SIZE])
- Task 4: [DESCRIPTION] → [OUTPUT_FILE] ([FILE_SIZE])

## Session IDs
- Terminal 1: [SESSION_ID]
- Terminal 2: [SESSION_ID]
- Terminal 3: [SESSION_ID] 
- Terminal 4: [SESSION_ID]

## Key Insights
- [INSIGHT_1]
- [INSIGHT_2]
- [INSIGHT_3]

## Files Created
[LIST_OF_OUTPUT_FILES]
```

## Success Metrics

- **Time Efficiency**: 3-4x faster than sequential execution
- **Output Quality**: Comprehensive analysis maintained across all tasks
- **Success Rate**: 90%+ task completion rate
- **Documentation**: Complete session logs and output files generated
- **Reproducibility**: Session IDs captured for future reference

## Related Skills

- `codex-cli.skill.md`: Core codex command reference
- `docker-based-testing.md`: Docker workflow for testing tasks
- `railway.skill.md`: Deployment-specific task delegation

## Version History

- **v1.0.0**: Initial parallel task delegation workflow
  - Support for 4+ parallel tasks
  - AppleScript terminal automation
  - Session ID tracking and cleanup
  - Comprehensive documentation template