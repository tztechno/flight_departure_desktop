/**
 * TelemetryUI.js
 * Renders bottom timeline control bar, playback scrub bar, and real-time telemetry metrics.
 * Supports both Auto Route trajectory playback and Manual Free Flight live mode.
 */

import { i18n } from '../i18n/translations.js';

export class TelemetryUI {
  constructor(container, options = {}) {
    this.container = container;
    this.onPlayPause = options.onPlayPause || (() => {});
    this.onSeek = options.onSeek || (() => {});
    this.onSpeedChange = options.onSpeedChange || (() => {});
    this.onAudioToggle = options.onAudioToggle || (() => {});
    this.onLoopToggle = options.onLoopToggle || (() => {});

    this.isPlaying = true;
    this.isAudioActive = false;
    this.isLooping = true;
    this.playbackSpeed = 1.0;
    this.flightMode = 'auto'; // 'auto' or 'manual'

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="telemetry-bar">
        <!-- Telemetry Data Cards -->
        <div class="telemetry-grid">
          <div class="telem-item">
            <span class="telem-label" id="telem-lbl-alt">${i18n.t('telem.alt')}</span>
            <span class="telem-val" id="telem-alt">0 <small>FT</small></span>
          </div>
          <div class="telem-item">
            <span class="telem-label" id="telem-lbl-spd">${i18n.t('telem.spd')}</span>
            <span class="telem-val" id="telem-spd">0 <small>KT</small></span>
          </div>
          <div class="telem-item">
            <span class="telem-label" id="telem-lbl-hdg">${i18n.t('telem.hdg')}</span>
            <span class="telem-val" id="telem-hdg">316°</span>
          </div>
          <div class="telem-item">
            <span class="telem-label" id="telem-lbl-bank">${i18n.t('telem.bank')}</span>
            <span class="telem-val" id="telem-bank">0.0°</span>
          </div>
          <div class="telem-item">
            <span class="telem-label" id="telem-lbl-g">${i18n.t('telem.g')}</span>
            <span class="telem-val" id="telem-g">1.00 <small>G</small></span>
          </div>
          <div class="telem-item">
            <span class="telem-label" id="telem-lbl-vs">${i18n.t('telem.vs')}</span>
            <span class="telem-val" id="telem-vs">+0 <small>FPM</small></span>
          </div>
        </div>

        <!-- Playback Timeline Controls -->
        <div class="timeline-controls">
          <div class="timeline-bar-inner">
            <button id="play-pause-btn" class="ctrl-btn main-play" title="${i18n.t('telem.playPauseTitle')}">
              <svg id="play-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg id="pause-icon" class="hidden" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            </button>

            <span class="time-readout" id="current-time">00:00</span>

            <div class="scrub-container" id="scrub-container-wrap">
              <input type="range" id="timeline-scrub" min="0" max="100" step="0.1" value="0">
              <div class="phase-markers" id="phase-markers-bar">
                <span class="marker marker-ph1" id="m-ph1" title="Phase 1: Roll & Climb">${i18n.t('telem.ph1')}</span>
                <span class="marker marker-ph2" id="marker-ph2" title="Phase 2: Itami Curve">${i18n.t('telem.ph2')}</span>
                <span class="marker marker-ph3" id="marker-ph3" title="Phase 3: Kobe Exit">${i18n.t('telem.ph3')}</span>
              </div>
            </div>

            <span class="time-readout" id="total-time">02:00</span>

            <!-- Speed Selector -->
            <div class="speed-toggle" id="speed-toggle-wrap">
              <button class="speed-btn" data-speed="0.5">0.5x</button>
              <button class="speed-btn active" data-speed="1.0">1x</button>
              <button class="speed-btn" data-speed="2.0">2x</button>
              <button class="speed-btn" data-speed="4.0">4x</button>
            </div>

            <!-- Loop Button -->
            <button id="loop-btn" class="ctrl-btn active" title="${i18n.t('telem.loopTitle')}">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </button>

            <!-- Audio Sound Toggle -->
            <button id="audio-toggle-btn" class="ctrl-btn" title="${i18n.t('telem.audioTitle')}">
              <svg id="audio-off-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/></svg>
              <svg id="audio-on-icon" class="hidden" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  updateLanguage() {
    const setText = (id, text) => {
      const el = this.container.querySelector(id);
      if (el) el.textContent = text;
    };

    setText('#telem-lbl-alt', i18n.t('telem.alt'));
    setText('#telem-lbl-spd', i18n.t('telem.spd'));
    setText('#telem-lbl-hdg', i18n.t('telem.hdg'));
    setText('#telem-lbl-bank', i18n.t('telem.bank'));
    setText('#telem-lbl-g', i18n.t('telem.g'));
    setText('#telem-lbl-vs', i18n.t('telem.vs'));

    setText('#m-ph1', i18n.t('telem.ph1'));
    setText('#marker-ph2', i18n.t('telem.ph2'));
    setText('#marker-ph3', i18n.t('telem.ph3'));

    const playBtn = this.container.querySelector('#play-pause-btn');
    if (playBtn) playBtn.setAttribute('title', i18n.t('telem.playPauseTitle'));

    const loopBtn = this.container.querySelector('#loop-btn');
    if (loopBtn) loopBtn.setAttribute('title', i18n.t('telem.loopTitle'));

    const audioBtn = this.container.querySelector('#audio-toggle-btn');
    if (audioBtn) audioBtn.setAttribute('title', i18n.t('telem.audioTitle'));
  }

  bindEvents() {
    // Play/Pause
    const playBtn = this.container.querySelector('#play-pause-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.isPlaying = !this.isPlaying;
        this.updatePlayPauseIcon();
        this.onPlayPause(this.isPlaying);
      });
    }

    // Scrubber
    const scrub = this.container.querySelector('#timeline-scrub');
    if (scrub) {
      scrub.addEventListener('input', (e) => {
        const progress = parseFloat(e.target.value) / 100.0;
        this.onSeek(progress);
      });
    }

    // Speed buttons
    const speedBtns = this.container.querySelectorAll('.speed-btn');
    speedBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        speedBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const spd = parseFloat(btn.getAttribute('data-speed'));
        this.playbackSpeed = spd;
        this.onSpeedChange(spd);
      });
    });

    // Loop button
    const loopBtn = this.container.querySelector('#loop-btn');
    if (loopBtn) {
      loopBtn.addEventListener('click', () => {
        this.isLooping = !this.isLooping;
        loopBtn.classList.toggle('active', this.isLooping);
        this.onLoopToggle(this.isLooping);
      });
    }

    // Audio button
    const audioBtn = this.container.querySelector('#audio-toggle-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const active = this.onAudioToggle();
        this.isAudioActive = active;
        this.updateAudioIcon();
      });
    }
  }

  setMode(mode) {
    this.flightMode = mode;
    const playBtn = this.container.querySelector('#play-pause-btn');
    const scrub = this.container.querySelector('#timeline-scrub');
    const markers = this.container.querySelector('#phase-markers-bar');
    const speedToggle = this.container.querySelector('#speed-toggle-wrap');
    const loopBtn = this.container.querySelector('#loop-btn');

    if (mode === 'manual') {
      if (playBtn) playBtn.classList.add('hidden');
      if (scrub) scrub.disabled = true;
      if (markers) markers.classList.add('hidden');
      if (speedToggle) speedToggle.classList.add('hidden');
      if (loopBtn) loopBtn.classList.add('hidden');
    } else {
      if (playBtn) playBtn.classList.remove('hidden');
      if (scrub) scrub.disabled = false;
      if (markers) markers.classList.remove('hidden');
      if (speedToggle) speedToggle.classList.remove('hidden');
      if (loopBtn) loopBtn.classList.remove('hidden');
    }
  }

  updatePlayPauseIcon() {
    const playIcon = this.container.querySelector('#play-icon');
    const pauseIcon = this.container.querySelector('#pause-icon');
    if (playIcon && pauseIcon) {
      playIcon.classList.toggle('hidden', this.isPlaying);
      pauseIcon.classList.toggle('hidden', !this.isPlaying);
    }
  }

  updateAudioIcon() {
    const offIcon = this.container.querySelector('#audio-off-icon');
    const onIcon = this.container.querySelector('#audio-on-icon');
    const audioBtn = this.container.querySelector('#audio-toggle-btn');
    if (offIcon && onIcon && audioBtn) {
      offIcon.classList.toggle('hidden', this.isAudioActive);
      onIcon.classList.toggle('hidden', !this.isAudioActive);
      audioBtn.classList.toggle('active', this.isAudioActive);
    }
  }

  setPhaseMarkerPositions(sim) {
    const p1Percent = (sim.tPhase1 / sim.totalDuration) * 100;
    const p2Percent = (sim.tPhase2 / sim.totalDuration) * 100;

    const m2 = this.container.querySelector('#marker-ph2');
    const m3 = this.container.querySelector('#marker-ph3');

    if (m2) m2.style.left = `${p1Percent}%`;
    if (m3) m3.style.left = `${p2Percent}%`;
  }

  update(flightState) {
    // 1. Scrub bar & Time
    const scrub = this.container.querySelector('#timeline-scrub');
    if (scrub && document.activeElement !== scrub && flightState.progress !== undefined) {
      scrub.value = (flightState.progress * 100).toFixed(1);
    }

    const formatTime = (sec) => {
      const m = Math.floor(sec / 60).toString().padStart(2, '0');
      const s = Math.floor(sec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    const curTimeSpan = this.container.querySelector('#current-time');
    const totTimeSpan = this.container.querySelector('#total-time');
    if (curTimeSpan) curTimeSpan.textContent = formatTime(flightState.time);
    if (totTimeSpan) {
      if (flightState.totalDuration) {
        totTimeSpan.textContent = formatTime(flightState.totalDuration);
      } else {
        totTimeSpan.textContent = 'LIVE';
      }
    }

    // 2. Metrics Readouts
    const elAlt = this.container.querySelector('#telem-alt');
    const elSpd = this.container.querySelector('#telem-spd');
    const elHdg = this.container.querySelector('#telem-hdg');
    const elBank = this.container.querySelector('#telem-bank');
    const elG = this.container.querySelector('#telem-g');
    const elVs = this.container.querySelector('#telem-vs');

    if (elAlt) elAlt.innerHTML = `${Math.round(flightState.altitudeFeet).toLocaleString()} <small>FT</small>`;
    if (elSpd) elSpd.innerHTML = `${Math.round(flightState.speedKnots)} <small>KT</small>`;
    if (elHdg) elHdg.innerHTML = `${Math.round(flightState.heading).toString().padStart(3, '0')}°`;
    if (elBank) elBank.innerHTML = `${Math.abs(flightState.bank).toFixed(1)}° ${flightState.bank < -0.5 ? 'L' : flightState.bank > 0.5 ? 'R' : ''}`;
    if (elG) elG.innerHTML = `${flightState.gForce.toFixed(2)} <small>G</small>`;

    const vsFpm = Math.round(flightState.verticalSpeed * 196.85);
    if (elVs) elVs.innerHTML = `${vsFpm >= 0 ? '+' : ''}${vsFpm.toLocaleString()} <small>FPM</small>`;
  }
}
