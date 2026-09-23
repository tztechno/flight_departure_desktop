/**
 * main.js
 * Main entry point and game loop orchestrator for the Itami 32L Flight Simulator.
 * Supports Auto Route trajectory simulation, 6-DOF Manual Free Flight, and real-time
 * mountain / terrain collision detection with dramatic crash game-over handling.
 */

import * as THREE from 'three';
import { FlightTrajectory } from './sim/FlightTrajectory.js';
import { FreeFlightSim } from './sim/FreeFlightSim.js';
import { FlightAudio } from './sim/FlightAudio.js';
import { FlightInstruments } from './sim/FlightInstruments.js';
import { AirportScene } from './scene/AirportScene.js';
import { CameraController } from './scene/CameraController.js';
import { ControlPanel } from './ui/ControlPanel.js';
import { TelemetryUI } from './ui/TelemetryUI.js';
import { ViewSelector } from './ui/ViewSelector.js';
import { i18n } from './i18n/translations.js';

class FlightSimulatorApp {
  constructor() {
    this.container = document.getElementById('viewport-container');
    this.pfdCanvas = document.getElementById('pfd-canvas');
    this.crashOverlay = document.getElementById('crash-overlay');
    this.crashRestartBtn = document.getElementById('crash-restart-btn');
    this.langToggleBtn = document.getElementById('lang-toggle-btn');

    // Simulation State
    this.flightMode = 'auto'; // 'auto' (Trajectory playback) or 'manual' (Free flight)
    this.currentTime = 0;
    this.isPlaying = true;
    this.playbackSpeed = 1.0;
    this.isLooping = true;
    this.isCrashed = false;
    this.lastCrashData = null;
    this.keysDown = {};

    this.initSimulation();
    this.initScene();
    this.initUI();
    this.initAudio();

    if (this.crashRestartBtn) {
      this.crashRestartBtn.addEventListener('click', () => this.resetFlight());
    }

    if (this.langToggleBtn) {
      this.langToggleBtn.addEventListener('click', () => {
        i18n.toggleLang();
        this.updateAppLanguage();
      });
    }

    this.updateAppLanguage();

    this.lastTimestamp = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  initSimulation() {
    this.trajectory = new FlightTrajectory();
    this.freeFlightSim = new FreeFlightSim();
  }

  initScene() {
    this.airportScene = new AirportScene(this.container);
    this.cameraController = new CameraController(this.container);

    // Initial 3D trajectory ribbon build
    this.airportScene.updateTrajectoryVisuals(this.trajectory);
  }

  initUI() {
    // 1. Primary Flight Display Canvas
    this.pfd = new FlightInstruments(this.pfdCanvas);

    // 2. Camera View Selector
    const viewContainer = document.getElementById('view-selector-container');
    this.viewSelector = new ViewSelector(viewContainer, {
      onViewChange: (viewId) => {
        this.cameraController.setMode(viewId);
      },
    });

    // 3. Right Parameter & Control Panel
    const controlContainer = document.getElementById('control-panel-container');
    this.controlPanel = new ControlPanel(controlContainer, {
      onParamsChange: (newParams) => {
        this.trajectory.setParameters(newParams);
        this.airportScene.updateTrajectoryVisuals(this.trajectory);
        this.telemetryUI.setPhaseMarkerPositions(this.trajectory);
        this.resetFlight();
      },
      onEnvChange: (envMode) => {
        this.airportScene.setEnvironmentMode(envMode);
      },
      onModeChange: (mode) => {
        this.setFlightMode(mode);
      },
      onManualInputChange: (inputs) => {
        if (this.isCrashed) return;
        if (inputs.throttle !== undefined) {
          this.freeFlightSim.setThrottle(inputs.throttle * 100.0);
        }
        if (inputs.toggleGear) {
          this.freeFlightSim.toggleGear();
        }
        if (inputs.cycleFlaps) {
          this.freeFlightSim.cycleFlaps();
        }
        if (inputs.toggleBrakes) {
          this.freeFlightSim.brakes = !this.freeFlightSim.brakes;
        }
      },
      onReset: () => {
        this.resetFlight();
      },
    });

    // 4. Bottom Telemetry & Timeline Dock
    const telemetryContainer = document.getElementById('telemetry-container');
    this.telemetryUI = new TelemetryUI(telemetryContainer, {
      onPlayPause: (playing) => {
        this.isPlaying = playing;
      },
      onSeek: (progress) => {
        this.currentTime = progress * this.trajectory.totalDuration;
      },
      onSpeedChange: (speed) => {
        this.playbackSpeed = speed;
      },
      onAudioToggle: () => {
        return this.audio.toggleMute();
      },
      onLoopToggle: (looping) => {
        this.isLooping = looping;
      },
    });

    this.telemetryUI.setPhaseMarkerPositions(this.trajectory);
  }

  initAudio() {
    this.audio = new FlightAudio();
  }

  setFlightMode(mode) {
    this.flightMode = mode;
    this.controlPanel.setMode(mode);
    this.telemetryUI.setMode(mode);
    this.resetFlight();

    if (mode === 'manual') {
      // Show trajectory ribbon as reference guide
      this.airportScene.trajectoryRibbon.visible = true;
      this.airportScene.waypointMarkers.visible = true;
    }
  }

  resetFlight() {
    this.isCrashed = false;
    if (this.crashOverlay) {
      this.crashOverlay.classList.add('hidden');
    }
    if (this.flightMode === 'auto') {
      this.currentTime = 0;
    } else {
      this.freeFlightSim.reset();
    }
  }

  updateAppLanguage() {
    const lang = i18n.getLang();

    // 1. Header brand text
    const titleEl = document.getElementById('brand-title');
    const subEl = document.getElementById('brand-subtitle');
    const langBtnText = document.getElementById('lang-btn-text');

    if (titleEl) {
      titleEl.innerHTML = `${i18n.t('appTitle')} <span class="rwy-tag">${i18n.t('rwyTag')}</span>`;
    }
    if (subEl) subEl.textContent = i18n.t('appSubtitle');
    if (langBtnText) {
      langBtnText.textContent = lang === 'ja' ? 'EN' : '日本語';
    }

    // 2. Child Components
    if (this.viewSelector) this.viewSelector.updateLanguage();
    if (this.controlPanel) this.controlPanel.updateLanguage();
    if (this.telemetryUI) this.telemetryUI.updateLanguage();

    // 3. Crash Modal Text
    const crashTitle = document.getElementById('crash-title-text');
    const crashSub = document.getElementById('crash-subtitle-text');
    const lblSpeed = document.getElementById('crash-lbl-speed');
    const lblElev = document.getElementById('crash-lbl-elev');
    const lblLoc = document.getElementById('crash-lbl-loc');
    const restartText = document.getElementById('crash-restart-text');

    if (crashTitle) crashTitle.textContent = i18n.t('crash.title');
    if (crashSub) crashSub.textContent = i18n.t('crash.subtitle');
    if (lblSpeed) lblSpeed.textContent = i18n.t('crash.speed');
    if (lblElev) lblElev.textContent = i18n.t('crash.elev');
    if (lblLoc) lblLoc.textContent = i18n.t('crash.loc');
    if (restartText) restartText.textContent = i18n.t('crash.restart');

    if (this.lastCrashData) {
      const locEl = document.getElementById('crash-loc');
      if (locEl) {
        locEl.textContent = this.lastCrashData.isMountain
          ? i18n.t('crash.locMountain')
          : i18n.t('crash.locUrban');
      }
    }
  }

  checkTerrainCollision(flightState, planeX, planeY, planeZ) {
    if (this.isCrashed) return;

    // Real elevation from GeoTIFF DEM
    const groundElev = this.airportScene.terrain.getElevationAt(planeX, planeZ);

    // Runway 32L alignment (315.5 deg)
    const rwyHeadingRad = THREE.MathUtils.degToRad(315.5);
    const dirX = Math.sin(rwyHeadingRad);
    const dirZ = -Math.cos(rwyHeadingRad);
    const perpX = Math.cos(rwyHeadingRad);
    const perpZ = Math.sin(rwyHeadingRad);

    const s = planeX * dirX + planeZ * dirZ;
    const t = planeX * perpX + planeZ * perpZ;
    const onAirportGrounds = s >= -500 && s <= 3400 && Math.abs(t) <= 120;

    // Safe ground roll or takeoff climb on airport runway corridor
    if (onAirportGrounds && (flightState.isGrounded || planeY >= 13.5)) {
      return;
    }

    // 1. Mountain / Hills Collision Check
    const isMountain = groundElev >= 40.0;
    const hitsMountain = isMountain && planeY <= groundElev + 4.5;

    // 2. Off-Runway Impact into Ground / City Buildings
    const offAirportCrash =
      !onAirportGrounds && planeY <= groundElev + 3.5 && flightState.speedKnots > 35.0;

    if (hitsMountain || offAirportCrash) {
      this.triggerCrash(flightState, groundElev, isMountain);
    }
  }

  triggerCrash(flightState, groundElev, isMountain) {
    this.isCrashed = true;
    this.lastCrashData = { flightState, groundElev, isMountain };
    this.audio.playCrashSound();

    const speedEl = document.getElementById('crash-speed');
    const elevEl = document.getElementById('crash-elev');
    const locEl = document.getElementById('crash-loc');

    if (speedEl) speedEl.textContent = `${Math.round(flightState.speedKnots)} KT`;
    if (elevEl) elevEl.textContent = `${Math.round(groundElev)} M`;
    if (locEl) {
      locEl.textContent = isMountain ? i18n.t('crash.locMountain') : i18n.t('crash.locUrban');
    }

    if (this.crashOverlay) {
      this.crashOverlay.classList.remove('hidden');
    }
  }

  onKeyDown(e) {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    this.keysDown[e.code] = true;

    if (e.code === 'KeyM') {
      const active = this.audio.toggleMute();
      this.telemetryUI.isAudioActive = active;
      this.telemetryUI.updateAudioIcon();
    } else if (e.code === 'KeyR') {
      this.resetFlight();
    } else if (e.code === 'Tab') {
      e.preventDefault();
      const nextMode = this.flightMode === 'auto' ? 'manual' : 'auto';
      this.setFlightMode(nextMode);
    } else if (e.code === 'KeyG') {
      if (this.flightMode === 'manual' && !this.isCrashed) {
        this.freeFlightSim.toggleGear();
      }
    } else if (e.code === 'KeyF') {
      if (this.flightMode === 'manual' && !this.isCrashed) {
        this.freeFlightSim.cycleFlaps();
      }
    } else if (e.code === 'KeyB') {
      if (this.flightMode === 'manual' && !this.isCrashed) {
        this.freeFlightSim.brakes = !this.freeFlightSim.brakes;
      }
    } else if (e.code === 'Space') {
      if (this.flightMode === 'auto' && !this.isCrashed) {
        e.preventDefault();
        this.isPlaying = !this.isPlaying;
        this.telemetryUI.isPlaying = this.isPlaying;
        this.telemetryUI.updatePlayPauseIcon();
      }
    }
  }

  onKeyUp(e) {
    this.keysDown[e.code] = false;
  }

  onWindowResize() {
    this.airportScene.resize();
    this.cameraController.resize();
    this.pfd.resize();
  }

  animate(now) {
    requestAnimationFrame(this.animate);

    const dt = Math.min((now - this.lastTimestamp) / 1000.0, 0.1);
    this.lastTimestamp = now;

    let flightState;

    if (this.flightMode === 'auto') {
      // Auto Trajectory Replay Mode
      if (this.isPlaying && !this.isCrashed) {
        this.currentTime += dt * this.playbackSpeed;
        if (this.currentTime > this.trajectory.totalDuration) {
          if (this.isLooping) {
            this.currentTime = 0;
          } else {
            this.currentTime = this.trajectory.totalDuration;
            this.isPlaying = false;
            this.telemetryUI.isPlaying = false;
            this.telemetryUI.updatePlayPauseIcon();
          }
        }
      }
      flightState = this.trajectory.sample(this.currentTime);
    } else {
      // Manual Free Flight 6-DOF Aerodynamic Mode
      if (!this.isCrashed) {
        // 1. Throttle Input: Shift / W (Up), Ctrl / S (Down)
        let deltaThrottle = 0;
        if (this.keysDown['ShiftLeft'] || this.keysDown['ShiftRight'] || this.keysDown['KeyW']) {
          deltaThrottle += 0.35 * dt;
        }
        if (this.keysDown['ControlLeft'] || this.keysDown['ControlRight'] || this.keysDown['KeyS']) {
          deltaThrottle -= 0.45 * dt;
        }
        if (deltaThrottle !== 0) {
          this.freeFlightSim.setThrottle((this.freeFlightSim.throttle + deltaThrottle) * 100.0);
        }

        // 2. Elevator (Pitch): Down key pulls yoke up (climb), Up key pushes yoke down
        let elevator = 0;
        if (this.keysDown['ArrowDown']) elevator += 1.0;
        if (this.keysDown['ArrowUp']) elevator -= 1.0;

        // 3. Aileron (Roll / Bank): Left key rolls left, Right key rolls right
        let aileron = 0;
        if (this.keysDown['ArrowLeft'] || this.keysDown['KeyA']) aileron -= 1.0;
        if (this.keysDown['ArrowRight'] || this.keysDown['KeyD']) aileron += 1.0;

        // 4. Rudder (Yaw / Ground Steer): Q left, E right
        let rudder = 0;
        if (this.keysDown['KeyQ']) rudder -= 1.0;
        if (this.keysDown['KeyE']) rudder += 1.0;

        const manualInputs = {
          elevator,
          aileron,
          rudder,
          brakes: !!this.keysDown['KeyB'] || this.freeFlightSim.brakes,
        };

        flightState = this.freeFlightSim.update(dt, manualInputs);
      } else {
        flightState = this.freeFlightSim.getState();
      }
      this.controlPanel.updateManualHUD(flightState);
    }

    // Update 3D Aircraft Model Position & Orientation
    // Note: In Three.js, +X is East, +Y is Altitude, -Z is North
    const planeX = flightState.position[0];
    const planeY = flightState.position[2] + 18.0; // 13.5m runway base + 4.5m landing gear offset
    const planeZ = -flightState.position[1];

    // Check terrain & mountain collision in real-time
    this.checkTerrainCollision(flightState, planeX, planeY, planeZ);

    const aircraftGroup = this.airportScene.aircraft.group;
    aircraftGroup.position.set(planeX, planeY, planeZ);

    // Heading, Pitch, Bank angles in radians
    const hdgRad = THREE.MathUtils.degToRad(flightState.heading);
    const pitchRad = THREE.MathUtils.degToRad(flightState.pitch);
    const bankRad = THREE.MathUtils.degToRad(flightState.bank);

    // Calculate forward vector in Three.js coordinate system (+X East, +Y Up, -Z North)
    const forward = new THREE.Vector3(
      Math.sin(hdgRad) * Math.cos(pitchRad),
      Math.sin(pitchRad),
      -Math.cos(hdgRad) * Math.cos(pitchRad)
    ).normalize();

    // Right vector (Starboard): for heading 0 (North: forward=(0,0,-1)), Right is East (+1,0,0)
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    // Apply roll (bank angle) around the forward flight axis
    // bank < 0 (left bank) -> left wing DOWN (-Y), right wing UP (+Y), fin tilts left
    const rollAngle = bankRad;
    right.applyAxisAngle(forward, rollAngle);
    up.applyAxisAngle(forward, rollAngle);

    // In AircraftModel.js: Local +X is Right wing, +Y is Up (Fuselage/Fin), -Z is Nose Forward (+Z is Backward/Tail)
    const backward = new THREE.Vector3().copy(forward).negate();
    const rotMatrix = new THREE.Matrix4();
    rotMatrix.makeBasis(right, up, backward);
    aircraftGroup.quaternion.setFromRotationMatrix(rotMatrix);

    // Update aircraft internal animations (turbofans, gear, strobes)
    this.airportScene.aircraft.update(flightState, dt);

    // Update Camera
    this.cameraController.update(flightState, dt);

    // Update 2D Canvas Primary Flight Display
    this.pfd.render(flightState);

    // Update Bottom Telemetry Readouts
    this.telemetryUI.update(flightState);

    // Update Sound Synthesizer
    if (!this.isCrashed) {
      const camDist = this.cameraController.camera.position.distanceTo(aircraftGroup.position);
      this.audio.update(flightState, camDist);
    }

    // Render Three.js Scene
    this.airportScene.renderer.render(
      this.airportScene.scene,
      this.cameraController.camera
    );
  }
}

// Bootstrap Application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new FlightSimulatorApp();
});
