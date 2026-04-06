import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, X, Loader2, Sparkles, MessageCircle, Maximize2, Minimize2, Trash2 } from 'lucide-react';
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
          content: 'Chào bạn! Mình là Gia sư AI. Mình đã nắm được nội dung bài học hôm nay. Bạn có câu hỏi nào cần giải đáp không? 🎓'
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
        content: 'Chào bạn! Mình là Gia sư AI. Mình đã nắm được nội dung bài học hôm nay. Bạn có câu hỏi nào cần giải đáp không? 🎓'
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
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed bottom-28 right-0 z-50 flex items-center"
          >
            <motion.button
              whileHover={{ x: -10 }}
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-3 pl-4 pr-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-l-full shadow-[0_10px_30px_rgba(79,70,229,0.3)] border-y border-l border-white/20 backdrop-blur-md group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
                <MessageCircle className="w-6 h-6 relative z-10" />
                <Sparkles className="absolute -top-2 -right-2 w-3 h-3 text-yellow-300 animate-bounce" />
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Trợ lý học tập</span>
                <span className="text-sm font-black tracking-tight">Hỏi Gia sư AI</span>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed z-50 flex flex-col bg-white/90 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden ${isExpanded
              ? 'top-4 bottom-4 left-4 right-4 rounded-3xl'
              : 'bottom-6 right-6 w-[380px] h-[600px] rounded-[2rem] max-h-[85vh] sm:w-[420px]'
              } transition-all duration-300`}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-600 text-white cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md relative">
                  <Bot className="w-5 h-5" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-indigo-600 rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Gia sư AI</h3>
                  <p className="text-xs text-indigo-100 font-medium">Sẵn sàng hỗ trợ 1:1</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); clearHistory(); }} className="p-2 hover:bg-white/20 rounded-full transition-colors" title="Xóa lịch sử">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-2 hover:bg-white/20 rounded-full transition-colors hidden sm:block">
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-2 hover:bg-rose-500/80 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
              {messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm ${msg.role === 'user'
                    ? 'bg-indigo-500 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
                    }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-p:leading-relaxed prose-headings:text-sm prose-headings:font-bold prose-a:text-indigo-500 max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-[15px] leading-relaxed break-words">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {!isLoading && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="px-4 py-2 bg-white flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                {quickPrompts.map((prompt, n) => (
                  <button
                    key={n}
                    onClick={() => handleSendMessage(prompt)}
                    className="whitespace-nowrap px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors shrink-0"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hỏi bất cứ điều gì..."
                  className="w-full bg-transparent resize-none max-h-32 min-h-[44px] py-2.5 px-3 outline-none text-sm text-slate-700 custom-scrollbar"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 text-white rounded-xl transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="text-center mt-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AI có thể mắc lỗi. Hãy kiểm tra lại thông tin.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
