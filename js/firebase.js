/**
 * AuraNotes / Memora - Firebase Cloud Synchronization & Google Authentication
 * Sincronización en tiempo real en Cloud Firestore y Auth con cuenta de Google.
 * Aislamiento estricto: Las notas pertenecen exclusivamente al usuario autenticado.
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

class FirebaseSyncManager {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.isConnected = false;
    this.syncStatusCallback = null;
    this.authStatusCallback = null;
    this.saveTimeout = null;
    this.unsubscribeLive = null;

    this.init();
  }

  init() {
    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);
      this.isConnected = true;

      // Escuchar cambios de estado de autenticación
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        if (user) {
          this.updateStatus('synced', `Conectado como ${user.displayName || user.email}`);
        } else {
          this.updateStatus('offline', 'Modo local (Sin cuenta Google)');
        }
        if (this.authStatusCallback) {
          this.authStatusCallback(user);
        }
      });
    } catch (e) {
      console.warn('Firebase init fallback to local storage:', e);
      this.isConnected = false;
    }
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
    this.updateStatus('syncing', 'Iniciando sesión con Google...');
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(this.auth, provider);
      this.currentUser = result.user;
      this.updateStatus('synced', `Sesión iniciada: ${this.currentUser.displayName || this.currentUser.email}`);
      return this.currentUser;
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      this.updateStatus('offline', 'Inicio de sesión cancelado');
      throw err;
    }
  }

  async signOutUser() {
    if (!this.auth) return;
    if (this.unsubscribeLive) {
      this.unsubscribeLive();
      this.unsubscribeLive = null;
    }
    await signOut(this.auth);
    this.currentUser = null;
    this.updateStatus('offline', 'Sesión cerrada');
  }

  getNotesCollection() {
    if (this.currentUser && this.currentUser.uid) {
      return collection(this.db, 'users', this.currentUser.uid, 'notes');
    }
    return null;
  }

  getNoteDoc(noteId) {
    if (this.currentUser && this.currentUser.uid) {
      return doc(this.db, 'users', this.currentUser.uid, 'notes', noteId);
    }
    return null;
  }

  async loadNotes() {
    if (!this.isConnected || !this.currentUser) return null;
    try {
      this.updateStatus('syncing', 'Cargando tus notas...');
      const notesRef = this.getNotesCollection();
      if (!notesRef) return null;
      const q = query(notesRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        this.updateStatus('synced', 'Espacio personal en la nube');
        return [];
      }

      const notes = [];
      snapshot.forEach(docSnap => {
        notes.push({ id: docSnap.id, ...docSnap.data() });
      });

      this.updateStatus('synced', 'Sincronizado con Firebase');
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
    if (!this.isConnected || !this.currentUser) return () => {};

    try {
      const notesRef = this.getNotesCollection();
      if (!notesRef) return () => {};
      const q = query(notesRef, orderBy('updatedAt', 'desc'));

      this.unsubscribeLive = onSnapshot(q, (snapshot) => {
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

  saveNoteLive(note) {
    if (!this.isConnected || !this.currentUser) return;

    this.updateStatus('syncing', 'Sincronizando...');
    clearTimeout(this.saveTimeout);

    this.saveTimeout = setTimeout(async () => {
      try {
        const noteRef = this.getNoteDoc(note.id);
        if (!noteRef) return;
        const dataToSave = {
          title: note.title || 'Sin título',
          content: note.content || '',
          tags: note.tags || [],
          type: note.type || 'idea',
          color: note.color || 'amber',
          cover: note.cover || null,
          isPinned: !!note.isPinned,
          isDeleted: !!note.isDeleted,
          deletedAt: note.deletedAt || null,
          updatedAt: note.updatedAt || new Date().toISOString()
        };
        await setDoc(noteRef, dataToSave, { merge: true });
        this.updateStatus('synced', 'Guardado en la nube');
      } catch (e) {
        console.warn('Firestore save failed:', e);
        this.updateStatus('offline', 'Guardado localmente');
      }
    }, 600);
  }

  async deleteNote(noteId) {
    if (!this.isConnected || !this.currentUser) return;
    try {
      this.updateStatus('syncing', 'Eliminando en la nube...');
      const noteRef = this.getNoteDoc(noteId);
      if (!noteRef) return;
      await deleteDoc(noteRef);
      this.updateStatus('synced', 'Eliminado en Firebase');
    } catch (e) {
      console.warn('Firestore delete failed:', e);
    }
  }

  async uploadNotesBatch(notes) {
    if (!this.isConnected || !this.currentUser || !notes || notes.length === 0) return;
    try {
      this.updateStatus('syncing', 'Guardando notas en tu cuenta...');
      for (const note of notes) {
        const noteRef = this.getNoteDoc(note.id);
        if (!noteRef) continue;
        const dataToSave = {
          title: note.title || 'Sin título',
          content: note.content || '',
          tags: note.tags || [],
          type: note.type || 'idea',
          color: note.color || 'amber',
          cover: note.cover || null,
          isPinned: !!note.isPinned,
          isDeleted: !!note.isDeleted,
          deletedAt: note.deletedAt || null,
          updatedAt: note.updatedAt || new Date().toISOString()
        };
        await setDoc(noteRef, dataToSave, { merge: true });
      }
      this.updateStatus('synced', 'Notas vinculadas a tu cuenta');
    } catch (e) {
      console.warn('Error en uploadNotesBatch:', e);
    }
  }
}

export const firebaseSync = new FirebaseSyncManager();
