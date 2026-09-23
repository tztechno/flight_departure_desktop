/**
 * FlightAudio.js
 * Synthesizes realistic jet airliner engine sounds using Web Audio API.
 * Modulates turbine whine, jet rumble noise, and wind noise based on aircraft state.
 * Also synthesizes dynamic terrain collision impact sound effects.
 */

export class FlightAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.masterGain = null;
    this.rumbleGain = null;
    this.turbineGain = null;
    this.windGain = null;
    this.turbineOsc = null;
    this.noiseNode = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 1. Jet Engine Low-Frequency Rumble (Filtered Pink/Brown Noise)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise filter approximation
        lastOut = (lastOut + 0.02 * white) / 1.02;
        output[i] = lastOut * 3.5;
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      const rumbleFilter = this.ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
      rumbleFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      this.rumbleGain = this.ctx.createGain();
      this.rumbleGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      this.noiseNode.connect(rumbleFilter);
      rumbleFilter.connect(this.rumbleGain);
      this.rumbleGain.connect(this.masterGain);

      // 2. High-Bypass Turbine Whine (Sine Oscillators with FM harmonics)
      this.turbineOsc = this.ctx.createOscillator();
      this.turbineOsc.type = 'sine';
      this.turbineOsc.frequency.setValueAtTime(650, this.ctx.currentTime);

      const turbineFilter = this.ctx.createBiquadFilter();
      turbineFilter.type = 'bandpass';
      turbineFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      turbineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      this.turbineGain = this.ctx.createGain();
      this.turbineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.turbineOsc.connect(turbineFilter);
      turbineFilter.connect(this.turbineGain);
      this.turbineGain.connect(this.masterGain);

      // 3. Airflow / Wind Noise
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      windFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      this.noiseNode.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);

      // Start Sources
      this.noiseNode.start();
      this.turbineOsc.start();

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext initialization failed or blocked:', e);
    }
  }

  toggleMute() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0.0 : 0.4;
      this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.1);
    }
    return !this.isMuted;
  }

  playCrashSound() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Heavy Low Impact Sub-bass Shockwave
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sawtooth';
    boomOsc.frequency.setValueAtTime(140, now);
    boomOsc.frequency.exponentialRampToValueAtTime(22, now + 1.4);

    const boomFilter = this.ctx.createBiquadFilter();
    boomFilter.type = 'lowpass';
    boomFilter.frequency.setValueAtTime(320, now);
    boomFilter.frequency.exponentialRampToValueAtTime(50, now + 1.4);

    boomGain.gain.setValueAtTime(0.9, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

    boomOsc.connect(boomFilter);
    boomFilter.connect(boomGain);
    boomGain.connect(this.ctx.destination);

    boomOsc.start(now);
    boomOsc.stop(now + 1.6);

    // 2. High-Frequency Crunch / Distortion Noise
    const crunchBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.8, this.ctx.sampleRate);
    const crunchData = crunchBuffer.getChannelData(0);
    for (let i = 0; i < crunchData.length; i++) {
      crunchData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }
    const crunchNode = this.ctx.createBufferSource();
    crunchNode.buffer = crunchBuffer;

    const crunchFilter = this.ctx.createBiquadFilter();
    crunchFilter.type = 'bandpass';
    crunchFilter.frequency.setValueAtTime(800, now);

    const crunchGain = this.ctx.createGain();
    crunchGain.gain.setValueAtTime(0.6, now);
    crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    crunchNode.connect(crunchFilter);
    crunchFilter.connect(crunchGain);
    crunchGain.connect(this.ctx.destination);

    crunchNode.start(now);
  }

  update(flightState, cameraDistance = 30) {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;

    const speedRatio = Math.min(flightState.speedKnots / 160.0, 1.5);
    const targetFreq = 480 + speedRatio * 320;

    if (this.turbineOsc) {
      this.turbineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    }

    // Distance attenuation
    const distFactor = Math.max(0.2, 1.0 - Math.min(cameraDistance / 300, 0.7));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0.4 * distFactor, this.ctx.currentTime, 0.1);
    }
  }
}
