/**
 * Memora - Pro Controller
 * Integra mejoras de Craft, Bear, Supernotes, Capacities, manejo de imágenes y sincronización con Firebase Firestore.
 */

import { haptics } from './audio.js';
import { NotesGraph } from './graph.js';
import { CommandPalette } from './commands.js?v=2.8.0';
import { firebaseSync } from './firebase.js?v=2.8.0';

const STORAGE_KEY = 'memora_data_v1';
const LEGACY_STORAGE_KEY = 'auranotes_data_v2';
const THEME_KEY = 'memora_theme';
const FONT_SIZE_KEY = 'memora_font_size';

const OBJECT_TYPES = {
  idea: {
    label: 'Idea',
    icon: '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M9 18h6M10 22h4M15 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg>',
    color: '#d97706'
  },
  project: {
    label: 'Proyecto',
    icon: '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    color: '#2563eb'
  },
  research: {
    label: 'Investigación',
    icon: '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="1.5" fill="none"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>',
    color: '#059669'
  },
  meeting: {
    label: 'Reunión',
    icon: '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="1.5" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    color: '#7c3aed'
  },
  journal: {
    label: 'Diario',
    icon: '<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    color: '#e11d48'
  }
};

const DEFAULT_COVERS = [
  'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #93c5fd 100%)',
  'linear-gradient(135deg, #78350f 0%, #d97706 50%, #fde68a 100%)',
  'linear-gradient(135deg, #064e3b 0%, #059669 50%, #a7f3d0 100%)',
  'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #ddd6fe 100%)',
  'linear-gradient(135deg, #881337 0%, #e11d48 50%, #fecdd3 100%)'
];

const SEED_NOTES = [
  {
    id: 'note_1',
    title: 'Manifiesto de Diseño & Segundo Cerebro',
    type: 'idea',
    color: 'amber',
    isPinned: true,
    cover: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #fde68a 100%)',
    tags: ['Arquitectura', 'Diseño', 'Productividad'],
    updatedAt: new Date().toISOString(),
    content: `# Manifiesto de Diseño Editorial

Un apunte no debe sentirse como una base de datos estéril, sino como un lienzo de pensamiento continuo donde cada idea tiene peso y fluidez.

> [!IDEA]
> La simplicidad no es la ausencia de funciones, sino la claridad en la ejecución y la jerarquía visual sin fricciones.

### Pilares Fundamentales
- [x] Tipografía jerárquica con escala proporcional armónica
- [x] Micro-interacciones hápticas mediante Web Audio API
- [x] Conexión de conceptos mediante red de nodos interactiva y muro de tarjetas
- [x] Sincronización en la nube con Firebase Firestore sin fricción de login

Para profundizar en la implementación visual y técnica, consulta [[Arquitectura de Interfaces de Alta Gama]].

Las mejores ideas nacen cuando la herramienta desaparece y solo queda el pensamiento.`
  },
  {
    id: 'note_2',
    title: 'Arquitectura de Interfaces de Alta Gama',
    type: 'project',
    color: 'blue',
    isPinned: false,
    cover: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #93c5fd 100%)',
    tags: ['Arquitectura', 'Frontend'],
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    content: `# Arquitectura Frontend sin AI-Slop

Para construir herramientas que perduren:
1. Rechazar gradientes genéricos y fuentes estándar sin intención.
2. Priorizar el rendimiento Above-The-Fold con carga inmediata.
3. Respetar las curvas de aceleración natural: \`cubic-bezier(0.16, 1, 0.3, 1)\`.

Este estándar complementa los principios del [[Manifiesto de Diseño & Segundo Cerebro]].

### Checklist de Calidad
- [x] Cero emojis usados como iconos decorativos en la interfaz
- [x] 100% interactivos con \`cursor: pointer\`
- [x] Soporte a catálogo de temas (Dark Obsidian, Warm Paper, Solarized, Dracula, Sepia)`
  },
  {
    id: 'note_3',
    title: 'Bitácora de Investigación de Nuevos Modelos',
    type: 'research',
    color: 'emerald',
    cover: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #a7f3d0 100%)',
    tags: ['Investigación', 'Modelos'],
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    content: `# Líneas de Exploración Activas

- **Modularidad por Notecards**: Visualización en cuadrícula que previene la fatiga de lectura.
- **Tipado de Objetos**: Categorizar las notas según su propósito (Idea, Proyecto, Investigación).
- **Subida de Imágenes**: Compatibilidad completa para arrastrar y soltar diagramas en el texto.`
  }
];

export class MemoraApp {
  constructor() {
    this.notes = [];
    this.activeNoteId = null;
    this.currentView = 'editor';
    this.activeObjectFilter = 'all';
    this.graph = null;
    this.cmdPalette = null;
    this.contextTargetNoteId = null;

    // Estados para mejoras avanzadas
    this.isZenMode = false;
    this.sidebarFilterQuery = '';
    this.slashMenuOpen = false;
    this.slashMenuSelectedIndex = 0;
    this.wikiMenuOpen = false;
    this.wikiMenuSelectedIndex = 0;

    this.init();
  }

  async init() {
    this.loadTheme();
    this.loadFontSize();
    this.loadLocalNotes();
    this.bindDOM();
    this.initModules();
    this.renderNoteList();

    if (this.notes.length > 0) {
      this.selectNote(this.notes[0].id, false);
    }

    // Inicializar mejoras de interacción Dream Team
    this.setupTabIndicator();
    this.setupFloatingToolbar();
    this.setupContextMenu();
    this.setupSidebarFilter();
    this.setupZenMode();
    this.setupSlashMenu();
    this.setupWikiLinks();
    this.setupLiveMarkdownShortcuts();

    // Iniciar conexión y sincronización con Firebase
    this.initCloudSync();
  }

  initCloudSync() {
    firebaseSync.onStatusChange((status, text) => {
      this.updateSyncBadge(status, text);
    });

    firebaseSync.onAuthStateChange(async (user) => {
      await this.handleAuthState(user);
    });
  }

  async handleAuthState(user) {
    this.currentUser = user;
    this.updateAuthUI(user);
    await this.syncUserData(user);
  }

  updateAuthUI(user) {
    const isLogged = !!user;

    // Sidebar auth widget
    if (this.dom.authLoggedOut) this.dom.authLoggedOut.style.display = isLogged ? 'none' : 'block';
    if (this.dom.authLoggedIn) this.dom.authLoggedIn.style.display = isLogged ? 'block' : 'none';

    // Settings modal auth widget
    if (this.dom.settingsAuthLoggedOut) this.dom.settingsAuthLoggedOut.style.display = isLogged ? 'none' : 'block';
    if (this.dom.settingsAuthLoggedIn) this.dom.settingsAuthLoggedIn.style.display = isLogged ? 'block' : 'none';

    if (user) {
      const displayName = user.displayName || user.email?.split('@')[0] || 'Usuario';
      const email = user.email || '';
      const initial = (displayName || email || 'U')[0].toUpperCase();

      if (this.dom.userDisplayName) this.dom.userDisplayName.textContent = displayName;
      if (this.dom.userEmail) this.dom.userEmail.textContent = email;
      if (this.dom.settingsDisplayName) this.dom.settingsDisplayName.textContent = displayName;
      if (this.dom.settingsEmail) this.dom.settingsEmail.textContent = email;
      if (this.dom.settingsUid) this.dom.settingsUid.textContent = user.uid;

      if (user.photoURL) {
        if (this.dom.userAvatarImg) {
          this.dom.userAvatarImg.src = user.photoURL;
          this.dom.userAvatarImg.style.display = 'block';
        }
        if (this.dom.userAvatarFallback) this.dom.userAvatarFallback.style.display = 'none';

        if (this.dom.settingsAvatarImg) {
          this.dom.settingsAvatarImg.src = user.photoURL;
          this.dom.settingsAvatarImg.style.display = 'block';
        }
        if (this.dom.settingsAvatarFallback) this.dom.settingsAvatarFallback.style.display = 'none';
      } else {
        if (this.dom.userAvatarImg) this.dom.userAvatarImg.style.display = 'none';
        if (this.dom.userAvatarFallback) {
          this.dom.userAvatarFallback.textContent = initial;
          this.dom.userAvatarFallback.style.display = 'flex';
        }

        if (this.dom.settingsAvatarImg) this.dom.settingsAvatarImg.style.display = 'none';
        if (this.dom.settingsAvatarFallback) {
          this.dom.settingsAvatarFallback.textContent = initial;
          this.dom.settingsAvatarFallback.style.display = 'flex';
        }
      }
    }
  }

  createStarterUserNotes(user) {
    const name = user?.displayName ? user.displayName.split(' ')[0] : 'Usuario';
    return [
      {
        id: 'note_' + Date.now(),
        title: `Mi Espacio de Notas`,
        type: 'idea',
        color: 'amber',
        isPinned: true,
        cover: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #93c5fd 100%)',
        tags: ['Personal', 'Primer Apunte'],
        updatedAt: new Date().toISOString(),
        content: `# Bienvenido a tu Espacio Personal

Hola ${name}, este es tu cuaderno exclusivo en la nube. Todas las notas y proyectos que crees aquí están vinculados únicamente a tu cuenta de Google (${user?.email || ''}) y se sincronizan en tiempo real mediante Firebase Firestore.

### Características de tu cuenta
- [x] **Aislamiento total**: Las notas de este espacio son tuyas y privadas.
- [x] **Sincronización en la nube**: Cualquier cambio se guarda al instante en tu Firestore.
- [x] **Organización**: Usa tipos de apuntes (Idea, Proyecto, Docs, etc.) y fija notas clave arriba.

Escribe libremente aquí tu primer apunte o pensamiento.`
      }
    ];
  }

  async syncUserData(user) {
    // 1. Cargar notas desde Cloud Firestore (espacio privado del usuario Google o espacio cloud por defecto)
    const remoteNotes = await firebaseSync.loadNotes();
    if (remoteNotes && remoteNotes.length > 0) {
      remoteNotes.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      this.notes = remoteNotes;
    } else {
      // Si la colección remota aún está vacía, recuperar del caché local correspondiente o inicializar semilla
      const localKey = this.getStorageKey();
      const localSaved = localStorage.getItem(localKey);
      if (localSaved) {
        try {
          this.notes = JSON.parse(localSaved);
        } catch (e) {
          this.notes = user ? this.createStarterUserNotes(user) : SEED_NOTES;
        }
      } else {
        this.notes = user ? this.createStarterUserNotes(user) : SEED_NOTES;
      }
      await firebaseSync.uploadNotesBatch(this.notes);
    }

    this.saveLocalNotes();
    this.renderNoteList();
    const activeNotes = this.getActiveNotes();
    if (activeNotes.length > 0) {
      const keepCurrent = activeNotes.find(n => n.id === this.activeNoteId);
      this.selectNote(keepCurrent ? keepCurrent.id : activeNotes[0].id, false);
    }

    // 2. Escuchar cambios en vivo desde Cloud Firestore
    firebaseSync.listenLiveUpdates((updatedNotes) => {
      if (updatedNotes && updatedNotes.length > 0) {
        const isTyping =
          document.activeElement === this.dom.titleInput ||
          document.activeElement === this.dom.editorBody ||
          (this.dom.editorBody && this.dom.editorBody.contains(document.activeElement));

        updatedNotes.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

        if (isTyping && this.activeNoteId) {
          const currentLocal = this.notes.find(n => n.id === this.activeNoteId);
          if (currentLocal) {
            const idx = updatedNotes.findIndex(n => n.id === this.activeNoteId);
            if (idx > -1) {
              updatedNotes[idx] = currentLocal;
            } else {
              updatedNotes.unshift(currentLocal);
            }
          }
        }

        this.notes = updatedNotes;
        this.saveLocalNotes();
        this.renderNoteList();
        if (!isTyping && this.activeNoteId) {
          const active = this.notes.find(n => n.id === this.activeNoteId && !n.isDeleted);
          if (active) {
            this.selectNote(active.id, false);
          }
        }
        if (this.currentView === 'broadsheet') this.renderBroadsheet();
        if (this.currentView === 'graph' && this.graph) this.graph.setData(this.getActiveNotes());
      }
    });
  }

  async handleGoogleLogin() {
    try {
      this.showToast('Iniciando sesión con Google...');
      const user = await firebaseSync.signInWithGoogle();
      this.showToast(`¡Sesión iniciada como ${user.displayName || 'Usuario'}!`);
    } catch (err) {
      console.warn('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        this.showToast('Inicio de sesión cancelado.');
      } else if (err.code === 'auth/unauthorized-domain') {
        this.showToast('Dominio no autorizado en Firebase Console.');
      } else {
        this.showToast('Error al conectar con Google.');
      }
    }
  }

  async handleSignOut() {
    try {
      await firebaseSync.signOutUser();
      this.currentUser = null;
      this.updateAuthUI(null);
      await this.syncUserData(null);
      this.showToast('Has cerrado sesión en Google.');
    } catch (err) {
      console.warn('Signout error:', err);
    }
  }

  async handleForceSyncCloud() {
    this.showToast('Sincronizando notas con la base de datos en la nube...');
    await firebaseSync.flushPendingSaves();
    await firebaseSync.uploadNotesBatch(this.notes);
    this.showToast('Base de datos sincronizada permanentemente.');
  }

  updateSyncBadge(status, text) {
    const dot = document.querySelector('#syncPill .status-dot');
    const label = document.querySelector('#syncPill span');
    if (dot && label) {
      dot.className = 'status-dot';
      if (status === 'syncing') dot.classList.add('syncing');
      if (status === 'offline') dot.classList.add('offline');
      label.textContent = text || 'Guardado';
    }
  }

  loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll('.theme-chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
    });
    this.showToast(`Tema activado: ${theme}`);
    if (this.currentView === 'graph' && this.graph) this.graph.render();
  }

  loadFontSize() {
    const size = localStorage.getItem(FONT_SIZE_KEY) || 'normal';
    this.setFontSize(size, false);
  }

  setFontSize(size, notify = true) {
    let px = '1.06rem';
    if (size === 'small') px = '0.96rem';
    if (size === 'large') px = '1.2rem';

    document.documentElement.style.setProperty('--editor-font-size', px);
    localStorage.setItem(FONT_SIZE_KEY, size);

    document.querySelectorAll('.typo-size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-size') === size);
    });

    if (notify) this.showToast(`Tamaño de fuente: ${size}`);
  }

  getStorageKey() {
    if (this.currentUser && this.currentUser.uid) {
      return `memora_user_${this.currentUser.uid}_notes`;
    }
    return 'memora_guest_notes';
  }

  loadLocalNotes() {
    try {
      const key = this.getStorageKey();
      const data = localStorage.getItem(key);
      if (data) {
        this.notes = JSON.parse(data);
      } else {
        if (this.currentUser) {
          this.notes = this.createStarterUserNotes(this.currentUser);
        } else {
          this.notes = SEED_NOTES;
        }
      }
    } catch (e) {
      this.notes = this.currentUser ? this.createStarterUserNotes(this.currentUser) : SEED_NOTES;
    }
    this.notes.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }

  saveLocalNotes() {
    try {
      const key = this.getStorageKey();
      localStorage.setItem(key, JSON.stringify(this.notes));
    } catch (e) {}
  }

  bindDOM() {
    this.dom = {
      notesList: document.getElementById('notesList'),
      noteCountBadge: document.getElementById('noteCountBadge'),
      titleInput: document.getElementById('editorTitle'),
      bodyTextarea: document.getElementById('editorBody'),
      editorBody: document.getElementById('editorBody'),
      renderedPreview: document.getElementById('renderedPreview'),
      tagsContainer: document.getElementById('tagsContainer'),
      dateDisplay: document.getElementById('editorDate'),
      wordCountPill: document.getElementById('wordCountPill'),
      readTimePill: document.getElementById('readTimePill'),
      syncPill: document.getElementById('syncPill'),
      btnNewNote: document.getElementById('btnNewNote'),
      btnSearchTrigger: document.getElementById('searchTrigger'),
      btnOpenSettings: document.getElementById('btnOpenSettings'),
      settingsModal: document.getElementById('settingsModal'),
      btnCloseSettings: document.getElementById('btnCloseSettings'),
      tabEditor: document.getElementById('tabEditor'),
      tabPreview: document.getElementById('tabPreview'),
      tabBroadsheet: document.getElementById('tabBroadsheet'),
      tabGraph: document.getElementById('tabGraph'),
      broadsheetContainer: document.getElementById('broadsheetContainer'),
      broadsheetGrid: document.getElementById('broadsheetGrid'),
      graphContainer: document.getElementById('graphContainer'),
      graphCanvas: document.getElementById('graphCanvas'),
      sidebar: document.getElementById('sidebar'),
      btnToggleSidebar: document.getElementById('btnToggleSidebar'),
      slideDrawer: document.getElementById('slideDrawer'),
      drawerBackdrop: document.getElementById('drawerBackdrop'),
      btnCloseDrawer: document.getElementById('btnCloseDrawer'),
      btnOpenDrawer: document.getElementById('btnOpenDrawer'),
      toastContainer: document.getElementById('toastContainer'),
      coverContainer: document.getElementById('coverBannerContainer'),
      btnToggleCover: document.getElementById('btnToggleCover'),
      btnChangeCover: document.getElementById('btnChangeCover'),
      btnRemoveCover: document.getElementById('btnRemoveCover'),
      objTypePicker: document.getElementById('objTypePicker'),
      colorPickerGroup: document.getElementById('colorPickerGroup'),
      fileInputImage: document.getElementById('fileInputImage'),
      sidebarResizer: document.getElementById('sidebarResizer'),
      filterTabsContainer: document.querySelector('.object-filter-tabs'),
      sidebarQuickFilter: document.getElementById('sidebarQuickFilter'),
      btnClearFilter: document.getElementById('btnClearFilter'),
      btnToggleZen: document.getElementById('btnToggleZen'),
      btnExitZen: document.getElementById('btnExitZen'),
      slashMenu: document.getElementById('slashMenu'),
      slashMenuItems: document.getElementById('slashMenuItems'),
      wikiLinkMenu: document.getElementById('wikiLinkMenu'),
      wikiMenuList: document.getElementById('wikiMenuList'),
      ctxPin: document.getElementById('ctxPin'),
      ctxPinLabel: document.getElementById('ctxPinLabel'),
      btnGoogleSignIn: document.getElementById('btnGoogleSignIn'),
      btnSignOut: document.getElementById('btnSignOut'),
      authLoggedOut: document.getElementById('authLoggedOut'),
      authLoggedIn: document.getElementById('authLoggedIn'),
      userAvatarImg: document.getElementById('userAvatarImg'),
      userAvatarFallback: document.getElementById('userAvatarFallback'),
      userDisplayName: document.getElementById('userDisplayName'),
      userEmail: document.getElementById('userEmail'),
      btnSettingsGoogleSignIn: document.getElementById('btnSettingsGoogleSignIn'),
      btnSettingsSignOut: document.getElementById('btnSettingsSignOut'),
      btnForceSyncCloud: document.getElementById('btnForceSyncCloud'),
      settingsAuthLoggedOut: document.getElementById('settingsAuthLoggedOut'),
      settingsAuthLoggedIn: document.getElementById('settingsAuthLoggedIn'),
      settingsAvatarImg: document.getElementById('settingsAvatarImg'),
      settingsAvatarFallback: document.getElementById('settingsAvatarFallback'),
      settingsDisplayName: document.getElementById('settingsDisplayName'),
      settingsEmail: document.getElementById('settingsEmail'),
      settingsUid: document.getElementById('settingsUid'),
      btnOpenTrash: document.getElementById('btnOpenTrash'),
      btnCloseTrash: document.getElementById('btnCloseTrash'),
      btnEmptyTrash: document.getElementById('btnEmptyTrash'),
      trashModal: document.getElementById('trashModal'),
      trashList: document.getElementById('trashList'),
      trashEmptyState: document.getElementById('trashEmptyState'),
      trashBadgeCount: document.getElementById('trashBadgeCount')
    };

    // Configuración de titleInput (ContentEditable H1)
    if (this.dom.titleInput) {
      Object.defineProperty(this.dom.titleInput, 'value', {
        get() {
          return this.innerText ? this.innerText.replace(/\r?\n/g, ' ').trim() : '';
        },
        set(val) {
          this.innerHTML = val || '';
        },
        configurable: true
      });

      this.dom.titleInput.select = function() {
        const range = document.createRange();
        range.selectNodeContents(this);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      };

      this.dom.titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.dom.editorBody.focus();
        }
      });

      this.dom.titleInput.addEventListener('focus', () => {
        this.lastFocusedElement = this.dom.titleInput;
      });
      this.dom.editorBody?.addEventListener('focus', () => {
        this.lastFocusedElement = this.dom.editorBody;
      });
    }

    // Eventos de edición
    this.dom.titleInput.addEventListener('input', () => this.onNoteChanged());
    this.dom.editorBody.addEventListener('input', () => {
      this.onNoteChanged();
      this.updateTelemetry();
    });

    // Soporte para pegar imágenes directamente (Ctrl+V)
    this.dom.editorBody.addEventListener('paste', (e) => this.handlePasteImage(e));

    // Arrastrar y soltar imágenes
    this.setupDragAndDrop();

    // Botones de acción principales
    this.dom.btnNewNote.addEventListener('click', () => {
      haptics.playTap();
      this.createNewNote();
    });

    this.dom.btnSearchTrigger.addEventListener('click', () => {
      haptics.playTap();
      this.cmdPalette.open();
    });

    // Settings Modal
    this.dom.btnOpenSettings?.addEventListener('click', () => {
      haptics.playTap();
      this.dom.settingsModal.classList.add('open');
    });

    this.dom.btnCloseSettings?.addEventListener('click', () => {
      haptics.playTap();
      this.dom.settingsModal.classList.remove('open');
    });

    this.dom.settingsModal?.addEventListener('click', (e) => {
      if (e.target === this.dom.settingsModal) {
        this.dom.settingsModal.classList.remove('open');
      }
    });

    // Google Auth & Cloud Sync Actions
    this.dom.btnGoogleSignIn?.addEventListener('click', () => {
      haptics.playTap();
      this.handleGoogleLogin();
    });

    this.dom.btnSettingsGoogleSignIn?.addEventListener('click', () => {
      haptics.playTap();
      this.handleGoogleLogin();
    });

    this.dom.btnSignOut?.addEventListener('click', () => {
      haptics.playTap();
      this.handleSignOut();
    });

    this.dom.btnSettingsSignOut?.addEventListener('click', () => {
      haptics.playTap();
      this.handleSignOut();
    });

    this.dom.btnForceSyncCloud?.addEventListener('click', () => {
      haptics.playTap();
      this.handleForceSyncCloud();
    });

    // Trash Modal Actions
    this.dom.btnOpenTrash?.addEventListener('click', () => {
      haptics.playTap();
      this.openTrashModal();
    });

    this.dom.btnCloseTrash?.addEventListener('click', () => {
      haptics.playTap();
      this.closeTrashModal();
    });

    this.dom.btnEmptyTrash?.addEventListener('click', () => {
      haptics.playTap();
      this.emptyTrash();
    });

    this.dom.trashModal?.addEventListener('click', (e) => {
      if (e.target === this.dom.trashModal) {
        this.closeTrashModal();
      }
    });

    // Theme chips
    document.querySelectorAll('.theme-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        haptics.playTap();
        const theme = btn.getAttribute('data-theme');
        this.setTheme(theme);
      });
    });

    // Typography size buttons
    document.querySelectorAll('.typo-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        haptics.playTap();
        const size = btn.getAttribute('data-size');
        this.setFontSize(size);
      });
    });

    // Filtros de Objetos (Capacities style)
    document.querySelectorAll('.obj-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        haptics.playTap();
        document.querySelectorAll('.obj-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeObjectFilter = btn.getAttribute('data-filter');
        this.renderNoteList();
        if (this.currentView === 'broadsheet') this.renderBroadsheet();
      });
    });

    // Selector de Tipo de Objeto en la nota activa
    this.dom.objTypePicker?.addEventListener('click', () => {
      haptics.playTap();
      this.cycleObjectType();
    });

    // Paleta cromática para texto y acentos
    const COLOR_HEX_MAP = {
      amber: '#f59e0b',
      blue: '#3b82f6',
      emerald: '#10b981',
      purple: '#a855f7',
      rose: '#f43f5e',
      slate: '#94a3b8'
    };

    // Color picker de tarjeta y texto seleccionado (Título y Cuerpo)
    this.dom.colorPickerGroup?.querySelectorAll('.color-dot-btn').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        // Crucial para no perder la selección activa en el título o en el editor
        e.preventDefault();
      });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const color = btn.getAttribute('data-color');
        const hex = COLOR_HEX_MAP[color] || color;

        // 1. Si hay texto seleccionado en el título o en el editor, pintarlo
        const sel = window.getSelection();
        let appliedToSelection = false;

        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const inTitle = this.dom.titleInput && (this.dom.titleInput === container || this.dom.titleInput.contains(container));
          const inBody = this.dom.editorBody && (this.dom.editorBody === container || this.dom.editorBody.contains(container));

          if (inTitle || inBody) {
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('foreColor', false, hex);
            appliedToSelection = true;
            this.onNoteChanged();
            this.updateTelemetry();
            haptics.playTap();
          }
        }

        // 2. Si el foco está en el título sin selección parcial, aplicar color al título entero
        if (!appliedToSelection && (document.activeElement === this.dom.titleInput || this.lastFocusedElement === this.dom.titleInput)) {
          this.dom.titleInput.style.color = hex;
          const note = this.notes.find(n => n.id === this.activeNoteId);
          if (note) {
            note.titleColor = hex;
            this.onNoteChanged();
          }
          haptics.playTap();
        }

        // 3. Aplicar color temático del apunte (Supernotes card color)
        this.setNoteColor(color);
      });
    });

    // Portadas
    this.dom.btnToggleCover?.addEventListener('click', () => this.toggleCover());
    this.dom.btnChangeCover?.addEventListener('click', () => this.changeCoverPrompt());
    this.dom.btnRemoveCover?.addEventListener('click', () => this.removeCover());

    // Fijar / Desfijar apunte activo
    document.getElementById('btnTogglePin')?.addEventListener('click', () => {
      if (this.activeNoteId) {
        this.togglePinNote(this.activeNoteId);
      }
    });

    // Inserción de Imágenes
    document.getElementById('btnInsertImage')?.addEventListener('click', () => {
      haptics.playTap();
      this.dom.fileInputImage.click();
    });

    this.dom.fileInputImage?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processAndInsertImage(file);
      e.target.value = '';
    });

    // Tabs de vista
    this.dom.tabEditor.addEventListener('click', () => {
      haptics.playTap();
      this.switchView('editor');
    });

    this.dom.tabPreview.addEventListener('click', () => {
      haptics.playTap();
      this.switchView('preview');
    });

    this.dom.tabBroadsheet.addEventListener('click', () => {
      haptics.playTap();
      this.switchView('broadsheet');
    });

    this.dom.tabGraph.addEventListener('click', () => {
      haptics.playTap();
      this.switchView('graph');
    });

    // Drawer y Sidebar móvil
    this.dom.btnToggleSidebar.addEventListener('click', () => {
      haptics.playTap();
      this.dom.sidebar.classList.toggle('open');
    });

    this.dom.btnOpenDrawer.addEventListener('click', () => {
      haptics.playTap();
      this.openExportDrawer();
    });

    this.dom.btnCloseDrawer.addEventListener('click', () => {
      haptics.playTap();
      this.closeExportDrawer();
    });

    this.dom.drawerBackdrop?.addEventListener('click', () => {
      this.closeExportDrawer();
    });

    // Cerrar modal o drawer con tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.dom.slideDrawer.classList.contains('open')) {
          this.closeExportDrawer();
        }
        if (this.dom.settingsModal?.classList.contains('open')) {
          this.dom.settingsModal.classList.remove('open');
        }
      }
    });

    // Exportaciones
    document.getElementById('btnExportMD')?.addEventListener('click', () => this.exportCurrentNote('markdown'));
    document.getElementById('btnExportHTML')?.addEventListener('click', () => this.exportCurrentNote('html'));
    document.getElementById('btnExportJSON')?.addEventListener('click', () => this.exportAllNotesJSON());
    document.getElementById('btnDeleteCurrentNote')?.addEventListener('click', () => this.deleteCurrentNote());

    // Toolbar de formato
    document.querySelectorAll('.tool-btn[data-format]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const fmt = btn.getAttribute('data-format');
        this.applyFormat(fmt);
      });
    });

    // Controles de zoom de grafo
    document.getElementById('btnGraphZoomIn')?.addEventListener('click', () => this.graph?.zoomIn());
    document.getElementById('btnGraphZoomOut')?.addEventListener('click', () => this.graph?.zoomOut());
    document.getElementById('btnGraphReset')?.addEventListener('click', () => this.graph?.resetView());

    // Inicializar Redimensionamiento de Barra Lateral y Arrastre Horizontal
    this.setupSidebarResizer();
    this.setupFilterTabsDragScroll();
  }

  setupSidebarResizer() {
    const resizer = this.dom.sidebarResizer;
    const sidebar = this.dom.sidebar;
    if (!resizer || !sidebar) return;

    // Restaurar ancho guardado previamente
    const savedWidth = localStorage.getItem('auranotes_sidebar_width');
    if (savedWidth) {
      const w = parseInt(savedWidth, 10);
      if (w >= 240 && w <= 650) {
        sidebar.style.width = `${w}px`;
        sidebar.style.minWidth = `${w}px`;
      }
    }

    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      resizer.classList.add('is-resizing');
      document.body.classList.add('is-resizing-sidebar');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(250, Math.min(650, e.clientX));
      sidebar.style.width = `${newWidth}px`;
      sidebar.style.minWidth = `${newWidth}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('is-resizing');
        document.body.classList.remove('is-resizing-sidebar');
        localStorage.setItem('auranotes_sidebar_width', parseInt(sidebar.style.width, 10));
      }
    });
  }

  setupFilterTabsDragScroll() {
    const tabs = this.dom.filterTabsContainer;
    if (!tabs) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    tabs.addEventListener('mousedown', (e) => {
      isDown = true;
      hasMoved = false;
      tabs.classList.add('grabbing');
      startX = e.pageX - tabs.offsetLeft;
      scrollLeft = tabs.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        tabs.classList.remove('grabbing');
      }
    });

    tabs.addEventListener('mouseleave', () => {
      if (isDown) {
        isDown = false;
        tabs.classList.remove('grabbing');
      }
    });

    tabs.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - tabs.offsetLeft;
      const walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 4) {
        hasMoved = true;
      }
      tabs.scrollLeft = scrollLeft - walk;
    });

    // Evitar que el clic en un filtro cambie de categoría si se estaba arrastrando horizontalmente
    tabs.querySelectorAll('.obj-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (hasMoved) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      }, true);
    });
  }

  initModules() {
    this.graph = new NotesGraph(this.dom.graphCanvas, (noteId) => {
      haptics.playSwitch();
      this.selectNote(noteId);
      this.switchView('editor');
    });

    this.cmdPalette = new CommandPalette(this);
  }

  createNewNote() {
    const newNote = {
      id: `note_${Date.now()}`,
      title: 'Nota sin título',
      type: 'idea',
      color: 'amber',
      cover: null,
      tags: ['Ideas'],
      updatedAt: new Date().toISOString(),
      content: ''
    };
    this.notes.unshift(newNote);
    this.saveLocalNotes();
    firebaseSync.saveNote(newNote);
    this.renderNoteList();
    this.selectNote(newNote.id);
    this.dom.titleInput.focus();
    this.dom.titleInput.select();
    this.showToast('Nueva nota creada');
    haptics.playChime();
  }

  selectNote(id, playSound = true) {
    const note = this.notes.find(n => n.id === id);
    if (!note) return;

    this.activeNoteId = id;
    if (this.dom.titleInput) {
      if (note.titleHtml) {
        this.dom.titleInput.innerHTML = note.titleHtml;
      } else {
        this.dom.titleInput.innerHTML = note.title || '';
      }
      this.dom.titleInput.style.color = note.titleColor || '';
    }
    this.setEditorContent(note.content);

    // Actualizar portada
    this.renderCover(note.cover);

    // Actualizar tipo de objeto e indicador
    this.updateObjectTypeDisplay(note.type || 'idea');

    // Actualizar color seleccionado
    this.updateColorPicker(note.color || 'amber');

    const date = new Date(note.updatedAt);
    this.dom.dateDisplay.textContent = date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    this.renderTags(note.tags);
    this.updateTelemetry();
    this.renderRenderedPreview(note.content);

    // Actualizar selección en la lista
    const cards = this.dom.notesList.querySelectorAll('.note-card-compact');
    cards.forEach(card => {
      card.classList.toggle('selected', card.getAttribute('data-id') === id);
    });

    // Actualizar botón de fijar en la cabecera del editor
    this.updateEditorPinButton(!!(note.isPinned || note.pinned));

    if (window.innerWidth <= 900) {
      this.dom.sidebar.classList.remove('open');
    }

    if (playSound) haptics.playSwitch();
  }

  onNoteChanged() {
    const note = this.notes.find(n => n.id === this.activeNoteId);
    if (!note) return;

    note.content = this.getEditorContent();

    if (this.dom.titleInput) {
      let rawTitle = this.dom.titleInput.innerText ? this.dom.titleInput.innerText.replace(/\r?\n/g, ' ').trim() : '';
      if (!rawTitle && note.content) {
        const firstLine = note.content
          .split('\n')
          .map(l => l.replace(/^[#*>\-\s]+/, '').trim())
          .find(l => l.length > 0 && !l.startsWith('!['));
        if (firstLine) {
          rawTitle = firstLine.slice(0, 65);
        }
      }
      note.title = rawTitle || 'Nota sin título';
      note.titleHtml = this.dom.titleInput.innerHTML;
      note.titleColor = this.dom.titleInput.style.color || '';
    } else {
      note.title = 'Nota sin título';
    }
    note.updatedAt = new Date().toISOString();

    this.saveLocalNotes();
    firebaseSync.saveNoteLive(note);
    this.updateSidebarCard(note);
    this.renderRenderedPreview(note.content);

    // Mover inmediatamente la nota al inicio de su sección en el panel lateral (orden por modificación)
    this.reorderCardToTop(note);

    if (this.graph && this.currentView === 'graph') {
      this.graph.setData(this.notes);
    }
  }

  reorderCardToTop(note) {
    if (!note) return;

    // 1. Reordenar en el array this.notes
    const idx = this.notes.findIndex(n => n.id === note.id);
    if (idx > -1) {
      this.notes.splice(idx, 1);
      const isPinned = !!(note.isPinned || note.pinned);
      if (isPinned) {
        this.notes.unshift(note);
      } else {
        const firstRegularIdx = this.notes.findIndex(n => !n.isPinned && !n.pinned);
        if (firstRegularIdx === -1) {
          this.notes.push(note);
        } else {
          this.notes.splice(firstRegularIdx, 0, note);
        }
      }
    }

    // 2. Mover el card en el DOM si no está ya en la primera posición de su grupo
    const card = this.dom.notesList.querySelector(`.note-card-compact[data-id="${note.id}"]`);
    if (!card) return;

    // Actualizar etiqueta de fecha en la tarjeta
    const dateSpan = card.querySelector('.note-card-header-row span[style*="font-mono"]');
    if (dateSpan) dateSpan.textContent = 'Ahora';

    const isPinned = !!(note.isPinned || note.pinned);
    const dividers = this.dom.notesList.querySelectorAll('.nav-sub-divider');

    if (isPinned) {
      const pinDivider = dividers[0];
      if (pinDivider && pinDivider.nextElementSibling !== card) {
        pinDivider.insertAdjacentElement('afterend', card);
      }
    } else {
      let regDivider = null;
      dividers.forEach(d => {
        if (d.textContent.includes('Recientes')) regDivider = d;
      });

      if (regDivider) {
        if (regDivider.nextElementSibling !== card) {
          regDivider.insertAdjacentElement('afterend', card);
        }
      } else {
        if (this.dom.notesList.firstElementChild !== card) {
          this.dom.notesList.prepend(card);
        }
      }
    }
  }

  // Cover Banners (Craft style)
  renderCover(cover) {
    if (!cover) {
      this.dom.coverContainer.classList.remove('active');
      this.dom.coverContainer.style.backgroundImage = 'none';
      return;
    }
    this.dom.coverContainer.classList.add('active');
    this.dom.coverContainer.style.backgroundImage = cover.startsWith('http') || cover.startsWith('data:')
      ? `url('${cover}')`
      : cover;
  }

  toggleCover() {
    const note = this.notes.find(n => n.id === this.activeNoteId);
    if (!note) return;
    if (note.cover) {
      this.removeCover();
    } else {
      const rndGradient = DEFAULT_COVERS[Math.floor(Math.random() * DEFAULT_COVERS.length)];
      note.cover = rndGradient;
      this.renderCover(note.cover);
      this.onNoteChanged();
      haptics.playTap();
      this.showToast('Portada aplicada');
    }
  }

  changeCoverPrompt() {
    const url = prompt('Introduce la URL de una imagen para la portada (o déjalo vacío para un gradiente):');
    const note = this.notes.find(n => n.id === this.activeNoteId);
    if (!note) return;

    if (url && url.trim()) {
      note.cover = url.trim();
    } else {
      note.cover = DEFAULT_COVERS[Math.floor(Math.random() * DEFAULT_COVERS.length)];
    }
    this.renderCover(note.cover);
    this.onNoteChanged();
    haptics.playTap();
  }

  removeCover() {
    const note = this.notes.find(n => n.id === this.activeNoteId);
    if (!note) return;
    note.cover = null;
    this.renderCover(null);
    this.onNoteChanged();
    haptics.playTap();
    this.showToast('Portada eliminada');
  }

  // Object Types (Capacities style)
  cycleObjectType() {
    const note = this.notes.find(n => n.id === this.activeNoteId);
    if (!note) return;

    const types = Object.keys(OBJECT_TYPES);
    const currIdx = types.indexOf(note.type || 'idea');
    const nextType = types[(currIdx + 1) % types.length];

    note.type = nextType;
    this.updateObjectTypeDisplay(nextType);
    this.onNoteChanged();
    this.renderNoteList();
    this.showToast(`Tipo de nota: ${OBJECT_TYPES[nextType].label}`);
  }

  updateObjectTypeDisplay(type) {
    const meta = OBJECT_TYPES[type] || OBJECT_TYPES.idea;
    if (this.dom.objTypePicker) {
      this.dom.objTypePicker.innerHTML = `<span>${meta.icon}</span><span>${meta.label}</span>`;
    }
  }

  // Color-coding (Supernotes style)
  setNoteColor(color) {
    const note = this.notes.find(n => n.id === this.activeNoteId);
    if (!note) return;
    note.color = color;
    this.updateColorPicker(color);
    this.onNoteChanged();
    this.renderNoteList();
    haptics.playTap();
  }

  updateColorPicker(color) {
    this.dom.colorPickerGroup?.querySelectorAll('.color-dot-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-color') === color);
    });
  }

  // Image Processing & Inserción
  setupDragAndDrop() {
    const viewport = document.getElementById('editorViewport');
    if (!viewport) return;

    ['dragenter', 'dragover'].forEach(name => {
      viewport.addEventListener(name, (e) => {
        e.preventDefault();
        viewport.style.background = 'var(--bg-hover)';
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      viewport.addEventListener(name, (e) => {
        e.preventDefault();
        viewport.style.background = 'transparent';
      });
    });

    viewport.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          this.processAndInsertImage(file);
        }
      }
    });
  }

  handlePasteImage(e) {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (items) {
      for (let item of items) {
        if (item.type && item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            this.processAndInsertImage(file);
          }
          return;
        }
      }
    }

    // Interceptar si se pega texto con imágenes markdown o Base64
    const pastedText = e.clipboardData?.getData('text/plain');
    if (pastedText && (pastedText.includes('data:image/') || /!\[.*?\]\(.*?\)/.test(pastedText))) {
      e.preventDefault();
      this.insertMarkdownFragment(pastedText);
    }
  }

  createImageCardElement(src, alt = 'Imagen') {
    const card = document.createElement('figure');
    card.className = 'note-image-card';
    card.setAttribute('contenteditable', 'false');

    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-remove-img';
    btn.title = 'Eliminar imagen';
    btn.setAttribute('aria-label', 'Eliminar imagen');
    btn.innerHTML = '✕';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      card.remove();
      this.onNoteChanged();
      this.updateTelemetry();
      this.showToast('Imagen eliminada');
    });

    card.appendChild(img);
    card.appendChild(btn);
    return card;
  }

  insertNodeAtCursor(node) {
    const sel = window.getSelection();
    let inserted = false;
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (this.dom.editorBody.contains(range.commonAncestorContainer)) {
        range.collapse(false);
        range.insertNode(node);
        const br = document.createElement('br');
        node.parentNode.insertBefore(br, node.nextSibling);
        range.setStartAfter(br);
        range.setEndAfter(br);
        sel.removeAllRanges();
        sel.addRange(range);
        inserted = true;
      }
    }

    if (!inserted) {
      this.dom.editorBody.appendChild(node);
      this.dom.editorBody.appendChild(document.createElement('br'));
    }
  }

  insertMarkdownFragment(text) {
    const regex = /(!\[.*?\]\((?:data:image\/[^\)]+|https?:\/\/[^\s\)]+)\)|data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=\s_-]+)/g;
    const parts = text.split(regex);
    const fragment = document.createDocumentFragment();

    parts.forEach(part => {
      if (!part) return;
      const mdMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
      const isRawBase64 = part.trim().startsWith('data:image/');

      if (mdMatch) {
        const card = this.createImageCardElement(mdMatch[2], mdMatch[1] || 'Imagen');
        fragment.appendChild(card);
        fragment.appendChild(document.createElement('br'));
      } else if (isRawBase64) {
        const card = this.createImageCardElement(part.trim(), 'Imagen');
        fragment.appendChild(card);
        fragment.appendChild(document.createElement('br'));
      } else {
        const lines = part.split('\n');
        lines.forEach((line, idx) => {
          if (idx > 0) fragment.appendChild(document.createElement('br'));
          if (line) fragment.appendChild(document.createTextNode(line));
        });
      }
    });

    this.insertNodeAtCursor(fragment);
    this.onNoteChanged();
    this.updateTelemetry();
  }

  processAndInsertImage(file) {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar para optimización y persistencia ligera
        const canvas = document.createElement('canvas');
        const maxW = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        // Crear la tarjeta visual sin caracteres de texto
        const card = this.createImageCardElement(dataUrl, 'Imagen');
        this.insertNodeAtCursor(card);
        this.onNoteChanged();
        this.updateTelemetry();
        this.showToast('Imagen agregada con éxito');
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  }

  setEditorContent(markdown = '') {
    this.dom.editorBody.innerHTML = '';
    if (!markdown) return;

    // Detectar imágenes markdown o URLs Base64 directas
    const regex = /(!\[.*?\]\((?:data:image\/[^\)]+|https?:\/\/[^\s\)]+)\)|data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=\s_-]+)/g;
    const parts = markdown.split(regex);

    parts.forEach(part => {
      if (!part) return;
      const mdMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
      const isRawBase64 = part.trim().startsWith('data:image/');

      if (mdMatch) {
        const card = this.createImageCardElement(mdMatch[2], mdMatch[1] || 'Imagen');
        this.dom.editorBody.appendChild(card);
        return;
      }
      if (isRawBase64) {
        const card = this.createImageCardElement(part.trim(), 'Imagen');
        this.dom.editorBody.appendChild(card);
        return;
      }

      // Procesar bloques de texto y encabezados por líneas
      const lines = part.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Encabezados H1, H2, H3 (con soporte para limpiar asteriscos accidentales)
        const headingMatch = line.match(/^(\*{1,2})?\s*(#{1,3})\s+(.*?)(\*{1,2})?$/);
        if (headingMatch && !line.startsWith('>')) {
          const level = headingMatch[2].length;
          const h = document.createElement(`h${level}`);
          h.className = `editor-h${level}`;
          h.innerHTML = this.inlineMarkdownToHTML(headingMatch[3].trim());
          this.dom.editorBody.appendChild(h);
        } else if (line.trim() === '---' || line.trim() === '***') {
          const hr = document.createElement('hr');
          hr.className = 'editor-divider';
          this.dom.editorBody.appendChild(hr);
        } else if (/^-\s\[([ x])\]\s(.*)/.test(line)) {
          const m = line.match(/^-\s\[([ x])\]\s(.*)/);
          const isChecked = m[1].toLowerCase() === 'x';
          const taskItem = document.createElement('div');
          taskItem.className = 'task-item';
          taskItem.innerHTML = `
            <div class="task-checkbox ${isChecked ? 'checked' : ''}" contenteditable="false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span class="task-text ${isChecked ? 'checked' : ''}">${this.inlineMarkdownToHTML(m[2])}</span>
          `;
          this.dom.editorBody.appendChild(taskItem);
        } else if (line.startsWith('> [!') || line.startsWith('> ')) {
          let calloutText = line.replace(/^>\s?(\[!.*?\])?\s?/, '');
          let header = 'IDEA';
          const matchHeader = line.match(/^>\s*\[!(.*?)\]/);
          if (matchHeader) header = matchHeader[1];

          while (i + 1 < lines.length && lines[i + 1].startsWith('>')) {
            i++;
            calloutText += ' ' + lines[i].replace(/^>\s?/, '');
          }

          const callout = document.createElement('div');
          callout.className = 'editorial-callout';
          callout.innerHTML = `
            <div class="callout-header" contenteditable="false">${header}</div>
            <p>${this.inlineMarkdownToHTML(calloutText)}</p>
          `;
          this.dom.editorBody.appendChild(callout);
        } else if (line.trim()) {
          const p = document.createElement('p');
          p.innerHTML = this.inlineMarkdownToHTML(line);
          this.dom.editorBody.appendChild(p);
        } else {
          const br = document.createElement('p');
          br.innerHTML = '<br>';
          this.dom.editorBody.appendChild(br);
        }
      }
    });

    this.attachCheckboxListeners();
  }

  inlineMarkdownToHTML(text) {
    if (!text) return '';
    // Proteger spans de color existentes
    const colorPlaceholders = [];
    let safe = text.replace(/<span\s+style="color:\s*([^"]+)">([\s\S]*?)<\/span>/gi, (m, color, inner) => {
      const idx = colorPlaceholders.length;
      colorPlaceholders.push({ color, inner });
      return `___COLOR_TOKEN_${idx}___`;
    });

    safe = safe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[\[(.*?)\]\]/g, (match, title) => {
        const clean = title.trim();
        return `<a class="wiki-link" data-title="${clean}" contenteditable="false"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg><span>${clean}</span></a>`;
      });

    colorPlaceholders.forEach((item, idx) => {
      safe = safe.replace(`___COLOR_TOKEN_${idx}___`, `<span style="color: ${item.color}">${this.inlineMarkdownToHTML(item.inner)}</span>`);
    });

    return safe;
  }

  attachCheckboxListeners() {
    this.dom.editorBody.querySelectorAll('.task-checkbox').forEach(box => {
      if (box._hasListener) return;
      box._hasListener = true;
      box.addEventListener('click', (e) => {
        e.stopPropagation();
        box.classList.toggle('checked');
        const text = box.parentElement?.querySelector('.task-text');
        if (text) text.classList.toggle('checked');
        this.onNoteChanged();
      });
    });
  }

  getEditorContent() {
    let output = '';
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        output += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();

        if (node.classList && node.classList.contains('note-image-card')) {
          const img = node.querySelector('img');
          if (img) {
            const src = img.getAttribute('src') || '';
            const alt = img.getAttribute('alt') || 'Imagen';
            output += `\n![${alt}](${src})\n\n`;
          }
          return;
        }

        if (node.classList && node.classList.contains('editorial-callout')) {
          const header = node.querySelector('.callout-header')?.textContent || 'IDEA';
          const p = node.querySelector('p')?.textContent || '';
          output += `\n> [!${header}]\n> ${p.trim()}\n\n`;
          return;
        }

        if (node.classList && node.classList.contains('task-item')) {
          const isChecked = node.querySelector('.task-checkbox')?.classList.contains('checked');
          const span = node.querySelector('.task-text')?.textContent || '';
          output += `\n- [${isChecked ? 'x' : ' '}] ${span.trim()}\n`;
          return;
        }

        if ((tag === 'span' || tag === 'font') && (node.style.color || node.getAttribute('color'))) {
          const col = node.style.color || node.getAttribute('color');
          output += `<span style="color: ${col}">`;
          node.childNodes.forEach(walk);
          output += `</span>`;
          return;
        }

        if (tag === 'h1') {
          output += `\n# `;
          node.childNodes.forEach(walk);
          output += `\n\n`;
          return;
        }
        if (tag === 'h2') {
          output += `\n## `;
          node.childNodes.forEach(walk);
          output += `\n\n`;
          return;
        }
        if (tag === 'h3') {
          output += `\n### `;
          node.childNodes.forEach(walk);
          output += `\n\n`;
          return;
        }
        if (tag === 'hr') {
          output += `\n---\n\n`;
          return;
        }
        if (tag === 'strong' || tag === 'b') {
          output += `**${node.textContent}**`;
          return;
        }
        if (tag === 'em' || tag === 'i') {
          output += `*${node.textContent}*`;
          return;
        }
        if (tag === 'code' && node.parentElement?.tagName.toLowerCase() !== 'pre') {
          output += `\`${node.textContent}\``;
          return;
        }
        if (node.classList && node.classList.contains('wiki-link')) {
          const title = node.getAttribute('data-title') || node.textContent.trim();
          output += `[[${title}]]`;
          return;
        }
        if (tag === 'br') {
          output += '\n';
          return;
        }
        if (tag === 'p' || tag === 'div') {
          if (output && !output.endsWith('\n')) output += '\n';
          node.childNodes.forEach(walk);
          if (!output.endsWith('\n')) output += '\n';
          return;
        }

        node.childNodes.forEach(walk);
      }
    };

    this.dom.editorBody.childNodes.forEach(walk);
    return output.trim();
  }

  // Tags
  renderTags(tags = []) {
    this.dom.tagsContainer.innerHTML = '';
    tags.forEach((tag, idx) => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.innerHTML = `#${tag} <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTag(idx);
      });
      this.dom.tagsContainer.appendChild(pill);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add-tag';
    addBtn.textContent = '+ Tag';
    addBtn.addEventListener('click', () => {
      const newTag = prompt('Nombre de la etiqueta:');
      if (newTag && newTag.trim()) {
        this.addTag(newTag.trim().replace(/^#/, ''));
      }
    });
    this.dom.tagsContainer.appendChild(addBtn);
  }

  addTag(tag) {
    const note = this.notes.find(n => n.id === this.activeNoteId);
    if (!note) return;
    if (!note.tags) note.tags = [];
    if (!note.tags.includes(tag)) {
      note.tags.push(tag);
      this.onNoteChanged();
      this.renderTags(note.tags);
      haptics.playTap();
    }
  }

  removeTag(index) {
    const note = this.notes.find(n => n.id === this.activeNoteId);
    if (!note || !note.tags) return;
    note.tags.splice(index, 1);
    this.onNoteChanged();
    this.renderTags(note.tags);
    haptics.playTap();
  }

  // Sidebar List
  renderNoteList() {
    this.dom.notesList.innerHTML = '';
    this.updateTrashBadge();

    const activeNotes = this.getActiveNotes();

    let filtered = activeNotes.filter(note => {
      if (this.activeObjectFilter === 'all') return true;
      return note.type === this.activeObjectFilter;
    });

    if (this.sidebarFilterQuery) {
      const q = this.sidebarFilterQuery.toLowerCase();
      filtered = filtered.filter(note => {
        const titleMatch = (note.title || '').toLowerCase().includes(q);
        const tagMatch = (note.tags || []).some(t => t.toLowerCase().includes(q));
        const contentMatch = (note.content || '').toLowerCase().includes(q);
        return titleMatch || tagMatch || contentMatch;
      });
    }

    this.dom.noteCountBadge.textContent = `${filtered.length}`;

    if (filtered.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'padding: 30px 16px; text-align: center; color: var(--text-muted); font-size: 0.8rem; line-height: 1.5;';
      emptyDiv.textContent = this.sidebarFilterQuery ? 'No se encontraron notas con ese criterio.' : 'No hay notas en esta categoría.';
      this.dom.notesList.appendChild(emptyDiv);
      return;
    }

    // Ordenar rigurosamente por última fecha de modificación (más reciente arriba)
    filtered.sort((a, b) => {
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    const pinned = filtered.filter(n => !!(n.isPinned || n.pinned));
    const regular = filtered.filter(n => !n.isPinned && !n.pinned);

    const renderCard = (note) => {
      const isPinned = !!(note.isPinned || note.pinned);
      const card = document.createElement('div');
      card.className = `note-card-compact ${note.id === this.activeNoteId ? 'selected' : ''}`;
      card.setAttribute('data-id', note.id);
      card.setAttribute('data-color', note.color || 'amber');

      const cleanContent = (note.content || '')
        .replace(/!\[.*?\]\([^\)]*\)/g, '[Imagen]')
        .replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/g, '')
        .replace(/[#*`>\[\]\(!\)]/g, '')
        .trim();
      const previewSnippet = cleanContent.slice(0, 85) || 'Sin contenido adicional...';
      const mainTag = (note.tags && note.tags[0]) ? `#${note.tags[0]}` : 'General';
      const objMeta = OBJECT_TYPES[note.type] || OBJECT_TYPES.idea;
      const date = new Date(note.updatedAt || Date.now());
      const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

      card.innerHTML = `
        <div class="note-card-header-row">
          <span class="note-card-obj-badge">${objMeta.icon} ${objMeta.label}</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.65rem; color: var(--text-muted); font-family: var(--font-mono);">${dateStr}</span>
            <button class="btn-card-pin ${isPinned ? 'active' : ''}" data-pin-id="${note.id}" title="${isPinned ? 'Desfijar apunte' : 'Fijar apunte al inicio'}" aria-label="${isPinned ? 'Desfijar' : 'Fijar'}">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="${isPinned ? 'currentColor' : 'none'}">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="note-card-title">${note.title || 'Sin título'}</div>
        <div class="note-card-snippet">${previewSnippet}</div>
        <div class="note-card-meta">
          <span class="note-card-tag">${mainTag}</span>
        </div>
      `;

      // Clic para fijar con un solo toque sin navegar
      const pinBtn = card.querySelector('.btn-card-pin');
      if (pinBtn) {
        pinBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.togglePinNote(note.id);
        });
      }

      card.addEventListener('click', () => {
        this.selectNote(note.id);
        if (this.currentView === 'broadsheet') this.switchView('editor');
      });

      card.addEventListener('contextmenu', (e) => this.openContextMenu(e, note.id));
      return card;
    };

    if (pinned.length > 0) {
      const pinHeader = document.createElement('div');
      pinHeader.className = 'nav-sub-divider';
      pinHeader.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="currentColor">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path>
        </svg>
        <span>Fijadas</span>
        <span class="count-badge">${pinned.length}</span>
      `;
      this.dom.notesList.appendChild(pinHeader);
      pinned.forEach(n => this.dom.notesList.appendChild(renderCard(n)));

      if (regular.length > 0) {
        const regHeader = document.createElement('div');
        regHeader.className = 'nav-sub-divider';
        regHeader.innerHTML = `
          <span>Recientes</span>
          <span class="count-badge">${regular.length}</span>
        `;
        this.dom.notesList.appendChild(regHeader);
      }
    }

    regular.forEach(n => this.dom.notesList.appendChild(renderCard(n)));
  }

  updateSidebarCard(note) {
    const card = this.dom.notesList.querySelector(`.note-card-compact[data-id="${note.id}"]`);
    if (card) {
      card.setAttribute('data-color', note.color || 'amber');
      card.querySelector('.note-card-title').textContent = note.title || 'Sin título';
      const cleanContent = (note.content || '')
        .replace(/!\[.*?\]\([^\)]*\)/g, '[Imagen]')
        .replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/g, '')
        .replace(/[#*`>\[\]\(!\)]/g, '')
        .trim();
      card.querySelector('.note-card-snippet').textContent = cleanContent.slice(0, 85) || 'Sin contenido adicional...';
    }
  }

  // Broadsheet / Muro de Tarjetas View (Supernotes style)
  renderBroadsheet() {
    this.dom.broadsheetGrid.innerHTML = '';

    const activeNotes = this.getActiveNotes();

    let filtered = activeNotes.filter(note => {
      if (this.activeObjectFilter === 'all') return true;
      return note.type === this.activeObjectFilter;
    });

    filtered.sort((a, b) => {
      const pinA = !!(a.isPinned || a.pinned);
      const pinB = !!(b.isPinned || b.pinned);
      if (pinA !== pinB) return pinB ? 1 : -1;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

    filtered.forEach(note => {
      const isPinned = !!(note.isPinned || note.pinned);
      const tile = document.createElement('article');
      tile.className = 'card-tile';

      const objMeta = OBJECT_TYPES[note.type] || OBJECT_TYPES.idea;
      const cleanContent = (note.content || '')
        .replace(/!\[.*?\]\([^\)]*\)/g, '[Imagen]')
        .replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/g, '')
        .replace(/[#*`>\[\]\(!\)]/g, '')
        .trim();
      const previewSnippet = cleanContent.slice(0, 140) || 'Sin contenido...';
      const date = new Date(note.updatedAt || Date.now());
      const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

      let coverHtml = '';
      if (note.cover) {
        const bgStyle = note.cover.startsWith('http') || note.cover.startsWith('data:')
          ? `background-image: url('${note.cover}')`
          : `background: ${note.cover}`;
        coverHtml = `<div class="card-tile-cover" style="${bgStyle}"></div>`;
      }

      tile.innerHTML = `
        ${coverHtml}
        <div class="card-tile-content">
          <div class="card-tile-header">
            <span class="card-tile-badge">${objMeta.icon} ${objMeta.label}</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${isPinned ? `
                <span title="Apunte fijado" style="color: #d97706; display: inline-flex; align-items: center;">
                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="currentColor">
                    <line x1="12" y1="17" x2="12" y2="22"></line>
                    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path>
                  </svg>
                </span>
              ` : ''}
              <span style="width: 10px; height: 10px; border-radius: 50%; background: var(--note-accent);"></span>
            </div>
          </div>
          <h3 class="card-tile-title">${note.title || 'Sin título'}</h3>
          <p class="card-tile-snippet">${previewSnippet}</p>
          <div class="card-tile-footer">
            <span>${(note.tags && note.tags[0]) ? '#' + note.tags[0] : '#General'}</span>
            <span>${dateStr}</span>
          </div>
        </div>
      `;

      tile.addEventListener('click', () => {
        this.selectNote(note.id);
        this.switchView('editor');
      });

      this.setupCardTilt(tile);
      tile.addEventListener('contextmenu', (e) => this.openContextMenu(e, note.id));

      this.dom.broadsheetGrid.appendChild(tile);
    });
  }

  switchView(view) {
    this.currentView = view;
    this.dom.tabEditor.classList.toggle('active', view === 'editor');
    this.dom.tabPreview.classList.toggle('active', view === 'preview');
    this.dom.tabBroadsheet.classList.toggle('active', view === 'broadsheet');
    this.dom.tabGraph.classList.toggle('active', view === 'graph');
    this.updateTabIndicator();

    // Ocultar todas las vistas secundarias
    this.dom.graphContainer.classList.remove('active');
    this.dom.broadsheetContainer.classList.remove('active');
    document.getElementById('editorViewport').style.display = 'flex';

    if (view === 'editor') {
      this.dom.editorBody.style.display = 'block';
      this.dom.renderedPreview.classList.remove('active');
      if (this.graph) this.graph.stop();
    } else if (view === 'preview') {
      this.dom.editorBody.style.display = 'none';
      this.dom.renderedPreview.classList.add('active');
      const note = this.notes.find(n => n.id === this.activeNoteId);
      if (note) this.renderRenderedPreview(note.content);
      if (this.graph) this.graph.stop();
    } else if (view === 'broadsheet') {
      document.getElementById('editorViewport').style.display = 'none';
      this.dom.broadsheetContainer.classList.add('active');
      this.renderBroadsheet();
      if (this.graph) this.graph.stop();
    } else if (view === 'graph') {
      document.getElementById('editorViewport').style.display = 'none';
      this.dom.graphContainer.classList.add('active');
      if (this.graph) {
        this.graph.setData(this.notes);
        this.graph.start();
      }
    }
  }

  applyFormat(format) {
    haptics.playTap();
    this.dom.editorBody.focus();
    const sel = window.getSelection();
    let selected = '';
    let range = null;
    if (sel && sel.rangeCount > 0 && this.dom.editorBody.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
      selected = sel.toString();
    }

    if (format === 'bold') {
      document.execCommand('bold', false, null);
      this.onNoteChanged();
      this.updateTelemetry();
      return;
    }

    if (format === 'italic') {
      document.execCommand('italic', false, null);
      this.onNoteChanged();
      this.updateTelemetry();
      return;
    }

    let elemToInsert = null;

    if (format === 'h1') {
      elemToInsert = document.createElement('h1');
      elemToInsert.className = 'editor-h1';
      elemToInsert.textContent = selected || 'Título Principal';
    } else if (format === 'h2') {
      elemToInsert = document.createElement('h2');
      elemToInsert.className = 'editor-h2';
      elemToInsert.textContent = selected || 'Subtítulo';
    } else if (format === 'h3') {
      elemToInsert = document.createElement('h3');
      elemToInsert.className = 'editor-h3';
      elemToInsert.textContent = selected || 'Encabezado H3';
    } else if (format === 'task') {
      elemToInsert = document.createElement('div');
      elemToInsert.className = 'task-item';
      elemToInsert.innerHTML = `
        <div class="task-checkbox" contenteditable="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="task-text">${selected || 'Tarea pendiente'}</span>
      `;
      elemToInsert.querySelector('.task-checkbox').addEventListener('click', (e) => {
        e.stopPropagation();
        elemToInsert.querySelector('.task-checkbox').classList.toggle('checked');
        elemToInsert.querySelector('.task-text').classList.toggle('checked');
        this.onNoteChanged();
      });
    } else if (format === 'callout') {
      elemToInsert = document.createElement('div');
      elemToInsert.className = 'editorial-callout';
      elemToInsert.innerHTML = `
        <div class="callout-header" contenteditable="false">IDEA</div>
        <p>${selected || 'Nota conceptual destacada'}</p>
      `;
    } else if (format === 'code') {
      elemToInsert = document.createElement('div');
      elemToInsert.className = 'code-block-container';
      elemToInsert.innerHTML = `
        <div class="code-block-header" contenteditable="false"><span>JAVASCRIPT</span><span>UTF-8</span></div>
        <pre class="code-block-content"><code>${selected || '// Código aquí'}</code></pre>
      `;
    }

    if (elemToInsert) {
      if (range) {
        range.deleteContents();
        range.insertNode(elemToInsert);
        const pNext = document.createElement('p');
        pNext.innerHTML = '<br>';
        elemToInsert.parentNode.insertBefore(pNext, elemToInsert.nextSibling);

        const newRange = document.createRange();
        newRange.selectNodeContents(elemToInsert);
        newRange.collapse(false);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } else {
        this.dom.editorBody.appendChild(elemToInsert);
        const pNext = document.createElement('p');
        pNext.innerHTML = '<br>';
        this.dom.editorBody.appendChild(pNext);
      }
    }

    this.onNoteChanged();
    this.updateTelemetry();
    this.dom.editorBody.focus();
  }

  setupLiveMarkdownShortcuts() {
    this.dom.editorBody.addEventListener('keydown', (e) => {
      // 1. Manejo de Space para transformar prefijos de markdown instantáneamente
      if (e.key === ' ' || e.key === 'Spacebar') {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const node = range.startContainer;

        if (node && node.nodeType === Node.TEXT_NODE) {
          const textBefore = node.textContent.slice(0, range.startOffset);
          const trimmed = textBefore.trim();

          // Encabezados: # + espacio, ## + espacio, ### + espacio
          if (/^#{1,3}$/.test(trimmed)) {
            e.preventDefault();
            const level = trimmed.length;
            const heading = document.createElement(`h${level}`);
            heading.className = `editor-h${level}`;

            const remaining = node.textContent.slice(range.startOffset);
            heading.textContent = remaining;
            if (!heading.textContent) heading.innerHTML = '<br>';

            const parent = node.parentNode;
            if (parent === this.dom.editorBody) {
              parent.replaceChild(heading, node);
            } else if (parent && parent.parentNode === this.dom.editorBody) {
              parent.parentNode.replaceChild(heading, parent);
            } else {
              parent.replaceChild(heading, node);
            }

            const newRange = document.createRange();
            newRange.selectNodeContents(heading);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);

            haptics.playTap();
            this.onNoteChanged();
            this.updateTelemetry();
            return;
          }

          // Callouts / Citas: > + espacio
          if (trimmed === '>') {
            e.preventDefault();
            const callout = document.createElement('div');
            callout.className = 'editorial-callout';
            const remaining = node.textContent.slice(range.startOffset);
            callout.innerHTML = `<div class="callout-header" contenteditable="false">IDEA</div><p>${remaining || '<br>'}</p>`;

            const parent = node.parentNode;
            if (parent === this.dom.editorBody) {
              parent.replaceChild(callout, node);
            } else if (parent && parent.parentNode === this.dom.editorBody) {
              parent.parentNode.replaceChild(callout, parent);
            } else {
              parent.replaceChild(callout, node);
            }

            const p = callout.querySelector('p');
            const newRange = document.createRange();
            newRange.selectNodeContents(p);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);

            haptics.playTap();
            this.onNoteChanged();
            this.updateTelemetry();
            return;
          }

          // Tareas: [] o - [ ] o - + espacio
          if (trimmed === '[]' || trimmed === '- [ ]' || trimmed === '-') {
            e.preventDefault();
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            const remaining = node.textContent.slice(range.startOffset);
            taskItem.innerHTML = `
              <div class="task-checkbox" contenteditable="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span class="task-text">${remaining || '<br>'}</span>
            `;

            taskItem.querySelector('.task-checkbox').addEventListener('click', (ev) => {
              ev.stopPropagation();
              taskItem.querySelector('.task-checkbox').classList.toggle('checked');
              taskItem.querySelector('.task-text').classList.toggle('checked');
              this.onNoteChanged();
            });

            const parent = node.parentNode;
            if (parent === this.dom.editorBody) {
              parent.replaceChild(taskItem, node);
            } else if (parent && parent.parentNode === this.dom.editorBody) {
              parent.parentNode.replaceChild(taskItem, parent);
            } else {
              parent.replaceChild(taskItem, node);
            }

            const span = taskItem.querySelector('.task-text');
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);

            haptics.playTap();
            this.onNoteChanged();
            this.updateTelemetry();
            return;
          }
        }
      }

      // 2. Al presionar Enter dentro de un Encabezado (h1, h2, h3), crear un párrafo nuevo normal
      if (e.key === 'Enter' && !e.shiftKey) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          let block = range.startContainer;
          while (block && block !== this.dom.editorBody && !['H1', 'H2', 'H3'].includes(block.tagName)) {
            block = block.parentNode;
          }
          if (block && ['H1', 'H2', 'H3'].includes(block.tagName)) {
            e.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            block.parentNode.insertBefore(p, block.nextSibling);

            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            this.onNoteChanged();
            return;
          }
        }
      }
    });

    this.dom.editorBody.addEventListener('input', () => {
      this.attachCheckboxListeners();

      // Transformación reactiva de markdown (# , ## , ### ) en evento input
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        let block = range.startContainer;
        while (block && block !== this.dom.editorBody && !['P', 'DIV', 'H1', 'H2', 'H3'].includes(block.tagName)) {
          block = block.parentNode;
        }
        if (block && block.tagName === 'P') {
          const text = (block.textContent || '').replace(/\u00a0/g, ' ');
          const match = text.match(/^(#{1,3})\s(.*)$/);
          if (match) {
            const level = match[1].length;
            const content = match[2];
            const heading = document.createElement(`h${level}`);
            heading.className = `editor-h${level}`;
            heading.textContent = content;
            if (!heading.textContent) heading.innerHTML = '<br>';
            block.parentNode.replaceChild(heading, block);

            const newRange = document.createRange();
            newRange.selectNodeContents(heading);
            newRange.collapse(false);
            sel.removeAllRanges();
            sel.addRange(newRange);
            this.onNoteChanged();
          }
        }
      }
    });
  }

  renderRenderedPreview(markdown = '') {
    let html = markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Callouts
    html = html.replace(/&gt; \[!(IDEA|NOTE|WARNING)\]\n&gt; (.*)/g, (m, type, content) => {
      return `<div class="editorial-callout"><div class="callout-header">${type}</div><p>${content}</p></div>`;
    });

    // Checkboxes
    html = html.replace(/- \[([ x])\] (.*)/g, (match, checked, text) => {
      const isChecked = checked.toLowerCase() === 'x';
      return `
        <div class="task-item">
          <div class="task-checkbox ${isChecked ? 'checked' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <span class="task-text ${isChecked ? 'checked' : ''}">${text}</span>
        </div>
      `;
    });

    // Imágenes: ![alt](url) o datos crudos base64
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" loading="lazy">');
    html = html.replace(/(data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+)/g, '<img src="$1" alt="Imagen" loading="lazy">');

    // Encabezados
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bloques de código
    html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, (m, lang, code) => {
      return `
        <div class="code-block-container">
          <div class="code-block-header"><span>${lang || 'CODE'}</span><span>UTF-8</span></div>
          <pre class="code-block-content"><code>${code.trim()}</code></pre>
        </div>
      `;
    });

    // Negrita y cursiva
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code style="background: var(--tag-bg); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.9em;">$1</code>');

    // Wiki-Links bidireccionales ([[Nota]])
    html = html.replace(/\[\[(.*?)\]\]/g, (match, title) => {
      const cleanTitle = title.trim();
      return `<a class="wiki-link" data-title="${cleanTitle}" title="Vincular con: ${cleanTitle}"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg><span>${cleanTitle}</span></a>`;
    });

    // Párrafos
    html = html.split('\n\n').map(p => {
      if (p.trim().startsWith('<h') || p.trim().startsWith('<div') || p.trim().startsWith('<pre') || p.trim().startsWith('<img')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    this.dom.renderedPreview.innerHTML = html;

    // Conectar eventos click en enlaces wiki
    this.dom.renderedPreview.querySelectorAll('.wiki-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTitle = link.getAttribute('data-title');
        this.navigateToWikiLink(targetTitle);
      });
    });
  }

  navigateToWikiLink(title) {
    if (!title) return;
    const match = this.notes.find(n => (n.title || '').trim().toLowerCase() === title.trim().toLowerCase());
    if (match) {
      haptics.playSwitch();
      this.selectNote(match.id);
      this.switchView('editor');
      this.showToast(`Navegando a: ${match.title}`);
    } else {
      haptics.playTap();
      if (confirm(`El apunte "${title}" aún no existe. ¿Deseas crearlo ahora?`)) {
        const sourceTitle = this.notes.find(n => n.id === this.activeNoteId)?.title || 'Apunte';
        const newNote = {
          id: `note_${Date.now()}`,
          title: title.trim(),
          type: 'idea',
          color: 'amber',
          isPinned: false,
          cover: null,
          tags: ['Conexiones'],
          updatedAt: new Date().toISOString(),
          content: `# ${title.trim()}\n\nNota enlazada desde [[${sourceTitle}]]`
        };
        this.notes.unshift(newNote);
        this.saveLocalNotes();
        firebaseSync.saveNoteLive(newNote);
        this.renderNoteList();
        this.selectNote(newNote.id);
        this.switchView('editor');
        this.showToast(`Apunte creado: ${title}`);
      }
    }
  }

  updateTelemetry() {
    const text = this.getEditorContent();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const readMins = Math.max(1, Math.ceil(words / 200));

    this.dom.wordCountPill.textContent = `${words} palabras`;
    this.dom.readTimePill.textContent = `${readMins} min lectura`;

    document.getElementById('drawerWordCount').textContent = words;
    document.getElementById('drawerCharCount').textContent = chars;
    document.getElementById('drawerReadTime').textContent = `${readMins} min`;
    document.getElementById('drawerTagCount').textContent = (this.notes.find(n => n.id === this.activeNoteId)?.tags || []).length;
  }

  openExportDrawer() {
    this.dom.slideDrawer.classList.add('open');
    this.dom.drawerBackdrop?.classList.add('open');
    this.updateTelemetry();
  }

  closeExportDrawer() {
    this.dom.slideDrawer.classList.remove('open');
    this.dom.drawerBackdrop?.classList.remove('open');
  }

  getActiveNotes() {
    return this.notes.filter(n => !n.isDeleted);
  }

  getDeletedNotes() {
    return this.notes.filter(n => !!n.isDeleted);
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  updateTrashBadge() {
    const deleted = this.getDeletedNotes();
    const count = deleted.length;
    if (this.dom.trashBadgeCount) {
      this.dom.trashBadgeCount.textContent = count;
      this.dom.trashBadgeCount.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (this.dom.btnEmptyTrash) {
      this.dom.btnEmptyTrash.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  openTrashModal() {
    this.renderTrashList();
    this.dom.trashModal?.classList.add('open');
  }

  closeTrashModal() {
    this.dom.trashModal?.classList.remove('open');
  }

  renderTrashList() {
    if (!this.dom.trashList || !this.dom.trashEmptyState) return;
    const deleted = this.getDeletedNotes();
    this.updateTrashBadge();

    if (deleted.length === 0) {
      this.dom.trashEmptyState.style.display = 'flex';
      this.dom.trashList.style.display = 'none';
      this.dom.trashList.innerHTML = '';
      return;
    }

    this.dom.trashEmptyState.style.display = 'none';
    this.dom.trashList.style.display = 'flex';
    this.dom.trashList.innerHTML = '';

    deleted.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));

    deleted.forEach(note => {
      const card = document.createElement('div');
      card.className = 'trash-item-card';

      const dateStr = note.deletedAt 
        ? new Date(note.deletedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'Reciente';

      card.innerHTML = `
        <div class="trash-item-info">
          <span class="trash-item-title">${this.escapeHtml(note.title || 'Sin título')}</span>
          <span class="trash-item-meta">Eliminado el ${dateStr}</span>
        </div>
        <div class="trash-item-actions">
          <button class="btn-trash-action btn-restore-action" data-id="${note.id}" title="Restaurar apunte">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="1.75" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            <span>Restaurar</span>
          </button>
          <button class="btn-trash-action btn-purge-action" data-id="${note.id}" title="Eliminar para siempre">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="1.75" fill="none" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Borrar</span>
          </button>
        </div>
      `;

      card.querySelector('.btn-restore-action').addEventListener('click', () => {
        haptics.playTap();
        this.restoreNote(note.id);
      });

      card.querySelector('.btn-purge-action').addEventListener('click', () => {
        haptics.playTap();
        this.purgeNote(note.id);
      });

      this.dom.trashList.appendChild(card);
    });
  }

  moveToTrash(noteId) {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return;

    note.isDeleted = true;
    note.deletedAt = new Date().toISOString();
    note.isPinned = false;

    this.saveLocalNotes();
    firebaseSync.saveNote(note);

    this.updateTrashBadge();
    this.renderNoteList();

    if (this.currentView === 'broadsheet') this.renderBroadsheet();
    if (this.currentView === 'graph' && this.graph) this.graph.setData(this.getActiveNotes());

    const active = this.getActiveNotes();
    if (this.activeNoteId === noteId) {
      if (active.length > 0) {
        this.selectNote(active[0].id, false);
      } else {
        this.createNewNote();
      }
    }

    this.showToast('Apunte movido a la papelera');
  }

  restoreNote(noteId) {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return;

    note.isDeleted = false;
    note.deletedAt = null;
    note.updatedAt = new Date().toISOString();

    this.saveLocalNotes();
    firebaseSync.saveNote(note);

    this.updateTrashBadge();
    this.renderNoteList();
    this.renderTrashList();
    if (this.currentView === 'broadsheet') this.renderBroadsheet();
    if (this.currentView === 'graph' && this.graph) this.graph.setData(this.getActiveNotes());

    this.selectNote(note.id);
    this.showToast('Apunte restaurado');
  }

  purgeNote(noteId) {
    if (confirm('¿Eliminar este apunte definitivamente? No se podrá recuperar.')) {
      this.notes = this.notes.filter(n => n.id !== noteId);
      this.saveLocalNotes();
      firebaseSync.deleteNote(noteId);
      this.renderTrashList();
      this.showToast('Apunte eliminado definitivamente');
    }
  }

  emptyTrash() {
    const deleted = this.getDeletedNotes();
    if (deleted.length === 0) return;

    if (confirm(`¿Vaciar la papelera? Se eliminarán definitivamente ${deleted.length} apunte(s).`)) {
      deleted.forEach(n => {
        firebaseSync.deleteNote(n.id);
      });
      this.notes = this.notes.filter(n => !n.isDeleted);
      this.saveLocalNotes();
      this.renderTrashList();
      this.showToast('Papelera vaciada');
    }
  }

  deleteCurrentNote() {
    const active = this.getActiveNotes();
    if (active.length <= 1) {
      this.showToast('Debes mantener al menos una nota activa.');
      return;
    }
    haptics.playTap();
    this.moveToTrash(this.activeNoteId);
    this.closeExportDrawer();
  }

  exportCurrentNote(format) {
    const note = this.notes.find(n => n.id === this.activeNoteId);
    if (!note) return;

    haptics.playChime();
    let content = '';
    let mime = 'text/plain';
    let filename = `${(note.title || 'nota').toLowerCase().replace(/\s+/g, '_')}`;

    if (format === 'markdown') {
      content = `# ${note.title}\n\n${note.content}`;
      filename += '.md';
    } else if (format === 'html') {
      content = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${note.title}</title><style>body { font-family: -apple-system, system-ui, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #1a1a1a; } h1 { font-family: Georgia, serif; font-size: 2.2rem; }</style></head><body><h1>${note.title}</h1>${this.dom.renderedPreview.innerHTML}</body></html>`;
      mime = 'text/html';
      filename += '.html';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast(`Descargado: ${filename}`);
  }

  exportAllNotesJSON() {
    haptics.playChime();
    const dataStr = JSON.stringify(this.notes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memora_cloud_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Copia JSON descargada');
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      <span>${message}</span>
    `;
    this.dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 2400);
  }

  setupTabIndicator() {
    this.updateTabIndicator();
    window.addEventListener('resize', () => this.updateTabIndicator());
    setTimeout(() => this.updateTabIndicator(), 60);
  }

  updateTabIndicator() {
    const activeTab = document.querySelector('.view-tab.active');
    const indicator = document.getElementById('viewTabIndicator');
    if (!activeTab || !indicator) return;
    indicator.style.width = `${activeTab.offsetWidth}px`;
    indicator.style.transform = `translate3d(${activeTab.offsetLeft}px, 0, 0)`;
  }

  setupCardTilt(card) {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;
      card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  }

  setupFloatingToolbar() {
    const toolbar = document.getElementById('floatingToolbar');
    if (!toolbar) return;

    const updatePosition = () => {
      if (this.currentView !== 'editor') {
        toolbar.classList.remove('visible');
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        toolbar.classList.remove('visible');
        return;
      }

      const range = sel.getRangeAt(0);
      if (!this.dom.editorBody.contains(range.commonAncestorContainer)) {
        toolbar.classList.remove('visible');
        return;
      }

      const text = sel.toString().trim();
      if (text.length === 0) {
        toolbar.classList.remove('visible');
        return;
      }

      const rect = range.getBoundingClientRect();
      toolbar.classList.add('visible');
      const top = Math.max(10, rect.top - 46);
      const left = Math.max(10, Math.min(window.innerWidth - 240, rect.left + (rect.width / 2) - 100));
      toolbar.style.top = `${top}px`;
      toolbar.style.left = `${left}px`;
    };

    document.addEventListener('selectionchange', () => {
      updatePosition();
    });

    toolbar.querySelectorAll('.float-tool-btn').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const format = btn.getAttribute('data-format');
        this.applyFormat(format);
        setTimeout(updatePosition, 20);
      });
    });
  }

  setupContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') menu.classList.remove('open');
    });

    document.getElementById('ctxPin')?.addEventListener('click', () => {
      if (this.contextTargetNoteId) {
        this.togglePinNote(this.contextTargetNoteId);
        menu.classList.remove('open');
      }
    });

    document.getElementById('ctxDuplicate')?.addEventListener('click', () => {
      if (this.contextTargetNoteId) {
        this.duplicateNote(this.contextTargetNoteId);
        menu.classList.remove('open');
      }
    });

    document.getElementById('ctxExport')?.addEventListener('click', () => {
      if (this.contextTargetNoteId) {
        this.selectNote(this.contextTargetNoteId);
        this.exportCurrentNote('markdown');
        menu.classList.remove('open');
      }
    });

    document.getElementById('ctxDelete')?.addEventListener('click', () => {
      if (this.contextTargetNoteId) {
        this.selectNote(this.contextTargetNoteId);
        this.deleteCurrentNote();
        menu.classList.remove('open');
      }
    });
  }

  openContextMenu(e, noteId) {
    e.preventDefault();
    this.contextTargetNoteId = noteId;
    const menu = document.getElementById('contextMenu');
    if (!menu) return;

    const targetNote = this.notes.find(n => n.id === noteId);
    const pinLabel = document.getElementById('ctxPinLabel');
    if (pinLabel && targetNote) {
      pinLabel.textContent = targetNote.isPinned ? 'Desfijar apunte' : 'Fijar apunte';
    }

    haptics.playTap();
    menu.classList.add('open');
    const x = Math.min(window.innerWidth - 210, e.clientX);
    const y = Math.min(window.innerHeight - 180, e.clientY);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }

  togglePinNote(id) {
    const note = this.notes.find(n => n.id === id);
    if (!note) return;
    note.isPinned = !note.isPinned;
    note.pinned = note.isPinned;
    note.updatedAt = new Date().toISOString();

    // Reordenar en this.notes: mover a la cima de su grupo
    const idx = this.notes.findIndex(n => n.id === id);
    if (idx > -1) {
      this.notes.splice(idx, 1);
      if (note.isPinned) {
        this.notes.unshift(note);
      } else {
        const firstRegular = this.notes.findIndex(n => !n.isPinned && !n.pinned);
        if (firstRegular === -1) {
          this.notes.push(note);
        } else {
          this.notes.splice(firstRegular, 0, note);
        }
      }
    }

    this.saveLocalNotes();
    firebaseSync.saveNote(note);
    this.renderNoteList();

    if (this.activeNoteId === id) {
      this.updateEditorPinButton(note.isPinned);
    }

    haptics.playTap();
    this.showToast(note.isPinned ? 'Apunte fijado al inicio' : 'Apunte desfijado');
  }

  updateEditorPinButton(isPinned) {
    const btn = document.getElementById('btnTogglePin');
    if (btn) {
      btn.classList.toggle('active', !!isPinned);
      btn.title = isPinned ? 'Desfijar este apunte' : 'Fijar este apunte al inicio';
      const label = btn.querySelector('span');
      if (label) label.textContent = isPinned ? 'Fijado' : 'Fijar';
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isPinned ? 'currentColor' : 'none');
    }
  }

  duplicateNote(id) {
    const orig = this.notes.find(n => n.id === id);
    if (!orig) return;
    const dup = {
      ...orig,
      id: `note_${Date.now()}`,
      title: `${orig.title || 'Apunte'} (Copia)`,
      isPinned: false,
      updatedAt: new Date().toISOString()
    };
    this.notes.unshift(dup);
    this.saveLocalNotes();
    firebaseSync.saveNote(dup);
    this.renderNoteList();
    this.selectNote(dup.id);
    if (this.currentView === 'broadsheet') this.renderBroadsheet();
    this.showToast('Nota duplicada');
  }

  // =========================================================================
  // 1. Sidebar Quick Filter
  // =========================================================================
  setupSidebarFilter() {
    const input = this.dom.sidebarQuickFilter;
    const btnClear = this.dom.btnClearFilter;
    if (!input) return;

    input.addEventListener('input', () => {
      this.sidebarFilterQuery = input.value.trim();
      if (btnClear) {
        btnClear.style.display = this.sidebarFilterQuery ? 'inline-block' : 'none';
      }
      this.renderNoteList();
    });

    btnClear?.addEventListener('click', () => {
      input.value = '';
      this.sidebarFilterQuery = '';
      btnClear.style.display = 'none';
      this.renderNoteList();
      input.focus();
    });
  }

  // =========================================================================
  // 2. Modo Zen / Focus Typewriter (Ctrl+.)
  // =========================================================================
  setupZenMode() {
    this.dom.btnToggleZen?.addEventListener('click', () => {
      this.toggleZenMode();
    });

    this.dom.btnExitZen?.addEventListener('click', () => {
      this.toggleZenMode(false);
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        this.toggleZenMode();
      } else if (e.key === 'Escape' && this.isZenMode) {
        this.toggleZenMode(false);
      }
    });
  }

  toggleZenMode(forceState = null) {
    this.isZenMode = forceState !== null ? forceState : !this.isZenMode;
    document.body.classList.toggle('zen-mode', this.isZenMode);
    haptics.playTap();

    if (this.isZenMode) {
      if (this.currentView !== 'editor') {
        this.switchView('editor');
      }
      this.dom.editorBody.focus();
      this.showToast('Modo Zen activado (Ctrl+. o Esc para salir)');
    } else {
      this.showToast('Modo Zen desactivado');
    }
  }

  // =========================================================================
  // 3. Menú Slash (/) en el Editor
  // =========================================================================
  setupSlashMenu() {
    const menu = this.dom.slashMenu;
    const container = this.dom.slashMenuItems;
    if (!menu || !container) return;

    const COMMANDS = [
      {
        id: 'h1',
        title: 'Título 1',
        desc: 'Encabezado editorial principal',
        icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 12h8M4 6v12M12 6v12M20 18h-4c0-4 4-3 4-6a3 3 0 1 0-6 0"/></svg>',
        action: () => this.applyFormat('h1')
      },
      {
        id: 'h2',
        title: 'Título 2',
        desc: 'Subtítulo de sección',
        icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 12h8M4 6v12M12 6v12M21 18h-4c0-4 4-3 4-6a3 3 0 1 0-6 0"/></svg>',
        action: () => this.applyFormat('h2')
      },
      {
        id: 'task',
        title: 'Lista de Tareas',
        desc: 'Casilla interactiva para checklist',
        icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
        action: () => this.applyFormat('task')
      },
      {
        id: 'code',
        title: 'Bloque de Código',
        desc: 'Fragmento con resaltado monoespaciado',
        icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
        action: () => this.applyFormat('code')
      },
      {
        id: 'callout',
        title: 'Cita / Callout',
        desc: 'Cuadro destacado con borde de color',
        icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        action: () => this.applyFormat('callout')
      },
      {
        id: 'divider',
        title: 'Divisor Horizontal',
        desc: 'Línea sutil de separación',
        icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        action: () => this.insertTextAtCursor('\n---\n')
      },
      {
        id: 'image',
        title: 'Subir Imagen',
        desc: 'Cargar o arrastrar archivo visual',
        icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        action: () => this.dom.fileInputImage?.click()
      }
    ];

    const renderItems = () => {
      container.innerHTML = '';
      COMMANDS.forEach((cmd, idx) => {
        const item = document.createElement('div');
        item.className = `slash-menu-item ${idx === this.slashMenuSelectedIndex ? 'selected' : ''}`;
        item.innerHTML = `
          <div class="slash-item-icon">${cmd.icon}</div>
          <div class="slash-item-info">
            <div class="slash-item-title">${cmd.title}</div>
            <div class="slash-item-desc">${cmd.desc}</div>
          </div>
        `;
        item.addEventListener('click', () => {
          this.executeSlashCommand(cmd);
        });
        container.appendChild(item);
      });
    };

    renderItems();

    // Interceptar pulsación de teclado en el editor
    this.dom.editorBody.addEventListener('keydown', (e) => {
      if (this.slashMenuOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.slashMenuSelectedIndex = (this.slashMenuSelectedIndex + 1) % COMMANDS.length;
          renderItems();
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.slashMenuSelectedIndex = (this.slashMenuSelectedIndex - 1 + COMMANDS.length) % COMMANDS.length;
          renderItems();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSlashCommand(COMMANDS[this.slashMenuSelectedIndex]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          this.closeSlashMenu();
          return;
        }
      }

      if (e.key === '/' && !this.slashMenuOpen && !this.wikiMenuOpen) {
        setTimeout(() => this.openSlashMenu(), 15);
      }
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target !== this.dom.editorBody) {
        this.closeSlashMenu();
      }
    });
  }

  openSlashMenu() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const menu = this.dom.slashMenu;
    if (!menu) return;

    this.slashMenuOpen = true;
    this.slashMenuSelectedIndex = 0;
    menu.classList.add('open');

    const top = Math.min(window.innerHeight - 340, Math.max(10, rect.bottom + 6));
    const left = Math.min(window.innerWidth - 280, Math.max(10, rect.left));
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }

  closeSlashMenu() {
    this.slashMenuOpen = false;
    this.dom.slashMenu?.classList.remove('open');
  }

  executeSlashCommand(cmd) {
    haptics.playTap();
    this.closeSlashMenu();
    this.removeTriggerChar('/');
    cmd.action();
  }

  removeTriggerChar(char) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node && node.nodeType === Node.TEXT_NODE) {
      const pos = range.startOffset;
      const text = node.textContent;
      if (pos > 0 && text[pos - 1] === char) {
        node.textContent = text.slice(0, pos - 1) + text.slice(pos);
        range.setStart(node, pos - 1);
        range.setEnd(node, pos - 1);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }

  insertTextAtCursor(text) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      this.dom.editorBody.appendChild(document.createTextNode(text));
    }
    this.onNoteChanged();
    this.updateTelemetry();
  }

  // =========================================================================
  // 4. Wiki-Links Autocomplete ([[ en el Editor)
  // =========================================================================
  setupWikiLinks() {
    const menu = this.dom.wikiLinkMenu;
    const list = this.dom.wikiMenuList;
    if (!menu || !list) return;

    let searchFilter = '';

    const renderWikiList = () => {
      list.innerHTML = '';
      const availableNotes = this.notes.filter(n => n.id !== this.activeNoteId);
      const matched = availableNotes.filter(n => {
        if (!searchFilter) return true;
        return (n.title || '').toLowerCase().includes(searchFilter.toLowerCase());
      });

      if (matched.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding: 8px 10px; font-size: 0.75rem; color: var(--text-muted);';
        empty.textContent = searchFilter.trim()
          ? `Presiona Enter para crear apunte "${searchFilter.trim()}"...`
          : 'No hay más notas disponibles para vincular.';
        list.appendChild(empty);
        return;
      }

      matched.forEach((note, idx) => {
        const item = document.createElement('div');
        item.className = `wiki-menu-item ${idx === this.wikiMenuSelectedIndex ? 'selected' : ''}`;
        const objMeta = OBJECT_TYPES[note.type] || OBJECT_TYPES.idea;
        item.innerHTML = `
          <div class="wiki-menu-title">${note.title || 'Sin título'}</div>
          <span class="wiki-menu-badge">${objMeta.label}</span>
        `;
        item.addEventListener('click', () => {
          this.insertWikiLink(note.title);
        });
        list.appendChild(item);
      });
    };

    this.dom.editorBody.addEventListener('keyup', (e) => {
      if (this.slashMenuOpen) return;

      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const textNode = range.startContainer;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const textBefore = textNode.textContent.slice(0, range.startOffset);
        const bracketIdx = textBefore.lastIndexOf('[[');

        if (bracketIdx !== -1 && !textBefore.slice(bracketIdx).includes(']]')) {
          searchFilter = textBefore.slice(bracketIdx + 2);
          this.openWikiMenu(range);
          renderWikiList();
          return;
        }
      }

      if (this.wikiMenuOpen) {
        this.closeWikiMenu();
      }
    });

    this.dom.editorBody.addEventListener('keydown', (e) => {
      if (this.wikiMenuOpen) {
        const availableNotes = this.notes.filter(n => n.id !== this.activeNoteId && (!searchFilter || (n.title || '').toLowerCase().includes(searchFilter.toLowerCase())));
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.wikiMenuSelectedIndex = (this.wikiMenuSelectedIndex + 1) % Math.max(1, availableNotes.length);
          renderWikiList();
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.wikiMenuSelectedIndex = (this.wikiMenuSelectedIndex - 1 + Math.max(1, availableNotes.length)) % Math.max(1, availableNotes.length);
          renderWikiList();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (availableNotes.length > 0) {
            const selected = availableNotes[this.wikiMenuSelectedIndex] || availableNotes[0];
            this.insertWikiLink(selected.title);
          } else if (searchFilter.trim()) {
            this.insertWikiLink(searchFilter.trim());
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          this.closeWikiMenu();
          return;
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target !== this.dom.editorBody) {
        this.closeWikiMenu();
      }
    });
  }

  openWikiMenu(range) {
    const rect = range.getBoundingClientRect();
    const menu = this.dom.wikiLinkMenu;
    if (!menu) return;
    this.wikiMenuOpen = true;
    this.wikiMenuSelectedIndex = 0;
    menu.classList.add('open');
    const top = Math.min(window.innerHeight - 300, Math.max(10, rect.bottom + 6));
    const left = Math.min(window.innerWidth - 310, Math.max(10, rect.left));
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }

  closeWikiMenu() {
    this.wikiMenuOpen = false;
    this.dom.wikiLinkMenu?.classList.remove('open');
  }

  insertWikiLink(title) {
    haptics.playTap();
    this.closeWikiMenu();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node && node.nodeType === Node.TEXT_NODE) {
      const pos = range.startOffset;
      const text = node.textContent;
      const bracketIdx = text.slice(0, pos).lastIndexOf('[[');
      if (bracketIdx !== -1) {
        const replacement = `[[${title}]] `;
        node.textContent = text.slice(0, bracketIdx) + replacement + text.slice(pos);
        const newPos = bracketIdx + replacement.length;
        range.setStart(node, newPos);
        range.setEnd(node, newPos);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    this.onNoteChanged();
    this.updateTelemetry();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new MemoraApp();
});
