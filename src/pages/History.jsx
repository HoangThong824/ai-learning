import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History as HistoryIcon,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Search,
  Filter,
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { getLessonOutlines, getQuizResults, storage, Keys } from '../persistence/storage';
import { useNavigate } from 'react-router-dom';

export default function History() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [filterType, setFilterType] = useState('all'); // all | lesson | quiz
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
      console.error("Error loading history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    // Clear lessons and quiz results
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 lg:p-12 h-full flex flex-col gap-8 bg-slate-50/30"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <HistoryIcon className="w-9 h-9 text-indigo-500" /> Lịch sử Hoạt động
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Xem lại toàn bộ hành trình học tập và kết quả của bạn.</p>
        </div>

        <button
          onClick={() => setShowConfirmClear(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 font-bold transition-all text-sm border border-rose-100"
        >
          <Trash2 className="w-4 h-4" /> Xóa toàn bộ lịch sử
        </button>
      </header>

      {/* Controls: Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Tìm kiếm bài học hoặc kết quả quiz..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-indigo-100 transition-all font-medium text-slate-700"
          />
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
          <FilterButton
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
            label="Tất cả"
            count={activities.length}
          />
          <FilterButton
            active={filterType === 'lesson'}
            onClick={() => setFilterType('lesson')}
            label="Bài học"
            count={activities.filter(a => a.type === 'lesson').length}
          />
          <FilterButton
            active={filterType === 'quiz'}
            onClick={() => setFilterType('quiz')}
            label="Quiz"
            count={activities.filter(a => a.type === 'quiz').length}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredActivities.length > 0 ? (
            <div className="flex flex-col gap-4">
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center mb-6">
                <HistoryIcon className="w-12 h-12 text-indigo-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter mb-2">Không tìm thấy hoạt động nào</h3>
              <p className="text-slate-300 font-bold text-lg max-w-sm leading-relaxed">
                {activities.length === 0
                  ? "Bắt đầu chuyến hành trình học tập của bạn ngay hôm nay bằng cách tạo bài học từ tài liệu!"
                  : "Không có kết quả nào phù hợp với tìm kiếm hoặc bộ lọc của bạn."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmClear && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmClear(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-16 -mt-16" />

              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mb-8">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Xóa tất cả lịch sử?</h3>
                <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                  Hành động này sẽ xóa vĩnh viễn toàn bộ bài học đã tạo và kết quả làm Quiz. Bạn không thể hoàn tác thao tác này.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 px-8 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black tracking-tight hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="flex-1 px-8 py-4 rounded-2xl bg-rose-500 text-white font-black tracking-tight shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95"
                  >
                    Đồng ý xóa
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

function FilterButton({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${active
          ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
          : 'text-slate-400 hover:text-slate-600'
        }`}
    >
      {label}
      <span className={`px-2 py-0.5 rounded-md text-[10px] ${active ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-200/50 text-slate-400'}`}>
        {count}
      </span>
    </button>
  );
}

function ActivityCard({ activity, idx, onClick }) {
  const isLesson = activity.type === 'lesson';
  const dateObj = new Date(activity.timestamp || activity.createdAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: idx * 0.05 }}
      onClick={onClick}
      className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex items-center justify-between cursor-pointer"
    >
      <div className="flex items-center gap-6">
        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3 ${isLesson ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'
          }`}>
          {isLesson ? <BookOpen className="w-8 h-8" /> : <BrainCircuit className="w-8 h-8" />}
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <p className={`text-[10px] font-black uppercase tracking-widest ${isLesson ? 'text-indigo-400' : 'text-rose-400'}`}>
              {isLesson ? 'Bài học AI' : 'Hoàn thành Quiz'}
            </p>
            <div className="w-1 h-1 rounded-full bg-slate-200" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {dateObj.toLocaleDateString('vi-VN')}
            </p>
          </div>
          <h4 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
            {activity.title || `Kết quả bài Quiz #${activity.documentId}`}
          </h4>
          <p className="text-sm text-slate-400 font-bold mt-1.5 flex items-center gap-2">
            Đã thực hiện lúc {dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-10">
        {!isLesson && (
          <div className="text-right px-8 border-r border-slate-100 hidden md:block">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kết quả đạt được</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-emerald-500">{activity.score}</p>
              <p className="text-lg font-black text-slate-300">/ {activity.total}</p>
            </div>
          </div>
        )}
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-all">
          <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
}
