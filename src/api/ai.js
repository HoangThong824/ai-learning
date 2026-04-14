import { getSettings } from '../persistence/storage';

// Base AI call — dispatches to OpenAI or Anthropic depending on user settings
const callLLM = async (systemMessage, userMessage) => {
  const { aiProvider } = getSettings();
  // apiKey is no longer required on client side as it is injected by Nginx proxy
  if (aiProvider === 'anthropic') {
    return callAnthropic(systemMessage, userMessage);
  } else {
    return callOpenAI(systemMessage, userMessage);
  }
};

const callOpenAI = async (systemMessage, userMessage) => {
  const response = await fetch('/api/openai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authorization header is injected by Nginx
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI Error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

const callAnthropic = async (systemMessage, userMessage) => {
  const response = await fetch('/api/anthropic/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // x-api-key is injected by Nginx
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic Error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
};

// --- Exported lesson / quiz helpers ---

export const generateLessonOutline = async (textChunk) => {
  const systemPrompt = `Bạn là một chuyên gia thiết kế bài giảng hiện đại, bậc thầy về phương pháp Micro-learning.
Nhiệm vụ của bạn là biến nội dung được cung cấp thành một bài học **sinh động, cô đọng và đi thẳng vào trọng tâm**.

Cấu trúc yêu cầu:
1. # [Tiêu đề hấp dẫn, ngắn gọn]
2. ## 🎯 Trọng tâm kiến thức: (Danh sách 3-5 gạch đầu dòng những điểm quan trọng nhất)
3. ## 💡 Nội dung chi tiết:
   Chia nhỏ thành các phần ### [Tên phần]. Trong mỗi phần, hãy:
   - Sử dụng bảng (table) hoặc danh sách nếu phù hợp để tối ưu hóa việc đọc.
   - **Tóm lược:** Giải thích ngắn gọn concept trong 2-3 câu.
   - **Ví dụ minh họa 📸:** Một ví dụ thực tế hoặc kịch bản gần gũi để làm rõ concept.
   - **Ghi nhớ (Takeaway):** Một câu chốt hạ đắt giá cho phần này.

Yêu cầu BẮT BUỘC:
- Trình bày chuyên nghiệp bằng Markdown, sử dụng emojis hợp lý để tăng tính sinh động.
- Văn phong hiện đại, lôi cuốn, dễ hiểu (không hàn lâm quá mức).
- Ưu tiên sự cô đọng: Lược bỏ các chi tiết rườm rà, tập trung vào ứng dụng thực tiễn.
- Trả lời bằng tiếng Việt.`;

  const userPrompt = `Dựa trên nội dung sau đây, hãy biên soạn một bài học theo phong cách Micro-learning sinh động, cô đọng. Hãy tập trung vào các ví dụ thực tế và lược bỏ các phần lý thuyết không cần thiết:\n\n${textChunk}`;

  const response = await callLLM(systemPrompt, userPrompt);

  // Extract title (the first # [Tiêu đề])
  const lines = response.split('\n').filter(l => l.trim());
  const titleMatch = response.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : (lines[0]?.replace(/^#+\s*/, '').trim() || 'Bài học mới');

  return { title, content: response };
};

export const generateQuiz = async (lessonContent) => {
  const systemPrompt = 'Bạn là một giáo viên tạo đề thi. Trả lời bằng tiếng Việt với cấu trúc JSON thuần túy.';
  const userPrompt = `Tạo các câu hỏi trắc nghiệm (4 đáp án A-D) dựa trên bài học sau. Trả về JSON thuần túy không có markdown:\n{"questions":[{"question":"...","options":["A...","B...","C...","D..."],"correct":0,"explanation":"..."}]}\n\nBài học:\n${lessonContent}`;

  const response = await callLLM(systemPrompt, userPrompt);

  try {
    // Strip potential markdown code fences
    const jsonStr = response.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    // Return a fallback if parsing fails
    return {
      questions: [
        { question: "Không thể phân tích kết quả từ AI. Vui lòng thử lại.", options: ["Thử lại", "Bỏ qua", "Kiểm tra API", "Xem lại bài"], correct: 0, explanation: response }
      ]
    };
  }
};

export const getQuizFeedback = async (questions, score, docTitle, lessonContent, missedQuestions = []) => {
  const systemPrompt = `Bạn là một chuyên gia giáo dục. Hãy đưa ra nhận xét và bộ câu hỏi bổ sung nếu cần thiết dưới dạng JSON thuần túy.
Cấu trúc JSON:
{
  "feedback": "...", // Nhận xét bằng Markdown, tập trung vào điểm mạnh và điểm yếu dựa trên kết quả
  "extraQuestions": [ // Chỉ cung cấp nếu điểm < 70% (tập trung vào các mảng kiến thức học viên làm sai)
    {"question": "...", "options": ["...", "..."], "correct": 0, "explanation": "..."}
  ]
}`;
  const total = questions.length;
  const percent = (score / total) * 100;

  let missedContext = '';
  if (missedQuestions.length > 0) {
    missedContext = `\nCác câu hỏi học viên đã làm sai:\n${missedQuestions.map((m, i) => `${i+1}. ${m.question} (Đáp án đúng là: ${m.options[m.correct]})`).join('\n')}`;
  }

  const userPrompt = `
Học viên vừa làm Quiz "${docTitle}": ${score}/${total} (${percent.toFixed(1)}%).
${missedContext}

Hãy phản hồi JSON phù hợp. CHỈ KHI điểm trung bình < 70%, hãy tạo các câu hỏi bổ sung tập trung chính xác vào các mảng kiến thức mà học viên đang bị hổng (dựa trên các câu sai ở trên). Nếu điểm >= 70%, hãy khen ngợi và để trống mảng extraQuestions ( [] ).

Nội dung bài học để tham khảo:
${lessonContent || 'Không có mô tả chi tiết'}
`;

  const response = await callLLM(systemPrompt, userPrompt);
  try {
    const jsonStr = response.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    return { feedback: response, extraQuestions: [] };
  }
};

export const chatWithTutor = async (history, context) => {
  const { docTitle, lessonContent, currentSection, quizStatus, wrongAnswerContext, userProgress, isConfirmed, currentQuestion, sessionMissedQuestions } = context;
  
  const systemPrompt = `Bạn là một Gia sư cá nhân 1:1 siêu tận tâm, chuyên môn xuất sắc nhưng vô cùng thân thiện.
Nhiệm vụ của bạn là đồng hành giải đáp thắc mắc cho học viên trong quá trình học tập dựa trên dữ liệu thật.
Hãy sử dụng Markdown để định dạng, dùng emojis hợp lý để động viên học trò.

=== 1. DỮ LIỆU BÀI HỌC (DO NGƯỜI DÙNG CUNG CẤP) ===
Tên tài liệu: ${docTitle}
Nội dung bài học chuyên sâu phục vụ tra cứu:
${lessonContent || 'Không có nội dung bài học cụ thể.'}

=== 2. DỮ LIỆU QUÁ TRÌNH HỌC (TIẾN ĐỘ THỰC TẾ) ===
- Các bài học/phần đã hoàn thành: ${userProgress?.completedTitles?.join(', ') || 'Chưa hoàn thành phần nào'}
- Trạng thái hiện tại: ${currentSection ? `Đang học phần "${currentSection.title}"` : 'Đang xem tổng quan'}
- Kết quả kiểm tra (Quiz): ${userProgress?.bestQuizScore !== undefined ? `Điểm cao nhất đạt được là ${userProgress.bestQuizScore}/${userProgress.totalQuizQuestions || 0}` : 'Chưa thực hiện bài kiểm tra nào'}
${userProgress?.lastQuizDate ? `- Ngày làm bài gần nhất: ${new Date(userProgress.lastQuizDate).toLocaleDateString('vi-VN')}` : ''}

=== 3. LỖI SAI TRONG BÀI THI HIỆN TẠI (CURRENT MISTAKES) ===
${sessionMissedQuestions && sessionMissedQuestions.length > 0 
  ? `Trong lần làm Quiz này, học viên VỪA LÀM SAI ${sessionMissedQuestions.length} câu hỏi sau:\n${sessionMissedQuestions.map((q, i) => `${i+1}. "${q.question}" (Đáp án đúng: ${q.options[q.correct]})`).join('\n')}\n=> MÊNH LỆNH QUAN TRỌNG: Nếu học viên yêu cầu giải thích các câu hỏi họ làm sai hoặc hỏi "tôi đã làm sai câu nào?", BẠN CHỈ ĐƯỢC PHÉP TRẢ LỜI VÀ GIẢI THÍCH DỰA CHÍNH XÁC VÀO DANH SÁCH TRÊN ĐÂY. Tuyệt đối không tự bịa thêm hoặc lấy câu hỏi cũ.`
  : 'Học viên chưa làm sai câu nào trong bài kiểm tra hiện tại.'}

=== 4. LỊCH SỬ LỖI SAI TỔNG HỢP (PAST MISTAKES) ===
${userProgress?.missedQuestions?.length > 0 
  ? `Học viên đã từng làm sai các câu sau trong quá khứ:\n${userProgress.missedQuestions.map((q, i) => `${i+1}. "${q.question}"`).join('\n')}\n=> LƯU Ý: Chỉ dùng để tham khảo khi học viên hỏi chung chung về "lịch sử yếu kém".`
  : 'Học viên chưa có lịch sử lỗi sai nào cần lưu ý.'}

=== 5. NGỮ CẢNH TƯƠNG TÁC HIỆN TẠI ===
${quizStatus ? `- Học viên đang làm Quiz.` : '- Học viên đang đọc bài.'}
${wrongAnswerContext ? `- HÀNH ĐỘNG CẦN THIẾT: Giải thích lỗi sai vừa mắc phải: "${wrongAnswerContext.question}". Giải thích tại sao chọn "${wrongAnswerContext.selected}" là sai và tại sao "${wrongAnswerContext.correct}" là đúng.` : ''}

=== 6. CÂU HỎI ĐANG HIỂN THỊ (QUAN TRỌNG) ===
${!isConfirmed && currentQuestion ? `Học viên ĐANG xem câu hỏi này và CHƯA trả lời:
- Câu hỏi: "${currentQuestion.question}"
- Các lựa chọn: ${currentQuestion.options.join(', ')}

=> NHIỆM VỤ: Nếu học viên hỏi về câu này (ví dụ: "Gợi ý cho mình", "Câu này là gì?"), bạn hãy:
1. Đưa ra GỢI Ý (hint) hoặc giải thích các khái niệm liên quan để học viên tự tìm ra đáp án.
2. CHỈ ĐƯA RA ĐÁP ÁN nếu học viên yêu cầu trực tiếp hoặc sau khi đã gợi ý mà họ vẫn không hiểu.
3. Luôn trung thành với nội dung bài học chuyên sâu ở mục 1.` : '- Không có câu hỏi nào đang chờ giải đáp.'}

Nhiệm vụ của bạn: Trả lời câu hỏi của học viên (trong khoảng 100-300 từ). 
QUAN TRỌNG: Bạn phải luôn đối chiếu với "DỮ LIỆU BÀI HỌC" và cá nhân hóa phản hồi dựa trên "LỖI SAI TRONG BÀI THI HIỆN TẠI", "LỊCH SỬ LỖI SAI" cũng như "CÂU HỎI ĐANG HIỂN THỊ" (nếu có).`;

  const { aiProvider } = getSettings();

  // Depending on provider, history needs to be formatted
  if (aiProvider === 'anthropic') {
      const response = await fetch('/api/anthropic/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // x-api-key is injected by Nginx
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          system: systemPrompt,
          messages: history.map(h => ({ role: h.role, content: h.content })),
        }),
      });
    
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Anthropic Error: ${response.status}`);
      }
    
      const data = await response.json();
      return data.content[0].text;
  } else {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header is injected by Nginx
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.map(h => ({ role: h.role, content: h.content }))
          ],
          temperature: 0.7,
        }),
      });
    
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `OpenAI Error: ${response.status}`);
      }
    
      const data = await response.json();
      return data.choices[0].message.content;
  }
};
