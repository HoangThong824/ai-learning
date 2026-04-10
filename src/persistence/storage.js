// LocalStorage utilities for user settings and metadata

const PREFIX = 'ala_'; // AI Learning Assistant prefix

export const Keys = {
  SETTINGS: `${PREFIX}settings`,
  LESSON_OUTLINES: `${PREFIX}lesson_outlines`,
  QUIZZES: `${PREFIX}quizzes`,
  QUIZ_RESULTS: `${PREFIX}quiz_results`,
  LAST_ACTIVITY: `${PREFIX}last_activity`,
  STREAK: `${PREFIX}streak`,
  LAST_STREAK_DATE: `${PREFIX}last_streak_date`,
  CHAT_TUTOR: `${PREFIX}chat_`,
  USER_PROGRESS: `${PREFIX}progress_`
};

export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading from localStorage (key: ${key}):`, error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error writing to localStorage (key: ${key}):`, error);
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing from localStorage (key: ${key}):`, error);
    }
  }
};

// --- Specific Helplers ---

export const getSettings = () => {
  const defaultSettings = { 
    apiKey: import.meta.env.VITE_DEFAULT_API_KEY || '', 
    aiProvider: import.meta.env.VITE_DEFAULT_AI_PROVIDER || 'openai', 
    theme: 'system',
    reminderEnabled: true,
    reminderTime: '20:00'
  };
  const saved = storage.get(Keys.SETTINGS, defaultSettings);
  
  // If we have saved settings but the apiKey is empty, try the default from env
  if (saved && !saved.apiKey && defaultSettings.apiKey) {
    return { 
      ...saved, 
      apiKey: defaultSettings.apiKey,
      aiProvider: saved.aiProvider || defaultSettings.aiProvider 
    };
  }
  
  // Debug warning for developers
  if (!saved.apiKey && !defaultSettings.apiKey) {
    console.warn('AI Learning Assistant: No API Key found in LocalStorage or VITE_DEFAULT_API_KEY.');
  }
  
  return saved;
};
export const dispatchSettingsUpdate = () => {
  window.dispatchEvent(new CustomEvent('settings-updated'));
};

export const saveSettings = (settings) => {
  const newSettings = { ...getSettings(), ...settings };
  storage.set(Keys.SETTINGS, newSettings);
  dispatchSettingsUpdate();
};

export const getLessonOutlines = () => storage.get(Keys.LESSON_OUTLINES, []);
export const saveLessonOutline = (outline) => {
  const current = getLessonOutlines();
  // Update if exists (matching both docId and chunkId), else add
  const existingIdx = current.findIndex(o => 
    o.documentId === outline.documentId && 
    (outline.chunkId !== undefined ? o.chunkId === outline.chunkId : true)
  );
  if (existingIdx >= 0) {
    current[existingIdx] = outline;
  } else {
    current.push(outline);
  }
  storage.set(Keys.LESSON_OUTLINES, current);
  trackActivity();
};

export const getQuizResults = () => storage.get(Keys.QUIZ_RESULTS, []);
export const saveQuizResult = (result) => {
  const current = getQuizResults();
  current.push({ ...result, timestamp: new Date().toISOString() });
  storage.set(Keys.QUIZ_RESULTS, current);
  trackActivity();
};

export const getQuizzes = () => storage.get(Keys.QUIZZES, []);
export const saveQuiz = (quiz) => {
  const current = getQuizzes();
  // Update if exists (matching both docId and chunkId), else add
  const existingIdx = current.findIndex(q => 
    q.documentId === quiz.documentId && 
    (quiz.chunkId !== undefined ? q.chunkId === quiz.chunkId : true)
  );
  if (existingIdx >= 0) {
    current[existingIdx] = quiz;
  } else {
    current.push(quiz);
  }
  storage.set(Keys.QUIZZES, current);
};

export const getChatHistory = (docId) => storage.get(`${Keys.CHAT_TUTOR}${docId}`, []);
export const saveChatHistory = (docId, messages) => {
  storage.set(`${Keys.CHAT_TUTOR}${docId}`, messages);
};

export const getUserProgress = (docId) => storage.get(`${Keys.USER_PROGRESS}${docId}`, {
  completedSections: [],
  lastSection: null,
  bestQuizScore: 0,
  lastQuizDate: null,
  percentage: 0
});

export const updateUserProgress = (docId, updates) => {
  const current = getUserProgress(docId);
  const next = { ...current, ...updates };
  
  // Custom merge for completedSections (slugs) to ensure uniqueness
  if (updates.completedSections) {
    const combined = [...current.completedSections, ...updates.completedSections];
    next.completedSections = [...new Set(combined)];
  }

  // Custom merge for completedTitles (human readable) to ensure uniqueness
  if (updates.completedTitles) {
    const combinedTitles = [...(current.completedTitles || []), ...updates.completedTitles];
    next.completedTitles = [...new Set(combinedTitles)];
  }

  // Custom merge for missedQuestions to ensure uniqueness and reasonable storage
  if (updates.missedQuestions) {
    const existingMissed = current.missedQuestions || [];
    // Key: question text (simple deduplication)
    const combined = [...existingMissed, ...updates.missedQuestions];
    const unique = [];
    const seen = new Set();
    
    for (const q of combined) {
      if (!seen.has(q.question)) {
        unique.push(q);
        seen.add(q.question);
      }
    }
    
    // Limit to last 50 mistakes
    next.missedQuestions = unique.slice(-50);
  }

  storage.set(`${Keys.USER_PROGRESS}${docId}`, next);
};

/**
 * Returns a human-readable summary of the user's progress for a document.
 */
export const getLearningSummary = (docId) => {
  const progress = getUserProgress(docId);
  const sections = progress.completedTitles?.length > 0 
    ? progress.completedTitles.join(', ') 
    : 'Chưa xem phần nào';
  
  const quizInfo = progress.lastQuizDate 
    ? `Điểm cao nhất: ${progress.bestQuizScore}/${progress.totalQuizQuestions} (Lần cuối: ${new Date(progress.lastQuizDate).toLocaleDateString('vi-VN')})`
    : 'Chưa làm Quiz';

  const missedInfo = progress.missedQuestions?.length > 0
    ? `Có ${progress.missedQuestions.length} câu hỏi từng làm sai cần chú ý.`
    : 'Không có câu hỏi làm sai lưu trong lịch sử.';

  return {
    sectionsSummary: sections,
    quizSummary: quizInfo,
    missedSummary: missedInfo,
    rawProgress: progress
  };
};

export const hasStudiedToday = () => {
  const today = new Date().toDateString();

  // 1. Check last activity timestamp
  const lastActivity = storage.get(Keys.LAST_ACTIVITY);
  if (lastActivity) {
    const activityDate = new Date(lastActivity).toDateString();
    if (activityDate === today) return true;
  }

  // 2. Check quiz results
  const results = getQuizResults();
  const hasQuizToday = results.some(result => {
    const resultDate = new Date(result.timestamp).toDateString();
    return resultDate === today;
  });

  if (hasQuizToday) return true;

  // 3. Check lesson outlines
  const outlines = getLessonOutlines();
  const hasLessonToday = outlines.some(outline => {
    if (!outline.createdAt) return false;
    const lessonDate = new Date(outline.createdAt).toDateString();
    return lessonDate === today;
  });

  return hasLessonToday;
};

/**
 * Calculates current level, points, and progress percentage.
 * 1 Lesson = 2 Points
 * 1 Quiz Result = 3 Points
 */
export const getUserLevel = () => {
  const lessons = getLessonOutlines();
  const results = getQuizResults();
  
  const totalPoints = (lessons.length * 2) + (results.length * 3);
  
  const levels = [
    { name: 'Người Khởi Đầu', min: 0, max: 10, icon: 'Sprout', color: 'from-blue-400 to-cyan-500' },
    { name: 'Học Giả Tập Sự', min: 11, max: 30, icon: 'BookOpen', color: 'from-indigo-400 to-purple-500' },
    { name: 'Học Giả Tài Năng', min: 31, max: 70, icon: 'Sparkles', color: 'from-emerald-400 to-teal-500' },
    { name: 'Bậc Thầy Kiến Thức', min: 71, max: 150, icon: 'GraduationCap', color: 'from-orange-400 to-rose-500' },
    { name: 'Học Thần', min: 151, max: 100000, icon: 'Trophy', color: 'from-yellow-400 to-amber-600' }
  ];

  const currentLevelIndex = levels.findIndex(l => totalPoints >= l.min && totalPoints <= l.max);
  const currentLevel = levels[currentLevelIndex] || levels[levels.length - 1];
  const nextLevel = levels[currentLevelIndex + 1];

  let progress = 100;
  if (nextLevel) {
    const range = nextLevel.min - currentLevel.min;
    progress = Math.min(100, Math.round(((totalPoints - currentLevel.min) / range) * 100));
  }

  return {
    points: totalPoints,
    rank: currentLevel.name,
    icon: currentLevel.icon,
    color: currentLevel.color,
    progress,
    nextRank: nextLevel?.name || 'Tối Đa'
  };
};

/**
 * Gets the current study streak.
 */
export const getStats = () => {
  const streak = storage.get(Keys.STREAK, 0);
  const lastActive = storage.get(Keys.LAST_ACTIVITY);
  const lessons = getLessonOutlines().length;
  const quizzes = getQuizResults().length;
  
  return { streak, lastActive, lessons, quizzes };
};

/**
 * Updates the last activity timestamp and study streak.
 */
export const trackActivity = () => {
  const now = new Date();
  const today = now.toDateString();
  const lastStreakDate = storage.get(Keys.LAST_STREAK_DATE);
  
  if (lastStreakDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    let currentStreak = storage.get(Keys.STREAK, 0);
    
    if (lastStreakDate === yesterday.toDateString()) {
      currentStreak += 1;
    } else if (lastStreakDate !== today) {
      currentStreak = 1;
    }
    
    storage.set(Keys.STREAK, currentStreak);
    storage.set(Keys.LAST_STREAK_DATE, today);
  }

  storage.set(Keys.LAST_ACTIVITY, now.toISOString());
  dispatchStudyActivity();
};

/**
 * Dispatches a custom event to notify listeners that a study activity has occurred.
 */
export const dispatchStudyActivity = () => {
  window.dispatchEvent(new CustomEvent('study-activity'));
};
