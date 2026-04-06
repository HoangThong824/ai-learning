---
name: AI Maintenance Skill
description: Guidelines for tuning prompts, managing LLM responses, and ensuring structured data integrity in the AI Learning Assistant.
---

# AI Maintenance Skill (ALA)

As an AI assistant, use this skill when asked to adjust how the system generates lessons, quizzes, or feedback.

## Prompt Tuning
- **Context is King**: Always pass sufficient context (source chunks) but avoid exceeding the average model's context window.
- **Language**: Core prompts MUST be in Vietnamese (`vi-VN`) to ensure the response matches the user's primary language.
- **Tone**: Professional, encouraging, and academically structured.

## JSON Schema Integrity
1. **Lessons**: Output must include a clear `title` and a `content` field.
2. **Quizzes**: 
   - Questions MUST be in a `questions` array.
   - Each object MUST have `question`, `options` (exactly 4), `correct` (index 0-3), and `explanation`.
3. **Feedback/Remediation**: 
   - Must return `feedback` (markdown) and `extraQuestions` (optional array of quiz objects).

## Response Validation
- **JSON Parsing**: All AI responses must be scrubbed of Markdown code blocks (` ```json ... ``` `) before parsing.
- **Fallback**: Always provide a fallback data structure (e.g. an empty quiz) if the AI fails to produce a valid response.
- **Retry Logic**: If the AI returns malformed JSON, the assistant should try to fix the JSON manually or suggest a retry to the user.
