import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, FileText, Clock, GraduationCap, ChevronRight, Plus, Layers } from 'lucide-react';
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-7 lg:p-10 min-h-full flex flex-col gap-7"
    >
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Layers className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-orange-600">Lộ trình học tập</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Bài học của bạn</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-md">
            {lessons.length > 0
              ? `${lessons.length} lộ trình đang được Roboki cá nhân hóa cho bạn.`
              : 'Tải lên tài liệu để Roboki tạo lộ trình học tập cho bạn.'}
          </p>
        </div>

        <button
          onClick={() => navigate('/documents')}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tạo bài học mới
        </button>
      </header>

      {lessons.length === 0 ? (
        <div className="flex-1 min-h-[360px] border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center bg-white">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
            <BookOpen className="w-7 h-7 text-violet-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-2">Chưa có bài học nào</h3>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
            Upload tài liệu PDF, DOCX hoặc TXT và Roboki sẽ tạo lộ trình học tập thông minh cho bạn.
          </p>
          <button
            onClick={() => navigate('/documents')}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            Tải lên tài liệu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
          <AnimatePresence mode="popLayout">
            {lessons.map((lesson, idx) => (
              <motion.div
                key={lesson.documentId || idx}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => navigate(`/lesson/${lesson.documentId}`)}
                className="group cursor-pointer bg-white border border-slate-100 rounded-2xl p-6 hover:border-slate-200 hover:shadow-md transition-all duration-200 flex flex-col h-full"
              >
                {/* Card top */}
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:bg-orange-50 transition-colors">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <p className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1.5 truncate">
                    <FileText className="w-3 h-3 flex-shrink-0" />
                    {getDocName(lesson.documentId)}
                  </p>
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-violet-600 transition-colors leading-snug mb-3 line-clamp-2">
                    {lesson.title || 'Bài học'}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {(lesson.content || '').slice(0, 140).replace(/[#*_`]/g, '')}…
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-4">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lesson.createdAt ? new Date(lesson.createdAt).toLocaleDateString('vi-VN') : 'Mới đây'}
                  </span>
                  <GraduationCap className="w-4 h-4 text-slate-200 group-hover:text-violet-300 transition-colors" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
