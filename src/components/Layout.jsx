import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, BookOpen, Settings as SettingsIcon, History, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { hasStudiedToday, getSettings } from '../persistence/storage';
import ReminderBanner from './ReminderBanner';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'Tài liệu', path: '/documents' },
  { icon: BookOpen, label: 'Bài học', path: '/lessons' },
  { icon: GraduationCap, label: 'Quizzes', path: '/quizzes' },
  { icon: History, label: 'Lịch sử', path: '/history' },
  { icon: SettingsIcon, label: 'Cài đặt', path: '/settings' },
];

export default function Layout() {
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    const checkStudyStatus = () => {
      const settings = getSettings();
      const studied = hasStudiedToday();

      if (!settings.reminderEnabled) {
        setShowReminder(false);
        return;
      }

      if (!studied) {
        setShowReminder(true);
      } else {
        setShowReminder(false);
      }

      const [remHour, remMin] = settings.reminderTime.split(':').map(Number);
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      const isPastReminderTime = currentHour > remHour || (currentHour === remHour && currentMin >= remMin);

      if (!studied && isPastReminderTime) {
        if ('Notification' in window && Notification.permission === 'granted') {
          const lastNotifiedKey = 'ala_last_push_notification';
          const lastNotifiedDate = localStorage.getItem(lastNotifiedKey);
          const today = new Date().toDateString();

          if (lastNotifiedDate !== today) {
            const notification = new Notification('Roboki Gia Sư', {
              body: 'Đã đến giờ học rồi! Hôm nay bạn chưa có hoạt động nào. Hãy giữ vững phong độ nhé!',
              icon: '/src/assets/logo.svg',
              badge: '/src/assets/logo.svg',
              tag: 'study-reminder'
            });

            notification.onclick = () => {
              window.focus();
              notification.close();
            };

            localStorage.setItem(lastNotifiedKey, today);
          }
        }
      }
    };

    checkStudyStatus();
    const interval = setInterval(checkStudyStatus, 60000);
    window.addEventListener('study-activity', checkStudyStatus);
    window.addEventListener('settings-updated', checkStudyStatus);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('study-activity', checkStudyStatus);
      window.removeEventListener('settings-updated', checkStudyStatus);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen flex font-sans bg-[#f5f5f0] text-slate-900">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0"
      >
        {/* Logo */}
        <div className="px-6 py-7 flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
            <img src="/src/assets/logo.svg" alt="Roboki Logo" className="w-5 h-5 object-contain brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-slate-900 leading-none">Roboki</h1>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-none">Gia sư AI</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-medium text-slate-400 px-3 pt-2 pb-2 tracking-wider">MENU</p>
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                  <span className={`text-[13px] font-medium ${isActive ? 'text-orange-700 font-semibold' : ''}`}>
                    {item.label}
                  </span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom hint */}
        <div className="px-4 py-5 border-t border-slate-100">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100/70">
            <p className="text-xs font-semibold text-orange-700 mb-1">Mẹo học tập</p>
            <p className="text-[11px] text-orange-600/80 leading-relaxed">Ôn tập 15 phút mỗi ngày hiệu quả hơn nhồi nhét 2 tiếng một lần.</p>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full min-h-screen bg-[#f5f5f0] relative overflow-y-auto">
        <AnimatePresence>
          {showReminder && (
            <div className="shrink-0">
              <ReminderBanner onClose={() => setShowReminder(false)} />
            </div>
          )}
        </AnimatePresence>
        <div className="flex-1 w-full relative overflow-y-auto custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
