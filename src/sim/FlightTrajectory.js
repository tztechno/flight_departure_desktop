/**
 * FlightTrajectory.js
 * Calculates 3D flight trajectory for Itami Airport (RJOO) Runway 32L Takeoff & Itami Curve.
 * Fully parameterized and reactive for real-time adjustments.
 */

export class FlightTrajectory {
  constructor(params = {}) {
    this.setParameters(params);
  }

  setParameters(params = {}) {
    this.speed = params.speed !== undefined ? params.speed : 80.0; // m/s (~155 kt)
    this.fps = params.fps !== undefined ? params.fps : 60; // Simulation sample rate for smooth interpolation
    this.hdgRwyDeg = params.hdgRwyDeg !== undefined ? params.hdgRwyDeg : 315.5; // Runway 32L magnetic heading
    this.liftoffDist = params.liftoffDist !== undefined ? params.liftoffDist : 1300.0; // Runway ground roll (m)
    this.d1Total = params.d1Total !== undefined ? params.d1Total : 3000.0; // Phase 1 distance (m)
    this.climbAngDeg = params.climbAngDeg !== undefined ? params.climbAngDeg : 8.0; // Initial steep climb angle
    this.rTurn = params.rTurn !== undefined ? params.rTurn : 1000.0; // Itami Curve turn radius (m)
    this.turnArcDeg = params.turnArcDeg !== undefined ? params.turnArcDeg : 90.0; // Left turn sweep angle (deg)
    this.hdgDepartDeg = params.hdgDepartDeg !== undefined ? params.hdgDepartDeg : 230.0; // Heading toward Kobe
    this.cruiseClimbDeg = params.cruiseClimbDeg !== undefined ? params.cruiseClimbDeg : 6.0; // Cruise climb angle
    this.d3 = params.d3 !== undefined ? params.d3 : 5000.0; // Phase 3 departure distance (m)

    this.compute();
  }

  compute() {
    const toRad = (deg) => (deg * Math.PI) / 180.0;
    const toDeg = (rad) => (rad * 180.0) / Math.PI;

    const hdgRwyRad = toRad(this.hdgRwyDeg);
    const rwyDir = [Math.sin(hdgRwyRad), Math.cos(hdgRwyRad)];
    const leftPerp = [-Math.cos(hdgRwyRad), Math.sin(hdgRwyRad)];

    const climbTan = Math.tan(toRad(this.climbAngDeg));
    const turnArcRad = toRad(this.turnArcDeg);

    // Phase 1 End (Takeoff & initial straight climb)
    const ph1EndXY = [rwyDir[0] * this.d1Total, rwyDir[1] * this.d1Total];
    const zPh1End = Math.max(0.0, (this.d1Total - this.liftoffDist) * climbTan);
    this.ph1End = [ph1EndXY[0], ph1EndXY[1], zPh1End];

    // Turn Center
    const turnCXY = [
      ph1EndXY[0] + leftPerp[0] * this.rTurn,
      ph1EndXY[1] + leftPerp[1] * this.rTurn,
    ];
    this.turnCXY = turnCXY;

    const angleStart = Math.atan2(
      ph1EndXY[1] - turnCXY[1],
      ph1EndXY[0] - turnCXY[0]
    );
    const angleEnd = angleStart + turnArcRad;

    // Phase 2 End (Itami Curve complete)
    const ph2EndXY = [
      turnCXY[0] + this.rTurn * Math.cos(angleEnd),
      turnCXY[1] + this.rTurn * Math.sin(angleEnd),
    ];
    const arcLen = turnArcRad * this.rTurn;
    const zPh2End = zPh1End + arcLen * climbTan;
    this.ph2End = [ph2EndXY[0], ph2EndXY[1], zPh2End];

    // Phase 3 End (Departure climb toward Kobe)
    const hdgDepartRad = toRad(this.hdgDepartDeg);
    const departDir = [Math.sin(hdgDepartRad), Math.cos(hdgDepartRad)];
    const ph3EndXY = [
      ph2EndXY[0] + departDir[0] * this.d3,
      ph2EndXY[1] + departDir[1] * this.d3,
    ];
    const cruiseTan = Math.tan(toRad(this.cruiseClimbDeg));
    const zPh3End = zPh2End + this.d3 * cruiseTan;
    this.ph3End = [ph3EndXY[0], ph3EndXY[1], zPh3End];

    // Total distance and time
    this.totalDistance = this.d1Total + arcLen + this.d3;
    this.totalDuration = this.totalDistance / this.speed;

    this.tPhase1 = this.d1Total / this.speed;
    this.tPhase2 = this.tPhase1 + arcLen / this.speed;
    this.tPhase3 = this.totalDuration;

    // Target Bank Angle during turn (standard coordinated turn: tan(phi) = v^2 / (g * R))
    const g = 9.80665;
    this.nominalBankAngleDeg = toDeg(Math.atan((this.speed * this.speed) / (g * this.rTurn)));
    this.nominalGForce = 1.0 / Math.cos(toRad(this.nominalBankAngleDeg));

    // Store key geometry for rendering ribbons/lines
    this.arcLen = arcLen;
    this.angleStart = angleStart;
    this.angleEnd = angleEnd;
    this.rwyDir = rwyDir;
    this.departDir = departDir;
    this.climbTan = climbTan;
    this.cruiseTan = cruiseTan;
  }

  /**
   * Samples flight state at given time t (seconds from start).
   */
  sample(time) {
    const t = Math.max(0, Math.min(time, this.totalDuration));
    let x = 0, y = 0, z = 0;
    let heading = this.hdgRwyDeg;
    let pitch = 0;
    let bank = 0; // positive = right bank, negative = left bank
    let phase = 1;
    let groundSpeed = this.speed;
    let verticalSpeed = 0; // m/s
    let gForce = 1.0;
    let gearState = 1.0; // 1.0 = down, 0.0 = fully retracted

    const toDeg = (rad) => (rad * 180.0) / Math.PI;

    if (t <= this.tPhase1) {
      // Phase 1: Ground roll + straight climb
      phase = 1;
      const dist = t * this.speed;
      x = this.rwyDir[0] * dist;
      y = this.rwyDir[1] * dist;
      heading = this.hdgRwyDeg;

      if (dist < this.liftoffDist) {
        z = 0;
        pitch = 0; // On runway
        verticalSpeed = 0;
        gearState = 1.0;
      } else {
        const climbDist = dist - this.liftoffDist;
        z = climbDist * this.climbTan;
        pitch = this.climbAngDeg;
        verticalSpeed = this.speed * Math.sin((this.climbAngDeg * Math.PI) / 180);
        // Gear retraction starts right after liftoff
        const timeSinceLiftoff = (dist - this.liftoffDist) / this.speed;
        gearState = Math.max(0, 1.0 - timeSinceLiftoff / 8.0);
      }
      bank = 0;
      gForce = 1.0;
    } else if (t <= this.tPhase2) {
      // Phase 2: Itami Curve (Left Turn)
      phase = 2;
      const tInPhase = t - this.tPhase1;
      const durPhase = this.tPhase2 - this.tPhase1;
      const progress = durPhase > 0 ? tInPhase / durPhase : 1.0;

      const angle = this.angleStart + progress * (this.turnArcDeg * Math.PI) / 180.0;
      x = this.turnCXY[0] + this.rTurn * Math.cos(angle);
      y = this.turnCXY[1] + this.rTurn * Math.sin(angle);
      z = this.ph1End[2] + progress * (this.ph2End[2] - this.ph1End[2]);

      // Heading is perpendicular to radius vector (tangent pointing CCW)
      // Tangent vector is (-sin(angle), cos(angle))
      const tangentX = -Math.sin(angle);
      const tangentY = Math.cos(angle);
      let hdgRad = Math.atan2(tangentX, tangentY);
      if (hdgRad < 0) hdgRad += 2 * Math.PI;
      heading = toDeg(hdgRad);

      pitch = this.climbAngDeg;
      verticalSpeed = this.speed * Math.sin((this.climbAngDeg * Math.PI) / 180);

      // Smooth bank entry and exit (smoothstep)
      let bankFactor = 1.0;
      const entryTime = Math.min(durPhase * 0.2, 4.0);
      if (tInPhase < entryTime) {
        bankFactor = tInPhase / entryTime;
        bankFactor = bankFactor * bankFactor * (3 - 2 * bankFactor); // smoothstep
      } else if (durPhase - tInPhase < entryTime) {
        bankFactor = (durPhase - tInPhase) / entryTime;
        bankFactor = bankFactor * bankFactor * (3 - 2 * bankFactor);
      }
      bank = -this.nominalBankAngleDeg * bankFactor; // Negative for left bank
      gForce = 1.0 + (this.nominalGForce - 1.0) * bankFactor;
      gearState = 0.0;
    } else {
      // Phase 3: Departure Climb / Dive toward exit waypoint
      phase = 3;
      const tInPhase = t - this.tPhase2;
      const durPhase = this.tPhase3 - this.tPhase2;
      const progress = durPhase > 0 ? tInPhase / durPhase : 1.0;

      x = this.ph2End[0] + progress * (this.ph3End[0] - this.ph2End[0]);
      y = this.ph2End[1] + progress * (this.ph3End[1] - this.ph2End[1]);
      z = this.ph2End[2] + progress * (this.ph3End[2] - this.ph2End[2]);

      heading = this.hdgDepartDeg;

      // Smooth pitch transition from Phase 2 climb angle into Phase 3 angle
      let currentPitch = this.cruiseClimbDeg;
      const pitchTransitionTime = Math.min(durPhase * 0.25, 2.5);
      if (tInPhase < pitchTransitionTime && pitchTransitionTime > 0) {
        const factor = tInPhase / pitchTransitionTime;
        const smooth = factor * factor * (3 - 2 * factor);
        currentPitch = this.climbAngDeg + (this.cruiseClimbDeg - this.climbAngDeg) * smooth;
      }
      pitch = currentPitch;

      verticalSpeed = this.speed * Math.sin((pitch * Math.PI) / 180);
      bank = 0;
      gForce = 1.0;
      gearState = 0.0;
    }

    // Direction vector in world space
    const hdgRad = (heading * Math.PI) / 180.0;
    const pitchRad = (pitch * Math.PI) / 180.0;
    const forward = [
      Math.sin(hdgRad) * Math.cos(pitchRad),
      Math.cos(hdgRad) * Math.cos(pitchRad),
      Math.sin(pitchRad),
    ];

    return {
      time: t,
      phase,
      position: [x, y, z], // [East, North, Altitude]
      forward,
      heading,
      pitch,
      bank,
      groundSpeed,
      verticalSpeed,
      altitudeMeters: z,
      altitudeFeet: z * 3.28084,
      speedKnots: this.speed * 1.94384,
      gForce,
      gearState,
      progress: this.totalDuration > 0 ? t / this.totalDuration : 0,
      totalDuration: this.totalDuration,
      totalDistance: this.totalDistance,
    };
  }

  /**
   * Generates a dense array of points for 3D trajectory visualization.
   */
  generateWaypoints(numSamples = 500) {
    const points = [];
    for (let i = 0; i <= numSamples; i++) {
      const t = (i / numSamples) * this.totalDuration;
      const sample = this.sample(t);
      points.push({
        position: sample.position,
        phase: sample.phase,
        t,
      });
    }
    return points;
  }
}
