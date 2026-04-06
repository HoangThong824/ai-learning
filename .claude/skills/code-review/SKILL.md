---
name: Code Review Skill
description: Instructions for automated and manual code reviews in the AI Learning Assistant project.
---

# Code Review Skill (ALA)

As an AI assistant, use this skill to check for consistency, security, and bugs in any incoming code changes.

## Security Check
1. **API Keys**: NEVER commit API keys directly. They MUST be stored in `localStorage` via the Settings page.
2. **Local Data**: Ensure no data is leaked outside the user's browser (IndexedDB and LocalStorage ONLY).

## Logic & Integrity
- **IndexedDB**: Check if database transactions are handled correctly with `tx.done` or using standard IndexedDB patterns.
- **LocalStorage**: Verify that keys are prefixed with `ala_` and that data is parsed safely/has error handling.
- **AI Response Handling**: Ensure that all LLM calls are wrapped in `try/catch` blocks and have fallback JSON if the AI fails or returns malformed text.

## Design Review
- **Colors**: Do NOT use plain colors like `bg-blue-500`. Use gradients: `bg-gradient-to-br from-blue-500 to-indigo-600`.
- **Icons**: Ensure `lucide-react` is used consistently and imports are managed efficiently.
- **Shadows**: Use soft, large shadows like `shadow-[0_20px_50px_rgba(0,0,0,0.05)]`.

## React Component Check
- **Props**: Verify that props are being used correctly (though this app has few multi-prop components).
- **Hooks**: Ensure `useEffect` dependencies are correct to avoid infinite loops when fetching from storage.
