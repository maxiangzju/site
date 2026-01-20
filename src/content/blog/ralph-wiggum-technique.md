---
title: "The Ralph Wiggum Technique: Running AI Coding Agents Overnight"
description: "How to set up autonomous coding agents that work while you sleep, using the 'Ralph loop' pattern for long-running AI development sessions."
pubDate: 2026-01-20
tags: [ai, coding-agents, automation, claude, codex]
---

# The Ralph Wiggum Technique: Running AI Coding Agents Overnight

*"Me fail English? That's unpossible!" — Ralph Wiggum*

The "Ralph Wiggum" technique (or "Ralph loop") is a pattern for running AI coding agents autonomously over extended periods — even overnight while you sleep. Named after The Simpsons character (for reasons the AI community finds amusing), this approach lets you delegate complex coding tasks to AI agents that work continuously without supervision.

## What is a Ralph Loop?

At its core, a Ralph loop is a `while true` wrapper around your coding agent that:

1. **Starts the agent** with a task
2. **Lets it work** until it completes or runs out of context
3. **Commits the work** to git
4. **Restarts** with fresh context, picking up where it left off
5. **Exits** when a completion condition is met

```bash
while true; do
  codex --full-auto "Continue working on the project. 
    Check progress.txt for context.
    If no further work needed, reply with COMPLETE."
  
  git add -A && git commit -m "Ralph progress $(date)"
  
  # Check for completion signal
  if grep -q "COMPLETE" output.log; then
    echo "Ralph finished!"
    break
  fi
  
  sleep 5
done
```

## Key Components

### 1. Progress Tracking

Maintain a `progress.txt` file that the agent appends to (never overwrites):

```
[2026-01-19 02:15] Started authentication module
[2026-01-19 02:45] Completed login flow, moving to session management
[2026-01-19 03:30] Session management done, starting API endpoints
```

Feed this into the agent's prompt so it knows what's been done across context resets.

### 2. Atomic Commits

Each iteration MUST:
- Pass all tests and type checks
- Make a clean git commit
- Not leave broken code for future iterations

This is critical — if you let broken code accumulate, future agent runs waste time debugging instead of building.

### 3. PRD-Based Scoping

Two common problems with Ralph loops:

1. **Agents pick tasks that are too large** — they run out of context window
2. **Agents don't know when to stop**

Solution: Use a structured PRD (Product Requirements Document) as a JSON file:

```json
{
  "features": [
    {
      "id": "auth-login",
      "description": "User can log in with email/password",
      "priority": 1,
      "passes": false
    },
    {
      "id": "auth-logout", 
      "description": "User can log out",
      "priority": 2,
      "passes": false
    }
  ]
}
```

Prompt the agent to:
- Pick the **highest priority incomplete feature**
- Work **only** on that feature
- Update `passes: true` when done

### 4. Completion Signals

Use a clear signal for the agent to indicate completion:

```
If there is no further work to be done, reply with <promise>COMPLETE</promise>
```

Check for this in your loop to exit gracefully.

## Beyond Basic Ralph: The Clawdbot Approach

A more sophisticated approach uses an **orchestrator agent** that manages coding agents:

> "My @clawdbot drove my coding agents after I went to bed last night from 12:30–7am while I snoozed. MUCH better than a Ralph loop because you don't just give it a prompt about when to stop. Instead I've been talking to my agent ALL DAY about the project... It knows about the entire project history, all the headaches. It drives better than Ralph because it's been watching me all day."
> — [@bffmike](https://x.com/bffmike/status/2012205710030127110)

The orchestrator:
- Has full context of your project discussions
- Makes intelligent decisions about what to work on
- Can course-correct when things go wrong
- Manages multiple coding agents in parallel

## Tool Recommendations

### For Ralph Loops

- **[Codex CLI](https://github.com/openai/codex)** — Streams raw text in headless mode, easy to monitor
- **Claude Code** — More capable but streams JSON (harder to parse live)

### For Orchestration

- **[Clawdbot](https://github.com/bffmike/clawdbot)** — Personal AI assistant that can manage coding agents
- **pm2** — Process manager for running dev servers (tip from [@nbaschez](https://x.com/nbaschez/status/2012986796179890617))

## Getting Started

1. **Start small** — Try a Ralph loop on a well-defined, scoped task first
2. **Set up CI** — Make sure tests run on every commit
3. **Use git worktrees** — Keep your main branch clean while Ralph experiments
4. **Monitor progress** — Check `progress.txt` and git history in the morning

## Conclusion

The Ralph Wiggum technique democratizes overnight coding. Whether you use a simple bash loop or a sophisticated orchestrator, the key principles remain:

- **Atomic commits** that always pass CI
- **Progress tracking** that survives context resets  
- **Clear scoping** via PRDs to prevent runaway tasks
- **Completion signals** so the loop knows when to stop

Now go forth and let Ralph work while you sleep! 🛌💻

---

*References from my Twitter bookmarks and the AI coding community. Special thanks to the builders sharing their techniques publicly.*
