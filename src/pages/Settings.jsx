import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Save, ShieldCheck, CheckCircle2, AlertCircle, Settings as SettingsIcon, Bell, ChevronDown } from 'lucide-react';
import { getSettings, saveSettings } from '../persistence/storage';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('openai');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [saveStatus, setSaveStatus] = useState(null); // null | 'success' | 'error'

  useEffect(() => {
    const settings = getSettings();
    if (settings.apiKey) setApiKey(settings.apiKey);
    if (settings.aiProvider) setAiProvider(settings.aiProvider);
    if (settings.reminderEnabled !== undefined) setReminderEnabled(settings.reminderEnabled);
    if (settings.reminderTime) setReminderTime(settings.reminderTime);
  }, []);

  const handleSave = () => {
    try {
      if (!apiKey.trim()) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }

      if (reminderEnabled && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      saveSettings({ apiKey: apiKey.trim(), aiProvider, reminderEnabled, reminderTime });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-7 lg:p-10 min-h-full flex flex-col gap-6 max-w-2xl"
    >
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-1.5">
          <SettingsIcon className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Cấu hình</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Cài đặt</h1>
        <p className="text-sm text-slate-400 mt-1">Quản lý API key và tuỳ chỉnh trải nghiệm học tập</p>
      </header>

      <div className="space-y-5 pb-10">
        {/* AI Config section has been moved to server-side proxy for security */}

        {/* Reminder config */}
        <section className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Nhắc nhở học tập</h2>
              <p className="text-xs text-slate-400">Nhận thông báo để duy trì chuỗi học đều đặn</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Bật nhắc nhở</p>
                <p className="text-xs text-slate-400 mt-0.5">Gửi thông báo đẩy khi đến giờ học</p>
              </div>
              <button
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${reminderEnabled ? 'bg-orange-500' : 'bg-slate-200'}`}
              >
                <motion.div
                  animate={{ x: reminderEnabled ? 22 : 2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                />
              </button>
            </div>

            {/* Time picker */}
            <AnimatePresence>
              {reminderEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs font-medium text-slate-600 mb-2">Thời gian thông báo</label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white transition-colors"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Save row */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-h-[20px]">
            <AnimatePresence mode="wait">
              {saveStatus === 'success' && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-sm text-emerald-600"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Đã lưu thành công
                </motion.p>
              )}
              {saveStatus === 'error' && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-sm text-red-500"
                >
                  <AlertCircle className="w-4 h-4" />
                  Vui lòng nhập API Key
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Save className="w-4 h-4" />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </motion.div>
  );
}
