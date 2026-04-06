import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, Loader2, Trash2, Library, Brain } from 'lucide-react';
import { extractTextFromFile } from '../services/extractor';
import { chunkText } from '../services/chunker';
import { saveDocument, saveChunks, getAllDocuments, deleteDocument } from '../persistence/db';

export default function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await getAllDocuments();
      setDocuments(docs || []);
    } catch (err) {
      console.error("Error loading documents:", err);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    try {
      setIsUploading(true);
      const text = await extractTextFromFile(file);
      const chunks = chunkText(text);
      const docId = await saveDocument(file, text);
      await saveChunks(docId, chunks);
      await loadDocuments();
    } catch (err) {
      console.error("Error processing file:", err);
      alert("Failed to process file: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this document?")) {
      await deleteDocument(id);
      await loadDocuments();
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 h-full flex flex-col"
    >
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500 tracking-tight flex items-center gap-3">
          Tài liệu của tôi <Library className="w-10 h-10 text-teal-500" />
        </h1>
        <p className="text-slate-500 mt-2 font-medium text-lg">Tải lên và quản lý kho học liệu của bạn.</p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-8">
        {/* Upload Zone */}
        <div className="lg:w-1/3">
          <form
            onDragEnter={handleDrag}
            onChange={handleChange}
            onSubmit={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`border-[3px] border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center text-center cursor-pointer h-64 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transform duration-300 ${dragActive ? "border-emerald-400 bg-emerald-50 scale-105" : "border-teal-300 bg-teal-50 hover:bg-teal-100 hover:-translate-y-1"
              } ${isUploading ? "opacity-75 pointer-events-none" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".docx,.pdf,.txt,..."

            />
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">Đang trích xuất kiến thức... <Brain className="w-5 h-5 text-indigo-400 animate-pulse" /></h3>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm transition-colors ${dragActive ? 'bg-emerald-200 animate-pulse' : 'bg-teal-200 animate-bounce'}`}>
                  <UploadCloud className={`w-8 h-8 ${dragActive ? 'text-emerald-700' : 'text-teal-600'}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Drop a file here to study!</h3>
                <p className="text-sm text-slate-500 font-medium tracking-wide">Or click to browse (.docx, .pdf, .txt)</p>
              </div>
            )}
          </form>
          {dragActive && (
            <div className="fixed inset-0 z-50 rounded-[2rem]" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}></div>
          )}
        </div>

        {/* List Zone */}
        <div className="lg:w-2/3 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-y-auto custom-scrollbar">
          <h2 className="text-xl font-bold mb-6 text-slate-700 flex items-center gap-2">
            Uploaded Files
          </h2>
          <div className="space-y-4">
            <AnimatePresence>
              {documents.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No materials uploaded yet. Drop a file to get started!
                </motion.div>
              ) : (
                documents.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mr-4 shadow-sm group-hover:scale-110 transition-transform">
                      <File className="text-white w-6 h-6" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-slate-800 text-lg truncate pr-4" title={doc.filename}>{doc.filename}</h4>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        {new Date(doc.uploadDate).toLocaleDateString()} • {formatSize(doc.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => navigate(`/lesson/${doc.id}`)}
                        className="px-5 py-2.5 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                      >
                        Lesson
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2.5 rounded-full bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-600 shadow-sm border border-slate-200 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete file"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
