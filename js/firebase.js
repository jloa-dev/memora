/**
 * AuraNotes / Memora - Firebase Cloud Synchronization & Google Authentication
 * Almacenamiento permanente en tiempo real en Cloud Firestore.
 * Soporta cuentas Google aisladas (/users/{uid}/notes) y espacio cloud general (/users/default_workspace/notes).
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
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

export const firebaseConfig = {
  apiKey: "AIzaSyAS6PUqQRVvwrYaaVvzOGBgxgUlyFLIbCI",
  authDomain: "cuentas-951a9.firebaseapp.com",
  projectId: "cuentas-951a9",
  storageBucket: "cuentas-951a9.firebasestorage.app",
  messagingSenderId: "567396574781",
  appId: "1:567396574781:web:e994621ee3c9d240baac54"
};

const DEFAULT_WORKSPACE_ID = 'default_workspace';

class FirebaseSyncManager {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.isConnected = false;
    this.syncStatusCallback = null;
    this.authStatusCallback = null;
    this.saveTimeouts = new Map();
    this.pendingNotes = new Map();
    this.unsubscribeLive = null;

    this.init();
  }

  init() {
    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);
      this.isConnected = true;

      // Garantizar guardado inmediato de notas pendientes al cambiar de pestaña o cerrar ventana
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushPendingSaves();
        }
      });
      window.addEventListener('beforeunload', () => {
        this.flushPendingSaves();
      });

      // Escuchar cambios de estado de autenticación
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user || null;
        if (user) {
          this.updateStatus('synced', `Cloud: ${user.displayName || user.email}`);
        } else {
          this.updateStatus('synced', 'Sincronizado en Cloud');
        }
        if (this.authStatusCallback) {
          this.authStatusCallback(this.currentUser);
        }
      });
    } catch (e) {
      console.warn('Firebase init fallback to local storage:', e);
      this.isConnected = false;
    }
  }

  getActiveWorkspaceId() {
    if (this.currentUser && this.currentUser.uid) {
      return this.currentUser.uid;
    }
    return DEFAULT_WORKSPACE_ID;
  }

  onStatusChange(cb) {
    this.syncStatusCallback = cb;
  }

  onAuthStateChange(cb) {
    this.authStatusCallback = cb;
    if (this.auth && this.currentUser !== undefined && cb) {
      cb(this.currentUser);
    }
  }

  updateStatus(status, text) {
    if (this.syncStatusCallback) {
      this.syncStatusCallback(status, text);
    }
  }

  async signInWithGoogle() {
    if (!this.auth) {
      throw new Error('Servicio de autenticación no inicializado');
    }
    await this.flushPendingSaves();
    this.updateStatus('syncing', 'Iniciando sesión con Google...');
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(this.auth, provider);
      this.currentUser = result.user;
      this.updateStatus('synced', `Cloud: ${this.currentUser.displayName || this.currentUser.email}`);
      return this.currentUser;
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      this.updateStatus('synced', 'Sincronizado en Cloud');
      throw err;
    }
  }

  async signOutUser() {
    if (!this.auth) return;
    await this.flushPendingSaves();
    if (this.unsubscribeLive) {
      this.unsubscribeLive();
      this.unsubscribeLive = null;
    }
    await signOut(this.auth);
    this.currentUser = null;
    this.updateStatus('synced', 'Sincronizado en Cloud');
  }

  getNotesCollection() {
    if (!this.db) return null;
    const workspaceId = this.getActiveWorkspaceId();
    return collection(this.db, 'users', workspaceId, 'notes');
  }

  getNoteDoc(noteId) {
    if (!this.db || !noteId) return null;
    const workspaceId = this.getActiveWorkspaceId();
    return doc(this.db, 'users', workspaceId, 'notes', String(noteId));
  }

  serializeNote(note) {
    let cleanTitle = (note.title || '').trim();
    if (!cleanTitle && note.content) {
      const firstLine = note.content
        .split('\n')
        .map(l => l.replace(/^[#*>\-\s]+/, '').trim())
        .find(l => l.length > 0 && !l.startsWith('!['));
      if (firstLine) {
        cleanTitle = firstLine.slice(0, 65);
      }
    }
    return {
      title: cleanTitle || 'Nota sin título',
      titleHtml: note.titleHtml || cleanTitle || 'Nota sin título',
      titleColor: note.titleColor || '',
      content: note.content || '',
      tags: Array.isArray(note.tags) ? note.tags : [],
      type: note.type || 'idea',
      color: note.color || 'amber',
      cover: note.cover || null,
      isPinned: !!(note.isPinned || note.pinned),
      isDeleted: !!note.isDeleted,
      deletedAt: note.deletedAt || null,
      updatedAt: note.updatedAt || new Date().toISOString()
    };
  }

  async loadNotes() {
    if (!this.isConnected) return null;
    try {
      this.updateStatus('syncing', 'Cargando base de datos...');
      const notesRef = this.getNotesCollection();
      if (!notesRef) return null;
      const q = query(notesRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        this.updateStatus('synced', 'Base de datos activa');
        return [];
      }

      const notes = [];
      snapshot.forEach(docSnap => {
        notes.push({ id: docSnap.id, ...docSnap.data() });
      });

      this.updateStatus('synced', 'Sincronizado en Cloud');
      return notes;
    } catch (e) {
      console.warn('Firestore load failed:', e);
      this.updateStatus('offline', 'Modo Local (Offline)');
      return null;
    }
  }

  listenLiveUpdates(onUpdate) {
    if (this.unsubscribeLive) {
      this.unsubscribeLive();
      this.unsubscribeLive = null;
    }
    if (!this.isConnected) return () => {};

    try {
      const notesRef = this.getNotesCollection();
      if (!notesRef) return () => {};
      const q = query(notesRef, orderBy('updatedAt', 'desc'));

      this.unsubscribeLive = onSnapshot(q, (snapshot) => {
        // Ignorar ecos locales pendientes para no interrumpir la escritura en curso
        if (snapshot.metadata.hasPendingWrites) return;

        const notes = [];
        snapshot.forEach(docSnap => {
          notes.push({ id: docSnap.id, ...docSnap.data() });
        });
        onUpdate(notes);
      }, (err) => {
        console.warn('Firestore snapshot error:', err);
      });
      return this.unsubscribeLive;
    } catch (e) {
      return () => {};
    }
  }

  async saveNote(note) {
    if (!this.isConnected || !note || !note.id) return;
    if (this.saveTimeouts.has(note.id)) {
      clearTimeout(this.saveTimeouts.get(note.id));
      this.saveTimeouts.delete(note.id);
    }
    this.pendingNotes.delete(note.id);

    try {
      this.updateStatus('syncing', 'Guardando en nube...');
      const noteRef = this.getNoteDoc(note.id);
      if (!noteRef) return;
      const dataToSave = this.serializeNote(note);
      await setDoc(noteRef, dataToSave, { merge: true });
      this.updateStatus('synced', 'Guardado en la nube');
    } catch (e) {
      console.warn('Firestore immediate save failed:', e);
      this.updateStatus('offline', 'Guardado localmente');
    }
  }

  saveNoteLive(note) {
    if (!this.isConnected || !note || !note.id) return;

    this.updateStatus('syncing', 'Sincronizando...');
    this.pendingNotes.set(note.id, { ...note });

    if (this.saveTimeouts.has(note.id)) {
      clearTimeout(this.saveTimeouts.get(note.id));
    }

    const timer = setTimeout(async () => {
      this.saveTimeouts.delete(note.id);
      const latestNote = this.pendingNotes.get(note.id) || note;
      this.pendingNotes.delete(note.id);
      await this.saveNote(latestNote);
    }, 350);

    this.saveTimeouts.set(note.id, timer);
  }

  async flushPendingSaves() {
    if (!this.isConnected || this.pendingNotes.size === 0) return;
    const entries = Array.from(this.pendingNotes.entries());
    this.pendingNotes.clear();
    for (const [noteId, timer] of this.saveTimeouts.entries()) {
      clearTimeout(timer);
    }
    this.saveTimeouts.clear();

    await Promise.all(
      entries.map(([_, note]) => this.saveNote(note))
    );
  }

  async deleteNote(noteId) {
    if (!this.isConnected || !noteId) return;
    if (this.saveTimeouts.has(noteId)) {
      clearTimeout(this.saveTimeouts.get(noteId));
      this.saveTimeouts.delete(noteId);
    }
    this.pendingNotes.delete(noteId);

    try {
      this.updateStatus('syncing', 'Eliminando en la nube...');
      const noteRef = this.getNoteDoc(noteId);
      if (!noteRef) return;
      await deleteDoc(noteRef);
      this.updateStatus('synced', 'Eliminado en la nube');
    } catch (e) {
      console.warn('Firestore delete failed:', e);
    }
  }

  async uploadNotesBatch(notes) {
    if (!this.isConnected || !notes || notes.length === 0) return;
    try {
      this.updateStatus('syncing', 'Sincronizando base de datos...');
      for (const note of notes) {
        if (!note || !note.id) continue;
        const noteRef = this.getNoteDoc(note.id);
        if (!noteRef) continue;
        const dataToSave = this.serializeNote(note);
        await setDoc(noteRef, dataToSave, { merge: true });
      }
      this.updateStatus('synced', 'Sincronizado en Cloud');
    } catch (e) {
      console.warn('Batch upload error:', e);
    }
  }
}

export const firebaseSync = new FirebaseSyncManager();
