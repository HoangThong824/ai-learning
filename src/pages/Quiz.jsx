import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, XCircle, ArrowRight, 
  RotateCcw, Trophy, Timer, AlertCircle, ArrowLeft, 
  Loader2, Rocket, Target, PartyPopper, Lightbulb,
  LayoutDashboard, FileText, BookOpen, GraduationCap
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
      <div className="flex flex-col items-center justify-center p-8 h-full gap-4 bg-slate-50">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Đang chuẩn bị câu hỏi...</p>
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
        <button onClick={() => navigate(`/lesson/${docId}`)} className="px-8 py-3 rounded-full bg-orange-500 text-white font-bold shadow-md hover:bg-orange-600 transition-all">
          Quay lại Bài học
        </button>
      </div>
    );
  }

  /* ---------- Start Screen ---------- */
  if (quizState === 'start') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 h-screen overflow-y-auto bg-slate-50 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm relative overflow-hidden">
          <div className="w-20 h-20 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-8 border border-orange-100">
            <Target className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase">Sẵn sàng thử thách?</h1>
          <p className="text-slate-500 text-base font-bold mb-10 leading-relaxed uppercase tracking-widest text-[11px]">
            Bộ câu hỏi gồm <strong className="text-orange-600">{questions.length} câu</strong> dựa trên: <br/>
            <span className="text-slate-800 normal-case text-lg mt-1 block">{doc?.filename}</span>
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleStart}
              className="w-full py-5 rounded-xl bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              Bắt đầu ngay <Rocket className="w-5 h-5" />
            </button>
            <button onClick={() => navigate(-1)} className="py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 h-screen overflow-y-auto bg-slate-50 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm relative overflow-hidden">
          <div className="w-24 h-24 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-8 border border-orange-100">
             <Trophy className="w-12 h-12 text-orange-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight uppercase">
            Hoàn thành bài tập!
          </h2>
          <p className="text-slate-500 text-sm font-bold mb-10 uppercase tracking-widest">Kết quả nỗ lực của bạn</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Điểm số</p>
              <p className="text-3xl font-black text-orange-600 tracking-tight">{score}/{questions.length}</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tỉ lệ đúng</p>
              <p className="text-3xl font-black text-emerald-600 tracking-tight">{percent}%</p>
            </div>
          </div>

          {/* AI Feedback Section */}
          <div className="mb-10 text-left">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" /> Nhận xét từ Roboki
            </h3>
            <div className="p-6 rounded-xl bg-orange-50 border border-orange-100 min-h-[80px]">
              {isLoadingFeedback ? (
                <div className="flex flex-col items-center justify-center py-4 gap-3">
                  <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                  <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Đang phân tích kết quả...</p>
                </div>
              ) : (
                <div className="prose prose-sm prose-orange max-w-none text-slate-700 font-medium leading-relaxed">
                  <ReactMarkdown>{feedback}</ReactMarkdown>
                </div>
              )}
            </div>
            {extraQuestions.length > 0 && (
              <button
                onClick={handleStartRemedial}
                className="mt-4 w-full py-4 rounded-xl bg-orange-500 text-white font-black text-sm uppercase tracking-widest shadow-sm hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
              >
                <GraduationCap className="w-5 h-5" /> Thử thách bổ sung
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => navigate('/documents')}
              className="w-full py-4 rounded-xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" /> Về trang chủ
            </button>
            <button 
              onClick={handleRestart}
              className="py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Làm lại Quiz
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 lg:p-10 h-screen overflow-y-auto bg-slate-50 flex flex-col items-center">
      <div className="w-full max-w-4xl flex-1 flex flex-col">
        {/* Header/Info */}
        <div className="flex items-center justify-between mb-8 px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-orange-600 font-black text-[10px] uppercase tracking-widest transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Tạm dừng
          </button>
          <div className="flex items-center gap-10">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                {isRemedialMode ? 'KỲ THI BỔ SUNG' : 'Tiến trình'}
              </p>
              <p className="text-xl font-black text-slate-800 tracking-tight leading-none">{currentIdx + 1}<span className="text-slate-300 mx-1">/</span>{questions.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Đúng</p>
              <p className="text-xl font-black text-emerald-600 tracking-tight leading-none">{score}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-200 rounded-full mb-12 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-orange-500" 
          />
        </div>

        {/* Question Card */}
        <div className="flex-1 flex flex-col lg:flex-row gap-10 items-start pb-20">
          <div className="flex-1 w-full">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 lg:p-12 shadow-sm relative"
              >
                <div className="mb-8">
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] px-2 py-1 bg-orange-50 rounded border border-orange-100">Câu hỏi {currentIdx + 1}</span>
                </div>

                <h2 className="text-xl lg:text-2xl font-black text-slate-900 mb-10 leading-tight tracking-tight">
                  {q.question}
                </h2>

                <div className="space-y-3">
                  {q.options.map((opt, idx) => {
                    const isCorrect = idx === q.correct;
                    const isSelected = selectedOpt === idx;
                    const showResult = isConfirmed;

                    let btnClass = "border-slate-100 bg-slate-50 hover:bg-white hover:border-orange-200 text-slate-600";
                    if (isSelected && !showResult) btnClass = "border-orange-500 bg-orange-50 text-orange-800";
                    if (showResult && isCorrect) btnClass = "border-emerald-500 bg-emerald-50 text-emerald-800 font-black";
                    if (showResult && isSelected && !isCorrect) btnClass = "border-rose-500 bg-rose-50 text-rose-800";

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        disabled={showResult}
                        className={`w-full text-left p-4 sm:p-5 rounded-xl border transition-all font-bold text-sm sm:text-base flex items-center justify-between group ${btnClass}`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs transition-all flex-shrink-0 ${
                            isSelected ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500 group-hover:bg-orange-100 group-hover:text-orange-600'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1 leading-tight">{opt}</span>
                        </div>
                        {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 shrink-0" />}
                        {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback / Explanation */}
                <AnimatePresence>
                  {isConfirmed && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-8 p-6 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <h4 className="font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                        {selectedOpt === q.correct ? (
                          <span className="text-emerald-600 flex items-center gap-2">Chính xác! </span>
                        ) : (
                          <span className="text-rose-500 flex items-center gap-2">Chưa đúng rồi</span>
                        )}
                      </h4>
                      <p className="text-slate-600 font-medium leading-relaxed mb-4 text-sm">{q.explanation}</p>
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
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-100 text-orange-600 font-black text-[10px] uppercase tracking-widest hover:bg-orange-200 transition-colors"
                        >
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
          <div className="w-full lg:w-48 flex flex-col gap-3 mt-6 lg:mt-0">
             {!isConfirmed ? (
               <button 
                 onClick={handleConfirm}
                 disabled={selectedOpt === null}
                 className={`w-full py-5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 ${
                   selectedOpt === null 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                 }`}
               >
                 Xác nhận 🎯
               </button>
             ) : (
               <button 
                 onClick={handleNext}
                 className="w-full py-5 rounded-xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
               >
                 {currentIdx < questions.length - 1 ? (
                   <>Tiếp tục <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>
                 ) : (
                   <>Kết quả <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>
                 )}
               </button>
             )}
          </div>
        </div>
      </div>
      
      {/* Tutor Chat Integration */}
      <TutorChat docId={docId} context={tutorContext} />
    </motion.div>
  );
}
