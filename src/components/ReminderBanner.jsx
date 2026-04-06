import { motion } from 'framer-motion';
import { Bell, X, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReminderBanner({ onClose }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mx-6 mt-4 mb-2 p-4 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl shadow-indigo-500/20 flex items-center justify-between gap-4 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
      
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center animate-bounce shadow-lg shadow-black/5">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <div>
          <h4 className="font-black text-lg tracking-tight flex items-center gap-2">
            Đã đến lúc học rồi! <Sparkles className="w-4 h-4 text-yellow-300" />
          </h4>
          <p className="text-white/80 text-sm font-medium">Hôm nay bạn chưa có hoạt động nào. Hãy giữ vững phong độ nhé!</p>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <button
          onClick={() => navigate('/lessons')}
          className="px-5 py-2.5 rounded-xl bg-white text-indigo-600 font-black text-sm shadow-lg hover:shadow-indigo-500/10 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
        >
          Học ngay <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl hover:bg-white/20 transition-colors text-white/70 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
