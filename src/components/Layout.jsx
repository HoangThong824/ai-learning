import { Outlet, NavLink } from 'react-router-dom';
import logoSvg from '../assets/logo.svg';
import { LayoutDashboard, FileText, BookOpen, Settings as SettingsIcon, History, GraduationCap, Menu, X } from 'lucide-react';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
              icon: logoSvg,
              badge: logoSvg,
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

  const SidebarContent = ({ onNavClick }) => (
    <>
      {/* Logo */}
      <div className="px-6 py-7 flex items-center gap-3 border-b border-slate-100">
        <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
          <img src={logoSvg} alt="Roboki Logo" className="w-5 h-5 object-contain brightness-0 invert" />
        </div>
        <div>
          <h1 className="text-[15px] font-semibold text-slate-900 leading-none">Roboki</h1>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-none">Gia sư AI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pt-3">
        <p className="text-[10px] font-medium text-slate-400 px-3 pt-2 pb-2 tracking-wider">MENU</p>
        {sidebarItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${isActive
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
    </>
  );

  return (
    <div className="min-h-screen flex font-sans bg-[#f5f5f0] text-slate-900">

      {/* ===== DESKTOP SIDEBAR (lg+) ===== */}
      <div className="hidden lg:flex w-64 bg-white border-r border-slate-100 flex-col h-screen sticky top-0 shrink-0">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex flex-col h-full"
        >
          <SidebarContent onNavClick={() => { }} />
        </motion.div>
      </div>

      {/* ===== MOBILE / TABLET SIDEBAR OVERLAY ===== */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            />

            {/* Slide-in Sidebar */}
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 h-screen w-64 bg-white flex flex-col z-50 shadow-2xl lg:hidden"
            >
              {/* Close button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent onNavClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== MAIN CONTENT AREA ===== */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#f5f5f0] relative">
        {/* Mobile / Tablet Top Bar */}
        <div className="lg:hidden flex items-center justify-between px-4 h-16 bg-white border-b border-slate-100 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-sm">
                <img src={logoSvg} alt="Roboki Logo" className="w-4.5 h-4.5 object-contain brightness-0 invert" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[14px] font-bold text-slate-900">Roboki</span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-tighter">Gia sư AI</span>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showReminder && (
            <div className="shrink-0">
              <ReminderBanner onClose={() => setShowReminder(false)} />
            </div>
          )}
        </AnimatePresence>

        <div className="flex-1 relative overflow-y-auto custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
