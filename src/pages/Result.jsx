import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, Trophy, ArrowRight, RotateCcw,
  Calendar, CheckCircle2, AlertCircle, Loader2, ChevronLeft,
  BookOpen
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
          const allResults = getQuizResults();
          const docResults = allResults.filter(r => r.documentId === docId);
          if (docResults.length > 0) {
            setResult(docResults[docResults.length - 1]);
          }
        }
      } catch (err) {
        console.error('Error loading result:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadResult();
  }, [docId, passedResult, passedFeedback]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 min-h-screen">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-sm text-slate-400">Đang tải kết quả…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 min-h-screen">
        <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mb-5">
          <AlertCircle className="w-7 h-7 text-slate-300" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Không tìm thấy kết quả</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-xs">Có vẻ như bạn chưa làm quiz nào cho tài liệu này.</p>
        <button
          onClick={() => navigate('/quizzes')}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Đến trang Quiz
        </button>
      </div>
    );
  }

  const percent = Math.round((result.score / result.total) * 100);
  const isGood = percent >= 70;

  const scoreColor = isGood ? 'text-emerald-600' : 'text-rose-500';
  const scoreBg = isGood ? 'bg-emerald-500' : 'bg-rose-500';

  const advice =
    percent >= 90
      ? 'Xuất sắc! Bạn đã nắm vững hoàn toàn phần kiến thức này rồi.'
      : percent >= 70
      ? 'Kết quả tốt. Ôn thêm một lần nữa để củng cố chắc hơn nhé!'
      : 'Đừng nản! Xem lại bài học và thử lại — bạn sẽ làm được.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-7 lg:p-10 min-h-full flex flex-col gap-7 max-w-5xl mx-auto"
    >
      {/* Top nav */}
      <header className="flex items-center justify-between">
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Lịch sử
        </button>
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(result.timestamp).toLocaleDateString('vi-VN')}
        </span>
      </header>

      {/* Hero score */}
      <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col md:flex-row items-center gap-8">
        {/* Big score circle */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className={`relative w-28 h-28 rounded-full ${isGood ? 'bg-emerald-50' : 'bg-rose-50'} flex items-center justify-center`}>
            <span className={`text-4xl font-bold ${scoreColor}`}>{percent}%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {result.score}/{result.total} câu đúng
          </p>
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium mb-3 ${isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
            {isGood ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {isGood ? 'Vượt qua' : 'Cần cải thiện'}
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-1">
            {isGood ? 'Hoàn thành tốt!' : 'Hãy thử lại nhé!'}
          </h1>
          {doc && (
            <p className="text-sm text-slate-400 flex items-center gap-1.5 justify-center md:justify-start">
              <BookOpen className="w-3.5 h-3.5" />
              {doc.filename}
            </p>
          )}
          <p className="text-sm text-slate-500 mt-3 leading-relaxed max-w-md">{advice}</p>
        </div>

        {/* Score bar */}
        <div className="flex-shrink-0 w-full md:w-32">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full ${scoreBg} rounded-full`}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5 text-center">{percent}% hoàn thành</p>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
        {/* Feedback */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-slate-800">Nhận xét từ Roboki</h2>
            </div>
            <div className="prose prose-slate prose-sm max-w-none text-slate-600">
              {result.feedback ? (
                <ReactMarkdown>{result.feedback}</ReactMarkdown>
              ) : (
                <p>Hệ thống ghi nhận kết quả. Hãy tiếp tục duy trì thói quen học tập hàng ngày để cải thiện hơn nữa.</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={() => navigate(`/quiz/${docId}`)}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:border-slate-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Làm lại
            </button>
            <button
              onClick={() => navigate('/lessons')}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Tiếp tục học
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Side stats */}
        <div className="space-y-4">
          <div className={`rounded-2xl p-6 text-white ${isGood ? 'bg-emerald-500' : 'bg-orange-500'}`}>
            <p className="text-xs font-medium opacity-80 mb-1">Điểm số</p>
            <div className="text-5xl font-bold mb-1">{result.score}</div>
            <p className="text-sm opacity-70">/ {result.total} câu hỏi</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs text-slate-400 mb-1">Tỉ lệ đúng</p>
            <p className={`text-2xl font-semibold mb-3 ${scoreColor}`}>{percent}%</p>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                className={`h-full ${scoreBg} rounded-full`}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
