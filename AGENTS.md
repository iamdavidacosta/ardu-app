# Repository guidance

- Make the smallest correct change required by the task.
- Inspect only the files needed; expand the search when evidence requires it.
- Preserve existing contracts unless the task explicitly changes them.
- Follow the repository's current architecture, naming, and tooling.
- Use relevant Codex skills and do not load unrelated skills.
- The UI profile is stored in `.codex/context/PROJECT_PROFILE.md`.
- Durable project context is stored in `.codex/context/PROJECT_STATE.md`.
- Read project context only when the task needs project-wide understanding.
- Update `PROJECT_STATE.md` only when durable project knowledge changes.
- Never store secrets, credentials, tokens, or personal data in agent context files.
- Run the narrowest relevant validation before broader suites.
- Report validation gaps and known remaining risks concisely.

