import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Save, ShieldCheck, CheckCircle2, AlertCircle, Settings as SettingsIcon, Bell } from 'lucide-react';
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

      // Request notification permission on save if enabled
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 h-full max-w-3xl"
    >
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-10 h-10 text-indigo-500" /> Cài đặt
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Quản lý cấu hình AI và nhắc nhở học tập của bạn.</p>
      </header>

      <div className="space-y-8 pb-20">
        {/* API Settings Module */}
        <section className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden">
          <div className="absolute -right-10 -top-10 text-indigo-500/5 pointer-events-none">
            <ShieldCheck className="w-64 h-64" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md">
                <Key className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Cấu hình AI</h2>
                <p className="text-sm text-slate-500 mt-0.5">Kết nối với OpenAI hoặc Anthropic Claude để kích hoạt AI</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Nhà cung cấp AI</label>
                <div className="relative">
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-4 text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all cursor-pointer font-semibold"
                  >
                    <option value="openai">OpenAI (GPT-4o mini)</option>
                    <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={aiProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all font-mono tracking-wider"
                />
                <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  API key được lưu trong browser và không gửi đến bất kỳ server nào ngoài nhà cung cấp AI.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Reminder Settings Module */}
        <section className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden">
          <div className="absolute -right-10 -top-10 text-emerald-500/5 pointer-events-none">
            <Bell className="w-64 h-64" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
                <Bell className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Cài đặt Nhắc nhở</h2>
                <p className="text-sm text-slate-500 mt-0.5">Quản lý các thông báo nhắc nhở học tập hàng ngày</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800">Bật nhắc nhở học tập</h3>
                  <p className="text-xs text-slate-500">Hệ thống sẽ gửi thông báo mỗi ngày để nhắc bạn học tập</p>
                </div>
                <button
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`w-14 h-8 rounded-full transition-all duration-300 relative ${reminderEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
                >
                  <motion.div
                    animate={{ x: reminderEnabled ? 24 : 4 }}
                    className="absolute top-1 left-0 w-6 h-6 rounded-full bg-white shadow-sm"
                  />
                </button>
              </div>

              <AnimatePresence>
                {reminderEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0">
                      <label className="block text-sm font-bold text-slate-600 mb-2">Giờ nhắc nhở hàng ngày</label>
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all font-semibold"
                      />
                      <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Chúng tôi khuyên bạn nên chọn khung giờ buổi tối để dễ duy trì thói quen học tập.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Action Button (Global) */}
        <div className="flex items-center justify-between p-6 bg-white/50 backdrop-blur-md border border-white rounded-[2rem] shadow-lg">
          <AnimatePresence>
            {saveStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-emerald-600 font-semibold"
              >
                <CheckCircle2 className="w-5 h-5" /> Đã lưu thành công!
              </motion.div>
            )}
            {saveStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-rose-500 font-semibold"
              >
                <AlertCircle className="w-5 h-5" /> API Key không được để trống!
              </motion.div>
            )}
            {!saveStatus && <div />}
          </AnimatePresence>

          <button
            onClick={handleSave}
            className="px-12 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-3"
          >
            <Save className="w-6 h-6" /> Lưu tất cả thay đổi
          </button>
        </div>
      </div>
    </motion.div>
  );
}
