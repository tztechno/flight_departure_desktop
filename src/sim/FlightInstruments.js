/**
 * FlightInstruments.js
 * High-performance HTML5 Canvas Primary Flight Display (PFD) / HUD.
 * Renders artificial horizon, airspeed tape, altitude tape, VSI, compass, and flight phase annunciation.
 */

import { i18n } from '../i18n/translations.js';

export class FlightInstruments {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 320;
    this.height = rect.height || 260;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  render(flightState) {
    const { ctx, width, height } = this;
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const pitch = flightState.pitch || 0; // degrees
    const bank = flightState.bank || 0; // degrees (- left, + right)
    const airspeed = flightState.speedKnots || 0; // knots
    const altitude = flightState.altitudeFeet || 0; // feet
    const vs = (flightState.verticalSpeed || 0) * 196.85; // m/s to ft/min
    const heading = flightState.heading || 0; // degrees
    const phase = flightState.phase || 1;
    const gForce = flightState.gForce || 1.0;

    const cx = width / 2;
    const cy = height / 2 - 15;
    const radius = Math.min(width, height) * 0.42;

    // Background Container
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // 1. Attitude Horizon (Sky & Ground)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-bank * Math.PI) / 180);

    const pitchOffset = (pitch / 45) * radius * 1.5;

    // Sky
    const skyGrad = ctx.createLinearGradient(0, -radius * 2 + pitchOffset, 0, pitchOffset);
    skyGrad.addColorStop(0, '#0277bd');
    skyGrad.addColorStop(1, '#29b6f6');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 2 + pitchOffset);

    // Ground
    const groundGrad = ctx.createLinearGradient(0, pitchOffset, 0, radius * 2 + pitchOffset);
    groundGrad.addColorStop(0, '#6d4c41');
    groundGrad.addColorStop(1, '#3e2723');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(-radius * 2, pitchOffset, radius * 4, radius * 4);

    // Horizon Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius * 2, pitchOffset);
    ctx.lineTo(radius * 2, pitchOffset);
    ctx.stroke();

    // Pitch Ladder
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const pitchStep = (radius * 1.5) / 45; // pixels per degree
    for (let p = -40; p <= 40; p += 10) {
      if (p === 0) continue;
      const py = pitchOffset - p * pitchStep;
      if (py < -radius * 1.5 || py > radius * 1.5) continue;

      const lineW = Math.abs(p) % 20 === 0 ? 36 : 22;
      ctx.beginPath();
      // Left tick
      ctx.moveTo(-lineW, py);
      ctx.lineTo(-12, py);
      // Right tick
      ctx.moveTo(12, py);
      ctx.lineTo(lineW, py);
      ctx.stroke();

      ctx.fillText(Math.abs(p).toString(), -lineW - 8, py);
      ctx.fillText(Math.abs(p).toString(), lineW + 8, py);
    }

    ctx.restore(); // end horizon rotation

    // Roll Sky Pointer / Arc
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 6, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Roll ticks: -60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60
    const rollMarks = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60];
    rollMarks.forEach((deg) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      const tickLen = Math.abs(deg) % 30 === 0 ? 8 : 4;
      const r1 = radius - 6;
      const r2 = radius - 6 - tickLen;
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(rad), cy + r1 * Math.sin(rad));
      ctx.lineTo(cx + r2 * Math.cos(rad), cy + r2 * Math.sin(rad));
      ctx.stroke();
    });

    // Roll Triangle Indicator (Aircraft Symbol at Top)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((bank * Math.PI) / 180);
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    const triR = radius - 7;
    ctx.moveTo(0, -triR);
    ctx.lineTo(-5, -triR + 9);
    ctx.lineTo(5, -triR + 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Fixed Aircraft Crosshair Symbol (Center)
    ctx.strokeStyle = '#ffeb3b';
    ctx.fillStyle = '#ffeb3b';
    ctx.lineWidth = 3;
    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    // Left wing
    ctx.beginPath();
    ctx.moveTo(cx - 36, cy);
    ctx.lineTo(cx - 12, cy);
    ctx.lineTo(cx - 12, cy + 6);
    ctx.stroke();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy + 6);
    ctx.lineTo(cx + 12, cy);
    ctx.lineTo(cx + 36, cy);
    ctx.stroke();

    ctx.restore(); // end container clip

    // Circular Bezel Rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Airspeed Tape (Left)
    this.renderTape(ctx, 6, cy - radius, 48, radius * 2, airspeed, 10, 'kt', '#00e5ff');

    // 3. Altitude Tape (Right)
    this.renderTape(ctx, width - 54, cy - radius, 48, radius * 2, altitude, 100, 'ft', '#00e676');

    // 4. Heading Indicator (Bottom)
    this.renderHeading(ctx, cx, height - 16, width - 30, heading);

    // 5. Phase Annunciator Badge (Top Center)
    this.renderPhaseBadge(ctx, cx, 14, phase, gForce, bank, pitch);
  }

  renderTape(ctx, x, y, w, h, value, step, unit, accentColor) {
    ctx.save();
    // Background glass box
    ctx.fillStyle = 'rgba(10, 15, 24, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();
    ctx.clip();

    const midY = y + h / 2;
    const pixelsPerUnit = (h / 3) / (step * 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px "Inter", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const minVal = Math.floor((value - (h / 2) / pixelsPerUnit) / step) * step;
    const maxVal = Math.ceil((value + (h / 2) / pixelsPerUnit) / step) * step;

    for (let v = minVal; v <= maxVal; v += step) {
      if (v < 0) continue;
      const dy = midY - (v - value) * pixelsPerUnit;
      if (dy < y || dy > y + h) continue;

      const isMajor = v % (step * 2) === 0;
      ctx.beginPath();
      ctx.moveTo(x + w - (isMajor ? 10 : 5), dy);
      ctx.lineTo(x + w - 2, dy);
      ctx.stroke();

      if (isMajor) {
        ctx.fillText(Math.round(v).toString(), x + w - 12, dy);
      }
    }

    // Current Value Readout Box
    ctx.fillStyle = '#0a192f';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + 2, midY - 10, w - 4, 20, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(value).toString(), x + w / 2, midY + 1);

    // Unit label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '8px sans-serif';
    ctx.fillText(unit, x + w / 2, y + 9);

    ctx.restore();
  }

  renderHeading(ctx, cx, y, w, heading) {
    ctx.save();
    const h = 24;
    const x = cx - w / 2;

    ctx.fillStyle = 'rgba(10, 15, 24, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y - h / 2, w, h, 4);
    ctx.fill();
    ctx.stroke();
    ctx.clip();

    const pixelsPerDeg = (w * 0.7) / 60; // 60 deg visible

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const minH = Math.floor((heading - 35) / 5) * 5;
    const maxH = Math.ceil((heading + 35) / 5) * 5;

    for (let hDeg = minH; hDeg <= maxH; hDeg += 5) {
      const normalizedH = ((hDeg % 360) + 360) % 360;
      const dx = cx + (hDeg - heading) * pixelsPerDeg;

      const isMajor = normalizedH % 10 === 0;
      ctx.beginPath();
      ctx.moveTo(dx, y - h / 2 + 2);
      ctx.lineTo(dx, y - h / 2 + (isMajor ? 8 : 4));
      ctx.stroke();

      if (isMajor) {
        let label = (normalizedH / 10).toString().padStart(2, '0');
        if (normalizedH === 0) label = 'N';
        else if (normalizedH === 90) label = 'E';
        else if (normalizedH === 180) label = 'S';
        else if (normalizedH === 270) label = 'W';
        ctx.fillText(label, dx, y + 4);
      }
    }

    // Lubber line indicator (Center Triangle)
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.moveTo(cx, y - h / 2);
    ctx.lineTo(cx - 4, y - h / 2 + 6);
    ctx.lineTo(cx + 4, y - h / 2 + 6);
    ctx.closePath();
    ctx.fill();

    // Digital Heading Box
    ctx.fillStyle = '#0a192f';
    ctx.strokeStyle = '#ffb300';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx - 18, y + 3, 36, 12, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffb300';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${Math.round(heading).toString().padStart(3, '0')}°`, cx, y + 9);

    ctx.restore();
  }

  renderPhaseBadge(ctx, cx, y, phase, gForce, bank, pitch = 0) {
    ctx.save();
    let text = i18n.t('pfd.ph1');
    let color = '#00e676';

    if (phase === 2) {
      text = i18n.t('pfd.ph2');
      color = '#ff9100';
    } else if (phase === 3) {
      if (pitch < -5.0) {
        text = i18n.t('pfd.ph3Dive');
        color = '#ff1744';
      } else {
        text = i18n.t('pfd.ph3');
        color = '#ff5252';
      }
    }

    ctx.font = 'bold 9px "Inter", sans-serif';
    const textWidth = ctx.measureText(text).width;
    const badgeW = textWidth + 20;

    ctx.fillStyle = 'rgba(10, 15, 24, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(cx - badgeW / 2, y - 8, badgeW, 18, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, y + 1);

    // G-Force and Bank Badges
    ctx.font = '9px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`G: ${gForce.toFixed(2)}`, cx - badgeW / 2 - 28, y + 1);
    ctx.fillText(`BANK: ${Math.abs(bank).toFixed(1)}°`, cx + badgeW / 2 + 34, y + 1);

    ctx.restore();
  }
}
