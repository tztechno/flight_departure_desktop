/**
 * FreeFlightSim.js
 * 6-DOF Aerodynamic Flight Simulation Engine for Manual Flight Controls.
 * Models thrust, lift, induced/parasitic drag, gravity, control surfaces,
 * ground contact / rollout, and aerodynamic damping at 60 FPS.
 */

export class FreeFlightSim {
  constructor() {
    this.reset();
  }

  reset() {
    // Initial State: At start of Runway 32L, heading 315.5 deg, stationary
    this.x = 0; // East (m)
    this.y = 0; // North (m)
    this.z = 0; // Altitude above runway (m)

    this.heading = 315.5; // deg (Runway 32L heading)
    this.pitch = 0.0; // deg
    this.bank = 0.0; // deg
    this.speed = 0.0; // Airspeed (m/s)
    this.verticalSpeed = 0.0; // m/s
    this.gamma = 0.0; // Flight path climb angle (rad)

    // Control Inputs
    this.throttle = 0.0; // 0.0 to 1.0 (Engine Thrust Command)
    this.actualThrustRatio = 0.0; // Spooled engine thrust
    this.elevatorInput = 0.0; // -1.0 (down) to +1.0 (up)
    this.aileronInput = 0.0; // -1.0 (left) to +1.0 (right)
    this.rudderInput = 0.0; // -1.0 (left) to +1.0 (right)
    this.flapsLevel = 1; // 0=0°, 1=5° (Takeoff), 2=15°, 3=30°
    this.gear = 1.0; // 1.0 = Down, 0.0 = Up
    this.brakes = false;

    // Aircraft Physical Properties (B737-800 class)
    this.mass = 65000.0; // kg
    this.wingArea = 125.0; // m^2
    this.maxThrust = 240000.0; // N (2x 120 kN CFM56 turbofans)
    this.rho = 1.225; // kg/m^3
    this.g = 9.80665; // m/s^2

    // Flight Status
    this.isGrounded = true;
    this.gForce = 1.0;
    this.elapsedTime = 0.0;
    this.stallWarning = false;
  }

  /**
   * Updates flight physics by time step dt (seconds).
   */
  update(dt, inputs = {}) {
    dt = Math.max(0.001, Math.min(dt, 0.1));
    this.elapsedTime += dt;

    // 1. Process User Inputs
    if (inputs.throttle !== undefined) {
      this.throttle = Math.max(0.0, Math.min(1.0, inputs.throttle));
    }
    this.elevatorInput = inputs.elevator || 0.0;
    this.aileronInput = inputs.aileron || 0.0;
    this.rudderInput = inputs.rudder || 0.0;
    this.brakes = !!inputs.brakes;

    if (inputs.toggleGear) {
      this.gear = this.gear > 0.5 ? 0.0 : 1.0;
    }
    if (inputs.cycleFlaps) {
      this.flapsLevel = (this.flapsLevel + 1) % 4;
    }

    // Engine Spool-Up Dynamics (Turbofan lag time constant ~ 1.5s)
    const spoolRate = 0.6 * dt;
    if (this.actualThrustRatio < this.throttle) {
      this.actualThrustRatio = Math.min(this.throttle, this.actualThrustRatio + spoolRate);
    } else if (this.actualThrustRatio > this.throttle) {
      this.actualThrustRatio = Math.max(this.throttle, this.actualThrustRatio - spoolRate * 1.2);
    }

    const currentThrust = this.actualThrustRatio * this.maxThrust;

    // Flaps Configuration
    const flapSettings = [
      { deg: 0, cLBonus: 0.0, cDBonus: 0.0 },
      { deg: 5, cLBonus: 0.35, cDBonus: 0.006 },
      { deg: 15, cLBonus: 0.70, cDBonus: 0.018 },
      { deg: 30, cLBonus: 1.15, cDBonus: 0.045 },
    ];
    const currentFlap = flapSettings[this.flapsLevel] || flapSettings[0];

    const toRad = (d) => (d * Math.PI) / 180.0;
    const toDeg = (r) => (r * 180.0) / Math.PI;

    // Dynamic Pressure q = 0.5 * rho * V^2
    const q = 0.5 * this.rho * this.speed * this.speed;

    // 2. Ground Roll vs Airborne Dynamics
    if (this.isGrounded) {
      this.gear = 1.0; // Must be down on ground
      this.bank = 0.0;

      // Ground Steering
      if (Math.abs(this.rudderInput) > 0.01) {
        const steerRate = 22.0 * this.rudderInput * Math.min(1.0, this.speed / 20.0);
        this.heading = (this.heading + steerRate * dt + 360.0) % 360.0;
      }

      // Ground Pitch (Elevator tilts nose up on runway, max 11 deg before tailstrike)
      const targetPitch = Math.max(-0.5, Math.min(11.0, this.elevatorInput * 11.0));
      this.pitch += (targetPitch - this.pitch) * Math.min(1.0, 5.0 * dt);

      // Angle of Attack on Ground
      const alphaDeg = Math.max(0.0, this.pitch);
      const cL = 0.28 + 0.09 * alphaDeg + currentFlap.cLBonus;
      const lift = q * this.wingArea * cL;

      // Drag on Ground
      const cD0 = 0.024 + currentFlap.cDBonus + (this.gear > 0.5 ? 0.018 : 0.0);
      const drag = q * this.wingArea * cD0;

      // Normal Ground Force & Friction
      const normalForce = Math.max(0.0, this.mass * this.g - lift);
      const frictionCoeff = this.brakes ? 0.38 : 0.022;
      const rollingResistance = normalForce * frictionCoeff;

      // Forward Acceleration along runway
      const netForce = currentThrust - drag - rollingResistance;
      const accel = netForce / this.mass;

      this.speed = Math.max(0.0, this.speed + accel * dt);
      this.verticalSpeed = 0.0;
      this.gamma = 0.0;
      this.gForce = 1.0;

      // Ground Motion along Heading
      const hdgRad = toRad(this.heading);
      this.x += Math.sin(hdgRad) * this.speed * dt;
      this.y += Math.cos(hdgRad) * this.speed * dt;
      this.z = 0.0;

      // Liftoff Condition: Lift exceeds 98% weight AND positive pitch
      if (lift >= this.mass * this.g * 0.96 && this.pitch > 2.5 && this.speed > 55.0) {
        this.isGrounded = false;
        this.verticalSpeed = this.speed * Math.sin(toRad(this.pitch));
      }
    } else {
      // 3. AIRBORNE AERODYNAMICS
      // Calculate Angle of Attack alpha = pitch - gamma
      const gammaDeg = toDeg(this.gamma);
      let alphaDeg = this.pitch - gammaDeg;

      // Stall characteristics (Stall at alpha > 16 deg)
      this.stallWarning = alphaDeg > 15.0;
      let cL = 0.25 + 0.095 * alphaDeg + currentFlap.cLBonus;
      if (alphaDeg > 16.0) {
        // Post-stall lift drop
        cL = Math.max(0.4, cL - (alphaDeg - 16.0) * 0.12);
      } else if (alphaDeg < -8.0) {
        cL = -0.5;
      }

      const lift = q * this.wingArea * cL;

      // Induced & Parasitic Drag
      const aspectratio = 9.4;
      const oswaldE = 0.82;
      const cDi = (cL * cL) / (Math.PI * aspectratio * oswaldE);
      const cD0 = 0.022 + currentFlap.cDBonus + (this.gear > 0.5 ? 0.022 : 0.0);
      const drag = q * this.wingArea * (cD0 + cDi);

      // Control Surface Responses (Aerodynamic control power scales with dynamic pressure)
      const ctrlPower = Math.min(1.4, Math.max(0.4, this.speed / 75.0));

      // Pitch Rate: Elevator command + pitch damping + natural trim
      const pitchCommand = this.elevatorInput * 16.0 * ctrlPower; // deg/s
      const pitchDamping = (this.pitch - gammaDeg - 3.0) * 0.8;
      this.pitch += (pitchCommand - pitchDamping) * dt;

      // Roll Rate: Aileron command + roll damping
      const rollCommand = this.aileronInput * 35.0 * ctrlPower; // deg/s
      const rollDamping = this.bank * 0.35; // natural roll stability
      this.bank += (rollCommand - rollDamping) * dt;
      this.bank = Math.max(-65.0, Math.min(65.0, this.bank)); // Limit bank angle

      // Turn Rate (Coordinated turn: omega = g * tan(bank) / V)
      const bankRad = toRad(this.bank);
      let turnRateDeg = 0.0;
      if (this.speed > 15.0) {
        turnRateDeg = toDeg((this.g * Math.tan(bankRad)) / this.speed);
      }
      // Add direct rudder yaw contribution
      turnRateDeg += this.rudderInput * 8.0 * ctrlPower;
      this.heading = (this.heading + turnRateDeg * dt + 360.0) % 360.0;

      // Flight Path Angle (Gamma) Dynamics
      const gammaRad = this.gamma;
      const liftVertical = lift * Math.cos(bankRad);
      const gammaDot = (liftVertical - this.mass * this.g * Math.cos(gammaRad)) / (this.mass * Math.max(20.0, this.speed));
      this.gamma += gammaDot * dt;
      this.gamma = Math.max(toRad(-35.0), Math.min(toRad(35.0), this.gamma));

      // Forward Speed Dynamics
      const accelForward = (currentThrust - drag - this.mass * this.g * Math.sin(this.gamma)) / this.mass;
      this.speed = Math.max(10.0, this.speed + accelForward * dt);

      // Vertical Speed and G-Force
      this.verticalSpeed = this.speed * Math.sin(this.gamma);
      this.gForce = Math.max(0.0, liftVertical / (this.mass * this.g));

      // Update 3D World Position
      const hdgRad = toRad(this.heading);
      const horizontalSpeed = this.speed * Math.cos(this.gamma);
      this.x += Math.sin(hdgRad) * horizontalSpeed * dt;
      this.y += Math.cos(hdgRad) * horizontalSpeed * dt;
      this.z += this.verticalSpeed * dt;

      // Touchdown / Ground Collision Check
      if (this.z <= 0.0) {
        this.z = 0.0;
        this.isGrounded = true;
        this.gamma = 0.0;
        this.verticalSpeed = 0.0;
        this.bank = 0.0;
        this.pitch = Math.max(0.0, Math.min(8.0, this.pitch));
      }
    }

    return this.getState();
  }

  setThrottle(percent) {
    this.throttle = Math.max(0.0, Math.min(1.0, percent / 100.0));
  }

  toggleGear() {
    this.gear = this.gear > 0.5 ? 0.0 : 1.0;
    return this.gear > 0.5;
  }

  cycleFlaps() {
    this.flapsLevel = (this.flapsLevel + 1) % 4;
    return [0, 5, 15, 30][this.flapsLevel];
  }

  getState() {
    const flapDegs = [0, 5, 15, 30][this.flapsLevel] || 0;
    return {
      position: [this.x, this.y, this.z],
      heading: this.heading,
      pitch: this.pitch,
      bank: this.bank,
      speed: this.speed,
      speedKnots: this.speed * 1.94384,
      altitudeFeet: this.z * 3.28084,
      verticalSpeed: this.verticalSpeed,
      gForce: this.gForce,
      gearState: this.gear,
      throttle: this.throttle * 100.0,
      actualThrust: this.actualThrustRatio * 100.0,
      flaps: flapDegs,
      brakes: this.brakes,
      isGrounded: this.isGrounded,
      stallWarning: this.stallWarning,
      time: this.elapsedTime,
      phase: 0, // 0 indicates Manual Flight Mode
    };
  }
}
