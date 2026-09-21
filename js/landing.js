/**
 * MEMORA LANDING PAGE — INTERACTIVE CONTROLLER
 * Compliant with 21st.dev interactive standard & Emil Kowalski motion physics
 */

(function () {
  'use strict';

  // State
  const state = {
    audioEnabled: true,
    theme: localStorage.getItem('memora_theme') || 'dark',
    billingCycle: 'annual', // 'monthly' | 'annual'
    activeMode: 'notebook', // 'notebook' | 'graph' | 'raw'
  };

  // Web Audio API Synthesis for Tactile Micro-Interactions
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playHapticSound(type = 'click') {
    if (!state.audioEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'click') {
        // Crisp tactile click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'success') {
        // Warm harmonious chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'toggle') {
        // Subtle soft blip
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      }
    } catch (e) {
      // Graceful fallback if Web Audio is restricted
    }
  }

  // Theme Management
  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    state.theme = themeName;
    localStorage.setItem('memora_theme', themeName);

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      const sunIcon = themeBtn.querySelector('.icon-sun');
      const moonIcon = themeBtn.querySelector('.icon-moon');
      if (themeName === 'dark') {
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
      } else {
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
      }
    }
  }

  function toggleTheme() {
    playHapticSound('toggle');
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }

  // Audio Switch Management
  function toggleAudio() {
    state.audioEnabled = !state.audioEnabled;
    const btn = document.getElementById('audioToggleBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', state.audioEnabled);
      const iconSoundOn = btn.querySelector('.icon-sound-on');
      const iconSoundOff = btn.querySelector('.icon-sound-off');
      if (iconSoundOn && iconSoundOff) {
        iconSoundOn.style.display = state.audioEnabled ? 'block' : 'none';
        iconSoundOff.style.display = state.audioEnabled ? 'none' : 'block';
      }
    }
    if (state.audioEnabled) {
      playHapticSound('success');
    }
  }

  // 3D Gyroscopic Stage Interactive Controller
  function init3DStage() {
    const stageWrapper = document.getElementById('stageWrapper');
    const stageBox = document.getElementById('stage3dBox');
    const stageGlare = document.getElementById('stageGlare');

    if (!stageWrapper || !stageBox) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let bounds = stageWrapper.getBoundingClientRect();

    window.addEventListener('resize', () => {
      bounds = stageWrapper.getBoundingClientRect();
    });

    stageWrapper.addEventListener('mousemove', (e) => {
      bounds = stageWrapper.getBoundingClientRect();
      const mouseX = e.clientX - bounds.left;
      const mouseY = e.clientY - bounds.top;

      const xPct = (mouseX / bounds.width) - 0.5;
      const yPct = (mouseY / bounds.height) - 0.5;

      const rotateY = xPct * 14; // -7deg to +7deg
      const rotateX = -yPct * 12; // -6deg to +6deg

      stageBox.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;

      if (stageGlare) {
        const glareX = (mouseX / bounds.width) * 100;
        const glareY = (mouseY / bounds.height) * 100;
        stageGlare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.18) 0%, transparent 60%)`;
      }
    });

    stageWrapper.addEventListener('mouseleave', () => {
      stageBox.style.transform = 'rotateX(0deg) rotateY(0deg)';
      if (stageGlare) {
        stageGlare.style.background = 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12) 0%, transparent 60%)';
      }
    });

    // Stage Mode Toggles
    const modeButtons = document.querySelectorAll('.mode-btn');
    const stageViews = document.querySelectorAll('.stage-view');

    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        playHapticSound('click');
        const mode = btn.dataset.mode;
        state.activeMode = mode;

        modeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        stageViews.forEach((view) => {
          if (view.dataset.view === mode) {
            view.classList.add('active');
          } else {
            view.classList.remove('active');
          }
        });
      });
    });
  }

  // Command Palette (Ctrl+K / ⌘K) — Instant 0ms Open
  const cmdBackdrop = document.getElementById('cmdPaletteBackdrop');
  const cmdInput = document.getElementById('cmdPaletteInput');
  const cmdItems = document.querySelectorAll('.cmd-item');

  function openCommandPalette() {
    playHapticSound('toggle');
    if (cmdBackdrop) {
      cmdBackdrop.classList.add('active');
      if (cmdInput) {
        cmdInput.value = '';
        filterCmdItems('');
        setTimeout(() => cmdInput.focus(), 10);
      }
    }
  }

  function closeCommandPalette() {
    if (cmdBackdrop) {
      cmdBackdrop.classList.remove('active');
    }
  }

  function filterCmdItems(query) {
    const q = query.toLowerCase().trim();
    cmdItems.forEach((item) => {
      const text = item.textContent.toLowerCase();
      if (!q || text.includes(q)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  // Slide-out Drawer Quick Capture
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const slideDrawer = document.getElementById('slideDrawer');

  function openDrawer() {
    playHapticSound('click');
    if (drawerBackdrop && slideDrawer) {
      drawerBackdrop.classList.add('active');
      slideDrawer.classList.add('active');
      const input = document.getElementById('quickNoteTitle');
      if (input) setTimeout(() => input.focus(), 150);
    }
  }

  function closeDrawer() {
    playHapticSound('toggle');
    if (drawerBackdrop && slideDrawer) {
      slideDrawer.classList.remove('active');
      setTimeout(() => {
        drawerBackdrop.classList.remove('active');
      }, 200);
    }
  }

  // Pricing Toggle (Monthly vs Annual)
  function initPricing() {
    const optMonthly = document.getElementById('optMonthly');
    const optAnnual = document.getElementById('optAnnual');
    const priceAmounts = document.querySelectorAll('.price-number');

    const prices = {
      monthly: { starter: '0', pro: '14', team: '32' },
      annual: { starter: '0', pro: '9', team: '24' }
    };

    function setCycle(cycle) {
      state.billingCycle = cycle;
      playHapticSound('click');

      if (cycle === 'monthly') {
        if (optMonthly) optMonthly.classList.add('active');
        if (optAnnual) optAnnual.classList.remove('active');
      } else {
        if (optMonthly) optMonthly.classList.remove('active');
        if (optAnnual) optAnnual.classList.add('active');
      }

      priceAmounts.forEach((el) => {
        const tier = el.dataset.tier;
        if (tier && prices[cycle][tier]) {
          el.textContent = prices[cycle][tier];
        }
      });
    }

    if (optMonthly) optMonthly.addEventListener('click', () => setCycle('monthly'));
    if (optAnnual) optAnnual.addEventListener('click', () => setCycle('annual'));
  }

  // FAQ Accordion
  function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach((item) => {
      const questionBtn = item.querySelector('.faq-question');
      if (!questionBtn) return;

      questionBtn.addEventListener('click', () => {
        playHapticSound('click');
        const isOpen = item.classList.contains('open');

        // Close others
        faqItems.forEach((other) => other.classList.remove('open'));

        if (!isOpen) {
          item.classList.add('open');
        }
      });
    });
  }

  // Simulated Telemetry Updates
  function initTelemetryTicker() {
    const latSpan = document.getElementById('telemetryLatency');
    if (!latSpan) return;

    setInterval(() => {
      const rand = (0.10 + Math.random() * 0.05).toFixed(2);
      latSpan.textContent = `${rand}ms`;
    }, 3800);
  }

  // Keyboard Shortcuts Binding
  function initShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (cmdBackdrop && cmdBackdrop.classList.contains('active')) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
      }

      // Escape key
      if (e.key === 'Escape') {
        if (cmdBackdrop && cmdBackdrop.classList.contains('active')) {
          closeCommandPalette();
        }
        if (slideDrawer && slideDrawer.classList.contains('active')) {
          closeDrawer();
        }
      }
    });

    if (cmdInput) {
      cmdInput.addEventListener('input', (e) => {
        filterCmdItems(e.target.value);
      });
    }

    if (cmdBackdrop) {
      cmdBackdrop.addEventListener('click', (e) => {
        if (e.target === cmdBackdrop) {
          closeCommandPalette();
        }
      });
    }

    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', (e) => {
        if (e.target === drawerBackdrop) {
          closeDrawer();
        }
      });
    }

    // Command Item Actions
    cmdItems.forEach((item) => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        closeCommandPalette();
        playHapticSound('click');

        if (action === 'quick-capture') {
          openDrawer();
        } else if (action === 'toggle-theme') {
          toggleTheme();
        } else if (action === 'toggle-audio') {
          toggleAudio();
        } else if (action === 'open-stage') {
          const stageEl = document.getElementById('stageSection');
          if (stageEl) stageEl.scrollIntoView({ behavior: 'smooth' });
        } else if (action === 'open-pricing') {
          const pricingEl = document.getElementById('pricingSection');
          if (pricingEl) pricingEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // Quick Capture Save Simulation
  function initQuickCaptureSave() {
    const saveBtn = document.getElementById('btnSaveQuickNote');
    const titleInput = document.getElementById('quickNoteTitle');
    const bodyInput = document.getElementById('quickNoteBody');
    const toast = document.getElementById('liveToast');

    if (!saveBtn) return;

    saveBtn.addEventListener('click', () => {
      const title = titleInput ? titleInput.value.trim() : '';
      if (!title) {
        if (titleInput) titleInput.focus();
        return;
      }

      playHapticSound('success');
      closeDrawer();

      if (titleInput) titleInput.value = '';
      if (bodyInput) bodyInput.value = '';

      if (toast) {
        toast.textContent = `Apunte guardado y sincronizado: "${title}"`;
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 3200);
      }
    });
  }

  // Attach All Global Listeners
  document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    applyTheme(state.theme);

    // Nav triggers
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const audioBtn = document.getElementById('audioToggleBtn');
    if (audioBtn) audioBtn.addEventListener('click', toggleAudio);

    const cmdKBtn = document.getElementById('cmdPaletteTrigger');
    if (cmdKBtn) cmdKBtn.addEventListener('click', openCommandPalette);

    const openDrawerBtn = document.getElementById('openDrawerBtn');
    if (openDrawerBtn) openDrawerBtn.addEventListener('click', openDrawer);

    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);

    // Initialize interactive modules
    init3DStage();
    initPricing();
    initFAQ();
    initShortcuts();
    initQuickCaptureSave();
    initTelemetryTicker();

    // Add haptic feedback to all primary and secondary buttons
    document.querySelectorAll('.btn-primary, .btn-secondary, .btn-ghost').forEach((btn) => {
      btn.addEventListener('click', () => {
        playHapticSound('click');
      });
    });
  });

})();
