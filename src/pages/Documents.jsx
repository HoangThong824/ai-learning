import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, Loader2, Trash2, GraduationCap, FolderOpen } from 'lucide-react';
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
      console.error('Error loading documents:', err);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
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
      console.error('Error processing file:', err);
      alert('Lỗi khi xử lý tệp: ' + err.message);
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
    if (confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
      await deleteDocument(id);
      await loadDocuments();
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileExt = (filename) => {
    return filename?.split('.').pop()?.toUpperCase() || 'FILE';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 lg:p-10 min-h-full flex flex-col gap-6 lg:gap-7"
    >
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-1.5">
          <FolderOpen className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-medium text-blue-600">Kho học liệu</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Tài liệu học tập</h1>
        <p className="text-sm text-slate-400 mt-1">
          Tải lên tài liệu để Roboki phân tích và tạo bài học cho bạn.
        </p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:gap-6">
        {/* Upload zone */}
        <div className="lg:w-80 flex-shrink-0">
          <form
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onChange={handleChange}
            onSubmit={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer h-64 transition-all duration-200 ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input ref={fileInputRef} type="file" className="hidden" accept=".docx,.pdf,.txt" />
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-slate-600">Đang xử lý tài liệu…</p>
                <p className="text-xs text-slate-400">Roboki đang đọc nội dung</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors ${dragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                  <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-1">
                    {dragActive ? 'Thả tệp vào đây' : 'Tải tài liệu lên'}
                  </p>
                  <p className="text-[11px] text-slate-400">PDF, DOCX, TXT — Tối đa 50MB</p>
                </div>
              </div>
            )}
          </form>

          <div className="mt-4 p-4 bg-white rounded-xl border border-slate-100">
            <p className="text-xs font-medium text-slate-600 mb-2">Định dạng hỗ trợ</p>
            <div className="flex gap-2">
              {['PDF', 'DOCX', 'TXT'].map(fmt => (
                <span key={fmt} className="px-2 py-1 rounded-md bg-slate-50 text-xs font-medium text-slate-500 border border-slate-100">{fmt}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <h2 className="text-sm font-semibold text-slate-800">
              Tài liệu đã tải lên
            </h2>
            <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
              {documents.length} tệp
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
            <AnimatePresence mode="popLayout">
              {documents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center p-12 text-center h-64"
                >
                  <FolderOpen className="w-8 h-8 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-500">Chưa có tài liệu nào</p>
                  <p className="text-xs text-slate-400 mt-1">Thả tệp vào ô bên trái để bắt đầu</p>
                </motion.div>
              ) : (
                documents.map((doc) => (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    {/* File icon */}
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-blue-500 leading-none">{getFileExt(doc.filename)}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(doc.uploadDate).toLocaleDateString('vi-VN')} • {formatSize(doc.size)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigate(`/lesson/${doc.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 lg:bg-slate-900 border border-orange-700 lg:border-transparent hover:bg-orange-700 lg:hover:bg-slate-700 text-white text-[10px] sm:text-xs font-bold transition-colors shadow-sm"
                      >
                        <GraduationCap className="w-3.5 h-3.5 hidden sm:inline-block" />
                        Học ngay
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-slate-100 lg:border-transparent"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-4 h-4" />
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
