import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, FileText, Activity, BrainCircuit,
  ChevronRight, TrendingUp, Clock, Award, Star,
  Rocket, Sparkles, FileStack, Trophy, Sprout, GraduationCap, Flame
} from 'lucide-react';
import { getAllDocuments } from '../persistence/db';
import { getLessonOutlines, getQuizzes, getQuizResults, getUserLevel, getStats } from '../persistence/storage';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    docs: 0,
    lessons: 0,
    quizzes: 0,
    avgScore: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [levelInfo, setLevelInfo] = useState({
    rank: 'Khởi đầu',
    progress: 0,
    icon: 'Sprout',
    color: 'from-blue-400 to-cyan-500',
    nextRank: '...'
  });
  const [streak, setStreak] = useState(0);

  const IconMap = {
    Sprout,
    BookOpen,
    Sparkles,
    GraduationCap,
    Trophy
  };

  const LevelIcon = IconMap[levelInfo.icon] || Sprout;

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

        setStats({
          docs: docs.length,
          lessons: lessons.length,
          quizzes: quizzes.length,
          avgScore: Math.round(avg)
        });

        // Mix and sort recent activity (Quizzes and Lessons)
        const activity = [
          ...lessons.map(l => ({ ...l, type: 'lesson' })),
          ...results.map(r => ({ ...r, type: 'quiz' }))
        ].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
          .slice(0, 5);

        setRecentActivity(activity);

        // Fetch User Level
        const level = getUserLevel();
        setLevelInfo(level);

        // Fetch Streak
        const stats = getStats();
        setStreak(stats.streak);
      } catch (err) {
        console.error("Dashboard data error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 lg:p-12 h-full flex flex-col gap-10 bg-slate-50/30"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2 flex items-center gap-4">
            Chào mừng trở lại! <Sparkles className="w-10 h-10 text-amber-500 animate-pulse" />
          </h1>
          <p className="text-slate-400 font-bold text-lg uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Tổng quan tiến trình học tập của bạn
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-6 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${levelInfo.color} flex items-center justify-center text-white shadow-sm shadow-indigo-500/10`}>
              <LevelIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cấp độ</p>
              <p className="font-bold text-slate-700">{levelInfo.rank}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard
          icon={<FileText className="w-7 h-7" />}
          title="Tài liệu"
          value={stats.docs}
          color="from-blue-500 to-cyan-400"
          label="TỔNG SỐ FILE"
          onClick={() => navigate('/documents')}
        />
        <StatCard
          icon={<BookOpen className="w-7 h-7" />}
          title="Bài học AI"
          value={stats.lessons}
          color="from-indigo-500 to-purple-500"
          label="ĐÃ TẠO"
          onClick={() => navigate('/lessons')}
        />
        <StatCard
          icon={<BrainCircuit className="w-7 h-7" />}
          title="Bài tập Quiz"
          value={stats.quizzes}
          color="from-rose-500 to-orange-400"
          label="THỬ THÁCH"
          onClick={() => navigate('/quizzes')}
        />
        <StatCard
          icon={<Activity className="w-7 h-7" />}
          title="Điểm số TB"
          value={`${stats.avgScore}%`}
          color="from-emerald-500 to-teal-400"
          label="HIỆU SUẤT"
          onClick={() => navigate('/history')}
        />
      </div>

      {/* Content Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 flex-1">

        {/* Recent Activity */}
        <div className="xl:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
              <Clock className="w-6 h-6 text-indigo-500" /> Hoạt động Gần đây
            </h2>
            <button onClick={() => navigate('/history')} className="text-sm font-black text-indigo-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
              Xem tất cả
            </button>
          </div>

          <div className="flex-1 space-y-4">
            <AnimatePresence mode="popLayout">
              {recentActivity.length > 0 ? (
                recentActivity.map((act, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex items-center justify-between cursor-pointer"
                    onClick={() => navigate(act.type === 'lesson' ? `/lesson/${act.documentId}` : `/quiz/${act.documentId}`)}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${act.type === 'lesson' ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'
                        }`}>
                        {act.type === 'lesson' ? <BookOpen className="w-7 h-7" /> : <BrainCircuit className="w-7 h-7" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {act.type === 'lesson' ? 'BÀI HỌC MỚI' : 'HOÀN THÀNH QUIZ'}
                        </p>
                        <h4 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
                          {act.title || `Kết quả bài Quiz #${act.documentId}`}
                        </h4>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                          {new Date(act.timestamp || act.createdAt).toLocaleDateString('vi-VN')} - {new Date(act.timestamp || act.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {act.type === 'quiz' && (
                      <div className="text-right px-6 border-l border-slate-100 hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kết quả</p>
                        <p className="text-xl font-black text-emerald-500">{act.score}/{act.total}</p>
                      </div>
                    )}
                    <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-indigo-400 transition-colors group-hover:translate-x-1" />
                  </motion.div>
                ))
              ) : (
                <div className="h-full min-h-[300px] border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center bg-white/50 backdrop-blur-sm">
                  <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
                    <FileStack className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter mb-2">Chưa có hoạt động nào</h3>
                  <p className="text-slate-300 font-bold text-sm max-w-xs leading-relaxed">Hãy tải tài liệu và bắt đầu tạo bài học để thấy tiến trình của bạn ở đây nhé!</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Level / Award Card */}
        <div className="flex flex-col gap-8">
          <div className="p-10 rounded-[3rem] bg-slate-900 text-white relative overflow-hidden shadow-2xl group cursor-pointer" onClick={() => navigate('/history')}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10">
              <LevelIcon className="w-12 h-12 text-indigo-400 mb-6" />
              <h3 className="text-3xl font-black tracking-tight mb-4">{levelInfo.rank}</h3>
              <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                {levelInfo.points > 100
                  ? "Bạn đã đạt đến đỉnh cao kiến thức! Hãy tiếp tục duy trì phong độ xuất sắc này."
                  : `Bạn đang trên con đường trở thành ${levelInfo.nextRank}. Chỉ còn một chút nữa thôi!`}
              </p>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Tiến độ cấp độ</span>
                  <span className="text-2xl font-black tracking-tight">{levelInfo.progress}%</span>
                </div>
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelInfo.progress}%` }}
                    className={`h-full bg-gradient-to-r ${levelInfo.color} rounded-full`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Streak Card */}
          <div className="p-8 rounded-[3rem] bg-orange-500 text-white relative overflow-hidden shadow-xl shadow-orange-500/10 group cursor-pointer" onClick={() => navigate('/history')}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-100 mb-1">Chuỗi học tập</p>
                <h3 className="text-3xl font-black tracking-tight">{streak} ngày liên tiếp</h3>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Flame className="w-8 h-8 text-white fill-white animate-pulse" />
              </div>
            </div>
          </div>

          {/* Quick Action? */}
          <div className="p-10 rounded-[3rem] bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-transform cursor-pointer group" onClick={() => navigate('/documents')}>
            <h3 className="text-2xl font-black mb-2 tracking-tight flex items-center gap-3">
              Học ngay bây giờ <BookOpen className="w-6 h-6" />
            </h3>
            <p className="text-indigo-100 font-bold text-sm opacity-80 uppercase tracking-widest flex items-center gap-2">
              BẮT ĐẦU TỪ TÀI LIỆU CỦA BẠN <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

function StatCard({ icon, title, value, color, label, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      onClick={onClick}
      className={`p-8 rounded-[2.5rem] border border-white bg-white shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.1)] transition-all duration-500 relative overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full bg-gradient-to-br ${color} opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-150 transition-all duration-700`} />

      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-6 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 relative z-10`}>
        {icon}
      </div>

      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">
        {label}
      </span>
      <h3 className="text-slate-500 font-bold text-lg mb-1">{title}</h3>
      <p className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{value}</p>
    </motion.div>
  );
}
