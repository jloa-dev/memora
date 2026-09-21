# Memora Studio — Editorial Second Brain & Knowledge Graph

[![Live Demo](https://img.shields.io/badge/Production-Live%20Demo-amber?style=for-the-badge&logo=firebase&logoColor=white)](https://memora-space.web.app)
[![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20ES6+-yellow?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![Cloud Sync](https://img.shields.io/badge/Backend-Firebase%20Firestore-orange?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **Lienzo de pensamiento continuo y arquitectura de ideas.** Diseñado con estética editorial de alta gama inspirada en *Craft*, *Bear*, *Supernotes* y *Capacities*, libre de plantillas genéricas (*Anti-Slop*), con rendimiento instantáneo y sincronización en la nube.

🔗 **Despliegue en Vivo:** [https://memora-space.web.app](https://memora-space.web.app)

---

## ✨ Características Principales

* ✍️ **Editor Visual Editorial**:
  * Formateo WYSIWYG interactivo con atajos en vivo (`# `, `## `, `- [ ]`, `> [!IDEA]`).
  * Coloreado contextual de texto tanto en el título principal (`ContentEditable H1`) como en cualquier fragmento del cuerpo.
  * Inserción y arrastre de imágenes locales con renderizado dinámico.
  * Portadas dinámicas con gradientes editoriales y personalización *Craft-Style*.

* 🕸️ **Red Visual de Ideas (Interactive Canvas Graph)**:
  * Motor de simulación física con nodos interconectados mediante menciones bidireccionales `[[wiki-links]]` y `#tags` comunes.
  * Modos de zoom, paneo y selección con feedback háptico.

* 🃏 **Muro de Tarjetas (Broadsheet Cards View)**:
  * Visualización espacial modular tipo *Supernotes* para prevenir la fatiga de lectura y organizar notas por categorías cromáticas.

* ⚡ **Paleta de Comandos CMDK (`Ctrl+K` / `⌘K`)**:
  * Buscador universal segmentado por **Títulos de Proyectos**, **Etiquetas & Tags**, **Palabras Clave en Contenido** (con snippets contextuales) y **Acciones del Sistema**.
  * Navegación completa por teclado con accesibilidad ARIA estricta.

* 🎧 **Micro-Interacciones Hápticas (Web Audio API)**:
  * Síntesis sonora nativa en el navegador para feedback táctil en clics, cambios de vista y conmutaciones, conmutable por el usuario.

* ☁️ **Sincronización en Tiempo Real (Firebase Firestore)**:
  * Arquitectura híbrida *Offline-First* con persistencia en `localStorage` y respaldo automático en Firestore.

---

## 🛠️ Stack Tecnológico

* **Core**: Vanilla JavaScript ES6+ (arquitectura modular, cero dependencias pesadas ni frameworks inflados).
* **Diseño & Sistema de Tokens**: CSS3 Custom Properties, Tipografía Editorial Display + Mono Técnico, Aceleración GPU en transiciones.
* **Persistencia & Cloud**: Firebase Hosting + Cloud Firestore.
* **Gráficos & Audio**: HTML5 Canvas 2D Physics Engine + Web Audio API Synthesis.

---

## 🚀 Instalación y Despliegue Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/jloa-dev/memora-studio.git
   cd memora-studio
   ```

2. **Ejecutar localmente:**
   Puedes abrir directamente `index.html` en tu navegador o levantarlo con cualquier servidor estático:
   ```bash
   # Con Python
   python -m http.server 8080
   
   # O con npx serve
   npx serve .
   ```

3. **Despliegue en Firebase Hosting:**
   ```bash
   firebase login
   firebase deploy --only hosting
   ```

---

## 👤 Autor

* **jloa-dev** — [GitHub Profile](https://github.com/jloa-dev)
