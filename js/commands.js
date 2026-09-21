/**
 * AuraNotes / Memora - Command Palette (⌘K / Ctrl+K)
 * Buscador Inteligente por Secciones:
 * 1. Títulos de Proyectos y Apuntes
 * 2. Etiquetas y Tags (#)
 * 3. Palabras Clave en Contenido (Snippets en texto)
 * 4. Acciones y Comandos Rápidos
 * 
 * Estándar Radix / CMDK con accesibilidad ARIA completa y diseño Anti-Slop
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightMatches(text, query) {
  if (!text) return '';
  if (!query) return escapeHtml(text);
  const cleanQ = query.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  if (!cleanQ) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${cleanQ})`, 'gi');
  return escaped.replace(regex, '<mark class="cmd-hl">$1</mark>');
}

function extractContextSnippet(content, query) {
  if (!content || !query) return '';
  // Limpiar sintaxis markdown pesada
  let cleanText = content
    .replace(/!\[.*?\]\((?:data:image\/[^\)]+|https?:\/\/[^\s\)]+)\)/g, '')
    .replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=\s_-]+/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[\[(.*?)\]\]/g, '$1')
    .replace(/(\*\*|\*|`|~~)/g, '')
    .replace(/>\s*\[!.*?\]/g, '')
    .replace(/>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const lowerText = cleanText.toLowerCase();
  const lowerQ = query.trim().toLowerCase();
  const idx = lowerText.indexOf(lowerQ);

  if (idx === -1) {
    const preview = cleanText.slice(0, 95);
    return escapeHtml(preview) + (cleanText.length > 95 ? '…' : '');
  }

  const start = Math.max(0, idx - 35);
  const end = Math.min(cleanText.length, idx + lowerQ.length + 55);
  let snippet = cleanText.slice(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < cleanText.length) snippet = snippet + '…';

  return highlightMatches(snippet, query);
}

export class CommandPalette {
  constructor(app) {
    this.app = app;
    this.backdrop = document.getElementById('cmdBackdrop');
    this.input = document.getElementById('cmdInput');
    this.resultsContainer = document.getElementById('cmdResults');
    this.isOpen = false;
    this.selectedIndex = 0;
    this.sections = [];
    this.selectableItems = [];
    this.triggerElement = null;

    this.initEvents();
  }

  initEvents() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+K o Cmd+K para abrir/cerrar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
        return;
      }

      // Atajos directos cuando el modal está cerrado
      if (!this.isOpen && (e.ctrlKey || e.metaKey)) {
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          this.app.createNewNote();
        } else if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          this.app.switchView(this.app.currentView === 'editor' ? 'graph' : 'editor');
        } else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          this.app.toggleTheme();
        } else if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          this.app.openExportDrawer();
        }
      }

      // Teclas dentro del modal abierto
      if (this.isOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.selectNext();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.selectPrev();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSelected();
        }
      }
    });

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    this.input.addEventListener('input', () => {
      this.filter(this.input.value);
    });
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.triggerElement = document.activeElement;
    this.isOpen = true;
    this.backdrop.classList.add('open');
    this.backdrop.setAttribute('aria-hidden', 'false');
    this.input.value = '';
    this.filter('');
    setTimeout(() => this.input.focus(), 30);
  }

  close() {
    this.isOpen = false;
    this.backdrop.classList.remove('open');
    this.backdrop.setAttribute('aria-hidden', 'true');
    if (this.triggerElement && typeof this.triggerElement.focus === 'function') {
      this.triggerElement.focus();
    }
  }

  getDefaultCommands() {
    return [
      {
        id: 'cmd_new_note',
        title: 'Crear nueva nota',
        category: 'action',
        badgeText: 'COMANDO',
        badgeClass: 'cmd-badge-action',
        boxClass: 'box-action',
        icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        shortcut: 'Ctrl+N',
        action: () => this.app.createNewNote()
      },
      {
        id: 'cmd_toggle_view',
        title: this.app.currentView === 'editor' ? 'Ver Red de Ideas (Grafo)' : 'Volver a Vista Editor',
        category: 'action',
        badgeText: 'VISTA',
        badgeClass: 'cmd-badge-action',
        boxClass: 'box-action',
        icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
        shortcut: 'Ctrl+G',
        action: () => this.app.switchView(this.app.currentView === 'editor' ? 'graph' : 'editor')
      },
      {
        id: 'cmd_view_broadsheet',
        title: 'Ver Muro de Tarjetas (Broadsheet)',
        category: 'action',
        badgeText: 'VISTA',
        badgeClass: 'cmd-badge-action',
        boxClass: 'box-action',
        icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
        shortcut: 'Vista',
        action: () => this.app.switchView('broadsheet')
      },
      {
        id: 'cmd_toggle_theme',
        title: 'Configuración de Temas & Tipografía',
        category: 'action',
        badgeText: 'AJUSTES',
        badgeClass: 'cmd-badge-action',
        boxClass: 'box-action',
        icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0 2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
        shortcut: 'Ctrl+T',
        action: () => {
          document.getElementById('settingsModal')?.classList.add('open');
        }
      },
      {
        id: 'cmd_toggle_cover',
        title: 'Alternar Portada de Nota (Banner)',
        category: 'action',
        badgeText: 'PORTADA',
        badgeClass: 'cmd-badge-action',
        boxClass: 'box-action',
        icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
        shortcut: 'Portada',
        action: () => this.app.toggleCover()
      },
      {
        id: 'cmd_export_note',
        title: 'Exportar nota actual (Markdown / HTML)',
        category: 'action',
        badgeText: 'EXPORTAR',
        badgeClass: 'cmd-badge-action',
        boxClass: 'box-action',
        icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
        shortcut: 'Ctrl+E',
        action: () => this.app.openExportDrawer()
      },
      {
        id: 'cmd_google_auth',
        title: this.app.currentUser ? 'Cerrar sesión de Google' : 'Iniciar sesión con Google (Cloud Sync)',
        category: 'action',
        badgeText: 'CUENTA',
        badgeClass: 'cmd-badge-action',
        boxClass: 'box-action',
        icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        shortcut: 'Cuenta',
        action: () => {
          if (this.app.currentUser) {
            this.app.handleSignOut();
          } else {
            this.app.handleGoogleLogin();
          }
        }
      },
      {
        id: 'cmd_sync_cloud',
        title: 'Sincronizar notas con Firebase Cloud',
        category: 'action',
        badgeText: 'NUBE',
        badgeClass: 'cmd-badge-action',
        boxClass: 'box-action',
        icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>',
        shortcut: 'Nube',
        action: () => this.app.handleForceSyncCloud()
      },
      {
        id: 'cmd_open_trash',
        title: 'Abrir Papelera de Reciclaje',
        category: 'action',
        badgeText: 'PAPELERA',
        badgeClass: 'cmd-badge-action',
        boxClass: 'box-action',
        icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
        shortcut: 'Papelera',
        action: () => this.app.openTrashModal()
      }
    ];
  }

  filter(query) {
    const q = query.trim().toLowerCase();
    const staticCmds = this.getDefaultCommands();
    const rawTagQ = q.startsWith('#') ? q.slice(1).trim() : q;
    const activeNotes = this.app.getActiveNotes ? this.app.getActiveNotes() : this.app.notes.filter(n => !n.isDeleted);

    this.sections = [];

    if (!q) {
      // Estado Inicial: Mostrar Proyectos/Apuntes Recientes, Etiquetas Populares y Acciones
      const recentNotes = [...activeNotes]
        .slice(0, 5)
        .map(n => {
          const isProject = n.type === 'project';
          return {
            id: `recent_${n.id}`,
            title: n.title || 'Sin título',
            titleHtml: escapeHtml(n.title || 'Sin título'),
            snippetHtml: n.tags && n.tags.length ? `Etiquetas: ${n.tags.map(t => '#' + t).join(' ')}` : '',
            badgeText: isProject ? 'PROYECTO' : 'APUNTE',
            badgeClass: isProject ? 'cmd-badge-project' : 'cmd-badge-note',
            boxClass: isProject ? 'box-project' : 'box-note',
            icon: isProject 
              ? '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>'
              : '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
            shortcut: 'Reciente',
            action: () => this.app.selectNote(n.id)
          };
        });

      // Recolectar tags del espacio
      const tagMap = new Map();
      activeNotes.forEach(n => {
        (n.tags || []).forEach(t => {
          if (!tagMap.has(t)) tagMap.set(t, []);
          tagMap.get(t).push(n);
        });
      });

      const initialTags = Array.from(tagMap.entries()).slice(0, 4).map(([tagName, notes]) => {
        return {
          id: `tag_${tagName}`,
          title: `#${tagName}`,
          titleHtml: `<span style="color: #34d399; font-weight: 600;">#${escapeHtml(tagName)}</span>`,
          snippetHtml: `${notes.length} apunte${notes.length > 1 ? 's' : ''} asociado${notes.length > 1 ? 's' : ''} (${notes.map(n => n.title).slice(0, 2).join(', ')})`,
          badgeText: '#TAG',
          badgeClass: 'cmd-badge-tag',
          boxClass: 'box-tag',
          icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
          shortcut: `${notes.length} notas`,
          action: () => {
            if (notes.length > 0) this.app.selectNote(notes[0].id);
          }
        };
      });

      if (recentNotes.length > 0) {
        this.sections.push({
          id: 'sec_recent',
          title: 'Proyectos & Apuntes Recientes',
          icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.75" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
          items: recentNotes
        });
      }

      if (initialTags.length > 0) {
        this.sections.push({
          id: 'sec_tags',
          title: 'Etiquetas del Espacio',
          icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.75" fill="none"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
          items: initialTags
        });
      }

      this.sections.push({
        id: 'sec_actions',
        title: 'Acciones & Comandos',
        icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.75" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
        items: staticCmds.map(cmd => ({
          id: cmd.id,
          title: cmd.title,
          titleHtml: escapeHtml(cmd.title),
          snippetHtml: '',
          badgeText: cmd.badgeText,
          badgeClass: cmd.badgeClass,
          boxClass: cmd.boxClass,
          icon: cmd.icon,
          shortcut: cmd.shortcut,
          action: cmd.action
        }))
      });
    } else {
      // -------------------------------------------------------------
      // BÚSQUEDA ACTIVA CLASIFICADA POR 3 SECCIONES PRINCIPALES
      // -------------------------------------------------------------

      // SECCIÓN 1: TÍTULOS DE PROYECTOS Y APUNTES
      const titleMatches = [];
      activeNotes.forEach(n => {
        const title = n.title || '';
        if (title.toLowerCase().includes(q)) {
          const isProject = n.type === 'project';
          titleMatches.push({
            id: `title_${n.id}`,
            title: title,
            titleHtml: highlightMatches(title, q),
            snippetHtml: n.tags && n.tags.length ? `Tags: ${n.tags.map(t => '#' + t).join(' ')}` : '',
            badgeText: isProject ? 'PROYECTO' : 'TÍTULO',
            badgeClass: isProject ? 'cmd-badge-project' : 'cmd-badge-note',
            boxClass: isProject ? 'box-project' : 'box-note',
            icon: isProject
              ? '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>'
              : '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
            shortcut: isProject ? 'Proyecto' : 'Apunte',
            action: () => this.app.selectNote(n.id)
          });
        }
      });

      // SECCIÓN 2: POR TAGS / ETIQUETAS
      const tagMatches = [];
      if (rawTagQ) {
        activeNotes.forEach(n => {
          (n.tags || []).forEach(tag => {
            if (tag.toLowerCase().includes(rawTagQ)) {
              tagMatches.push({
                id: `tag_${n.id}_${tag}`,
                title: `#${tag}`,
                titleHtml: `<span style="color: #34d399; font-weight: 600;">#${highlightMatches(tag, rawTagQ)}</span>`,
                snippetHtml: `En apunte: <em>${escapeHtml(n.title || 'Sin título')}</em>`,
                badgeText: '#TAG',
                badgeClass: 'cmd-badge-tag',
                boxClass: 'box-tag',
                icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
                shortcut: 'Etiqueta',
                action: () => this.app.selectNote(n.id)
              });
            }
          });
        });
      }

      // SECCIÓN 3: PALABRAS CLAVE EN NOTAS (CONTENIDO INTERNO)
      const contentMatches = [];
      if (q.length >= 2) {
        activeNotes.forEach(n => {
          const content = n.content || '';
          if (content.toLowerCase().includes(q)) {
            const snippet = extractContextSnippet(content, q);
            contentMatches.push({
              id: `content_${n.id}`,
              title: n.title || 'Sin título',
              titleHtml: escapeHtml(n.title || 'Sin título'),
              snippetHtml: snippet,
              badgeText: 'EN TEXTO',
              badgeClass: 'cmd-badge-content',
              boxClass: 'box-content',
              icon: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="1.75" fill="none"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="15" y1="12" x2="3" y2="12"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>',
              shortcut: 'Contenido',
              action: () => this.app.selectNote(n.id)
            });
          }
        });
      }

      // SECCIÓN 4: ACCIONES DEL SISTEMA
      const actionMatches = staticCmds
        .filter(c => c.title.toLowerCase().includes(q))
        .map(c => ({
          ...c,
          titleHtml: highlightMatches(c.title, q),
          snippetHtml: ''
        }));

      // Agregar secciones con contenido
      if (titleMatches.length > 0) {
        this.sections.push({
          id: 'sec_titles',
          title: 'Títulos de Proyectos & Apuntes',
          icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.75" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
          items: titleMatches
        });
      }

      if (tagMatches.length > 0) {
        this.sections.push({
          id: 'sec_tags',
          title: 'Etiquetas & Tags (#)',
          icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.75" fill="none"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
          items: tagMatches
        });
      }

      if (contentMatches.length > 0) {
        this.sections.push({
          id: 'sec_content',
          title: 'Palabras Clave en Apuntes',
          icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.75" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
          items: contentMatches
        });
      }

      if (actionMatches.length > 0) {
        this.sections.push({
          id: 'sec_actions',
          title: 'Acciones del Sistema',
          icon: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="1.75" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
          items: actionMatches
        });
      }
    }

    // Aplanar items seleccionables manteniendo índices exactos
    this.selectableItems = [];
    this.sections.forEach(sec => {
      sec.items.forEach(item => {
        item.globalIndex = this.selectableItems.length;
        this.selectableItems.push(item);
      });
    });

    this.selectedIndex = 0;
    this.render();
  }

  render() {
    this.resultsContainer.innerHTML = '';

    if (this.selectableItems.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="cmd-empty-state">
          <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="1.5" fill="none" style="opacity: 0.4; margin-bottom: 8px;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <p style="margin: 0; font-size: 0.88rem; color: var(--text-primary); font-weight: 500;">
            Sin coincidencias para "<strong>${escapeHtml(this.input.value)}</strong>"
          </p>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
            Intenta buscar por título de proyecto, etiqueta (#tag) o frases en el texto.
          </span>
        </div>
      `;
      return;
    }

    this.sections.forEach(section => {
      const secEl = document.createElement('div');
      secEl.className = 'cmd-section';
      secEl.setAttribute('role', 'group');
      secEl.setAttribute('aria-label', section.title);

      // Cabecera de la Sección
      const headerEl = document.createElement('div');
      headerEl.className = 'cmd-section-header';
      headerEl.innerHTML = `
        <span class="cmd-section-title">
          ${section.icon}
          <span>${section.title}</span>
        </span>
        <span class="cmd-section-count">${section.items.length}</span>
      `;
      secEl.appendChild(headerEl);

      // Lista de items de la sección
      section.items.forEach(item => {
        const itemEl = document.createElement('div');
        const isSelected = item.globalIndex === this.selectedIndex;
        itemEl.className = `cmd-item ${isSelected ? 'active' : ''}`;
        itemEl.id = `cmd-opt-${item.globalIndex}`;
        itemEl.setAttribute('data-index', item.globalIndex);
        itemEl.setAttribute('role', 'option');
        itemEl.setAttribute('aria-selected', isSelected ? 'true' : 'false');

        itemEl.innerHTML = `
          <div class="cmd-item-left">
            <div class="cmd-item-icon-box ${item.boxClass}">
              ${item.icon}
            </div>
            <div class="cmd-item-text">
              <div class="cmd-item-row">
                <span class="cmd-item-title">${item.titleHtml}</span>
                <span class="cmd-badge ${item.badgeClass}">${item.badgeText}</span>
              </div>
              ${item.snippetHtml ? `<div class="cmd-item-snippet">${item.snippetHtml}</div>` : ''}
            </div>
          </div>
          ${item.shortcut ? `<span class="cmd-item-shortcut">${item.shortcut}</span>` : ''}
        `;

        itemEl.addEventListener('click', () => {
          item.action();
          this.close();
        });

        itemEl.addEventListener('mouseenter', () => {
          this.selectedIndex = item.globalIndex;
          this.updateActiveItem();
        });

        secEl.appendChild(itemEl);
      });

      this.resultsContainer.appendChild(secEl);
    });

    this.input.setAttribute('aria-activedescendant', `cmd-opt-${this.selectedIndex}`);
  }

  updateActiveItem() {
    const items = this.resultsContainer.querySelectorAll('.cmd-item');
    items.forEach(it => {
      const idx = parseInt(it.getAttribute('data-index'), 10);
      const isSel = idx === this.selectedIndex;
      it.classList.toggle('active', isSel);
      it.setAttribute('aria-selected', isSel ? 'true' : 'false');
    });
    this.input.setAttribute('aria-activedescendant', `cmd-opt-${this.selectedIndex}`);
  }

  selectNext() {
    if (this.selectableItems.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.selectableItems.length;
    this.updateActiveItem();
    this.scrollSelectedIntoView();
  }

  selectPrev() {
    if (this.selectableItems.length === 0) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.selectableItems.length) % this.selectableItems.length;
    this.updateActiveItem();
    this.scrollSelectedIntoView();
  }

  scrollSelectedIntoView() {
    const activeEl = this.resultsContainer.querySelector(`.cmd-item[data-index="${this.selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  executeSelected() {
    const item = this.selectableItems[this.selectedIndex];
    if (item) {
      item.action();
      this.close();
    }
  }
}
