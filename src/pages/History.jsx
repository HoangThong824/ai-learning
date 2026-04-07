import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History as HistoryIcon,
  BookOpen,
  ChevronRight,
  Search,
  Trash2,
  Calendar,
  AlertCircle,
  Target,
} from 'lucide-react';
import { getLessonOutlines, getQuizResults, storage, Keys } from '../persistence/storage';
import { useNavigate } from 'react-router-dom';

export default function History() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = () => {
    setIsLoading(true);
    try {
      const lessons = getLessonOutlines();
      const results = getQuizResults();
      const allActivities = [
        ...lessons.map(l => ({ ...l, type: 'lesson' })),
        ...results.map(r => ({ ...r, type: 'quiz' }))
      ].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
      setActivities(allActivities);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    storage.set(Keys.LESSON_OUTLINES, []);
    storage.set(Keys.QUIZ_RESULTS, []);
    setActivities([]);
    setShowConfirmClear(false);
  };

  const filteredActivities = activities.filter(act => {
    const matchesFilter = filterType === 'all' || act.type === filterType;
    const title = (act.title || `Kết quả bài Quiz #${act.documentId}`).toLowerCase();
    const matchesSearch = title.includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const lessonCount = activities.filter(a => a.type === 'lesson').length;
  const quizCount = activities.filter(a => a.type === 'quiz').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-7 lg:p-10 min-h-full flex flex-col gap-6"
    >
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <HistoryIcon className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Hành trình học tập</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Lịch sử hoạt động</h1>
        </div>

        {activities.length > 0 && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-500 hover:bg-red-50 text-sm font-medium transition-colors border border-red-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa lịch sử
          </button>
        )}
      </header>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm hoạt động..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-300 transition-colors"
          />
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 flex-shrink-0">
          {[
            { key: 'all', label: 'Tất cả', count: activities.length },
            { key: 'lesson', label: 'Bài học', count: lessonCount },
            { key: 'quiz', label: 'Quiz', count: quizCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                filterType === tab.key
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${filterType === tab.key ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity list */}
      <div className="flex-1 pb-10">
        <AnimatePresence mode="popLayout">
          {filteredActivities.length > 0 ? (
            <div className="space-y-2.5">
              {filteredActivities.map((act, idx) => (
                <ActivityCard
                  key={`${act.type}-${act.documentId}-${idx}`}
                  activity={act}
                  idx={idx}
                  onClick={() => navigate(act.type === 'lesson' ? `/lesson/${act.documentId}` : `/quiz/${act.documentId}`)}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-h-[280px] flex flex-col items-center justify-center text-center bg-white border border-dashed border-slate-200 rounded-2xl p-10"
            >
              <HistoryIcon className="w-8 h-8 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">
                {activities.length === 0 ? 'Chưa có hoạt động nào' : 'Không tìm thấy kết quả'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activities.length === 0
                  ? 'Bắt đầu học để thấy lịch sử tại đây'
                  : 'Thử từ khoá tìm kiếm khác'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm clear modal */}
      <AnimatePresence>
        {showConfirmClear && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmClear(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-2xl p-7 shadow-xl border border-slate-100"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-5">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Xóa toàn bộ lịch sử?</h3>
                <p className="text-sm text-slate-400 mb-7 leading-relaxed">
                  Tất cả bài học và kết quả quiz sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    Xóa tất cả
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActivityCard({ activity, idx, onClick }) {
  const isLesson = activity.type === 'lesson';
  const dateObj = new Date(activity.timestamp || activity.createdAt);
  const percent = !isLesson ? Math.round((activity.score / activity.total) * 100) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: idx * 0.03 }}
      onClick={onClick}
      className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer"
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isLesson ? 'bg-violet-50 text-violet-500' : 'bg-emerald-50 text-emerald-500'
      }`}>
        {isLesson ? <BookOpen className="w-4 h-4" /> : <Target className="w-4 h-4" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            isLesson ? 'bg-violet-50 text-violet-500' : 'bg-emerald-50 text-emerald-600'
          }`}>
            {isLesson ? 'Bài học' : 'Quiz'}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {dateObj.toLocaleDateString('vi-VN')}
          </span>
        </div>
        <h4 className="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900 transition-colors">
          {activity.title || `Kết quả Quiz #${activity.documentId}`}
        </h4>
      </div>

      {/* Score */}
      {!isLesson && (
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-xs text-slate-400 mb-0.5">Điểm</p>
          <p className={`text-sm font-semibold ${percent >= 70 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {activity.score}/{activity.total}
          </p>
        </div>
      )}

      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </motion.div>
  );
}
