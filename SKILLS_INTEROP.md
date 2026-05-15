# Skills Interop — Claude Skills Under Codex

This project uses the guidance in `~/.agentskills` as a design and delivery framework, but applies it through Codex-native tools and constraints.

Project routing is already declared in [CLAUDE.md](/Users/apple/emdash-projects/worktrees/puny-chairs-create-9eu/CLAUDE.md), which points Codex at `~/.agentskills` and `~/.claude/rules/` for the prompt-layer policy.

## What maps cleanly
- Goal/brief skills map to [PROJECT_BRIEF.md](/Users/apple/emdash-projects/worktrees/puny-chairs-create-9eu/PROJECT_BRIEF.md)
- Slice/build skills map to [SPEC.md](/Users/apple/emdash-projects/worktrees/puny-chairs-create-9eu/SPEC.md) and the Worker/static-site implementation
- Brand/design/motion skills map to the content and styling in [public/index.html](/Users/apple/emdash-projects/worktrees/puny-chairs-create-9eu/public/index.html) and [public/styles.css](/Users/apple/emdash-projects/worktrees/puny-chairs-create-9eu/public/styles.css)
- Deploy/runtime skills map to [docs/OPERATIONS.md](/Users/apple/emdash-projects/worktrees/puny-chairs-create-9eu/docs/OPERATIONS.md)

## What changes under Codex
- Claude-oriented subagent assumptions are not automatic here; Codex uses delegation only when explicitly requested
- Project edits are done with `apply_patch`, not ad-hoc file rewrites
- Verification is local-first unless credentials or publish approval are supplied
- Global `~/.claude` automation hooks are treated as external system configuration, not project code

## Not changed in this pass
- No direct edits were made to `~/.claude`
- No direct edits were made to `~/.agentskills`

If you want, the next pass can produce a separate patch set for your global `~/.claude` and `~/.agentskills` files specifically for Codex compatibility, but that should be reviewed independently from this site deploy.
