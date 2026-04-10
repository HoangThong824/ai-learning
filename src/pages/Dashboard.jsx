import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, FileText, Activity,
  ChevronRight, TrendingUp, Clock, Trophy,
  Target, GraduationCap, Flame, History as HistoryIcon,
} from 'lucide-react';
import { getAllDocuments } from '../persistence/db';
import { getLessonOutlines, getQuizzes, getQuizResults, getUserLevel, getStats } from '../persistence/storage';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ docs: 0, lessons: 0, quizzes: 0, avgScore: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [levelInfo, setLevelInfo] = useState({ rank: 'Khởi đầu', progress: 0, nextRank: '...' });
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const docs = await getAllDocuments();
        const lessons = getLessonOutlines();
        const quizzes = getQuizzes();
        const results = getQuizResults();

        const avg = results.length > 0
          ? results.reduce((acc, r) => acc + (r.score / r.total), 0) / results.length * 100
          : 0;

        setStats({ docs: docs.length, lessons: lessons.length, quizzes: quizzes.length, avgScore: Math.round(avg) });

        const activity = [
          ...lessons.map(l => ({ ...l, type: 'lesson' })),
          ...results.map(r => ({ ...r, type: 'quiz' }))
        ].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)).slice(0, 5);

        setRecentActivity(activity);

        const level = getUserLevel();
        level.color = 'bg-orange-500';
        setLevelInfo(level);

        const st = getStats();
        setStreak(st.streak);
      } catch (err) {
        console.error('Dashboard data error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 lg:p-10 min-h-full flex flex-col gap-6 lg:gap-8"
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-400 mb-1">{greeting()} 👋</p>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">Tổng quan học tập</h1>
        </div>
        <div
          className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-orange-300 transition-colors"
          onClick={() => navigate('/history')}
        >
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 leading-none mb-0.5">Cấp độ</p>
            <p className="text-sm font-semibold text-slate-800 leading-none">{levelInfo.rank}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 ml-1" />
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          icon={<FileText className="w-4 h-4" />}
          label="Tài liệu"
          value={stats.docs}
          sub="tệp đã tải lên"
          onClick={() => navigate('/documents')}
          accent="text-blue-500 bg-blue-50"
        />
        <StatCard
          icon={<BookOpen className="w-4 h-4" />}
          label="Bài học"
          value={stats.lessons}
          sub="lộ trình đang học"
          onClick={() => navigate('/lessons')}
          accent="text-violet-500 bg-violet-50"
        />
        <StatCard
          icon={<Target className="w-4 h-4" />}
          label="Quiz"
          value={stats.quizzes}
          sub="bộ câu hỏi"
          onClick={() => navigate('/quizzes')}
          accent="text-emerald-500 bg-emerald-50"
        />
        <StatCard
          icon={<Activity className="w-4 h-4" />}
          label="Điểm TB"
          value={`${stats.avgScore}%`}
          sub="hiệu suất chung"
          onClick={() => navigate('/history')}
          accent="text-orange-500 bg-orange-50"
        />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6 flex-1 pb-10">
        {/* Recent activity */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Hoạt động gần đây
            </h2>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              Xem tất cả
            </button>
          </div>

          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {recentActivity.length > 0 ? (
                recentActivity.map((act, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer group"
                    onClick={() => {
                      const path = act.type === 'lesson' ? 'lesson' : 'quiz';
                      const chunkSuffix = act.chunkId ? `/${act.chunkId}` : '';
                      const querySuffix = (act.type === 'quiz' && act.chunkId) ? `?chunkId=${act.chunkId}` : '';
                      
                      if (act.type === 'lesson') {
                        navigate(`/lesson/${act.documentId}${chunkSuffix}`);
                      } else {
                        navigate(`/quiz/${act.documentId}${querySuffix}`);
                      }
                    }}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${act.type === 'lesson' ? 'bg-violet-50 text-violet-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {act.type === 'lesson' ? <BookOpen className="w-4.5 h-4.5" /> : <Target className="w-4.5 h-4.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-400 mb-0.5">
                        {act.type === 'lesson' ? 'Bài học' : 'Quiz'}
                      </p>
                      <h4 className="text-sm font-medium text-slate-800 truncate group-hover:text-orange-600 transition-colors">
                        {act.title || `Kết quả Quiz #${act.documentId}`}
                      </h4>
                    </div>
                    {act.type === 'quiz' && (
                      <span className="text-sm font-semibold text-slate-700 ml-2 whitespace-nowrap">
                        {act.score}/{act.total}
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-[11px]">{new Date(act.timestamp || act.createdAt).toLocaleDateString('vi-VN')}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-48 bg-white rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-6">
                  <HistoryIcon className="w-8 h-8 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-500">Chưa có hoạt động nào</p>
                  <p className="text-xs text-slate-400 mt-1">Bắt đầu học để thấy lịch sử tại đây</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Level card */}
          <div
            className="bg-slate-900 rounded-2xl p-6 cursor-pointer hover:bg-slate-800 transition-colors"
            onClick={() => navigate('/history')}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <Trophy className="w-4.5 h-4.5 text-orange-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 leading-none mb-0.5">Cấp độ hiện tại</p>
                <p className="text-sm font-semibold text-white leading-none">{levelInfo.rank}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              {levelInfo.points > 100
                ? 'Bạn đã là một bậc thầy kiến thức thực thụ!'
                : `Còn một chút nữa là tới ${levelInfo.nextRank}!`}
            </p>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] text-slate-500">Tiến độ</span>
                <span className="text-sm font-semibold text-white">{levelInfo.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo.progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-orange-500 rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Streak */}
          <div
            className="bg-orange-500 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:bg-orange-600 transition-colors"
            onClick={() => navigate('/history')}
          >
            <div>
              <p className="text-orange-200 text-xs mb-1">Chuỗi học tập</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white">{streak}</span>
                <span className="text-orange-200 text-sm">ngày</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
              <Flame className="w-6 h-6 text-white fill-white" />
            </div>
          </div>

          {/* Quick start */}
          <button
            onClick={() => navigate('/documents')}
            className="group w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all"
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Bắt đầu học</p>
              <p className="text-xs text-slate-400">Chọn tài liệu để tạo bài học</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-orange-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, sub, onClick, accent }) {
  return (
    <div
      onClick={onClick}
      className="p-4 sm:p-5 rounded-xl bg-white border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer group flex flex-row items-center gap-4 sm:flex-col sm:items-start sm:gap-0"
    >
      <div className={`w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center sm:mb-4 flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none mb-1 sm:mb-0.5">{value}</p>
        <p className="text-[11px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{sub}</p>
      </div>
    </div>
  );
}
