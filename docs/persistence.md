# Persistence & Data Model

This document details how data is stored in the **AI Learning Assistant**.

## Storage Strategy
We use a hybrid storage approach to balance performance and capacity:
1. **IndexedDB**: For large blobs (Files) and extracted text.
2. **LocalStorage**: For high-frequency metadata, settings, and generated JSON content.

---

## IndexedDB Schema
**Database Name**: `ai_learning_assistant_db`  
**Version**: `1`

### `documents` Store
Stores the source materials uploaded by the user.
| Key | Type | Description |
|:---|:---|:---|
| `id` | `Number` | Auto-increment primary key |
| `filename` | `String` | Original name of the file |
| `type` | `String` | MIME type (PDF, DOCX, TXT) |
| `size` | `Number` | File size in bytes |
| `uploadDate` | `ISO String` | Timestamp of upload |
| `rawText` | `String` | The full extracted text content |
| `binary` | `Blob/File` | The original file object |

### `chunks` Store
Stores segments of the document for focused processing.
| Key | Type | Description |
|:---|:---|:---|
| `id` | `Number` | Auto-increment primary key |
| `documentId` | `Number` | Foreign key to `documents.id` (Indexed) |
| `content` | `String` | The text content of the chunk |
| `createdAt` | `ISO String` | Timestamp of creation |

---

## LocalStorage Schema
All keys are prefixed with `ala_` to avoid collisions.

### `ala_settings`
Global application configuration.
```json
{
  "apiKey": "sk-...",
  "theme": "light",
  "language": "vi"
}
```

### `ala_lesson_outlines`
Cached AI-generated lessons.
```json
[
  {
    "documentId": 123,
    "chunkId": 456,
    "title": "Machine Learning Intro",
    "content": "Markdown content...",
    "createdAt": "..."
  }
]
```

### `ala_quizzes`
AI-generated multiple-choice questions.
```json
[
  {
    "documentId": 123,
    "questions": [
      {
        "question": "What is AI?",
        "options": ["A", "B", "C", "D"],
        "correct": 0,
        "explanation": "..."
      }
    ]
  }
]
```

### `ala_quiz_results`
Tracking user performance and history.
```json
[
  {
    "documentId": 123,
    "score": 4,
    "total": 5,
    "timestamp": "..."
  }
]
```
