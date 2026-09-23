/**
 * ControlPanel.js
 * Parameter adjustment sliders, flight preset selector, flight mode switcher (Auto / Manual Free Flight),
 * manual throttle/flap controls, and environment lighting controls.
 */

import { i18n } from '../i18n/translations.js';

export class ControlPanel {
  constructor(container, options = {}) {
    this.container = container;
    this.onParamsChange = options.onParamsChange || (() => {});
    this.onEnvChange = options.onEnvChange || (() => {});
    this.onReset = options.onReset || (() => {});
    this.onModeChange = options.onModeChange || (() => {});
    this.onManualInputChange = options.onManualInputChange || (() => {});

    this.flightMode = 'auto'; // 'auto' or 'manual'

    this.presets = {
      standard: {
        name: 'Standard Itami NADP',
        speed: 80.0,
        liftoffDist: 1300.0,
        climbAngDeg: 8.0,
        d1Total: 3000.0,
        rTurn: 1000.0,
        turnArcDeg: 90.0,
        cruiseClimbDeg: 6.0,
        hdgRwyDeg: 315.5,
        hdgDepartDeg: 230.0,
        d3: 5000.0,
      },
      sharp: {
        name: 'Sharp Noise Abatement (R=750m)',
        speed: 75.0,
        liftoffDist: 1100.0,
        climbAngDeg: 10.5,
        d1Total: 2500.0,
        rTurn: 750.0,
        turnArcDeg: 95.0,
        cruiseClimbDeg: 7.0,
        hdgRwyDeg: 315.5,
        hdgDepartDeg: 230.0,
        d3: 5000.0,
      },
      heavy: {
        name: 'Heavy Widebody (Gentle Climb)',
        speed: 95.0,
        liftoffDist: 1700.0,
        climbAngDeg: 5.5,
        d1Total: 3600.0,
        rTurn: 1400.0,
        turnArcDeg: 85.0,
        cruiseClimbDeg: 4.5,
        hdgRwyDeg: 315.5,
        hdgDepartDeg: 230.0,
        d3: 5000.0,
      },
      crashMountain: {
        name: 'Mountain Impact (Rokko/Nakayama Mountain)',
        speed: 85.0,
        liftoffDist: 1300.0,
        climbAngDeg: 2.0,
        d1Total: 12000.0,
        rTurn: 1000.0,
        turnArcDeg: 0.0,
        cruiseClimbDeg: 2.0,
        hdgRwyDeg: 315.5,
        hdgDepartDeg: 315.5,
        d3: 2000.0,
      },
      crashDive: {
        name: 'Engine Stall Dive Crash',
        speed: 85.0,
        liftoffDist: 1200.0,
        climbAngDeg: 8.0,
        d1Total: 3000.0,
        rTurn: 900.0,
        turnArcDeg: 35.0,
        cruiseClimbDeg: -18.0,
        hdgRwyDeg: 315.5,
        hdgDepartDeg: 280.0,
        d3: 2000.0,
      },
    };
    // Alias for legacy calls
    this.presets.crash = this.presets.crashMountain;

    this.currentValues = { ...this.presets.standard };
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title" id="cp-panel-title">
          <svg class="icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
          ${i18n.t('panelTitle')}
        </div>
        <button id="toggle-panel-btn" class="icon-btn" title="Minimize / Expand Panel">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      <div class="panel-content" id="panel-content">
        <!-- Flight Mode Selector -->
        <div class="control-group">
          <label class="control-label" id="cp-lbl-mode">${i18n.t('modeLabel')}</label>
          <div class="mode-toggle-buttons">
            <button class="mode-btn active" data-mode="auto" id="mode-btn-auto">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span id="cp-btn-auto">${i18n.t('modeAuto')}</span>
            </button>
            <button class="mode-btn" data-mode="manual" id="mode-btn-manual">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6z"/></svg>
              <span id="cp-btn-manual">${i18n.t('modeManual')}</span>
            </button>
          </div>
        </div>

        <!-- 1. Auto Route Parameters (Visible in Auto Mode) -->
        <div id="auto-mode-section">
          <!-- Preset Selector -->
          <div class="control-group">
            <label class="control-label" id="cp-lbl-preset">${i18n.t('presetLabel')}</label>
            <div class="preset-buttons three-cols">
              <button class="preset-btn active" data-preset="standard" id="pbtn-standard">${i18n.t('presets.standard')}</button>
              <button class="preset-btn" data-preset="sharp" id="pbtn-sharp">${i18n.t('presets.sharp')}</button>
              <button class="preset-btn" data-preset="heavy" id="pbtn-heavy">${i18n.t('presets.heavy')}</button>
            </div>
            <div class="preset-buttons two-cols" style="margin-top: 6px;">
              <button class="preset-btn danger" data-preset="crashMountain" id="pbtn-crashMountain">${i18n.t('presets.crashMountain')}</button>
              <button class="preset-btn danger" data-preset="crashDive" id="pbtn-crashDive">${i18n.t('presets.crashDive')}</button>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Sliders -->
          <div class="slider-row">
            <div class="slider-info">
              <span class="slider-name" id="cp-sl-speed">${i18n.t('sliders.speed')}</span>
              <span class="slider-val" id="val-speed">80 m/s (155 kt)</span>
            </div>
            <input type="range" id="param-speed" min="60" max="110" step="1" value="80">
          </div>

          <div class="slider-row">
            <div class="slider-info">
              <span class="slider-name" id="cp-sl-liftoffDist">${i18n.t('sliders.liftoffDist')}</span>
              <span class="slider-val" id="val-liftoffDist">1,300 m</span>
            </div>
            <input type="range" id="param-liftoffDist" min="800" max="2200" step="50" value="1300">
          </div>

          <div class="slider-row">
            <div class="slider-info">
              <span class="slider-name" id="cp-sl-climbAngDeg">${i18n.t('sliders.climbAngDeg')}</span>
              <span class="slider-val" id="val-climbAngDeg">8.0°</span>
            </div>
            <input type="range" id="param-climbAngDeg" min="1.0" max="14.0" step="0.5" value="8.0">
          </div>

          <div class="slider-row">
            <div class="slider-info">
              <span class="slider-name" id="cp-sl-d1Total">${i18n.t('sliders.d1Total')}</span>
              <span class="slider-val" id="val-d1Total">3,000 m</span>
            </div>
            <input type="range" id="param-d1Total" min="2000" max="15000" step="100" value="3000">
          </div>

          <div class="slider-row">
            <div class="slider-info">
              <span class="slider-name" id="cp-sl-rTurn">${i18n.t('sliders.rTurn')}</span>
              <span class="slider-val" id="val-rTurn">1,000 m</span>
            </div>
            <input type="range" id="param-rTurn" min="600" max="1800" step="50" value="1000">
          </div>

          <div class="slider-row">
            <div class="slider-info">
              <span class="slider-name" id="cp-sl-turnArcDeg">${i18n.t('sliders.turnArcDeg')}</span>
              <span class="slider-val" id="val-turnArcDeg">90.0°</span>
            </div>
            <input type="range" id="param-turnArcDeg" min="0.0" max="120.0" step="5" value="90.0">
          </div>

          <div class="slider-row">
            <div class="slider-info">
              <span class="slider-name" id="cp-sl-cruiseClimbDeg">${i18n.t('sliders.cruiseClimbDeg')}</span>
              <span class="slider-val" id="val-cruiseClimbDeg">6.0°</span>
            </div>
            <input type="range" id="param-cruiseClimbDeg" min="-25.0" max="12.0" step="0.5" value="6.0">
          </div>

          <div class="slider-row">
            <div class="slider-info">
              <span class="slider-name" id="cp-sl-hdgRwyDeg">${i18n.t('sliders.hdgRwyDeg')}</span>
              <span class="slider-val" id="val-hdgRwyDeg">315.5°</span>
            </div>
            <input type="range" id="param-hdgRwyDeg" min="312.0" max="320.0" step="0.5" value="315.5">
          </div>
        </div>

        <!-- 2. Manual Flight Controls (Visible in Manual Mode) -->
        <div id="manual-mode-section" class="hidden">
          <div class="manual-control-card">
            <div class="manual-card-header">
              <span id="cp-mn-throttle">${i18n.t('manual.throttleTitle')}</span>
              <span class="throttle-badge" id="throttle-val-badge">0%</span>
            </div>
            <div class="throttle-slider-wrap">
              <input type="range" id="manual-throttle-slider" min="0" max="100" step="1" value="0">
            </div>
            <div class="thrust-meter-bar">
              <div class="thrust-fill" id="thrust-fill-bar" style="width: 0%"></div>
            </div>
          </div>

          <div class="control-group">
            <label class="control-label" id="cp-mn-aero">${i18n.t('manual.aeroTitle')}</label>
            <div class="config-buttons">
              <button class="config-btn" id="flaps-toggle-btn">
                <span class="cfg-lbl" id="cp-mn-flaps">${i18n.t('manual.flaps')}</span>
                <span class="cfg-val" id="flaps-val-text">5° (TO)</span>
              </button>
              <button class="config-btn active" id="gear-toggle-btn">
                <span class="cfg-lbl" id="cp-mn-gear">${i18n.t('manual.gear')}</span>
                <span class="cfg-val" id="gear-val-text">DOWN</span>
              </button>
              <button class="config-btn" id="brakes-toggle-btn">
                <span class="cfg-lbl" id="cp-mn-brakes">${i18n.t('manual.brakes')}</span>
                <span class="cfg-val" id="brakes-val-text">OFF</span>
              </button>
            </div>
          </div>

          <!-- Key Hints Guide -->
          <div class="manual-key-hints">
            <div class="hint-title" id="cp-mn-cheat">${i18n.t('manual.cheatSheetTitle')}</div>
            <div class="hint-row"><kbd>Shift</kbd> / <kbd>Ctrl</kbd> <span id="cp-k-throttle">${i18n.t('manual.kThrottle')}</span></div>
            <div class="hint-row"><kbd>↓</kbd> / <kbd>↑</kbd> <span id="cp-k-pitch">${i18n.t('manual.kPitch')}</span></div>
            <div class="hint-row"><kbd>←</kbd> / <kbd>→</kbd> <span id="cp-k-roll">${i18n.t('manual.kRoll')}</span></div>
            <div class="hint-row"><kbd>Q</kbd> / <kbd>E</kbd> <span id="cp-k-rudder">${i18n.t('manual.kRudder')}</span></div>
            <div class="hint-row"><kbd>G</kbd> / <kbd>F</kbd> <span id="cp-k-gear">${i18n.t('manual.kGearFlaps')}</span></div>
            <div class="hint-row"><kbd>R</kbd> <span id="cp-k-reset">${i18n.t('manual.kReset')}</span></div>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Environment Lighting -->
        <div class="control-group">
          <label class="control-label" id="cp-lbl-env">${i18n.t('env.title')}</label>
          <div class="env-buttons">
            <button class="env-btn active" data-env="sunset" id="ebtn-sunset">${i18n.t('env.sunset')}</button>
            <button class="env-btn" data-env="day" id="ebtn-day">${i18n.t('env.day')}</button>
            <button class="env-btn" data-env="night" id="ebtn-night">${i18n.t('env.night')}</button>
          </div>
        </div>

        <!-- Actions -->
        <div class="action-buttons">
          <button id="reset-sim-btn" class="action-btn secondary">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            <span id="cp-btn-reset">${i18n.t('resetBtn')}</span>
          </button>
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

    const titleEl = this.container.querySelector('#cp-panel-title');
    if (titleEl) {
      titleEl.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
        ${i18n.t('panelTitle')}
      `;
    }

    setText('#cp-lbl-mode', i18n.t('modeLabel'));
    setText('#cp-btn-auto', i18n.t('modeAuto'));
    setText('#cp-btn-manual', i18n.t('modeManual'));

    setText('#cp-lbl-preset', i18n.t('presetLabel'));
    setText('#pbtn-standard', i18n.t('presets.standard'));
    setText('#pbtn-sharp', i18n.t('presets.sharp'));
    setText('#pbtn-heavy', i18n.t('presets.heavy'));
    setText('#pbtn-crashMountain', i18n.t('presets.crashMountain'));
    setText('#pbtn-crashDive', i18n.t('presets.crashDive'));

    setText('#cp-sl-speed', i18n.t('sliders.speed'));
    setText('#cp-sl-liftoffDist', i18n.t('sliders.liftoffDist'));
    setText('#cp-sl-climbAngDeg', i18n.t('sliders.climbAngDeg'));
    setText('#cp-sl-d1Total', i18n.t('sliders.d1Total'));
    setText('#cp-sl-rTurn', i18n.t('sliders.rTurn'));
    setText('#cp-sl-turnArcDeg', i18n.t('sliders.turnArcDeg'));
    setText('#cp-sl-cruiseClimbDeg', i18n.t('sliders.cruiseClimbDeg'));
    setText('#cp-sl-hdgRwyDeg', i18n.t('sliders.hdgRwyDeg'));

    setText('#cp-mn-throttle', i18n.t('manual.throttleTitle'));
    setText('#cp-mn-aero', i18n.t('manual.aeroTitle'));
    setText('#cp-mn-flaps', i18n.t('manual.flaps'));
    setText('#cp-mn-gear', i18n.t('manual.gear'));
    setText('#cp-mn-brakes', i18n.t('manual.brakes'));
    setText('#cp-mn-cheat', i18n.t('manual.cheatSheetTitle'));
    setText('#cp-k-throttle', i18n.t('manual.kThrottle'));
    setText('#cp-k-pitch', i18n.t('manual.kPitch'));
    setText('#cp-k-roll', i18n.t('manual.kRoll'));
    setText('#cp-k-rudder', i18n.t('manual.kRudder'));
    setText('#cp-k-gear', i18n.t('manual.kGearFlaps'));
    setText('#cp-k-reset', i18n.t('manual.kReset'));

    setText('#cp-lbl-env', i18n.t('env.title'));
    setText('#ebtn-sunset', i18n.t('env.sunset'));
    setText('#ebtn-day', i18n.t('env.day'));
    setText('#ebtn-night', i18n.t('env.night'));

    setText('#cp-btn-reset', i18n.t('resetBtn'));
  }

  bindEvents() {
    // Mode Switch buttons
    const modeBtns = this.container.querySelectorAll('.mode-btn');
    const autoSec = this.container.querySelector('#auto-mode-section');
    const manualSec = this.container.querySelector('#manual-mode-section');

    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        modeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode');
        this.flightMode = mode;

        if (mode === 'manual') {
          autoSec.classList.add('hidden');
          manualSec.classList.remove('hidden');
        } else {
          autoSec.classList.remove('hidden');
          manualSec.classList.add('hidden');
        }
        this.onModeChange(mode);
      });
    });

    // Preset Buttons
    const presetBtns = this.container.querySelectorAll('.preset-btn');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        presetBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const pKey = btn.getAttribute('data-preset');
        if (this.presets[pKey]) {
          this.applyPreset(this.presets[pKey]);
        }
      });
    });

    // Slider inputs for Auto Mode
    const paramKeys = [
      'speed',
      'liftoffDist',
      'climbAngDeg',
      'd1Total',
      'rTurn',
      'turnArcDeg',
      'cruiseClimbDeg',
      'hdgRwyDeg',
    ];

    paramKeys.forEach((key) => {
      const input = this.container.querySelector(`#param-${key}`);
      if (!input) return;

      input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.currentValues[key] = val;
        this.updateValueDisplay(key, val);
        this.onParamsChange(this.currentValues);
      });
    });

    // Manual Throttle Slider
    const throttleSlider = this.container.querySelector('#manual-throttle-slider');
    if (throttleSlider) {
      throttleSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.onManualInputChange({ throttle: val / 100.0 });
      });
    }

    // Manual Flaps Button
    const flapsBtn = this.container.querySelector('#flaps-toggle-btn');
    if (flapsBtn) {
      flapsBtn.addEventListener('click', () => {
        this.onManualInputChange({ cycleFlaps: true });
      });
    }

    // Manual Gear Button
    const gearBtn = this.container.querySelector('#gear-toggle-btn');
    if (gearBtn) {
      gearBtn.addEventListener('click', () => {
        this.onManualInputChange({ toggleGear: true });
      });
    }

    // Manual Brakes Button
    const brakesBtn = this.container.querySelector('#brakes-toggle-btn');
    if (brakesBtn) {
      brakesBtn.addEventListener('click', () => {
        this.onManualInputChange({ toggleBrakes: true });
      });
    }

    // Environment Lighting buttons
    const envBtns = this.container.querySelectorAll('.env-btn');
    envBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        envBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const env = btn.getAttribute('data-env');
        this.onEnvChange(env);
      });
    });

    // Reset button
    const resetBtn = this.container.querySelector('#reset-sim-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.onReset());
    }

    // Toggle minimize
    const toggleBtn = this.container.querySelector('#toggle-panel-btn');
    const content = this.container.querySelector('#panel-content');
    if (toggleBtn && content) {
      toggleBtn.addEventListener('click', () => {
        content.classList.toggle('collapsed');
        toggleBtn.classList.toggle('rotated');
      });
    }
  }

  setMode(mode) {
    this.flightMode = mode;
    const btnAuto = this.container.querySelector('#mode-btn-auto');
    const btnManual = this.container.querySelector('#mode-btn-manual');
    const autoSec = this.container.querySelector('#auto-mode-section');
    const manualSec = this.container.querySelector('#manual-mode-section');

    if (btnAuto && btnManual && autoSec && manualSec) {
      btnAuto.classList.toggle('active', mode === 'auto');
      btnManual.classList.toggle('active', mode === 'manual');
      autoSec.classList.toggle('hidden', mode === 'manual');
      manualSec.classList.toggle('hidden', mode === 'auto');
    }
  }

  updateManualHUD(flightState) {
    if (this.flightMode !== 'manual') return;

    // Throttle & Thrust Fill
    const throttleSlider = this.container.querySelector('#manual-throttle-slider');
    const throttleBadge = this.container.querySelector('#throttle-val-badge');
    const thrustFill = this.container.querySelector('#thrust-fill-bar');

    if (throttleSlider && document.activeElement !== throttleSlider) {
      throttleSlider.value = Math.round(flightState.throttle || 0);
    }
    if (throttleBadge) {
      throttleBadge.textContent = `${Math.round(flightState.throttle || 0)}%`;
    }
    if (thrustFill) {
      thrustFill.style.width = `${Math.min(100, flightState.actualThrust || 0)}%`;
    }

    // Flaps Text
    const flapsText = this.container.querySelector('#flaps-val-text');
    if (flapsText) {
      flapsText.textContent = `${flightState.flaps}° ${flightState.flaps === 5 ? '(TO)' : flightState.flaps === 30 ? '(LDG)' : ''}`;
    }

    // Gear Text
    const gearBtn = this.container.querySelector('#gear-toggle-btn');
    const gearText = this.container.querySelector('#gear-val-text');
    const isGearDown = (flightState.gearState || 0) > 0.5;
    if (gearBtn && gearText) {
      gearBtn.classList.toggle('active', isGearDown);
      gearText.textContent = isGearDown ? 'DOWN' : 'UP';
    }

    // Brakes Text
    const brakesBtn = this.container.querySelector('#brakes-toggle-btn');
    const brakesText = this.container.querySelector('#brakes-val-text');
    if (brakesBtn && brakesText) {
      brakesBtn.classList.toggle('active', !!flightState.brakes);
      brakesText.textContent = flightState.brakes ? 'ON' : 'OFF';
    }
  }

  applyPreset(preset) {
    this.currentValues = { ...preset };
    for (const [key, val] of Object.entries(preset)) {
      const input = this.container.querySelector(`#param-${key}`);
      if (input) {
        input.value = val;
        this.updateValueDisplay(key, val);
      }
    }
    this.onParamsChange(this.currentValues);
  }

  updateValueDisplay(key, val) {
    const span = this.container.querySelector(`#val-${key}`);
    if (!span) return;

    if (key === 'speed') {
      const kt = Math.round(val * 1.94384);
      span.textContent = `${val.toFixed(0)} m/s (${kt} kt)`;
    } else if (key === 'liftoffDist' || key === 'd1Total' || key === 'rTurn') {
      span.textContent = `${val.toLocaleString()} m`;
    } else if (key.endsWith('Deg')) {
      span.textContent = `${val.toFixed(1)}°`;
    }
  }
}
