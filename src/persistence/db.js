import { openDB } from 'idb';

const DB_NAME = 'ai_learning_assistant_db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id', autoIncrement: true });
        store.createIndex('filename', 'filename');
        store.createIndex('uploadDate', 'uploadDate');
      }
      if (!db.objectStoreNames.contains('chunks')) {
        const store = db.createObjectStore('chunks', { keyPath: 'id', autoIncrement: true });
        store.createIndex('documentId', 'documentId');
      }
    },
  });
};

export const saveDocument = async (file, extractedText) => {
  const db = await initDB();
  const id = await db.add('documents', {
    filename: file.name,
    type: file.type,
    size: file.size,
    uploadDate: new Date().toISOString(),
    rawText: extractedText,
    binary: file // Store File object directly
  });
  return id;
};

export const getDocument = async (id) => {
  const db = await initDB();
  return db.get('documents', id);
};

export const getAllDocuments = async () => {
  const db = await initDB();
  return db.getAllFromIndex('documents', 'uploadDate');
};

export const deleteDocument = async (id) => {
  const db = await initDB();
  await db.delete('documents', id);
  // Also delete associated chunks
  const tx = db.transaction('chunks', 'readwrite');
  const index = tx.store.index('documentId');
  let cursor = await index.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
};

export const saveChunks = async (documentId, chunks) => {
  const db = await initDB();
  const tx = db.transaction('chunks', 'readwrite');
  for (const chunk of chunks) {
    tx.store.add({
      documentId,
      content: chunk,
      createdAt: new Date().toISOString()
    });
  }
  await tx.done;
};

export const getChunksForDocument = async (documentId) => {
  const db = await initDB();
  return db.getAllFromIndex('chunks', 'documentId', documentId);
};
