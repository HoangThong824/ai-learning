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

  const getBestScore = (docId) => {
    const docResults = results.filter(r => r.documentId === docId);
    if (docResults.length === 0) return null;
    return Math.max(...docResults.map(r => (r.score / r.total) * 100));
  };

  const getAttemptCount = (docId) => {
    return results.filter(r => r.documentId === docId).length;
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
            <Target className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600">Luyện tập</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Bài kiểm tra</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-md">
            {quizzes.length > 0
              ? `${quizzes.length} bộ câu hỏi đang chờ bạn thử thách.`
              : 'Hoàn thành bài học để mở khoá các bộ câu hỏi kiểm tra.'}
          </p>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100">
          <div className="text-center">
            <p className="text-xl font-semibold text-slate-900">{quizzes.length}</p>
            <p className="text-xs text-slate-400">bộ quiz</p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div className="text-center">
            <p className="text-xl font-semibold text-slate-900">{results.length}</p>
            <p className="text-xs text-slate-400">lần làm</p>
          </div>
        </div>
      </header>

      {quizzes.length === 0 ? (
        <div className="flex-1 min-h-[360px] border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center bg-white">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
            <Target className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-2">Chưa có quiz nào</h3>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
            Vào mục Bài học, chọn một chủ đề và Roboki sẽ tạo câu hỏi kiểm tra cho bạn.
          </p>
          <button
            onClick={() => navigate('/lessons')}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            Đến trang bài học
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
          <AnimatePresence mode="popLayout">
            {quizzes.map((quiz, idx) => {
              const bestScore = getBestScore(quiz.documentId);
              const attempts = getAttemptCount(quiz.documentId);
              const scoreColor = bestScore === null ? '' : bestScore >= 70 ? 'text-emerald-600' : 'text-rose-500';

              return (
                <motion.div
                  key={quiz.documentId || idx}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => navigate(`/quiz/${quiz.documentId}`)}
                  className="group cursor-pointer bg-white border border-slate-100 rounded-2xl p-6 hover:border-slate-200 hover:shadow-md transition-all duration-200 flex flex-col"
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
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      {getDocName(quiz.documentId)}
                    </p>
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors leading-snug mb-3">
                      {quiz.title || getDocName(quiz.documentId)}
                    </h3>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 text-xs text-slate-500 border border-slate-100">
                        {quiz.questions?.length || 0} câu hỏi
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 text-xs text-slate-500 border border-slate-100">
                        Trắc nghiệm
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
                      Làm bài
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
