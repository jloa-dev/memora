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
export const DEFAULT_WORKSPACE_ID = "default_workspace";

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
    this.currentUser = undefined; // undefined = pendiente de resolución, null = invitado, User = autenticado
    this.authResolved = false;
    this.authReadyPromise = new Promise((resolve) => {
      this._resolveAuthReady = resolve;
    });
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
        this.authResolved = true;
        if (this._resolveAuthReady) {
          this._resolveAuthReady(this.currentUser);
          this._resolveAuthReady = null;
        }
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
      console.warn('Error inicializando Supabase Cloud / Firebase Auth:', e);
      this.isConnected = true; // REST API sigue disponible vía fetch directo
      this.authResolved = true;
      this.currentUser = null;
      if (this._resolveAuthReady) {
        this._resolveAuthReady(null);
        this._resolveAuthReady = null;
      }
    }
  }

  waitForAuthReady() {
    if (this.authResolved) {
      return Promise.resolve(this.currentUser);
    }
    return this.authReadyPromise;
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
    if (this.authResolved && cb) {
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

  toDbRow(note, workspaceId = null) {
    const targetWorkspace = workspaceId || this.getActiveWorkspaceId();
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
      workspace_id: targetWorkspace,
      id: String(note.id),
      user_email: targetWorkspace === DEFAULT_WORKSPACE_ID ? null : (this.currentUser?.email || null),
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

  async loadNotes(workspaceId = null, signal = null) {
    if (workspaceId && typeof workspaceId === 'object' && ('aborted' in workspaceId || (typeof AbortSignal !== 'undefined' && workspaceId instanceof AbortSignal))) {
      signal = workspaceId;
      workspaceId = null;
    }
    const targetWorkspace = workspaceId || this.getActiveWorkspaceId();

    try {
      this.updateStatus('syncing', 'Cargando desde Supabase...');
      const encodedWs = encodeURIComponent(targetWorkspace);
      const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?workspace_id=eq.${encodedWs}&order=updated_at.desc`;
      const fetchOptions = {
        method: 'GET',
        headers: this.getHeaders('return=representation'),
        cache: 'no-store'
      };
      if (signal) fetchOptions.signal = signal;

      const res = await fetch(url, fetchOptions);

      if (!res.ok) {
        throw new Error(`Supabase HTTP ${res.status}`);
      }

      const rows = await res.json();
      const notes = Array.isArray(rows) ? rows.map(r => this.fromDbRow(r)) : [];
      this.updateStatus('synced', 'Sincronizado en Supabase');
      return notes;
    } catch (e) {
      if (e.name === 'AbortError' || signal?.aborted) {
        console.log(`[SupabaseSync] loadNotes abortado para workspace: ${targetWorkspace}`);
        return { aborted: true };
      }
      console.warn('Supabase load failed:', e);
      this.updateStatus('offline', 'Modo Local (Offline)');
      return null;
    }
  }

  listenLiveUpdates(workspaceIdOrCb = null, onUpdate = null) {
    let targetWorkspace = null;
    let callback = onUpdate;
    if (typeof workspaceIdOrCb === 'function') {
      callback = workspaceIdOrCb;
      targetWorkspace = this.getActiveWorkspaceId();
    } else {
      targetWorkspace = workspaceIdOrCb || this.getActiveWorkspaceId();
    }

    if (this.realtimeChannel && this.supabase) {
      try {
        this.supabase.removeChannel(this.realtimeChannel);
      } catch (e) {}
      this.realtimeChannel = null;
    }
    if (!this.supabase || !callback) return () => {};

    try {
      this.realtimeChannel = this.supabase
        .channel(`memora_notes_${targetWorkspace}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: TABLE_NAME,
            filter: `workspace_id=eq.${targetWorkspace}`
          },
          async () => {
            // Evitar recarga si el cambio fue originado localmente hace menos de 1.2s
            if (Date.now() - this.lastLocalWriteTime < 1200) return;
            const freshNotes = await this.loadNotes(targetWorkspace);
            if (Array.isArray(freshNotes)) {
              callback(freshNotes);
            }
          }
        )
        .subscribe();

      const activeChan = this.realtimeChannel;
      return () => {
        if (activeChan && this.supabase) {
          try {
            this.supabase.removeChannel(activeChan);
          } catch (e) {}
          if (this.realtimeChannel === activeChan) {
            this.realtimeChannel = null;
          }
        }
      };
    } catch (e) {
      return () => {};
    }
  }

  async saveNote(note, workspaceId = null, useKeepalive = false, signal = null) {
    if (!note || !note.id) return;
    if (typeof workspaceId === 'boolean') {
      useKeepalive = workspaceId;
      workspaceId = null;
    }
    if (workspaceId && typeof workspaceId === 'object' && ('aborted' in workspaceId || (typeof AbortSignal !== 'undefined' && workspaceId instanceof AbortSignal))) {
      signal = workspaceId;
      workspaceId = null;
    }
    if (typeof useKeepalive === 'object' && useKeepalive && ('aborted' in useKeepalive || (typeof AbortSignal !== 'undefined' && useKeepalive instanceof AbortSignal))) {
      signal = useKeepalive;
      useKeepalive = false;
    }
    const targetWorkspace = workspaceId || this.getActiveWorkspaceId();

    if (this.saveTimeouts.has(note.id)) {
      clearTimeout(this.saveTimeouts.get(note.id));
      this.saveTimeouts.delete(note.id);
    }
    this.pendingNotes.delete(note.id);

    try {
      this.lastLocalWriteTime = Date.now();
      this.updateStatus('syncing', 'Guardando en Supabase...');
      const row = this.toDbRow(note, targetWorkspace);
      const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?on_conflict=workspace_id,id`;

      // Si el payload es menor a 60KB podemos activar keepalive para garantizar escritura al cerrar pestaña
      const bodyStr = JSON.stringify([row]);
      const canKeepAlive = useKeepalive && bodyStr.length < 60000;

      const fetchOptions = {
        method: 'POST',
        headers: this.getHeaders('resolution=merge-duplicates,return=minimal'),
        body: bodyStr,
        keepalive: canKeepAlive
      };
      if (signal) fetchOptions.signal = signal;

      const res = await fetch(url, fetchOptions);

      if (!res.ok) {
        throw new Error(`Supabase save error ${res.status}`);
      }
      this.updateStatus('synced', 'Guardado en Supabase');
      return { success: true };
    } catch (e) {
      if (e.name === 'AbortError' || signal?.aborted) return { aborted: true };
      console.warn('Supabase save failed:', e);
      this.updateStatus('offline', 'Guardado localmente');
      return null;
    }
  }

  saveNoteLive(note, workspaceId = null) {
    if (!note || !note.id) return;
    const targetWorkspace = workspaceId || this.getActiveWorkspaceId();

    this.updateStatus('syncing', 'Sincronizando con Supabase...');
    this.pendingNotes.set(note.id, { note: { ...note }, workspaceId: targetWorkspace });

    if (this.saveTimeouts.has(note.id)) {
      clearTimeout(this.saveTimeouts.get(note.id));
    }

    const timer = setTimeout(async () => {
      this.saveTimeouts.delete(note.id);
      const item = this.pendingNotes.get(note.id);
      this.pendingNotes.delete(note.id);
      const noteToSave = item ? item.note : note;
      const wsToSave = item ? item.workspaceId : targetWorkspace;
      await this.saveNote(noteToSave, wsToSave, true);
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
      entries.map(([, item]) => {
        if (item && item.note) {
          return this.saveNote(item.note, item.workspaceId, useKeepalive);
        }
        return this.saveNote(item, null, useKeepalive);
      })
    );
  }

  async deleteNote(noteId, workspaceId = null, signal = null) {
    if (!noteId) return;
    if (workspaceId && typeof workspaceId === 'object' && ('aborted' in workspaceId || (typeof AbortSignal !== 'undefined' && workspaceId instanceof AbortSignal))) {
      signal = workspaceId;
      workspaceId = null;
    }
    const targetWorkspace = workspaceId || this.getActiveWorkspaceId();

    if (this.saveTimeouts.has(noteId)) {
      clearTimeout(this.saveTimeouts.get(noteId));
      this.saveTimeouts.delete(noteId);
    }
    this.pendingNotes.delete(noteId);

    try {
      this.lastLocalWriteTime = Date.now();
      this.updateStatus('syncing', 'Eliminando en Supabase...');
      const encodedWs = encodeURIComponent(targetWorkspace);
      const idParam = encodeURIComponent(String(noteId));
      const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?workspace_id=eq.${encodedWs}&id=eq.${idParam}`;

      const fetchOptions = {
        method: 'DELETE',
        headers: this.getHeaders('return=minimal'),
        keepalive: true
      };
      if (signal) fetchOptions.signal = signal;

      const res = await fetch(url, fetchOptions);

      if (!res.ok) {
        throw new Error(`Supabase delete error ${res.status}`);
      }
      this.updateStatus('synced', 'Eliminado en Supabase');
      return { success: true };
    } catch (e) {
      if (e.name === 'AbortError' || signal?.aborted) return { aborted: true };
      console.warn('Supabase delete failed:', e);
      return null;
    }
  }

  async uploadNotesBatch(notes, workspaceId = null, signal = null) {
    if (!notes || notes.length === 0) return;
    if (workspaceId && typeof workspaceId === 'object' && ('aborted' in workspaceId || (typeof AbortSignal !== 'undefined' && workspaceId instanceof AbortSignal))) {
      signal = workspaceId;
      workspaceId = null;
    }
    const targetWorkspace = workspaceId || this.getActiveWorkspaceId();

    try {
      this.lastLocalWriteTime = Date.now();
      this.updateStatus('syncing', 'Sincronizando lote en Supabase...');
      const rows = notes.filter(n => n && n.id).map(n => this.toDbRow(n, targetWorkspace));
      if (rows.length === 0) return;

      const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?on_conflict=workspace_id,id`;
      const fetchOptions = {
        method: 'POST',
        headers: this.getHeaders('resolution=merge-duplicates,return=minimal'),
        body: JSON.stringify(rows)
      };
      if (signal) fetchOptions.signal = signal;

      const res = await fetch(url, fetchOptions);

      if (!res.ok) {
        throw new Error(`Supabase batch error ${res.status}`);
      }
      this.updateStatus('synced', 'Sincronizado en Supabase');
      return { success: true };
    } catch (e) {
      if (e.name === 'AbortError' || signal?.aborted) return { aborted: true };
      console.warn('Supabase batch upload error:', e);
      return null;
    }
  }
}

export const firebaseSync = new SupabaseCloudSyncManager();
