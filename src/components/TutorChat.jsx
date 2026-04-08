import { useState, useRef, useEffect } from 'react';
import logoSvg from '../assets/logo.svg';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, X, Loader2, MessageCircle, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithTutor } from '../api/ai';
import { getChatHistory, saveChatHistory } from '../persistence/storage';

export default function TutorChat({ docId, context }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  // Load initial history
  useEffect(() => {
    if (docId) {
      const history = getChatHistory(docId);
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        // Initial greeting
        setMessages([{
          role: 'assistant',
          content: 'Chào bạn! Mình là Roboki Gia Sư. Mình đã nắm được nội dung bài học hôm nay. Bạn có câu hỏi nào cần giải đáp không? 🎓'
        }]);
      }
    }
  }, [docId]);

  // Handle wrong answer context change to auto-open and send message
  useEffect(() => {
    if (context?.wrongAnswerContext && context.wrongAnswerContext.autoTrigger) {
      setIsOpen(true);
      const questionText = context.wrongAnswerContext.question;
      handleSendMessage(`Tại sao mình chọn "${context.wrongAnswerContext.selected}" lại sai ở câu hỏi "${questionText}"?`);
      // Consume the autoTrigger so it only happens once
      context.wrongAnswerContext.autoTrigger = false;
    }
  }, [context?.wrongAnswerContext]);

  const saveHistory = (newMessages) => {
    setMessages(newMessages);
    if (docId) {
      saveChatHistory(docId, newMessages);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (customMessage) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim() || isLoading) return;

    const newMsg = { role: 'user', content: textToSend };
    const updatedHistory = [...messages, newMsg];

    setInput('');
    saveHistory(updatedHistory);
    setIsLoading(true);

    try {
      const gptHistory = updatedHistory.filter(m => m.role !== 'assistant' || m.content).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await chatWithTutor(gptHistory, context);
      saveHistory([...updatedHistory, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error(error);
      saveHistory([...updatedHistory, { role: 'assistant', content: `Xin lỗi, mình gặp lỗi kết nối: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?')) {
      const initial = [{
        role: 'assistant',
        content: 'Chào bạn! Mình là Roboki Gia Sư. Mình đã nắm được nội dung bài học hôm nay. Bạn có câu hỏi nào cần giải đáp không? 🎓'
      }];
      saveHistory(initial);
    }
  };

  // Quick Prompts
  const quickPrompts = [];

  if (context?.userProgress?.missedQuestions?.length > 0) {
    quickPrompts.push("Giải thích lại các câu mình đã làm sai");
  }

  if (context?.quizStatus) {
    if (context.currentQuestion && !context.isConfirmed) {
      quickPrompts.push("Gợi ý cho mình câu này");
    }
    quickPrompts.push("Giải thích lại khái niệm chính của bài");
    quickPrompts.push("Mình cảm thấy phần này khá khó");
  } else {
    quickPrompts.push("Giải thích đoạn này chi tiết hơn");
    quickPrompts.push("Cho mình một ví dụ thực tế");
    quickPrompts.push("Tóm tắt ý chính của phần này");
  }

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-28 right-0 z-50 flex items-center"
          >
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-3 pl-5 pr-7 py-4 bg-slate-900 text-white rounded-l-2xl shadow-sm border border-slate-800 transition-all hover:bg-slate-800 active:scale-95 group"
            >
              <div className="relative">
                <img src={logoSvg} alt="Logo" className="w-6 h-6 object-contain" />
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Gia sư trực tuyến</span>
                <span className="text-sm font-black tracking-tight uppercase">Hỏi Roboki</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed z-50 flex flex-col bg-white shadow-sm border border-slate-200 overflow-hidden ${isExpanded
              ? 'top-4 bottom-4 left-4 right-4 rounded-2xl'
              : 'bottom-6 right-6 w-[380px] h-[600px] rounded-2xl max-h-[85vh] sm:w-[400px]'
              } transition-all duration-300`}
          >
            {/* Header */}
            <div className="px-5 py-5 border-b border-slate-200 flex items-center justify-between bg-white cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                  <img src={logoSvg} alt="Roboki Logo" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">Roboki Gia Sư</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">Trực tuyến</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); clearHistory(); }} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-orange-600 rounded-lg transition-colors" title="Xóa lịch sử">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-orange-600 rounded-lg transition-colors hidden sm:block">
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-slate-50">
              {messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-1">
                      <img src={logoSvg} alt="Avatar" className="w-5 h-5 object-contain" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl p-4 ${msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                    }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-headings:text-sm prose-headings:font-black prose-strong:text-orange-600">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm font-medium leading-relaxed break-words">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                     <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-5 h-5 text-white" />
                     </div>
                  )}
                </motion.div>
              ))}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start items-start">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-1">
                    <img src={logoSvg} alt="Avatar" className="w-5 h-5 object-contain animate-pulse" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl rounded-tl-sm p-4 flex items-center gap-1.5 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {!isLoading && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="px-4 py-3 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
                {quickPrompts.map((prompt, n) => (
                  <button
                    key={n}
                    onClick={() => handleSendMessage(prompt)}
                    className="whitespace-nowrap px-4 py-2 rounded-lg bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-colors shrink-0"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-end gap-2"
              >
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-1 focus-within:bg-white focus-within:border-orange-500 transition-all">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Hỏi Gia sư bất cứ điều gì..."
                    className="w-full bg-transparent resize-none max-h-32 min-h-[44px] py-2.5 px-3 outline-none text-sm font-bold text-slate-700"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white rounded-xl transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="text-center mt-3">
                <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest italic uppercase">AI trợ giúp học tập — Cung cấp bởi Roboki</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
