import { motion } from 'framer-motion';
import { Bell, X, ArrowRight, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReminderBanner({ onClose }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 28 }}
      className="w-full bg-orange-500 shrink-0 overflow-hidden"
    >
      <div className="px-5 py-3 flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-none">
              Hôm nay bạn chưa học gì!
            </p>
            <p className="text-xs text-orange-100 mt-0.5 hidden sm:block truncate">
              Chỉ 15 phút mỗi ngày — hãy duy trì chuỗi học của bạn.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-white/15 rounded-lg flex-shrink-0">
            <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
            <span className="text-xs font-medium text-white">Duy trì streak</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/lessons')}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-orange-600 text-xs font-semibold rounded-lg hover:bg-orange-50 transition-colors shadow-sm"
          >
            Học ngay
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
