import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Play, FileText, CheckCircle2, ChevronRight, Target, Award, Sparkles } from 'lucide-react';
import { getQuizzes, getQuizResults } from '../persistence/storage';
import { getAllDocuments } from '../persistence/db';

export default function Quizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const load = async () => {
      const savedQuizzes = getQuizzes();
      const docs = await getAllDocuments();
      const savedResults = getQuizResults();
      setQuizzes(savedQuizzes || []);
      setDocuments(docs || []);
      setResults(savedResults || []);
    };
    load();
  }, []);

  const getDocName = (docId) => {
    const doc = documents.find(d => d.id === docId);
    return doc?.filename || `Tài liệu #${docId}`;
  };

  const getBestScore = (docId) => {
    const docResults = results.filter(r => r.documentId === docId);
    if (docResults.length === 0) return null;
    return Math.max(...docResults.map(r => (r.score / r.total) * 100));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 lg:p-12 h-full flex flex-col gap-10 bg-slate-50/30"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                 <BrainCircuit className="w-6 h-6 text-rose-600" />
              </div>
              <span className="text-rose-500 font-black tracking-widest uppercase text-xs">Thử thách trí tuệ</span>
           </div>
           <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">
              Luyện tập <br/> & Kiểm tra
           </h1>
           <p className="text-slate-400 font-bold text-lg mt-2 max-w-lg">Vượt qua các bài Quiz trắc nghiệm được cá nhân hóa để củng cố kiến thức của bạn.</p>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng Quiz</p>
              <p className="text-3xl font-black text-slate-900">{quizzes.length}</p>
           </div>
           <div className="w-[1px] h-10 bg-slate-100" />
           <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Target className="w-6 h-6" />
           </div>
        </div>
      </header>

      {quizzes.length === 0 ? (
        <div className="flex-1 min-h-[400px] border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center bg-white/50 backdrop-blur-sm">
          <div className="w-24 h-24 rounded-[2rem] bg-rose-50 flex items-center justify-center mb-6 shadow-inner">
            <BrainCircuit className="w-12 h-12 text-rose-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter mb-2">Chưa có Quiz nào</h3>
          <p className="text-slate-300 font-bold text-sm max-w-xs leading-relaxed mb-8">Hãy vào mục **Bài học** và nhấn **"Tạo bài tập AI"** để hệ thống chuẩn bị thử thách cho bạn!</p>
          <button
            onClick={() => navigate('/lessons')}
            className="px-10 py-5 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-xl hover:shadow-rose-500/10 transition-all transform hover:-translate-y-1 active:scale-95"
          >
            Đi tới Bài học
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
          <AnimatePresence mode="popLayout">
            {quizzes.map((quiz, idx) => {
              const bestScore = getBestScore(quiz.documentId);
              return (
                <motion.div
                  key={quiz.documentId || idx}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate(`/quiz/${quiz.documentId}`)}
                  className="group cursor-pointer bg-white border border-slate-100 rounded-[3rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden flex flex-col"
                >
                  {/* Decoration */}
                  <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-rose-50 opacity-40 group-hover:scale-150 group-hover:opacity-60 transition-all duration-700 blur-2xl" />
                  
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-8">
                       <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/20 group-hover:rotate-6 transition-transform">
                          <Sparkles className="w-8 h-8" />
                       </div>
                       {bestScore !== null && (
                         <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                           <Award className="w-3.5 h-3.5" />
                           CAO NHẤT: {Math.round(bestScore)}%
                         </div>
                       )}
                    </div>

                    <div className="flex-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          {getDocName(quiz.documentId)}
                       </p>
                       <h3 className="text-2xl font-black text-slate-900 group-hover:text-rose-600 transition-colors leading-tight mb-4 tracking-tight">
                          Bài tập Quiz: {getDocName(quiz.documentId)}
                       </h3>
                       <div className="flex items-center gap-2 mb-8">
                          <div className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                             {quiz.questions?.length || 0} CÂU HỎI
                          </div>
                          <div className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                             HỆ MULTIPLE CHOICE
                          </div>
                       </div>
                    </div>

                    <button 
                      onClick={() => navigate(`/quiz/${quiz.documentId}`)}
                      className="relative z-10 w-full py-5 rounded-2xl bg-slate-900 text-white font-black text-sm transition-all flex items-center justify-center gap-3 group/btn overflow-hidden shadow-lg shadow-slate-900/5 hover:scale-[1.02]"
                    >
                      Bắt đầu làm bài
                      <Play className="w-4 h-4 fill-current group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
