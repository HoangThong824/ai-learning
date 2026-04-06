---
name: Release Skill
description: Procedures for preparing and verifying the AI Learning Assistant for local-first deployment.
---

# Release Skill (ALA)

As an AI assistant, use this skill when the user is ready to "release" or finalize a feature version.

## Verification Checklist
1. **Clear Storage**: Test with a fresh browser profile (empty IndexedDB and LocalStorage).
2. **First-Run Experience**: Ensure the "No data" placeholders are beautiful and informative.
3. **API Setup**: Verify that the Settings page is intuitive for new users to enter their keys.
4. **Export/Import**: (Future) Check if any data portability features are functional.

## Final UI Audit
- Run the app on multiple screen sizes (Responsive check).
- Verify all `lucide-react` icons are loading and aligned.
- Check that the `Dashboard` correctly reflects the new data state.

## Build Verification
- Run `npm run build` locally (if possible) to ensure Vite doesn't have any compilation or library conflicts.
- Check for common performance issues (e.g. large images in `public/`).
