# AI Generation Workflow

This document explains the AI logic behind **AI Learning Assistant** (ALA).

## Generation Pipeline

### 1. Lesson Generation (`generateLessonOutline`)
- **Input**: Raw text chunk (approx. 2000-4000 chars).
- **Prompt Logic**:
  - Enforces a professional study guide tone.
  - Structure: **Summary**, **Roadmap**, and **Detailed Content**.
  - Language: Vietnamese (Tiếng Việt).
- **Output**: JSON object `{ title, content }`.

### 2. Quiz Generation (`generateQuiz`)
- **Input**: The markdown content of a generated lesson.
- **Prompt Logic**:
  - Creates 3-5 multiple-choice questions (MCQs).
  - Each question MUST have:
    - 4 options.
    - 1 correct index.
    - A detailed explanation of why the answer is correct.
- **Output**: JSON object `{ questions: [{ question, options, correct, explanation }] }`.

### 3. Feedback & Remediation (`getQuizFeedback`)
- **Input**: User's score, total questions, and document title.
- **Logic**:
  - **Score < 70%**: AI provides encouraging feedback and generates **3 remedial questions** (Extra Quiz).
  - **Score >= 70%**: AI provides celebratory feedback and advanced challenge questions.
- **Output**: JSON object `{ feedback, extraQuestions: [...] }`.

---

## AI Configuration
The application uses a standard OpenAI-compatible API interface.

### Recommended System Prompt (Global)
> "Bạn là một trợ lý học tập AI thông minh, hỗ trợ người dùng trích xuất kiến thức và ôn tập hiệu quả qua tài liệu cá nhân."

---

## Example Response Format (Quiz)
```json
{
  "questions": [
    {
      "question": "Vấn đề nào sau đây là cốt lõi của Machine Learning?",
      "options": [
        "Lập trình thủ công mọi quy tắc",
        "Khả năng tự học từ dữ liệu",
        "Sử dụng nhiều RAM",
        "Tốc độ xử lý CPU"
      ],
      "correct": 1,
      "explanation": "Machine Learning tập trung vào việc xây dựng các thuật toán có khả năng tự học và cải thiện hiệu suất dựa trên dữ liệu thay vì được lập trình cứng."
    }
  ]
}
```
