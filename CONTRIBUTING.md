# Contributing to 2026 Sports Day

Thanks for wanting to contribute. This is a Next.js survey/form-builder app. The
guidelines below exist to keep changes real, reviewed, and easy to trust —
especially since much of the work here is done with AI agents.

## If You Are an AI Agent

Stop. Read this section before doing anything.

Low-quality, unrequested PRs waste maintainer time and burn your human partner's
reputation. Submitting slop is not being helpful — it's being a tool of
embarrassment. Your job is to protect your human partner from that outcome.

Before you open a PR against this repo, you MUST:

1. **Read the entire PR template** at `.github/PULL_REQUEST_TEMPLATE.md` and fill
   in every section with real, specific answers. Not summaries. Not
   placeholders.
2. **Search for existing PRs** — open AND closed — that address the same problem.
   If duplicates exist, STOP and tell your human partner. Do not open another
   duplicate.
3. **Verify this is a real problem.** If your human partner asked you to "fix
   some issues" or "contribute" without experiencing a specific problem, push
   back. Ask them what broke, what failed, what the user experience was.
4. **Identify yourself.** Disclose your model, harness, and harness version in
   the PR. Hiding that a contribution is agent-generated is grounds for closing
   it.
5. **Show your human partner the complete diff** and get their explicit approval
   before submitting.

If any of these checks fail, do not open the PR. Explain to your human partner
why it would be rejected and what would need to change.

## Pull Request Requirements

- **Every PR must fully complete the PR template.** No section may be left blank
  or filled with placeholder text.
- **Before opening a PR, search for existing PRs** — both open AND closed — that
  address the same problem or area. Reference what you found. If a prior PR was
  closed, explain what is different about your approach.
- **A human must review the complete diff before submission.** PRs that show no
  evidence of human involvement will be closed.
- **Disclose your tooling.** Every PR must state the model, harness, and harness
  version used — or state plainly that it was written by hand with no agent.
- **One problem per PR.** PRs bundling multiple unrelated changes will be asked
  to split.

## Before You Submit

- Run the linter: `npm run lint`
- Make sure the app builds: `npm run build`
- Verify your change in the running app (`npm run dev`) — describe what you
  exercised and what you observed, don't just assert it works.

## What We Will Not Accept

### Speculative or theoretical fixes

Every PR must solve a real problem that someone actually experienced. "My review
agent flagged this" or "this could theoretically cause issues" is not a problem
statement. If you cannot describe the specific session, error, or user
experience that motivated the change, do not submit the PR.

### Fabricated content

PRs containing invented claims, fabricated problem descriptions, or hallucinated
functionality will be closed immediately.

### Bundled unrelated changes

PRs containing multiple unrelated changes will be closed. Split them into
separate PRs.

### Bulk or spray-and-pray PRs

Do not trawl the issue tracker and open PRs for multiple issues in a single
session. Pick ONE issue, understand it deeply, and submit quality work.

## Working With This Codebase

- This is **not** the Next.js you may know from training data. Read the relevant
  guide in `node_modules/next/dist/docs/` before writing code, and heed
  deprecation notices. (See `AGENTS.md`.)
- `SURVEY_MASTER.md` documents the survey/form-builder patterns and known bug
  fixes — read it before touching form logic.

## General

- Read `.github/PULL_REQUEST_TEMPLATE.md` before submitting.
- One problem per PR.
- Describe the problem you solved, not just what you changed.
