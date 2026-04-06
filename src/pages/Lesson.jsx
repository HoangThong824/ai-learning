import { useState, useEffect, useRef, Children } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  BookOpen, Sparkles, Loader2, ArrowLeft, FileText,
  RotateCcw, AlertCircle, CheckCircle2, Zap,
  GraduationCap, Share2, Download, Copy, ChevronUp,
  Target
} from 'lucide-react';
import { getDocument, getChunksForDocument } from '../persistence/db';
import { generateLessonOutline, generateQuiz } from '../api/ai';
import { getLessonOutlines, saveLessonOutline, saveQuiz, trackActivity, getUserProgress, updateUserProgress } from '../persistence/storage';
import ReactMarkdown from 'react-markdown';
import TutorChat from '../components/TutorChat';

const generateSlug = (text) => {
  if (typeof text !== 'string') return '';
  return text.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/(^-|-$)+/g, '');
};

const getText = (children) => {
  let text = '';
  Children.forEach(children, child => {
    if (typeof child === 'string') {
      text += child;
    } else if (child && child.props && child.props.children) {
      text += getText(child.props.children);
    }
  });
  return text;
};

const CustomHeading2 = ({ children, ...props }) => {
  const text = getText(children);
  const id = generateSlug(text);
  return <h2 id={id} className="scroll-mt-32" {...props}>{children}</h2>;
};

const CustomHeading3 = ({ children, ...props }) => {
  const text = getText(children);
  const id = generateSlug(text);
  return <h3 id={id} className="scroll-mt-32" {...props}>{children}</h3>;
};

const parseLessonSections = (markdown) => {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const sections = [];
  let currentSection = {
    level: 1,
    title: 'Mở đầu',
    slug: 'intro',
    content: []
  };
  let isCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) isCodeBlock = !isCodeBlock;
    
    if (!isCodeBlock) {
      const match = line.match(/^(#{1,3})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        if (level >= 2) {
          if (currentSection.content.length > 0 || currentSection.slug === 'intro') {
            sections.push({...currentSection, content: currentSection.content.join('\n')});
          }
          const rawText = match[2].trim();
          const plainText = rawText.replace(/[*_`]/g, '');
          const slug = generateSlug(plainText) || `section-${sections.length}`;
          currentSection = {
            level,
            title: plainText,
            slug,
            content: [line]
          };
          continue;
        }
      }
    }
    currentSection.content.push(line);
  }
  
  if (currentSection.content.length > 0) {
    sections.push({...currentSection, content: currentSection.content.join('\n')});
  }
  
  return sections.filter((s, idx) => {
    if (idx === 0 && s.slug === 'intro') {
      const cleanText = s.content.replace(/#.*?\n|^\s*$/gm, '').trim();
      return cleanText.length > 0;
    }
    return true;
  });
};



export default function Lesson() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contentRef = useRef(null);

  const [doc, setDoc] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [generatedLesson, setGeneratedLesson] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generateError, setGenerateError] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Scroll progress for the lesson
  const { scrollYProgress } = useScroll({
    container: contentRef,
  });
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    if (id === 'demo') { setIsLoading(false); return; }

    const loadData = async () => {
      try {
        const docId = Number(id);
        const loadedDoc = await getDocument(docId);
        const loadedChunks = await getChunksForDocument(docId);
        setDoc(loadedDoc);
        setChunks(loadedChunks || []);
        if (loadedChunks?.length > 0) setSelectedChunk(loadedChunks[0]);
        const saved = getLessonOutlines();
        const existing = saved.find(o => o.documentId === docId);
        if (existing) {
          setGeneratedLesson({ title: existing.title, content: existing.content });
          
          // Restore progress
          const progress = getUserProgress(docId);
          if (progress.lastSection) {
            const sections = parseLessonSections(existing.content);
            const idx = sections.findIndex(s => s.slug === progress.lastSection);
            if (idx >= 0) setActiveSectionIndex(idx);
          }
        }
      } catch (error) {
        console.error("Error loading lesson data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  // Track progress when section changes
  useEffect(() => {
    if (generatedLesson && !isGenerating) {
      const sections = parseLessonSections(generatedLesson.content);
      const current = sections[activeSectionIndex];
      if (current) {
        updateUserProgress(Number(id), {
          lastSection: current.slug,
          completedSections: [current.slug],
          completedTitles: [current.title]
        });
      }
    }
  }, [activeSectionIndex, generatedLesson, isGenerating, id]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let hasTrackedActivity = false;

    const handleScroll = () => {
      setShowScrollTop(el.scrollTop > 300);

      // Track activity when scrolled near the bottom
      if (!hasTrackedActivity && el.scrollHeight - el.scrollTop <= el.clientHeight + 300) {
        hasTrackedActivity = true;
        trackActivity();
      }
    };

    // Check initially in case content is short and doesn't require scrolling
    handleScroll();

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [generatedLesson]);

  const handleGenerate = async () => {
    if (!selectedChunk) return;
    try {
      setGenerateError(null);
      setIsGenerating(true);
      const lesson = await generateLessonOutline(selectedChunk.content);
      setGeneratedLesson(lesson);
      setActiveSectionIndex(0);

      // Persist the generated lesson
      saveLessonOutline({
        documentId: Number(id),
        title: lesson.title,
        content: lesson.content,
        chunkId: selectedChunk.id,
        createdAt: new Date().toISOString(),
      });

      // Also generate and save a companion quiz
      // cũng tự động tạo và lưu Quiz đi kèm
      const quiz = await generateQuiz(lesson.content);
      saveQuiz({
        documentId: Number(id),
        questions: quiz.questions,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Lesson] Generation error:', error);
      setGenerateError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLesson) return;
    navigator.clipboard.writeText(generatedLesson.content);
    // Simple alert or toast could go here
  };

  /* ---------- Loading state ---------- */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full gap-6 bg-slate-50/50">
        <div className="relative w-24 h-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-t-4 border-indigo-500/30 border-r-4 border-indigo-500/10"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 rounded-full border-t-4 border-purple-500 border-l-4 border-purple-500/20"
          />
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <p className="text-slate-600 font-bold text-xl mb-1 animate-pulse">Chuẩn bị không gian học tập...</p>
          <p className="text-slate-400 text-sm">Đang tải dữ liệu tài liệu của bạn</p>
        </div>
      </div>
    );
  }

  /* ---------- No document ---------- */
  if (id === 'demo' || !doc) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full text-center bg-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 mb-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center shadow-inner"
        >
          <BookOpen className="w-16 h-16 text-indigo-300" />
        </motion.div>
        <h2 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">Chưa chọn tài liệu</h2>
        <p className="text-slate-500 mb-8 max-w-sm text-lg leading-relaxed">Hãy quay lại thư viện và chọn một tài liệu tuyệt vời để bắt đầu hành trình khám phá kiến thức nhé!</p>
        <button
          onClick={() => navigate('/documents')}
          className="group px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_auto] hover:bg-right text-white font-bold shadow-xl shadow-indigo-500/20 transition-all duration-500 transform hover:-translate-y-1 active:scale-95 flex items-center gap-2"
        >
          <FileText className="w-5 h-5" />
          Quay lại Thư viện
        </button>
      </div>
    );
  }

  const selectedIdx = chunks.findIndex(c => c.id === selectedChunk?.id);
  const lessonSections = generatedLesson ? parseLessonSections(generatedLesson.content) : [];
  const activeSection = lessonSections[activeSectionIndex] || null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-slate-50/30 overflow-hidden"
    >
      {/* Tutor Chat Integration */}
      <TutorChat 
        docId={id} 
        context={{
          docTitle: doc?.filename,
          lessonContent: generatedLesson ? parseLessonSections(generatedLesson.content).map(s => s.content).join('\n') : '',
          currentSection: activeSection,
          quizStatus: false,
          userProgress: getUserProgress(Number(id))
        }} 
      />

      {/* --- Progress Bar (Sticky) --- */}
      {generatedLesson && !isGenerating && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 z-[100] origin-left"
          style={{ scaleX }}
        />
      )}

      {/* --- Top Header --- */}
      <header className="px-6 lg:px-10 py-6 flex items-center gap-6 border-b border-white/40 bg-white/40 backdrop-blur-md z-40">
        <motion.button
          whileHover={{ x: -4 }}
          onClick={() => navigate('/documents')}
          className="p-3 rounded-2xl bg-white text-slate-400 hover:bg-white hover:text-indigo-600 transition-all shadow-sm border border-slate-100 hover:shadow-md"
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight truncate">
              {doc.filename}
            </h1>
            {generatedLesson && (
              <span className="shrink-0 px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest hidden sm:inline-block border border-emerald-200 shadow-sm">
                Đã hoàn thành AI
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <p className="text-slate-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-widest">
              <GraduationCap className="w-4 h-4 text-indigo-400" /> Trình tạo bài học thông minh
            </p>
            <div className="h-1 w-1 rounded-full bg-slate-300 hidden sm:block" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest hidden sm:block">
              {chunks.length} PHẦN NỘI DUNG
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-3 rounded-2xl bg-white text-slate-400 hover:text-indigo-600 border border-slate-100 shadow-sm hover:shadow-md transition-all hidden md:block">
            <Share2 className="w-5 h-5" />
          </button>
          <button className="p-3 rounded-2xl bg-white text-slate-400 hover:text-indigo-600 border border-slate-100 shadow-sm hover:shadow-md transition-all hidden md:block">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* --- Main Area --- */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden relative">

        {/* ===== SIDEPANEL: Sections ===== */}
        <aside className="lg:w-[380px] flex-shrink-0 flex flex-col bg-white/60 backdrop-blur-xl border-r border-white/40 z-30 group">
          {generatedLesson ? (
            <>
              {/* Sidebar Header for TOC */}
              <div className="px-8 py-6">
                <button 
                  onClick={() => setGeneratedLesson(null)} 
                  className="mb-4 flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold transition-colors text-xs uppercase tracking-wider"
                >
                  <ArrowLeft className="w-4 h-4" /> Về cấu trúc tài liệu
                </button>
                <h2 className="font-black text-slate-800 flex items-center gap-3 text-sm uppercase tracking-[0.2em] mb-1">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Mục lục bài học
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Nhấn để cuộn đến nội dung</p>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2 custom-scrollbar">
                {lessonSections.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveSectionIndex(idx);
                      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-300 font-bold block ${
                      activeSectionIndex === idx 
                        ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200 ring-2 ring-indigo-500/20' 
                        : 'hover:bg-white/80 hover:shadow-sm ' + (item.level === 2 ? 'text-slate-800 text-sm mt-3 bg-white/40 border border-slate-100' : 'text-slate-500 text-xs pl-8')
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Sidebar Header */}
              <div className="px-8 py-6">
                <h2 className="font-black text-slate-800 flex items-center gap-3 text-sm uppercase tracking-[0.2em] mb-1">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Cấu trúc tài liệu
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Chọn đoạn để học tập</p>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3 custom-scrollbar">
                {chunks.map((chunk, idx) => (
                  <motion.button
                    key={chunk.id || idx}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => { setSelectedChunk(chunk); setGenerateError(null); }}
                    className={`w-full text-left p-5 rounded-[1.5rem] transition-all duration-300 relative overflow-hidden group/item ${selectedChunk?.id === chunk.id
                        ? 'bg-white shadow-[0_10px_30px_rgba(79,70,229,0.1)] ring-1 ring-indigo-100'
                        : 'hover:bg-white/40'
                      }`}
                  >
                    {selectedChunk?.id === chunk.id && (
                      <motion.div
                        layoutId="activeGlow"
                        className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 -z-10"
                      />
                    )}

                    <div className="flex items-start gap-4">
                      <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 shadow-sm transition-all duration-500 ${selectedChunk?.id === chunk.id
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white scale-110 rotate-3'
                          : 'bg-slate-100 text-slate-400 group-hover/item:bg-white group-hover/item:text-indigo-500'
                        }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-black text-sm transition-colors ${selectedChunk?.id === chunk.id ? 'text-slate-800' : 'text-slate-500'
                            }`}>
                            PHẦN {idx + 1}
                          </span>
                          {selectedChunk?.id === chunk.id && (
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            </motion.div>
                          )}
                        </div>
                        <div className="text-xs opacity-60 line-clamp-2 leading-relaxed font-medium">
                          {chunk.content}
                        </div>
                      </div>
                    </div>

                    {/* Hover progress underline */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 transition-all duration-500 transform translate-y-full group-hover/item:translate-y-0 bg-gradient-to-r from-transparent via-indigo-400 to-transparent ${selectedChunk?.id === chunk.id ? 'opacity-100 translate-y-0' : 'opacity-0'
                      }`} />
                  </motion.button>
                ))}
              </div>

              {/* Bottom stats? */}
              <div className="p-8 border-t border-white/40 bg-white/20">
                <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                  <span>Tiến độ tổng quát</span>
                  <span className="text-slate-600">0%</span>
                </div>
                <div className="mt-3 h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-indigo-500 rounded-full" />
                </div>
              </div>
            </>
          )}
        </aside>

        {/* ===== CONTENT AREA ===== */}
        <main className="flex-1 flex flex-col min-w-0 bg-white/20 relative">

          {/* Animated background highlights */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                x: [0, 40, 0],
                y: [0, -40, 0],
                rotate: [0, 10, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-100/30 blur-[120px]"
            />
            <motion.div
              animate={{
                x: [0, -50, 0],
                y: [0, 60, 0],
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-100/30 blur-[100px]"
            />
          </div>

          {/* Content Scroll Area */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-6 lg:p-12 xl:p-20"
          >
            <AnimatePresence mode="wait">
              {isGenerating ? (
                /* --- Generating State --- */
                <motion.div
                  key="generating"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="max-w-3xl mx-auto py-20 flex flex-col items-center text-center"
                >
                  <div className="relative mb-12">
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 bg-indigo-500 rounded-full blur-[40px]"
                    />
                    <div className="relative w-32 h-32 rounded-[3rem] bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 transform rotate-6">
                      <Sparkles className="w-16 h-16 text-white animate-pulse" />
                    </div>
                    {/* Floating particle animations could go here */}
                  </div>

                  <h3 className="text-4xl font-black text-slate-800 mb-4 tracking-tighter">AI Đang Khám Phá Kiến Thức...</h3>
                  <p className="text-slate-500 text-lg font-medium max-w-md mx-auto leading-relaxed mb-10">
                    Hệ thống đang phân tích các ý chính và tổng hợp thành một bài học sinh động cho bạn.
                  </p>

                  <div className="w-full max-w-sm space-y-4">
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-white shadow-inner">
                      <motion.div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 15, ease: 'easeInOut' }}
                      />
                    </div>
                    <div className="flex justify-between px-2">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">ĐANG TRÍCH XUẤT</span>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">HOÀN THÀNH</span>
                    </div>
                  </div>
                </motion.div>
              ) : generatedLesson ? (
                /* --- Lesson Content State --- */
                <motion.div
                  key={`lesson-${activeSectionIndex}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 120 }}
                  className="max-w-4xl mx-auto pb-32"
                >
                  {/* Floating Action Bar */}
                  <div className="top-0 z-50 py-4 mb-10">
                    <div className="mx-auto inline-flex items-center gap-2 p-2 rounded-2xl bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50">
                      <div className="px-4 border-r border-slate-100">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">BÀI {activeSectionIndex + 1} / {lessonSections.length}</span>
                      </div>
                      <button
                        onClick={copyToClipboard}
                        className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        <span className="text-xs font-black uppercase">Sao chép</span>
                      </button>
                      <button
                        onClick={() => { setGeneratedLesson(null); setGenerateError(null); }}
                        className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-tight">Tạo lại với AI</span>
                      </button>
                    </div>
                  </div>

                  {/* Header Decoration */}
                  <div className="mb-14">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: 80 }}
                      className="h-2 bg-indigo-500 rounded-full mb-6"
                    />
                    <div className="flex flex-col gap-2 mb-6">
                      <span className="text-indigo-500 font-black tracking-widest uppercase text-xs">
                        {generatedLesson.title}
                      </span>
                      <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-[1.2] tracking-tighter">
                        {activeSection?.title || generatedLesson.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400 font-black text-sm uppercase tracking-widest">
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Zap className="w-3 h-3 text-indigo-500" />
                        </div>
                        Thực thụ
                      </span>
                      <div className="h-4 w-[1px] bg-slate-200" />
                      <span>Bài {activeSectionIndex + 1} / {lessonSections.length}</span>
                    </div>
                  </div>

                  {/* Markdown content with Premium Styling */}
                  <div className="
                    prose prose-xl max-w-none
                    prose-headings:text-slate-900 prose-headings:font-black prose-headings:tracking-tight
                    prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:pb-4 prose-h2:border-b-2 prose-h2:border-slate-100
                    prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-6 prose-h3:text-indigo-600 prose-h3:font-black prose-h3:flex prose-h3:items-center prose-h3:gap-3
                    prose-p:text-slate-600 prose-p:leading-[1.8] prose-p:mb-8
                    prose-strong:text-slate-900 prose-strong:font-black
                    prose-ul:my-8 prose-ul:space-y-6 prose-ul:list-none prose-ul:pl-0
                    prose-li:text-slate-600 prose-li:leading-relaxed prose-li:bg-white/50 prose-li:p-6 prose-li:rounded-2xl prose-li:border prose-li:border-slate-100 prose-li:shadow-sm
                    prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/40 prose-blockquote:rounded-r-3xl prose-blockquote:px-8 prose-blockquote:py-4 prose-blockquote:text-slate-700 prose-blockquote:font-bold prose-blockquote:not-italic
                    prose-code:bg-white prose-code:text-indigo-600 prose-code:px-2 prose-code:py-1 prose-code:rounded-lg prose-code:border prose-code:border-indigo-100 prose-code:text-base prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-slate-900 prose-pre:rounded-[2rem] prose-pre:p-8 prose-pre:shadow-2xl prose-pre:border prose-pre:border-white/10
                    prose-hr:border-slate-100 prose-hr:my-16
                  ">
                    <ReactMarkdown components={{ h2: CustomHeading2, h3: CustomHeading3 }}>{activeSection?.content}</ReactMarkdown>
                  </div>

                  {/* Bottom Navigation */}
                  <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-10">
                    <button
                      disabled={activeSectionIndex === 0}
                      onClick={() => {
                        setActiveSectionIndex(prev => Math.max(0, prev - 1));
                        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`flex-1 w-full sm:max-w-xs py-5 rounded-3xl font-bold flex items-center justify-center gap-3 transition-all ${
                        activeSectionIndex === 0 ? 'bg-slate-50 text-slate-300 cursor-not-allowed hidden sm:flex opacity-50' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <ArrowLeft className="w-5 h-5" /> Bài trước
                    </button>

                    {activeSectionIndex < lessonSections.length - 1 ? (
                      <button
                        onClick={() => {
                          setActiveSectionIndex(prev => Math.min(lessonSections.length - 1, prev + 1));
                          contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-[2] w-full py-5 rounded-3xl font-black flex items-center justify-center gap-3 bg-indigo-500 text-white shadow-xl hover:bg-indigo-600 hover:shadow-indigo-500/20 transition-all text-lg transform hover:-translate-y-1"
                      >
                        Chuyển sang bài tiếp theo <Target className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                         onClick={() => navigate(`/quiz/${doc.id}`)}
                         className="flex-[2] w-full py-5 rounded-3xl font-black flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-xl hover:shadow-emerald-500/20 transition-all text-lg transform hover:-translate-y-1"
                      >
                        Thi Quiz điểm cao ngay <GraduationCap className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* --- Raw Text / Empty State --- */
                <motion.div
                  key="raw"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="max-w-4xl mx-auto"
                >
                  {selectedChunk ? (
                    <div className="relative pt-10">
                      {/* Badge and Title */}
                      <div className="flex items-center justify-between mb-8 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-indigo-500" />
                          </div>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Nội dung trích xuất</span>
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest shadow-sm">
                          Phần {selectedIdx + 1} / {chunks.length}
                        </div>
                      </div>

                      {/* Content Box */}
                      <div className="group relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2.5rem] blur opacity-5 transition duration-1000 group-hover:opacity-10" />
                        <div className="bg-white/70 backdrop-blur-xl border border-white p-12 lg:p-16 rounded-[2.5rem] shadow-xl shadow-slate-200/40 relative">
                          <div className="whitespace-pre-wrap text-slate-700 leading-[2] text-xl font-medium tracking-tight">
                            {selectedChunk.content}
                          </div>
                        </div>
                      </div>

                      {/* Giant CTA */}
                      <div className="mt-16 text-center">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleGenerate}
                          disabled={isGenerating}
                          className="px-12 py-6 rounded-[2rem] bg-slate-900 text-white font-black text-xl shadow-2xl hover:shadow-indigo-500/20 transition-all flex items-center gap-4 mx-auto group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <span>Biến nội dung này thành bài học AI <Sparkles className="inline-block w-5 h-5 text-amber-300" /></span>
                        </motion.button>
                        <p className="mt-6 text-slate-400 font-bold text-sm uppercase tracking-widest animate-bounce">
                          Bắt đầu ngay để không bỏ lỡ kiến thức quan trọng!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                      <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center mb-10 shadow-inner">
                        <FileText className="w-12 h-12 text-indigo-200" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-400 tracking-tighter uppercase mb-2">Không có dữ liệu</h3>
                      <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">Hãy chọn một đoạn nội dung từ thanh bên trái</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* --- Floating Scroll Top Button --- */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-10 right-10 w-16 h-16 rounded-[1.5rem] bg-slate-900 text-white shadow-2xl flex items-center justify-center z-50 hover:bg-slate-800 transition-colors"
          >
            <ChevronUp className="w-8 h-8" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* --- Global Error Message Overlay --- */}
      <AnimatePresence>
        {generateError && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-6"
          >
            <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-[2rem] shadow-2xl flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-rose-800 text-sm uppercase tracking-widest mb-1">Rất tiếc, đã có lỗi xảy ra</h4>
                <p className="text-rose-600 font-medium text-sm leading-relaxed">{generateError}</p>
              </div>
              <button
                onClick={() => setGenerateError(null)}
                className="text-rose-300 hover:text-rose-500 transition-colors font-black"
              >
                ĐÓNG
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
