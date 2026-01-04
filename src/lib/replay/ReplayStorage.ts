/**
 * REPLAY STORAGE UTILITIES
 * 
 * Uses IndexedDB for local storage of recordings.
 */

import type { Recording, SavedRecording, RecordingFrame } from './types';

const DB_NAME = 'surgical-replays';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
        store.createIndex('levelId', 'metadata.levelId', { unique: false });
      }
    };
  });
}

export async function saveRecordingToStorage(recording: Recording): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  const storedData = {
    id: recording.metadata.id,
    metadata: recording.metadata,
    frames: compressFrames(recording.frames),
    events: recording.events,
    savedAt: Date.now(),
  };
  
  store.put(storedData);
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadRecordingFromStorage(id: string): Promise<Recording | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      db.close();
      if (request.result) {
        resolve({
          metadata: request.result.metadata,
          frames: decompressFrames(request.result.frames),
          events: request.result.events,
        });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function loadSavedRecordingsList(): Promise<SavedRecording[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('savedAt');
  
  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, 'prev');
    const recordings: SavedRecording[] = [];
    
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        recordings.push({
          id: cursor.value.id,
          metadata: cursor.value.metadata,
          savedAt: cursor.value.savedAt,
        });
        cursor.continue();
      } else {
        db.close();
        resolve(recordings);
      }
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function deleteRecordingFromStorage(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// Simple frame compression - stores as JSON string
function compressFrames(frames: RecordingFrame[]): string {
  return JSON.stringify(frames);
}

function decompressFrames(compressed: string): RecordingFrame[] {
  return JSON.parse(compressed);
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
