---
name: Refactor Skill
description: Guidelines for maintaining the premium UI/UX, React patterns, and local-first architecture in the AI Learning Assistant project.
---

# Refactor Skill (ALA)

As an AI assistant, use this skill to ensure all refactoring tasks maintain the project's high-fidelity design and local-first performance.

## UI/UX Standards
- **Glassmorphism**: Always use `bg-white/80 backdrop-blur-xl border border-white/50` for cards and sidebars.
- **Micro-animations**: Use `framer-motion` for page transitions (`initial`, `animate`, `exit`) and interactive elements (`whileHover`, `whileTap`).
- **Kinetic Typography**: Use `font-black`, `tracking-tighter`, and `leading-none` for headers.
- **Iconography**: Use ONLY `lucide-react` icons. No raw SVGs or emojis in the UI.

## React Patterns
- **Functional Components**: Use arrow functions or standard function declarations with `export default`.
- **State Management**: Keep state local and hoist only when necessary.
- **Loading Hearts**: Always provide beautiful `Loader2` or pulse animations during async operations.

## Local-First Architecture
- **No Backend**: Do not attempt to add server-side routes or global database calls.
- **IndexedDB**: Use for large datasets (blobs, raw text).
- **LocalStorage**: Use ONLY for metadata and API keys. Use the `ala_` prefix for all keys.

## Performance
- Avoid unnecessary re-renders in large listing pages (`Documents.jsx`, `Quizzes.jsx`).
- Use `AnimatePresence` correctly for deletion transitions.
