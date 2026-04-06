import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BrainCircuit, CheckCircle2, XCircle, ArrowRight, 
  RotateCcw, Trophy, Timer, AlertCircle, ArrowLeft, 
  Sparkles, Loader2, Rocket, Target, PartyPopper, Lightbulb,
  LayoutDashboard, FileText, BookOpen, Settings as SettingsIcon, Sprout
} from 'lucide-react';
import { getDocument } from '../persistence/db';
import { getQuizzes, saveQuizResult, trackActivity, getLessonOutlines, getUserProgress, updateUserProgress } from '../persistence/storage';
import { getQuizFeedback } from '../api/ai';
import ReactMarkdown from 'react-markdown';
import TutorChat from '../components/TutorChat';

export default function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const docId = Number(id);

  const [doc, setDoc] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState('start'); // 'start', 'playing', 'finished'
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [extraQuestions, setExtraQuestions] = useState([]);
  const [isRemedialMode, setIsRemedialMode] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [missedQuestions, setMissedQuestions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedDoc = await getDocument(docId);
        setDoc(loadedDoc);
        
        const allQuizzes = getQuizzes();
        const found = allQuizzes.find(q => q.documentId === docId);
        if (found && found.questions) {
          setQuestions(found.questions);
        }
      } catch (error) {
        console.error("Error loading quiz data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [docId]);

  const [tutorContext, setTutorContext] = useState({
    docTitle: '',
    lessonContent: '',
    quizStatus: true,
    wrongAnswerContext: null,
    userProgress: null
  });

  useEffect(() => {
    if (doc) {
      const outlines = getLessonOutlines();
      const currentOutline = outlines.find(o => o.documentId === docId);
      const progress = getUserProgress(docId);
      setTutorContext(prev => ({
        ...prev,
        docTitle: doc.filename,
        lessonContent: currentOutline ? currentOutline.content : '',
        userProgress: progress,
        currentQuestion: questions[currentIdx],
        isConfirmed: isConfirmed,
        sessionMissedQuestions: missedQuestions
      }));
    }
  }, [doc, docId, currentIdx, questions, isConfirmed, missedQuestions]);

  const handleStart = () => {
    setQuizState('playing');
  };

  const handleSelect = (idx) => {
    if (isConfirmed) return;
    setSelectedOpt(idx);
  };

  const handleConfirm = () => {
    if (selectedOpt === null) return;
    setIsConfirmed(true);
    if (selectedOpt === questions[currentIdx].correct) {
      setScore(s => s + 1);
    } else {
      // Track missed question
      setMissedQuestions(prev => [...prev, questions[currentIdx]]);
    }
  };

  const handleNext = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedOpt(null);
      setIsConfirmed(false);
    } else {
      setQuizState('finished');
      setIsLoadingFeedback(true);
      try {
        const outlines = getLessonOutlines();
        const currentOutline = outlines.find(o => o.documentId === docId);
        const lessonContent = currentOutline ? currentOutline.content : '';

        const feedbackData = await getQuizFeedback(questions, score, doc?.filename || 'Bài học', lessonContent, missedQuestions);
        setFeedback(feedbackData.feedback || '');
        setExtraQuestions(feedbackData.extraQuestions || []);
      } catch (err) {
        console.error("AI Feedback error:", err);
        setFeedback("Không thể tải nhận xét từ AI lúc này.");
      } finally {
        setIsLoadingFeedback(false);
      }
      
      saveQuizResult({
        documentId: docId,
        score,
        total: questions.length
      });

      // Update detailed user progress
      const prevProgress = getUserProgress(docId);
      const newBest = Math.max(prevProgress.bestQuizScore || 0, score);
      const newProgress = {
        bestQuizScore: newBest,
        totalQuizQuestions: questions.length,
        lastQuizDate: new Date().toISOString(),
        missedQuestions: missedQuestions // Persistent storage of errors
      };
      updateUserProgress(docId, newProgress);
      
      // Update tutor context so AI is aware immediately
      setTutorContext(prev => ({
        ...prev,
        userProgress: { ...prev.userProgress, ...newProgress }
      }));
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setIsConfirmed(false);
    setScore(0);
    setFeedback('');
    setExtraQuestions([]);
    setMissedQuestions([]);
    setIsRemedialMode(false);
    setQuizState('playing');
  };

  const handleStartRemedial = () => {
    setQuestions(extraQuestions);
    setExtraQuestions([]);
    setIsRemedialMode(true);
    setCurrentIdx(0);
    setSelectedOpt(null);
    setIsConfirmed(false);
    setScore(0);
    setFeedback('');
    setQuizState('playing');
  };

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full gap-4">
        <BrainCircuit className="w-12 h-12 text-indigo-500 animate-pulse" />
        <p className="text-slate-500 font-bold animate-pulse">Đang chuẩn bị câu hỏi...</p>
      </div>
    );
  }

  /* ---------- No Quiz Found ---------- */
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-rose-50 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-rose-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">Chưa có Quiz cho tài liệu này</h2>
        <p className="text-slate-500 mb-6 max-w-sm">Hãy quay lại mục Bài học và nhấn "Tạo bài học AI" để hệ thống tự động tạo Quiz cho bạn nhé!</p>
        <button onClick={() => navigate(`/lesson/${docId}`)} className="px-8 py-3 rounded-full bg-indigo-500 text-white font-bold shadow-md hover:bg-indigo-600 transition-all">
          Quay lại Bài học
        </button>
      </div>
    );
  }

  /* ---------- Start Screen ---------- */
  if (quizState === 'start') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 h-full flex items-center justify-center">
        <div className="max-w-xl w-full bg-white border border-slate-100 rounded-[3rem] p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.05)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="w-24 h-24 rounded-3xl bg-indigo-50 flex items-center justify-center mx-auto mb-8 shadow-inner">
            <BrainCircuit className="w-12 h-12 text-indigo-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Sẵn sàng thử thách? <Target className="inline-block w-8 h-8 text-rose-500" /></h1>
          <p className="text-slate-500 text-lg font-medium mb-10">
            Bạn sẽ thực hiện bộ câu hỏi gồm <strong>{questions.length} câu</strong> dựa trên bài học <strong>{doc?.filename}</strong>.
          </p>
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleStart}
              className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black text-xl shadow-xl hover:shadow-indigo-500/20 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
            >
              Bắt đầu ngay <Rocket className="w-6 h-6" />
            </button>
            <button onClick={() => navigate(-1)} className="text-slate-400 font-bold hover:text-slate-600 transition-colors">
              Quay lại
            </button>
          </div>
        </div>
        {/* Tutor Chat Integration */}
        <TutorChat docId={docId} context={tutorContext} />
      </motion.div>
    );
  }

  /* ---------- Finished Screen ---------- */
  if (quizState === 'finished') {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-8 h-full flex items-center justify-center">
        <div className="max-w-xl w-full bg-white border border-slate-100 rounded-[3rem] p-12 text-center shadow-[0_20px_60px_rgba(0,0,0,0.05)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="w-28 h-28 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-8 shadow-inner relative">
             <Trophy className="w-14 h-14 text-emerald-500" />
             <motion.div 
               animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="absolute inset-0 bg-emerald-400 rounded-full blur-xl -z-10" 
             />
          </div>
          <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter flex items-center justify-center gap-3">
            Tuyệt vời! <PartyPopper className="w-10 h-10 text-amber-500" />
          </h2>
          <p className="text-slate-500 text-lg font-medium mb-10">Bạn đã hoàn thành bài kiểm tra suất sắc.</p>
          
          <div className="grid grid-cols-2 gap-6 mb-12">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Điểm số</p>
              <p className="text-4xl font-black text-indigo-600 tracking-tight">{score}/{questions.length}</p>
            </div>
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tỉ lệ đúng</p>
              <p className="text-4xl font-black text-emerald-500 tracking-tight">{percent}%</p>
            </div>
          </div>

          {/* AI Feedback Section */}
          <div className="mb-12 text-left">
            <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" /> Nhận xét từ giáo viên AI
            </h3>
            <div className="p-6 lg:p-8 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 relative overflow-hidden min-h-[100px]">
              {isLoadingFeedback ? (
                <div className="flex flex-col items-center justify-center py-4 gap-3">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Đang phân tích kết quả...</p>
                </div>
              ) : (
                <div className="prose prose-sm prose-indigo max-w-none text-slate-600 font-medium leading-relaxed">
                  <ReactMarkdown>{feedback}</ReactMarkdown>
                </div>
              )}
            </div>
            {extraQuestions.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleStartRemedial}
                className="mt-6 w-full py-4 rounded-2xl bg-indigo-500 text-white font-black text-lg shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all"
              >
                <BrainCircuit className="w-6 h-6" /> Làm Quiz bổ sung ngay <Sparkles className="w-5 h-5 text-amber-300" />
              </motion.button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={() => navigate('/documents')}
              className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-xl hover:shadow-indigo-500/20 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="w-5 h-5" /> Về trang chủ
            </button>
            <button 
              onClick={handleRestart}
              className="flex items-center justify-center gap-2 py-4 text-slate-400 font-bold hover:text-indigo-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Làm lại Quiz
            </button>
          </div>
        </div>
        
        {/* Tutor Chat Integration */}
        <TutorChat docId={docId} context={tutorContext} />
      </motion.div>
    );
  }

  /* ---------- Playing Screen ---------- */
  const q = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-10 h-full flex flex-col items-center">
      <div className="w-full max-w-4xl flex-1 flex flex-col">
        {/* Header/Info */}
        <div className="flex items-center justify-between mb-8 px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold transition-colors">
            <ArrowLeft className="w-5 h-5" /> Nghỉ ngơi Tạm dừng
          </button>
          <div className="flex items-center gap-10">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                {isRemedialMode ? 'KỲ THI BỔ SUNG' : 'Tiến trình'}
              </p>
              <p className="text-xl font-black text-slate-800 tracking-tight">{currentIdx + 1}<span className="text-slate-300 mx-1">/</span>{questions.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Đúng</p>
              <p className="text-xl font-black text-emerald-500 tracking-tight">{score}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-slate-100 rounded-full mb-12 overflow-hidden shadow-inner p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]" 
          />
        </div>

        {/* Question Card */}
        <div className="flex-1 flex flex-col lg:flex-row gap-10 items-start">
          <div className="flex-1 w-full">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentIdx}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                className="bg-white border border-slate-100 rounded-[3rem] p-10 lg:p-14 shadow-[0_30px_60px_rgba(0,0,0,0.04)] relative"
              >
                <div className="absolute -top-10 -left-10 w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center -rotate-12">
                   <Timer className="w-10 h-10 text-indigo-500" />
                </div>

                <h2 className="text-2xl lg:text-3xl font-black text-slate-800 mb-10 leading-snug tracking-tight">
                  {q.question}
                </h2>

                <div className="space-y-4">
                  {q.options.map((opt, idx) => {
                    const isCorrect = idx === q.correct;
                    const isSelected = selectedOpt === idx;
                    const showResult = isConfirmed;

                    let btnClass = "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 text-slate-600";
                    if (isSelected && !showResult) btnClass = "border-indigo-500 bg-indigo-50 text-indigo-800 ring-4 ring-indigo-500/10";
                    if (showResult && isCorrect) btnClass = "border-emerald-500 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-500/10";
                    if (showResult && isSelected && !isCorrect) btnClass = "border-rose-500 bg-rose-50 text-rose-800 ring-4 ring-rose-500/10";

                    return (
                      <motion.button
                        key={idx}
                        whileHover={!showResult ? { scale: 1.02 } : {}}
                        whileTap={!showResult ? { scale: 0.98 } : {}}
                        onClick={() => handleSelect(idx)}
                        disabled={showResult}
                        className={`w-full text-left p-6 lg:p-7 rounded-3xl border-2 transition-all font-bold text-lg flex items-center justify-between group ${btnClass}`}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all ${
                            isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </div>
                        {showResult && isCorrect && <CheckCircle2 className="w-7 h-7 text-emerald-500" />}
                        {showResult && isSelected && !isCorrect && <XCircle className="w-7 h-7 text-rose-500" />}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Feedback / Explanation */}
                <AnimatePresence>
                  {isConfirmed && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-10 p-6 rounded-3xl bg-slate-50 border border-slate-100"
                    >
                      <h4 className="font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                        {selectedOpt === q.correct ? (
                          <span className="text-emerald-500 flex items-center gap-2">Chính xác! <Sparkles className="w-4 h-4" /></span>
                        ) : (
                          <span className="text-rose-500 flex items-center gap-2">Chưa đúng rồi <Lightbulb className="w-4 h-4" /></span>
                        )}
                      </h4>
                      <p className="text-slate-500 font-medium leading-relaxed mb-4">{q.explanation}</p>
                      {selectedOpt !== q.correct && (
                        <button
                          onClick={() => {
                            setTutorContext(prev => ({
                              ...prev,
                              wrongAnswerContext: {
                                question: q.question,
                                selected: q.options[selectedOpt],
                                correct: q.options[q.correct],
                                explanation: q.explanation,
                                autoTrigger: true
                              }
                            }));
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-100 text-indigo-600 font-bold text-sm hover:bg-indigo-200 transition-colors"
                        >
                          <BrainCircuit className="w-4 h-4" />
                          Hỏi Gia sư giải thích thêm
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action Pane */}
          <div className="w-full lg:w-48 flex flex-col gap-4 mt-6 lg:mt-0">
             {!isConfirmed ? (
               <button 
                 onClick={handleConfirm}
                 disabled={selectedOpt === null}
                 className={`w-full py-6 rounded-3xl font-black text-lg transition-all shadow-xl flex flex-col items-center justify-center gap-2 ${
                   selectedOpt === null 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20'
                 }`}
               >
                 Xác nhận 🎯
               </button>
             ) : (
               <motion.button 
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 onClick={handleNext}
                 className="w-full py-6 rounded-3xl bg-slate-900 text-white font-black text-lg shadow-xl hover:shadow-indigo-500/20 transition-all flex flex-col items-center justify-center gap-2 group"
               >
                 {currentIdx < questions.length - 1 ? (
                   <>Câu tiếp theo <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></>
                 ) : (
                   <>Xem kết quả <PartyPopper className="w-6 h-6" /></>
                 )}
               </motion.button>
             )}
          </div>
        </div>
      </div>
      
      {/* Tutor Chat Integration */}
      <TutorChat docId={docId} context={tutorContext} />
    </motion.div>
  );
}
