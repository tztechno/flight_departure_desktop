/**
 * ViewSelector.js
 * Camera mode switching toolbar with keyboard shortcuts (1-6).
 */

import { i18n } from '../i18n/translations.js';

export class ViewSelector {
  constructor(container, options = {}) {
    this.container = container;
    this.onViewChange = options.onViewChange || (() => {});
    this.currentView = 'chase';

    this.views = [
      { id: 'chase', key: '1', icon: `<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>` },
      { id: 'cockpit', key: '2', icon: `<circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>` },
      { id: 'wing', key: '3', icon: `<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>` },
      { id: 'tower', key: '4', icon: `<rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/><line x1="10" y1="6" x2="14" y2="6"/>` },
      { id: 'free', key: '5', icon: `<circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18"/>` },
      { id: 'radar', key: '6', icon: `<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>` },
    ];

    this.render();
  }

  getLabel(viewId) {
    return i18n.t(`views.${viewId}`);
  }

  render() {
    this.container.innerHTML = `
      <div class="view-toolbar">
        ${this.views
          .map((v) => {
            const label = this.getLabel(v.id);
            return `
          <button class="view-btn ${v.id === this.currentView ? 'active' : ''}" data-view="${v.id}" title="${label} [Key: ${v.key}]">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
              ${v.icon}
            </svg>
            <span class="btn-text" id="view-lbl-${v.id}">${label}</span>
            <kbd class="shortcut-key">${v.key}</kbd>
          </button>
        `;
          })
          .join('')}
      </div>
    `;

    this.bindEvents();
  }

  updateLanguage() {
    this.views.forEach((v) => {
      const label = this.getLabel(v.id);
      const span = this.container.querySelector(`#view-lbl-${v.id}`);
      const btn = this.container.querySelector(`[data-view="${v.id}"]`);
      if (span) span.textContent = label;
      if (btn) btn.setAttribute('title', `${label} [Key: ${v.key}]`);
    });
  }

  bindEvents() {
    const btns = this.container.querySelectorAll('.view-btn');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const viewId = btn.getAttribute('data-view');
        this.setView(viewId);
      });
    });

    // Keyboard Shortcuts (1-6)
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      const keyIndex = parseInt(e.key) - 1;
      if (keyIndex >= 0 && keyIndex < this.views.length) {
        this.setView(this.views[keyIndex].id);
      }
    });
  }

  setView(viewId) {
    this.currentView = viewId;
    const btns = this.container.querySelectorAll('.view-btn');
    btns.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
    });
    this.onViewChange(viewId);
  }
}
