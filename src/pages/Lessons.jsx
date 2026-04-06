import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, ArrowRight, FileText, Clock, BookMarked, GraduationCap, Target } from 'lucide-react';
import { getLessonOutlines } from '../persistence/storage';
import { getAllDocuments } from '../persistence/db';

export default function Lessons() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const load = async () => {
      const saved = getLessonOutlines();
      const docs = await getAllDocuments();
      setLessons(saved || []);
      setDocuments(docs || []);
    };
    load();
  }, []);

  const getDocName = (docId) => {
    const doc = documents.find(d => d.id === docId);
    return doc?.filename || `Tài liệu #${docId}`;
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
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                 <BookMarked className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-emerald-500 font-black tracking-widest uppercase text-xs">Kho kiến thức</span>
           </div>
           <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">
              Bài học AI <br/> của bạn
           </h1>
           <p className="text-slate-400 font-bold text-lg mt-2 max-w-lg">Tổng hợp các lộ trình học tập chuyên sâu đã được AI tinh luyện cho riêng bạn.</p>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng bài học</p>
              <p className="text-3xl font-black text-slate-900">{lessons.length}</p>
           </div>
           <div className="w-[1px] h-10 bg-slate-100" />
           <button 
             onClick={() => navigate('/documents')}
             className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-110 active:scale-95 transition-all"
           >
              <Sparkles className="w-6 h-6" />
           </button>
        </div>
      </header>

      {lessons.length === 0 ? (
        <div className="flex-1 min-h-[400px] border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center bg-white/50 backdrop-blur-sm">
          <div className="w-24 h-24 rounded-[2rem] bg-emerald-50 flex items-center justify-center mb-6">
            <BookOpen className="w-12 h-12 text-emerald-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter mb-2">Chưa có bài học nào</h3>
          <p className="text-slate-300 font-bold text-sm max-w-xs leading-relaxed mb-8">Hãy upload tài liệu và bắt đầu tạo bài giảng đầu tiên bằng sức mạnh của AI nhé!</p>
          <button
            onClick={() => navigate('/documents')}
            className="px-10 py-5 rounded-2xl bg-slate-900 text-white font-black text-lg shadow-xl hover:shadow-emerald-500/10 transition-all transform hover:-translate-y-1 active:scale-95"
          >
            Bắt đầu tạo ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
          <AnimatePresence mode="popLayout">
            {lessons.map((lesson, idx) => (
              <motion.div
                key={lesson.documentId || idx}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/lesson/${lesson.documentId}`)}
                className="group cursor-pointer bg-white border border-slate-100 rounded-[3rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden"
              >
                {/* Decoration */}
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-emerald-50 opacity-40 group-hover:scale-150 group-hover:opacity-60 transition-all duration-700 blur-2xl" />
                
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/20 group-hover:rotate-6 transition-transform">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-all">
                       <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  <div className="flex-1">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        {getDocName(lesson.documentId)}
                     </p>
                     <h3 className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors leading-tight mb-4 tracking-tight">
                        {lesson.title || 'Bài học'}
                     </h3>
                     <p className="text-slate-500 font-medium text-sm line-clamp-3 leading-relaxed mb-8">
                        {lesson.content?.slice(0, 150).replace(/[#*_`]/g, '')}...
                     </p>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
                    <div className="flex items-center gap-4">
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                         <Clock className="w-3.5 h-3.5" />
                         {lesson.createdAt ? new Date(lesson.createdAt).toLocaleDateString('vi-VN') : 'Mới đây'}
                       </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <GraduationCap className="w-5 h-5 text-emerald-100 group-hover:text-emerald-200 transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function ChevronRight({ className }) {
   return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>;
}
