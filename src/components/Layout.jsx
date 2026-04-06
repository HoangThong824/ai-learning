import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, BookOpen, BrainCircuit, Settings as SettingsIcon, Sprout, Bell, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { hasStudiedToday, getSettings } from '../persistence/storage';
import ReminderBanner from './ReminderBanner';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'Documents', path: '/documents' },
  { icon: BookOpen, label: 'Lessons', path: '/lessons' },
  { icon: BrainCircuit, label: 'Quizzes', path: '/quizzes' },
  { icon: History, label: 'History', path: '/history' },
  { icon: SettingsIcon, label: 'Settings', path: '/settings' },
];

export default function Layout() {
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    // Check if studied today and handle reminders
    const checkStudyStatus = () => {
      const settings = getSettings();
      const studied = hasStudiedToday();

      if (!settings.reminderEnabled) {
        setShowReminder(false);
        return;
      }

      // Set banner visibility: show immediately if not studied today
      if (!studied) {
        setShowReminder(true);
      } else {
        setShowReminder(false);
      }

      // Parse reminder time (HH:mm) for push notification logic
      const [remHour, remMin] = settings.reminderTime.split(':').map(Number);
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      // Should show push notification if:
      // 1. Not studied today
      // 2. Current time >= reminder time
      const isPastReminderTime = currentHour > remHour || (currentHour === remHour && currentMin >= remMin);

      if (!studied && isPastReminderTime) {
        // Push notification logic
        if ('Notification' in window && Notification.permission === 'granted') {
          // Only show notification once per day at the exact reminder time or shortly after
          // We can use a ref or session storage to avoid spamming if checked multiple times
          const lastNotifiedKey = 'ala_last_push_notification';
          const lastNotifiedDate = localStorage.getItem(lastNotifiedKey);
          const today = new Date().toDateString();

          if (lastNotifiedDate !== today) {
            const notification = new Notification('AI Learning Assistant', {
              body: 'Đã đến giờ học rồi! Hôm nay bạn chưa có hoạt động nào. Hãy giữ vững phong độ nhé!',
              icon: '/favicon.svg',
              badge: '/favicon.svg',
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

    // Check periodically (every minute) for time-based reminders
    const interval = setInterval(checkStudyStatus, 60000);

    // Listen for study activity and settings updates
    window.addEventListener('study-activity', checkStudyStatus);
    window.addEventListener('settings-updated', checkStudyStatus);

    // Request Notification permission
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
    <div className="min-h-screen flex overflow-hidden selection:bg-indigo-500/30 font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-pink-300/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-yellow-300/30 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', type: 'spring', bounce: 0.4 }}
        className="relative z-10 w-64 m-4 rounded-[2rem] border border-white/50 bg-white/80 backdrop-blur-xl flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30 transform hover:scale-110 transition-transform duration-300">
            <BrainCircuit className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 tracking-tight flex items-center gap-2">
            AI Learn <Sprout className="w-6 h-6 text-emerald-500" />
          </h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-3">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-500 transform hover:scale-[1.05] ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold' 
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent font-semibold'
                }`
              }
            >
              <div className={`transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[1rem] tracking-tight">{item.label}</span>
              {item.path === '/' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
            </NavLink>
          ))}
        </nav>
      </motion.aside>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col p-4 pl-0 w-full h-screen overflow-hidden">
        <AnimatePresence>
          {showReminder && (
            <ReminderBanner onClose={() => setShowReminder(false)} />
          )}
        </AnimatePresence>
        <div className="flex-1 w-full h-full rounded-[2rem] border border-white/60 bg-white/70 backdrop-blur-md overflow-y-auto custom-scrollbar relative shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
