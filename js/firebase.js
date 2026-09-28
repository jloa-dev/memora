/**
 * Memora - Supabase PostgreSQL Permanent Cloud Database & Google Auth
 * Almacenamiento relacional permanente en Supabase (tabla public.memora_notes)
 * con soporte para cuenta de Google y espacio cloud general.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

export const SUPABASE_URL = "https://rzdzsvbthtvashksixzk.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHpzdmJ0aHR2YXNoa3NpeHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTIxMTgsImV4cCI6MjEwMzg4ODExOH0.P-KuXsAGR5LftgUhuz-zEHDed0BSWX1N7zcv_lQ3cfw";
const TABLE_NAME = "memora_notes";
const DEFAULT_WORKSPACE_ID = "default_workspace";

export const firebaseConfig = {
  apiKey: "AIzaSyAS6PUqQRVvwrYaaVvzOGBgxgUlyFLIbCI",
  authDomain: "cuentas-951a9.firebaseapp.com",
  projectId: "cuentas-951a9",
  storageBucket: "cuentas-951a9.firebasestorage.app",
  messagingSenderId: "567396574781",
  appId: "1:567396574781:web:e994621ee3c9d240baac54"
};

class SupabaseCloudSyncManager {
  constructor() {
    this.supabase = null;
    this.app = null;
    this.auth = null;
    this.currentUser = null;
    this.isConnected = false;
    this.syncStatusCallback = null;
    this.authStatusCallback = null;
    this.saveTimeouts = new Map();
    this.pendingNotes = new Map();
    this.realtimeChannel = null;
    this.lastLocalWriteTime = 0;

    this.init();
  }

  init() {
    try {
      // 1. Inicializar cliente Supabase PostgreSQL
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
      });
      this.isConnected = true;

      // 2. Inicializar Google Auth
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);

      // 3. Garantizar vaciado inmediato (con keepalive) al ocultar o cerrar pestaña
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushPendingSaves(true);
        }
      });
      window.addEventListener('pagehide', () => {
        this.flushPendingSaves(true);
      });
      window.addEventListener('beforeunload', () => {
        this.flushPendingSaves(true);
      });

      // 4. Escuchar estado de cuenta Google
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user || null;
        if (user) {
          this.updateStatus('synced', `Supabase: ${user.displayName || user.email}`);
        } else {
          this.updateStatus('synced', 'Supabase: Conectado');
        }
        if (this.authStatusCallback) {
          this.authStatusCallback(this.currentUser);
        }
      });
    } catch (e) {
      console.warn('Error inicializando Supabase Cloud:', e);
      this.isConnected = true; // REST API sigue disponible vía fetch directo
    }
  }

  getActiveWorkspaceId() {
    if (this.currentUser && this.currentUser.uid) {
      return this.currentUser.uid;
    }
    return DEFAULT_WORKSPACE_ID;
  }

  getHeaders(prefer = 'return=minimal') {
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': prefer
    };
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
    await this.flushPendingSaves(true);
    this.updateStatus('syncing', 'Iniciando sesión con Google...');
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(this.auth, provider);
      this.currentUser = result.user;
      this.updateStatus('synced', `Supabase: ${this.currentUser.displayName || this.currentUser.email}`);
      return this.currentUser;
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      this.updateStatus('synced', 'Supabase: Conectado');
      throw err;
    }
  }

  async signOutUser() {
    if (!this.auth) return;
    await this.flushPendingSaves(true);
    if (this.realtimeChannel && this.supabase) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    await signOut(this.auth);
    this.currentUser = null;
    this.updateStatus('synced', 'Supabase: Conectado');
  }

  toDbRow(note) {
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
      workspace_id: this.getActiveWorkspaceId(),
      id: String(note.id),
      user_email: this.currentUser?.email || null,
      title: cleanTitle || 'Nota sin título',
      title_html: note.titleHtml || cleanTitle || 'Nota sin título',
      title_color: note.titleColor || '',
      content: note.content || '',
      tags: Array.isArray(note.tags) ? note.tags : [],
      type: note.type || 'idea',
      color: note.color || 'amber',
      cover: note.cover || null,
      is_pinned: !!(note.isPinned || note.pinned),
      is_deleted: !!note.isDeleted,
      deleted_at: note.deletedAt || null,
      updated_at: note.updatedAt || new Date().toISOString()
    };
  }

  fromDbRow(row) {
    return {
      id: row.id,
      title: row.title || 'Nota sin título',
      titleHtml: row.title_html || row.title || 'Nota sin título',
      titleColor: row.title_color || '',
      content: row.content || '',
      tags: Array.isArray(row.tags) ? row.tags : [],
      type: row.type || 'idea',
      color: row.color || 'amber',
      cover: row.cover || null,
      isPinned: !!row.is_pinned,
      pinned: !!row.is_pinned,
      isDeleted: !!row.is_deleted,
      deletedAt: row.deleted_at || null,
      updatedAt: row.updated_at || new Date().toISOString()
    };
  }

  async loadNotes() {
    try {
      this.updateStatus('syncing', 'Cargando desde Supabase...');
      const workspaceId = encodeURIComponent(this.getActiveWorkspaceId());
      const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?workspace_id=eq.${workspaceId}&order=updated_at.desc`;
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders('return=representation'),
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`Supabase HTTP ${res.status}`);
      }

      const rows = await res.json();
      const notes = Array.isArray(rows) ? rows.map(r => this.fromDbRow(r)) : [];
      this.updateStatus('synced', 'Sincronizado en Supabase');
      return notes;
    } catch (e) {
      console.warn('Supabase load failed:', e);
      this.updateStatus('offline', 'Modo Local (Offline)');
      return null;
    }
  }

  listenLiveUpdates(onUpdate) {
    if (this.realtimeChannel && this.supabase) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    if (!this.supabase) return () => {};

    const workspaceId = this.getActiveWorkspaceId();
    try {
      this.realtimeChannel = this.supabase
        .channel(`memora_notes_${workspaceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: TABLE_NAME,
            filter: `workspace_id=eq.${workspaceId}`
          },
          async () => {
            // Evitar recarga si el cambio fue originado localmente hace menos de 1.2s
            if (Date.now() - this.lastLocalWriteTime < 1200) return;
            const freshNotes = await this.loadNotes();
            if (freshNotes) {
              onUpdate(freshNotes);
            }
          }
        )
        .subscribe();

      return () => {
        if (this.realtimeChannel && this.supabase) {
          this.supabase.removeChannel(this.realtimeChannel);
          this.realtimeChannel = null;
        }
      };
    } catch (e) {
      return () => {};
    }
  }

  async saveNote(note, useKeepalive = false) {
    if (!note || !note.id) return;

    if (this.saveTimeouts.has(note.id)) {
      clearTimeout(this.saveTimeouts.get(note.id));
      this.saveTimeouts.delete(note.id);
    }
    this.pendingNotes.delete(note.id);

    try {
      this.lastLocalWriteTime = Date.now();
      this.updateStatus('syncing', 'Guardando en Supabase...');
      const row = this.toDbRow(note);
      const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?on_conflict=workspace_id,id`;

      // Si el payload es menor a 60KB podemos activar keepalive para garantizar escritura al cerrar pestaña
      const bodyStr = JSON.stringify([row]);
      const canKeepAlive = useKeepalive && bodyStr.length < 60000;

      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders('resolution=merge-duplicates,return=minimal'),
        body: bodyStr,
        keepalive: canKeepAlive
      });

      if (!res.ok) {
        throw new Error(`Supabase save error ${res.status}`);
      }
      this.updateStatus('synced', 'Guardado en Supabase');
    } catch (e) {
      console.warn('Supabase save failed:', e);
      this.updateStatus('offline', 'Guardado localmente');
    }
  }

  saveNoteLive(note) {
    if (!note || !note.id) return;

    this.updateStatus('syncing', 'Sincronizando con Supabase...');
    this.pendingNotes.set(note.id, { ...note });

    if (this.saveTimeouts.has(note.id)) {
      clearTimeout(this.saveTimeouts.get(note.id));
    }

    const timer = setTimeout(async () => {
      this.saveTimeouts.delete(note.id);
      const latestNote = this.pendingNotes.get(note.id) || note;
      this.pendingNotes.delete(note.id);
      await this.saveNote(latestNote, true);
    }, 300);

    this.saveTimeouts.set(note.id, timer);
  }

  async flushPendingSaves(useKeepalive = true) {
    if (this.pendingNotes.size === 0) return;
    const entries = Array.from(this.pendingNotes.entries());
    this.pendingNotes.clear();
    for (const [, timer] of this.saveTimeouts.entries()) {
      clearTimeout(timer);
    }
    this.saveTimeouts.clear();

    await Promise.all(
      entries.map(([, note]) => this.saveNote(note, useKeepalive))
    );
  }

  async deleteNote(noteId) {
    if (!noteId) return;
    if (this.saveTimeouts.has(noteId)) {
      clearTimeout(this.saveTimeouts.get(noteId));
      this.saveTimeouts.delete(noteId);
    }
    this.pendingNotes.delete(noteId);

    try {
      this.lastLocalWriteTime = Date.now();
      this.updateStatus('syncing', 'Eliminando en Supabase...');
      const workspaceId = encodeURIComponent(this.getActiveWorkspaceId());
      const idParam = encodeURIComponent(String(noteId));
      const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?workspace_id=eq.${workspaceId}&id=eq.${idParam}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders('return=minimal'),
        keepalive: true
      });

      if (!res.ok) {
        throw new Error(`Supabase delete error ${res.status}`);
      }
      this.updateStatus('synced', 'Eliminado en Supabase');
    } catch (e) {
      console.warn('Supabase delete failed:', e);
    }
  }

  async uploadNotesBatch(notes) {
    if (!notes || notes.length === 0) return;
    try {
      this.lastLocalWriteTime = Date.now();
      this.updateStatus('syncing', 'Sincronizando lote en Supabase...');
      const rows = notes.filter(n => n && n.id).map(n => this.toDbRow(n));
      if (rows.length === 0) return;

      const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?on_conflict=workspace_id,id`;
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders('resolution=merge-duplicates,return=minimal'),
        body: JSON.stringify(rows)
      });

      if (!res.ok) {
        throw new Error(`Supabase batch error ${res.status}`);
      }
      this.updateStatus('synced', 'Sincronizado en Supabase');
    } catch (e) {
      console.warn('Supabase batch upload error:', e);
    }
  }
}

export const firebaseSync = new SupabaseCloudSyncManager();
