import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Trophy, ArrowRight, RotateCcw, PartyPopper, 
  Sparkles, BrainCircuit, Rocket, ChevronLeft, Calendar,
  CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { getDocument } from '../persistence/db';
import { getQuizResults } from '../persistence/storage';
import ReactMarkdown from 'react-markdown';

export default function Result() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const docId = Number(id);

  const [doc, setDoc] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // We can passed state from Quiz.jsx or fetch from storage
  const passedResult = location.state?.result;
  const passedFeedback = location.state?.feedback;

  useEffect(() => {
    const loadResult = async () => {
      try {
        const loadedDoc = await getDocument(docId);
        setDoc(loadedDoc);

        if (passedResult) {
          setResult({ ...passedResult, feedback: passedFeedback });
        } else {
          // Fetch last result from storage for this doc
          const allResults = getQuizResults();
          const docResults = allResults.filter(r => r.documentId === docId);
          if (docResults.length > 0) {
            setResult(docResults[docResults.length - 1]);
          }
        }
      } catch (err) {
        console.error("Error loading result:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadResult();
  }, [docId, passedResult, passedFeedback]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-bold">Đang tải kết quả...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertCircle className="w-16 h-16 text-rose-300 mb-6" />
        <h2 className="text-2xl font-black text-slate-700 mb-4">Không tìm thấy kết quả</h2>
        <p className="text-slate-500 mb-8 max-w-sm">Có vẻ như bạn chưa thực hiện bài Quiz nào cho tài liệu này.</p>
        <button onClick={() => navigate('/quizzes')} className="px-8 py-3 rounded-2xl bg-indigo-500 text-white font-bold">
           Đến trang Quiz
        </button>
      </div>
    );
  }

  const percent = Math.round((result.score / result.total) * 100);
  const isGood = percent >= 70;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 lg:p-12 h-full flex flex-col gap-10 max-w-5xl mx-auto overflow-y-auto custom-scrollbar"
    >
      <header className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Quay lại Lịch sử
        </button>
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
           <Calendar className="w-3.5 h-3.5" />
           {new Date(result.timestamp).toLocaleDateString('vi-VN')}
        </div>
      </header>

      <div className="flex flex-col items-center text-center">
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className={`inline-flex items-center justify-center w-32 h-32 rounded-[2.5rem] bg-gradient-to-br mb-8 shadow-2xl relative ${
            isGood ? 'from-amber-300 via-orange-400 to-red-400' : 'from-slate-300 via-slate-400 to-slate-500'
          }`}
        >
          <Trophy className="w-16 h-16 text-white drop-shadow-lg" />
          {isGood && (
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-amber-400 rounded-full blur-2xl -z-10" 
            />
          )}
        </motion.div>
        
        <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter flex items-center justify-center gap-4">
          {isGood ? 'Hoàn thành xuất sắc!' : 'Cố gắng lên nhé!'} 
          {isGood ? <PartyPopper className="w-10 h-10 text-amber-500" /> : <Rocket className="w-10 h-10 text-indigo-400" />}
        </h1>
        <p className="text-xl text-slate-500 font-medium">
          Bạn đạt <span className={`${isGood ? 'text-emerald-500' : 'text-rose-500'} font-black text-2xl`}>{result.score}/{result.total}</span> điểm 
          cho bài học <span className="text-indigo-500 font-bold bg-indigo-50 px-3 py-1 rounded-xl mx-1">{doc?.filename}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white border border-slate-100 rounded-[3rem] p-10 relative overflow-hidden shadow-sm shadow-indigo-500/5 group hover:shadow-xl transition-shadow duration-500">
             <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none text-indigo-500 group-hover:scale-110 transition-transform duration-700">
               <BrainCircuit className="w-64 h-64" />
             </div>
             
             <h2 className="text-2xl font-black mb-6 text-slate-800 flex items-center gap-3">
               <div className="p-2.5 bg-indigo-100 rounded-2xl"><Sparkles className="w-6 h-6 text-indigo-600" /></div> Phân tích của AI
             </h2>
             
             <div className="prose prose-indigo max-w-none text-slate-600 font-medium leading-relaxed">
               {result.feedback ? (
                 <ReactMarkdown>{result.feedback}</ReactMarkdown>
               ) : (
                 <p>Hệ thống ghi nhận kết quả tốt. Hãy tiếp tục duy trì phong độ và ôn tập định kỳ để ghi nhớ kiến thức lâu hơn.</p>
               )}
             </div>
           </div>

           <div className="flex flex-col sm:flex-row gap-4">
             <button 
               onClick={() => navigate(`/quiz/${docId}`)}
               className="flex-1 px-8 py-5 rounded-[2rem] bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center gap-3 transition-all active:scale-95 text-lg border-b-4 border-slate-200"
             >
               <RotateCcw className="w-6 h-6" /> Thử sức lại
             </button>
             <button 
               onClick={() => navigate('/lessons')}
               className="flex-1 px-10 py-5 rounded-[2rem] bg-slate-900 text-white font-black flex items-center justify-center gap-4 transition-all shadow-xl hover:shadow-indigo-500/20 active:scale-95 text-lg"
             >
               Tiếp tục học tập <ArrowRight className="w-7 h-7" />
             </button>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-emerald-500 rounded-[3rem] p-10 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <CheckCircle2 className="w-12 h-12 mb-6" />
              <h3 className="text-2xl font-black mb-2 tracking-tight">Kỹ năng đạt được</h3>
              <p className="text-emerald-50/80 font-bold text-sm uppercase tracking-widest mb-6">Mastery Level</p>
              <div className="text-6xl font-black tracking-tighter mb-4">{percent}%</div>
              <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${percent}%` }}
                   className="h-full bg-white"
                 />
              </div>
           </div>

           <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6">
                 <Target className="w-8 h-8 text-indigo-500" />
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-2">Lời khuyên</h4>
              <p className="text-slate-400 font-medium text-sm leading-relaxed">
                 {percent >= 90 
                   ? "Thật không thể tin được! Bạn đã làm chủ hoàn toàn kiến thức này. Hãy chuyển sang tài liệu tiếp theo."
                   : percent >= 70
                   ? "Phong độ rất tốt. Hãy làm thêm một bài Quiz nữa để đạt điểm số tuyệt đối nhé!"
                   : "Đừng nản chí! Hãy xem lại các bài học con để hiểu rõ hơn những phần còn vướng mắc."
                 }
              </p>
           </div>
        </div>
      </div>
      
      <div className="pb-20" />
    </motion.div>
  );
}
