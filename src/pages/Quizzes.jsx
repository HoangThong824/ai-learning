import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, FileText, ChevronRight, Target, Award, BookOpen } from 'lucide-react';
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

  const getBestScore = (docId, chunkId) => {
    const docResults = results.filter(r => 
      r.documentId === docId && 
      (chunkId ? r.chunkId === chunkId : true)
    );
    if (docResults.length === 0) return null;
    return Math.max(...docResults.map(r => (r.score / r.total) * 100));
  };

  const getAttemptCount = (docId, chunkId) => {
    return results.filter(r => 
      r.documentId === docId && 
      (chunkId ? r.chunkId === chunkId : true)
    ).length;
  };

  // Group quizzes by document to show only one unified quiz per lesson
  const uniqueDocIds = [...new Set(quizzes.map(q => q.documentId))];
  const displayQuizzes = uniqueDocIds.map(docId => {
    const docQuizzes = quizzes.filter(q => q.documentId === docId);
    const totalQuestions = docQuizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0);
    const attempts = getAttemptCount(docId, null);
    const bestScore = getBestScore(docId, null);

    return {
      documentId: docId,
      chunkId: null,
      isUnified: true,
      title: getDocName(docId),
      totalQuestions,
      attempts,
      bestScore
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 lg:p-10 min-h-full flex flex-col gap-6 lg:gap-7"
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Target className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600">Luyện tập</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Bài kiểm tra</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-md">
            {displayQuizzes.length > 0
              ? `Bạn có ${displayQuizzes.length} bộ bài tập tổng hợp để ôn luyện.`
              : 'Hoàn thành bài học để mở khoá các bộ câu hỏi kiểm tra.'}
          </p>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100">
          <div className="text-center">
            <p className="text-xl font-semibold text-slate-900">{displayQuizzes.length}</p>
            <p className="text-xs text-slate-400">bài học</p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div className="text-center">
            <p className="text-xl font-semibold text-slate-900">{results.length}</p>
            <p className="text-xs text-slate-400">lần làm</p>
          </div>
        </div>
      </header>

      {displayQuizzes.length === 0 ? (
        <div className="flex-1 min-h-[360px] border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center bg-white">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
            <Target className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-2">Chưa có quiz nào</h3>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
            Vào mục Bài học, biên soạn kiến thức và Roboki sẽ tự động gộp thành bài thi cho bạn.
          </p>
          <button
            onClick={() => navigate('/lessons')}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            Đến trang bài học
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5 pb-10">
          <AnimatePresence mode="popLayout">
            {displayQuizzes.map((quiz, idx) => {
              const bestScore = quiz.bestScore;
              const attempts = quiz.attempts;

              return (
                <motion.div
                  key={quiz.documentId}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => navigate(`/quiz/${quiz.documentId}`)}
                  className="group cursor-pointer bg-white border border-slate-100 rounded-2xl p-6 hover:border-emerald-200 hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  {/* Card top */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                    {bestScore !== null && (
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${bestScore >= 70 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                        <Award className="w-3 h-3" />
                        {Math.round(bestScore)}%
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <p className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1.5 truncate">
                      <BookOpen className="w-3 h-3 flex-shrink-0" />
                      Học phần tổng hợp
                    </p>
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors leading-snug mb-3 line-clamp-2 break-words">
                      {quiz.title}
                    </h3>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-600 border border-emerald-100">
                        {quiz.totalQuestions} câu hỏi
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 text-xs text-slate-500 border border-slate-100">
                        Trắc nghiệm gộp
                      </span>
                      {attempts > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-50 text-xs text-slate-500 border border-slate-100">
                          {attempts} lần làm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer CTA */}
                  <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {attempts === 0 ? 'Chưa thử lần nào' : `Tốt nhất: ${Math.round(bestScore)}%`}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 group-hover:text-emerald-600 transition-colors">
                      Làm bài ngay
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
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
