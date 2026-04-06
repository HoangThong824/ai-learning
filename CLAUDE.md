# AI Learning Assistant - Claude Code Context

## Project Overview
A React-based AI Learning Assistant allowing users to upload PDFs, generate lessons, and take AI-graded quizzes locally using IndexedDB for storage and external AI API for intelligence.

## Operational Guidance
- Frontend logic resides in `src/`.
- Modular, strictly client-side.
- State is synced via `db.js` (IndexedDB) or `storage.js` (localStorage).
- Avoid backend patterns (no Node.js server).
