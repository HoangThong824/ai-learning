import { useState, useEffect, useRef, Children } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  BookOpen, Loader2, ArrowLeft, FileText,
  RotateCcw, AlertCircle, CheckCircle2,
  GraduationCap, Share2, Download, Copy, ChevronUp, ChevronRight,
  Target, Plus, Trophy
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
          if (currentSection.content.length > 0) {
            sections.push({ ...currentSection, content: currentSection.content.join('\n') });
          }
          const rawText = (match[2] || '').trim();
          const plainText = rawText.replace(/[*_`]/g, '') || `Phần ${sections.length + 1}`;
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
    sections.push({ ...currentSection, content: currentSection.content.join('\n') });
  }

  // If no sections were found (i.e. only the intro or no content), 
  // ensure we return something usable.
  if (sections.length === 0 && markdown.trim().length > 0) {
    return [{
      level: 1,
      title: 'Bài học',
      slug: 'full-content',
      content: markdown
    }];
  }

  return sections.filter((s) => {
    const cleanText = s.content.replace(/#.*?\n|^\s*$/gm, '').trim();
    return cleanText.length > 0;
  });
};



export default function Lesson() {
  const { id, chunkId } = useParams();
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

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
        if (id === 'demo') {
          setDoc({ filename: 'Bài học Thử nghiệm (Demo)' });
          setGeneratedLesson({
            title: 'Bài học Thử nghiệm',
            content: '## Giới thiệu\nNội dung giới thiệu.\n## Nội dung chính\nĐây là nội dung bài học.\n## Kết luận\nTổng kết nội dung.'
          });
          setIsLoading(false);
          return;
        }

        if (isNaN(docId)) {
          setDoc(null);
          setIsLoading(false);
          return;
        }

        const loadedDoc = await getDocument(docId);
        const loadedChunks = await getChunksForDocument(docId);
        setDoc(loadedDoc);
        setChunks(loadedChunks || []);

        // chunkId in URL takes precedence
        const targetChunkId = chunkId ? Number(chunkId) : (loadedChunks?.[0]?.id);

        if (loadedChunks?.length > 0) {
          const matchedChunk = loadedChunks.find(c => c.id === targetChunkId) || loadedChunks[0];
          setSelectedChunk(matchedChunk);

          // Check for existing lesson for this specific chunk
          const saved = getLessonOutlines();
          const existing = saved.find(o => o.documentId === docId && o.chunkId === matchedChunk.id);

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
        }

        // Automatic bulk generate if any lessons are missing for this document
        const savedLessons = getLessonOutlines();
        const existingLessons = savedLessons.filter(o => o.documentId === docId);
        const missing = loadedChunks?.filter(c => !existingLessons.find(o => o.chunkId === c.id)) || [];

        if (loadedChunks?.length > 0 && missing.length > 0 && id !== 'demo') {
          handleBulkGenerate(missing);
        }

      } catch (error) {
        console.error("Error loading lesson data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  // Effect to handle chunkId changes from URL
  useEffect(() => {
    if (chunks.length > 0 && chunkId && id !== 'demo') {
      const targetId = Number(chunkId);
      const matched = chunks.find(c => c.id === targetId);
      if (matched && matched.id !== selectedChunk?.id) {
        setSelectedChunk(matched);
        setGenerateError(null);

        // Load existing lesson for this chunk
        const docId = Number(id);
        const saved = getLessonOutlines();
        const existing = saved.find(o => o.documentId === docId && o.chunkId === matched.id);

        if (existing) {
          setGeneratedLesson({ title: existing.title, content: existing.content });
          setActiveSectionIndex(0);
        } else if (!isGenerating) {
          setGeneratedLesson(null);
        }
      }
    }
  }, [chunkId, chunks, id]);

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
      const quiz = await generateQuiz(lesson.content);
      saveQuiz({
        documentId: Number(id),
        chunkId: selectedChunk.id,
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

  const handleBulkGenerate = async (chunksToProcess) => {
    if (!chunksToProcess || chunksToProcess.length === 0) return;

    setIsBulkProcessing(true);
    setBulkProgress({ current: 0, total: chunksToProcess.length });

    for (let i = 0; i < chunksToProcess.length; i++) {
      const chunk = chunksToProcess[i];

      // Skip if already generating manually
      if (isGenerating && chunk.id === selectedChunk?.id) continue;

      try {
        const lesson = await generateLessonOutline(chunk.content);
        saveLessonOutline({
          documentId: Number(id),
          title: lesson.title,
          content: lesson.content,
          chunkId: chunk.id,
          createdAt: new Date().toISOString(),
        });

        const quiz = await generateQuiz(lesson.content);
        saveQuiz({
          documentId: Number(id),
          chunkId: chunk.id,
          questions: quiz.questions,
          createdAt: new Date().toISOString(),
        });

        // Update UI if this is the currently viewed chunk
        if (chunk.id === (chunkId ? Number(chunkId) : chunks[0]?.id)) {
          setGeneratedLesson(lesson);
          setActiveSectionIndex(0);
        }

        setBulkProgress(prev => ({ ...prev, current: i + 1 }));
      } catch (err) {
        console.error(`[Bulk Gen] Error processing chunk ${chunk.id}:`, err);
      }

      //delay to prevent API overloading
      await new Promise(r => setTimeout(r, 500));
    }

    setIsBulkProcessing(false);
    trackActivity();
  };

  const copyToClipboard = () => {
    if (!generatedLesson) return;
    navigator.clipboard.writeText(generatedLesson.content);
    // Simple alert or toast could go here
  };

  /* ---------- Loading state ---------- */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full gap-6 bg-slate-50">
        <div className="relative w-16 h-16">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-slate-800 font-bold text-xl mb-1">Chuẩn bị bài học...</p>
          <p className="text-slate-400 text-sm font-medium">Đang tải dữ liệu tài liệu của bạn</p>
        </div>
      </div>
    );
  }

  /* ---------- No document ---------- */
  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full text-center bg-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 mb-8 rounded-2xl bg-slate-50 flex items-center justify-center shadow-inner"
        >
          <AlertCircle className="w-16 h-16 text-slate-300" />
        </motion.div>
        <h2 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">Không tìm thấy tài liệu</h2>
        <p className="text-slate-500 mb-8 max-w-sm text-lg leading-relaxed font-medium">Tài liệu bạn đang tìm kiếm không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <button
          onClick={() => navigate('/documents')}
          className="group px-10 py-4 rounded-2xl bg-slate-900 text-white font-bold shadow-sm transition-all duration-300 hover:bg-slate-800 active:scale-95 flex items-center gap-2"
        >
          <FileText className="w-5 h-5" />
          Về Thư viện tài liệu
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
      className="h-full flex flex-col bg-slate-50/30 overflow-y-auto lg:overflow-hidden"
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
          className="fixed top-0 left-0 right-0 h-1.5 bg-orange-500 z-[100] origin-left"
          style={{ scaleX }}
        />
      )}

      {/* --- Top Header --- */}
      <header className="px-4 sm:px-6 lg:px-10 py-3 lg:py-4 flex items-center gap-3 lg:gap-6 border-b border-slate-200 bg-white z-40">
        <button
          onClick={() => navigate('/lessons')}
          className="p-2.5 rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all border border-slate-200 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-0.5">
            <h1 className="text-lg lg:text-2xl font-black text-slate-900 tracking-tight truncate">
              {doc.filename}
            </h1>
            {generatedLesson && (
              <span className="shrink-0 px-2 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[9px] font-black uppercase tracking-widest hidden sm:inline-block border border-orange-200">
                Đã xử lý
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <p className="text-slate-400 font-bold flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
              <GraduationCap className="w-4 h-4 text-orange-500" /> Tài liệu học tập
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2.5 rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 border border-slate-200 shadow-sm transition-all hidden md:block">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* --- Main Area --- */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden relative">

        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100">
          <button
            onClick={() => setMobileSidebarOpen(prev => !prev)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            {mobileSidebarOpen ? 'Ẩn mục lục' : (generatedLesson ? 'Mục lục' : 'Cấu trúc')}
          </button>
        </div>

        {/* Backdrop for Mobile Sidebar */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        {/* ===== SIDEPANEL: Sections ===== */}
        <aside className={`
          flex-col bg-white z-50 transition-all duration-300
          ${mobileSidebarOpen
            ? 'fixed inset-y-0 left-0 w-[280px] shadow-2xl flex border-r border-slate-100'
            : 'hidden lg:flex lg:w-[320px] lg:flex-shrink-0 lg:border-r lg:border-slate-200 lg:relative lg:z-30'}
        `}>
          {generatedLesson ? (
            <>
              {/* Sidebar Header for TOC */}
              <div className="px-6 py-6 border-b border-slate-50">
                <button
                  onClick={() => setGeneratedLesson(null)}
                  className="mb-4 flex items-center gap-2 text-slate-400 hover:text-orange-600 font-bold transition-colors text-[10px] uppercase tracking-widest"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Về cấu trúc
                </button>
                <h2 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-[0.1em]">
                  <FileText className="w-4 h-4 text-orange-500" />
                  Mục lục
                </h2>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
                {lessonSections.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveSectionIndex(idx);
                      setMobileSidebarOpen(false);
                      // Scroll inner content
                      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200 font-bold text-sm leading-tight ${activeSectionIndex === idx
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 ' + (item.level === 2 ? 'mt-2' : 'pl-8 text-xs font-medium opacity-70')
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
              <div className="px-6 py-6 border-b border-slate-50">
                <h2 className="font-black text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-[0.1em]">
                  <FileText className="w-4 h-4 text-orange-500" />
                  Cấu trúc
                </h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">Chọn đoạn để học</p>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 custom-scrollbar">
                {chunks.map((chunk, idx) => (
                  <button
                    key={chunk.id || idx}
                    onClick={() => {
                      navigate(`/lesson/${id}/${chunk.id}`);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 border ${selectedChunk?.id === chunk.id
                      ? 'bg-orange-50 border-orange-200 shadow-sm'
                      : 'bg-white border-transparent hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 border ${selectedChunk?.id === chunk.id
                        ? 'bg-orange-500 border-orange-400 text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`font-black text-[10px] uppercase tracking-widest mb-1 ${selectedChunk?.id === chunk.id ? 'text-orange-600' : 'text-slate-400'}`}>
                          PHẦN {idx + 1}
                        </p>
                        <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                          {chunk.content}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {/* Comprehensive Quiz Option */}
                {chunks.length > 1 && (
                  <button
                    onClick={() => {
                      navigate(`/quiz/${id}`);
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full text-left p-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50 transition-all duration-200 group mt-4 mb-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-emerald-700 font-extrabold text-[10px] uppercase tracking-widest leading-none mb-1">Thi tổng hợp</p>
                        <p className="text-emerald-600/70 text-[9px] font-bold uppercase tracking-wider">Tất cả các phần</p>
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto text-emerald-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                )}
              </div>

              {/* Bottom stats */}
              <div className="p-6 border-t border-slate-100 bg-white">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Tiến độ</span>
                  <span className="text-slate-600">0%</span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-orange-500" />
                </div>
              </div>
            </>
          )}
        </aside>

        {/* ===== CONTENT AREA ===== */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
          {/* Content Scroll Area */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-4 sm:p-8 lg:p-12 xl:p-16"
          >
            {/* Bulk Processing Progress Banner */}
            {isBulkProcessing && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto mb-8 p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative"
              >
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center animate-pulse">
                      <GraduationCap className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-black text-[10px] uppercase tracking-widest leading-none mb-1">Đang biên soạn tự động</h4>
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider leading-none">Vui lòng chờ Roboki chuẩn bị giáo trình cho bạn</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-orange-500 font-black text-sm tracking-tighter">{bulkProgress.current}/{bulkProgress.total}</span>
                    <span className="text-slate-500 text-[10px] ml-1 font-bold uppercase tracking-widest">Phần</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                  />
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[40px] rounded-full -mr-10 -mt-10" />
              </motion.div>
            )}
            <AnimatePresence mode="wait">
              {isGenerating ? (
                /* --- Generating State --- */
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-xl mx-auto py-32 flex flex-col items-center text-center"
                >
                  <div className="relative mb-10">
                    <div className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg">
                      <GraduationCap className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Roboki đang biên soạn...</h3>
                  <p className="text-slate-500 text-base font-bold max-w-sm mx-auto leading-relaxed mb-12">
                    Hệ thống đang phân tích và tổng hợp nội dung bài học chuyên sâu cho bạn.
                  </p>

                  <div className="w-full max-w-xs space-y-3">
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-orange-500"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 10, ease: 'easeInOut' }}
                      />
                    </div>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Đang trích xuất kiến thức</p>
                  </div>
                </motion.div>
              ) : generatedLesson ? (
                /* --- Lesson Content State --- */
                <motion.div
                  key={`lesson-${activeSectionIndex}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl mx-auto pb-32"
                >
                  {/* Floating Action Bar (Optimized for Mobile) */}
                  <div className="mb-8 lg:mb-12 flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-2 p-1 sm:p-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <div className="px-2 sm:px-3 border-r border-slate-100">
                        <span className="text-[9px] sm:text-[10px] font-black text-orange-600 uppercase tracking-widest whitespace-nowrap">
                          {activeSectionIndex + 1} / {lessonSections.length}
                        </span>
                      </div>
                      <button
                        onClick={copyToClipboard}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-orange-600 transition-all flex items-center gap-1.5 sm:gap-2"
                      >
                        <Copy className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase">Sao chép</span>
                      </button>
                      <button
                        onClick={() => { setGeneratedLesson(null); setGenerateError(null); }}
                        className="p-1.5 sm:p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all flex items-center gap-1.5 sm:gap-2"
                      >
                        <RotateCcw className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase">Tạo lại</span>
                      </button>
                    </div>
                  </div>

                  {/* Header Decoration */}
                  <div className="mb-10">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight tracking-tight">
                        {activeSection?.title || generatedLesson.title}
                      </h2>
                    </div>
                  </div>

                  {/* Markdown content with Premium Styling */}
                  <div className="
                    prose prose-slate max-w-none
                    prose-headings:text-slate-900 prose-headings:font-black prose-headings:tracking-tight
                    prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-4 prose-h2:border-b border-slate-200
                    prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-orange-600
                    prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-6 prose-p:text-base
                    prose-strong:text-slate-900
                    prose-ul:my-6 prose-ul:space-y-3
                    prose-li:text-slate-600
                    prose-blockquote:border-l-4 prose-blockquote:border-orange-500 prose-blockquote:bg-orange-50 prose-blockquote:px-6 prose-blockquote:py-3 prose-blockquote:rounded-r-xl prose-blockquote:text-slate-700 prose-blockquote:not-italic
                    prose-code:bg-slate-100 prose-code:text-orange-600 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
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
                      className={`flex-1 w-full sm:max-w-xs py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeSectionIndex === 0 ? 'bg-slate-50 text-slate-300 cursor-not-allowed opacity-50' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm'
                        }`}
                    >
                      <ArrowLeft className="w-4 h-4" /> Bài trước
                    </button>

                    {activeSectionIndex < lessonSections.length - 1 ? (
                      <button
                        onClick={() => {
                          setActiveSectionIndex(prev => Math.min(lessonSections.length - 1, prev + 1));
                          contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-[2] w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 bg-orange-500 text-white shadow-sm hover:bg-orange-600 transition-all uppercase tracking-widest text-sm"
                      >
                        Bài tiếp theo <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/quiz/${doc.id}`)}
                        className="flex-[2] w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 transition-all uppercase tracking-widest text-sm"
                      >
                        Bài thi tổng hợp <Trophy className="w-4 h-4 ml-1" />
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
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-orange-500" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung trích xuất</span>
                        </div>
                        <div className="px-3 py-1 rounded-md bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                          Phần {selectedIdx + 1} / {chunks.length}
                        </div>
                      </div>

                      {/* Content Box */}
                      <div className="bg-white border border-slate-200 p-8 lg:p-12 rounded-2xl shadow-sm relative">
                        <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg font-medium">
                          {selectedChunk.content}
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="mt-12 text-center">
                        <button
                          onClick={handleGenerate}
                          disabled={isGenerating}
                          className="px-10 py-5 rounded-xl bg-slate-900 text-white font-black text-base shadow-sm hover:bg-slate-800 transition-all flex items-center gap-3 mx-auto uppercase tracking-widest"
                        >
                          <BookOpen className="w-5 h-5 text-orange-400" />
                          <span>Biên soạn bài học ngay</span>
                        </button>
                        <p className="mt-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                          Nhấn để bắt đầu quá trình học tập cùng Roboki
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-10">
                        <FileText className="w-10 h-10 text-slate-200" />
                      </div>
                      <h3 className="text-xl font-black text-slate-400 tracking-tight uppercase mb-2">Chưa chọn nội dung</h3>
                      <p className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">Hãy chọn một đoạn từ thanh bên để bắt đầu</p>
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
            className="fixed bottom-10 right-10 w-16 h-16 rounded-[1.5rem] bg-slate-900 text-white shadow-sm flex items-center justify-center z-50 hover:bg-slate-800 transition-colors"
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
            <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-2xl shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center shrink-0 shadow-sm shadow-sm">
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
