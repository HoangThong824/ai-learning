import { getSettings } from '../persistence/storage';

// Base AI call — dispatches to OpenAI or Anthropic depending on user settings
const callLLM = async (systemMessage, userMessage) => {
  const { apiKey, aiProvider } = getSettings();
  if (!apiKey) throw new Error('Vui lòng nhập API Key trong phần Cài đặt (hoặc cấu hình VITE_DEFAULT_API_KEY).');

  if (aiProvider === 'anthropic') {
    return callAnthropic(systemMessage, userMessage, apiKey);
  } else {
    return callOpenAI(systemMessage, userMessage, apiKey);
  }
};

const callOpenAI = async (systemMessage, userMessage, apiKey) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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

const callAnthropic = async (systemMessage, userMessage, apiKey) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
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
  const systemPrompt = `Bạn là một giáo sư đại học và l một siêu chuyên gia trong việc phân tích chuyên môn.
Nhiệm vụ của bạn là biến nội dung được cung cấp thành một **Giáo trình học thuật siêu chi tiết**. Các "Bài học con (Sub-lessons)" cần có độ dài cực lớn, bao phủ mọi khía cạnh, chuyên sâu và giải thích cực kỳ cặn kẽ. Tránh viết tóm tắt! Hãy mổ xẻ nội dung ở mức độ chuyên gia thực thụ.

Cấu trúc chuẩn của bài học:
1. # [Tiêu đề tổng quát của nội dung này]
2. ## Tổng quan chuyên đề: (Phân tích toàn diện và khái quát học thuật sâu sắc về những gì sẽ được học)
3. ## Lộ trình làm chủ kiến thức: (Danh sách các bài học con siêu chi tiết bên dưới)
4. ## Các bài học con (Sub-lessons):
   Đây là phần QUAN TRỌNG NHẤT. Hãy viết mỗi bài học con THẬT DÀI (ít nhất 500-1000 từ mỗi phần) và cực kỳ sắc bén theo cấu trúc:
   ### [Tên bài học con]
   - **Bối cảnh & Khái niệm cốt lõi:** (Giải thích cực kỳ sâu, định nghĩa rõ ràng, nguồn gốc vấn đề).
   - **Phân tích chuyên sâu:** (Mổ xẻ chi tiết từng khía cạnh, nguyên lý hoạt động, tại sao lại như vậy).
   - **Ví dụ thực tiễn & Case Study:** (Cung cấp các ví dụ rất thực tế, có số liệu hoặc kịch bản rõ ràng để chứng minh).
   - **Mở rộng, Nâng cao & Phản biện (Critical Thinking):** (Kết nối với kiến thức nâng cao, góc nhìn phản biện từ chuyên gia, các điểm tối, giới hạn hoặc ứng dụng tương lai).

Yêu cầu BẮT BUỘC: 
- Trình bày chuyên nghiệp bằng Markdown. 
- Viết siêu dài, nội dung mang tính hàn lâm nhưng dễ hiểu, như một cuốn Bách khoa toàn thư. Tối đa hóa lượng kiến thức được xuất ra.
- Trả lời bằng tiếng Việt.`;

  const userPrompt = `Dựa trên nội dung gốc sau đây, hãy xây dựng một giáo trình học thuật hoàn chỉnh gồm nhiều bài học con SIÊU CHI TIẾT, chuyên sâu. Hãy diễn giải, mở rộng mọi ý tưởng từ văn bản tới mức tối đa, viết dài nhất có thể:\n\n${textChunk}`;

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

  const { apiKey, aiProvider } = getSettings();
  if (!apiKey) throw new Error('Vui lòng nhập API Key trong phần Cài đặt.');

  // Depending on provider, history needs to be formatted
  if (aiProvider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
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
