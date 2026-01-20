---
title: "The Ralph Wiggum Technique: Running AI Coding Agents Overnight"
description: "How I set up autonomous coding agents that work while I sleep, using the 'Ralph loop' pattern for long-running AI development sessions."
pubDate: 2026-01-20
tags: [ai, coding-agents, automation, claude, codex]
---

# The Ralph Wiggum Technique: Running AI Coding Agents Overnight

I've been experimenting with running AI coding agents overnight, and I wanted to share a technique that's been circulating in the AI dev community — the "Ralph Wiggum" technique (or "Ralph loop").

The name comes from The Simpsons character, and honestly, I'm not 100% sure why it stuck, but the technique itself is genuinely useful.

## What's a Ralph Loop?

The basic idea is simple: wrap your coding agent in a `while true` loop that:

1. Starts the agent with a task
2. Lets it work until it completes or runs out of context
3. Commits the work to git
4. Restarts with fresh context
5. Exits when done

Here's what it looks like:

```bash
while true; do
  codex --full-auto "Continue working on the project. 
    Check progress.txt for context.
    If no further work needed, reply with COMPLETE."
  
  git add -A && git commit -m "Ralph progress $(date)"
  
  if grep -q "COMPLETE" output.log; then
    echo "Ralph finished!"
    break
  fi
  
  sleep 5
done
```

## The Key Parts I Learned

### Progress Tracking

I keep a `progress.txt` file that the agent appends to (never overwrites):

```
[2026-01-19 02:15] Started authentication module
[2026-01-19 02:45] Completed login flow, moving to session management
[2026-01-19 03:30] Session management done, starting API endpoints
```

This way the agent knows what's been done even after context resets.

### Atomic Commits

This is crucial — each iteration MUST pass all tests and type checks before committing. If you let broken code accumulate, future runs waste time debugging instead of building.

### PRD-Based Scoping

I ran into two problems early on:

1. The agent picks tasks that are too large and runs out of context
2. It doesn't know when to stop

My solution: use a JSON PRD file:

```json
{
  "features": [
    {"id": "auth-login", "description": "User can log in", "priority": 1, "passes": false},
    {"id": "auth-logout", "description": "User can log out", "priority": 2, "passes": false}
  ]
}
```

I prompt the agent to pick only the highest priority incomplete feature and update `passes: true` when done.

## Beyond Basic Ralph

I found this tweet from [@bffmike](https://x.com/bffmike) that resonated with me:

> "My @clawdbot drove my coding agents after I went to bed last night from 12:30–7am while I snoozed. MUCH better than a Ralph loop because you don't just give it a prompt about when to stop. Instead I've been talking to my agent ALL DAY about the project... It knows about the entire project history, all the headaches."

The idea of having an orchestrator agent that's been "watching you all day" and can make intelligent decisions about what to work on next — that's the next level.

## Tools I've Been Using

- **Codex CLI** — Streams raw text in headless mode, easy to monitor
- **Claude Code** — More capable but streams JSON
- **pm2** — For running dev servers (tip from [@nbaschez](https://x.com/nbaschez))

## My Takeaways

1. **Start small** — Try it on a well-scoped task first
2. **Set up CI** — Tests must run on every commit
3. **Use git worktrees** — Keep main branch clean while experimenting
4. **Check in the morning** — Review `progress.txt` and git history

The Ralph Wiggum technique isn't perfect, but it's a solid starting point for anyone wanting to let AI agents work while they sleep.

Now I just need to figure out how to make my agent brew coffee for when I wake up. 😄

---

*Collected from various sources in the AI coding community. Thanks to everyone sharing their experiments publicly.*
