/**
 * AuraNotes - Interactive 2D Graph Visualizer (Second Brain Network)
 * Renderizado de nodos y conexiones de ideas en Canvas con física de partículas
 */

export class NotesGraph {
  constructor(canvasElement, onSelectNote) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.onSelectNote = onSelectNote;

    this.nodes = [];
    this.links = [];
    this.width = canvasElement.clientWidth;
    this.height = canvasElement.clientHeight;

    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.isDragging = false;
    this.dragNode = null;
    this.startX = 0;
    this.startY = 0;

    this.active = false;
    this.animId = null;

    this.initEvents();
  }

  resize() {
    this.width = this.canvas.parentElement.clientWidth;
    this.height = this.canvas.parentElement.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setData(notes) {
    const nodeMap = new Map();
    const titleToId = new Map();

    this.nodes = notes.map((n, i) => {
      const node = {
        id: n.id,
        title: n.title || 'Sin título',
        tags: n.tags || [],
        x: (Math.random() - 0.5) * 400 + this.width / 2,
        y: (Math.random() - 0.5) * 400 + this.height / 2,
        vx: 0,
        vy: 0,
        radius: Math.max(7, Math.min(18, 8 + (n.content?.length || 0) / 120)),
        isHovered: false
      };
      nodeMap.set(n.id, node);
      if (n.title) {
        titleToId.set(n.title.trim().toLowerCase(), n.id);
      }
      return node;
    });

    this.links = [];
    const linkSet = new Set();

    // 1. Conexiones directas por menciones Wiki-Links [[Nota]]
    notes.forEach(note => {
      const sourceNode = nodeMap.get(note.id);
      if (!sourceNode || !note.content) return;

      const wikiMatches = note.content.matchAll(/\[\[(.*?)\]\]/g);
      for (const match of wikiMatches) {
        const targetTitle = (match[1] || '').trim().toLowerCase();
        const targetId = titleToId.get(targetTitle);
        if (targetId && targetId !== note.id) {
          const targetNode = nodeMap.get(targetId);
          if (targetNode) {
            const pairKey = [note.id, targetId].sort().join('--');
            if (!linkSet.has(pairKey)) {
              linkSet.add(pairKey);
              this.links.push({
                source: sourceNode,
                target: targetNode,
                strength: 0.08,
                isMention: true
              });
            }
          }
        }
      }
    });

    // 2. Conexiones complementarias por tags comunes
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const pairKey = [this.nodes[i].id, this.nodes[j].id].sort().join('--');
        if (linkSet.has(pairKey)) continue;

        const commonTags = this.nodes[i].tags.filter(t => this.nodes[j].tags.includes(t));
        if (commonTags.length > 0 || Math.random() < 0.12) {
          linkSet.add(pairKey);
          this.links.push({
            source: this.nodes[i],
            target: this.nodes[j],
            strength: commonTags.length > 0 ? 0.035 : 0.015,
            isMention: false
          });
        }
      }
    }
  }

  start() {
    this.active = true;
    this.resize();
    this.panX = this.width / 2;
    this.panY = this.height / 2;
    this.loop();
  }

  stop() {
    this.active = false;
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  initEvents() {
    window.addEventListener('resize', () => {
      if (this.active) this.resize();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - this.panX) / this.zoom;
      const my = (e.clientY - rect.top - this.panY) / this.zoom;

      const hit = this.nodes.find(n => Math.hypot(n.x - mx, n.y - my) <= n.radius + 6);
      if (hit) {
        this.dragNode = hit;
      } else {
        this.isDragging = true;
        this.startX = e.clientX - this.panX;
        this.startY = e.clientY - this.panY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - this.panX) / this.zoom;
      const my = (e.clientY - rect.top - this.panY) / this.zoom;

      if (this.dragNode) {
        this.dragNode.x = mx;
        this.dragNode.y = my;
        this.dragNode.vx = 0;
        this.dragNode.vy = 0;
      } else if (this.isDragging) {
        this.panX = e.clientX - this.startX;
        this.panY = e.clientY - this.startY;
      } else {
        this.nodes.forEach(n => {
          n.isHovered = Math.hypot(n.x - mx, n.y - my) <= n.radius + 6;
        });
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.dragNode) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left - this.panX) / this.zoom;
        const my = (e.clientY - rect.top - this.panY) / this.zoom;
        if (Math.hypot(this.dragNode.x - mx, this.dragNode.y - my) < 8) {
          this.onSelectNote(this.dragNode.id);
        }
        this.dragNode = null;
      }
      this.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.zoom = Math.max(0.4, Math.min(2.5, this.zoom * zoomFactor));
    }, { passive: false });
  }

  zoomIn() {
    this.zoom = Math.min(2.5, this.zoom * 1.2);
  }

  zoomOut() {
    this.zoom = Math.max(0.4, this.zoom / 1.2);
  }

  resetView() {
    this.zoom = 1;
    this.panX = this.width / 2;
    this.panY = this.height / 2;
  }

  updatePhysics() {
    const repulsion = 450;
    const centerStrength = 0.0008;

    // Repulsión entre nodos
    for (let i = 0; i < this.nodes.length; i++) {
      const n1 = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const n2 = this.nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < 260) {
          const force = (repulsion / (dist * dist));
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }

    // Atracción por enlaces
    this.links.forEach(l => {
      const dx = l.target.x - l.source.x;
      const dy = l.target.y - l.source.y;
      l.source.vx += dx * l.strength;
      l.source.vy += dy * l.strength;
      l.target.vx -= dx * l.strength;
      l.target.vy -= dy * l.strength;
    });

    // Gravedad hacia el centro y amortiguación
    this.nodes.forEach(n => {
      if (n !== this.dragNode) {
        n.vx += (0 - n.x) * centerStrength;
        n.vy += (0 - n.y) * centerStrength;
        n.vx *= 0.88;
        n.vy *= 0.88;
        n.x += n.vx;
        n.y += n.vy;
      }
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);

    // Dibujar enlaces (diferenciando menciones wiki-links de tags estándar)
    this.links.forEach(l => {
      this.ctx.beginPath();
      if (l.isMention) {
        this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
        this.ctx.lineWidth = 2.0;
        this.ctx.setLineDash([4, 2]);
      } else {
        this.ctx.strokeStyle = 'rgba(217, 119, 6, 0.18)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);
      }
      this.ctx.moveTo(l.source.x, l.source.y);
      this.ctx.lineTo(l.target.x, l.target.y);
      this.ctx.stroke();
    });
    this.ctx.setLineDash([]);

    // Dibujar nodos
    const isDark = document.documentElement.getAttribute('data-theme') !== 'paper';

    this.nodes.forEach(n => {
      // Glow o halo en hover
      if (n.isHovered) {
        this.ctx.beginPath();
        this.ctx.arc(n.x, n.y, n.radius + 8, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(217, 119, 6, 0.25)';
        this.ctx.fill();
      }

      // Nodo central
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = n.isHovered ? '#f59e0b' : '#d97706';
      this.ctx.fill();
      this.ctx.strokeStyle = isDark ? '#14161c' : '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Etiqueta del nodo
      this.ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
      this.ctx.fillStyle = isDark ? (n.isHovered ? '#ffffff' : '#9ca3af') : (n.isHovered ? '#000000' : '#4b5563');
      this.ctx.textAlign = 'center';
      this.ctx.fillText(n.title.slice(0, 18), n.x, n.y + n.radius + 14);
    });

    this.ctx.restore();
  }

  loop() {
    if (!this.active) return;
    this.updatePhysics();
    this.render();
    this.animId = requestAnimationFrame(() => this.loop());
  }
}
