/**
 * AuraNotes - Firebase Firestore Real-Time Cloud Synchronization
 * Sesión maestra por defecto sin pantalla de login previa
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: "AIzaSyAS6PUqQRVvwrYaaVvzOGBgxgUlyFLIbCI",
  authDomain: "cuentas-951a9.firebaseapp.com",
  projectId: "cuentas-951a9",
  storageBucket: "cuentas-951a9.firebasestorage.app",
  messagingSenderId: "567396574781",
  appId: "1:567396574781:web:e994621ee3c9d240baac54"
};

class FirebaseSyncManager {
  constructor() {
    this.app = null;
    this.db = null;
    this.sessionId = 'master_session_default';
    this.isConnected = false;
    this.syncStatusCallback = null;
    this.saveTimeout = null;

    this.init();
  }

  init() {
    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.isConnected = true;
    } catch (e) {
      console.warn('Firebase init fallback to local storage:', e);
      this.isConnected = false;
    }
  }

  onStatusChange(cb) {
    this.syncStatusCallback = cb;
  }

  updateStatus(status, text) {
    if (this.syncStatusCallback) {
      this.syncStatusCallback(status, text);
    }
  }

  async loadNotes() {
    if (!this.isConnected) return null;
    try {
      this.updateStatus('syncing', 'Conectando a Firebase...');
      const notesRef = collection(this.db, 'sessions', this.sessionId, 'notes');
      const q = query(notesRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        this.updateStatus('synced', 'Firebase Conectado (Sin notas en la nube)');
        return null;
      }

      const notes = [];
      snapshot.forEach(docSnap => {
        notes.push({ id: docSnap.id, ...docSnap.data() });
      });

      this.updateStatus('synced', 'Sincronizado con Firebase');
      return notes;
    } catch (e) {
      console.warn('Firestore load failed, using local offline copy:', e);
      this.updateStatus('offline', 'Modo Local (Offline)');
      return null;
    }
  }

  listenLiveUpdates(onUpdate) {
    if (!this.isConnected) return () => {};
    try {
      const notesRef = collection(this.db, 'sessions', this.sessionId, 'notes');
      const q = query(notesRef, orderBy('updatedAt', 'desc'));

      return onSnapshot(q, (snapshot) => {
        const notes = [];
        snapshot.forEach(docSnap => {
          notes.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (notes.length > 0) {
          onUpdate(notes);
        }
      }, (err) => {
        console.warn('Firestore snapshot error:', err);
      });
    } catch (e) {
      return () => {};
    }
  }

  saveNoteLive(note) {
    if (!this.isConnected) return;

    this.updateStatus('syncing', 'Sincronizando...');
    clearTimeout(this.saveTimeout);

    this.saveTimeout = setTimeout(async () => {
      try {
        const noteRef = doc(this.db, 'sessions', this.sessionId, 'notes', note.id);
        const dataToSave = {
          title: note.title || 'Sin título',
          content: note.content || '',
          tags: note.tags || [],
          type: note.type || 'idea',
          color: note.color || 'amber',
          cover: note.cover || null,
          updatedAt: note.updatedAt || new Date().toISOString()
        };
        await setDoc(noteRef, dataToSave, { merge: true });
        this.updateStatus('synced', 'Guardado en la nube');
      } catch (e) {
        console.warn('Firestore save failed, saved locally:', e);
        this.updateStatus('offline', 'Guardado localmente');
      }
    }, 600); // Debounce de 600ms para no saturar peticiones mientras escribe
  }

  async deleteNote(noteId) {
    if (!this.isConnected) return;
    try {
      this.updateStatus('syncing', 'Eliminando en la nube...');
      const noteRef = doc(this.db, 'sessions', this.sessionId, 'notes', noteId);
      await deleteDoc(noteRef);
      this.updateStatus('synced', 'Eliminado en Firebase');
    } catch (e) {
      console.warn('Firestore delete failed:', e);
    }
  }
}

export const firebaseSync = new FirebaseSyncManager();
