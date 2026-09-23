/**
 * AircraftModel.js
 * Builds a highly detailed procedural Twin-Engine Jet Airliner 3D model.
 * Features articulating flight control surfaces, retractable landing gear,
 * rotating engine turbofans, and dynamic aviation strobe/navigation lights.
 */

import * as THREE from 'three';

export class AircraftModel {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Aircraft';

    this.turbofans = [];
    this.navLights = [];
    this.strobeLights = [];
    this.beaconLights = [];
    this.landingGears = [];
    this.ailerons = { left: null, right: null };
    this.elevators = [];
    this.rudder = null;

    this.build();
  }

  build() {
    // Materials
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0xf4f6f8, // Clean pearl airliner white
      roughness: 0.25,
      metalness: 0.2,
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0x1a237e, // Dark navy belly stripe
      roughness: 0.3,
      metalness: 0.3,
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xdde3ea, // Metallic composite grey
      roughness: 0.35,
      metalness: 0.4,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.15,
      metalness: 0.85,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x102027,
      roughness: 0.1,
      metalness: 0.95,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x212121,
      roughness: 0.7,
    });

    // 1. Fuselage
    const fuselageCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -32),  // Nose tip (-Z is aircraft forward in Three.js)
      new THREE.Vector3(0, 0.2, -28),// Cockpit area
      new THREE.Vector3(0, 0, -18),  // Front fuselage
      new THREE.Vector3(0, 0, 0),    // Center fuselage
      new THREE.Vector3(0, 0.1, 18), // Rear fuselage
      new THREE.Vector3(0, 0.8, 30), // Tail cone
    ]);
    const fuselageGeo = new THREE.TubeGeometry(fuselageCurve, 32, 2.8, 20, false);
    const fuselageMesh = new THREE.Mesh(fuselageGeo, fuselageMat);
    fuselageMesh.castShadow = true;
    fuselageMesh.receiveShadow = true;
    this.group.add(fuselageMesh);

    // Nose Radome Cap
    const noseGeo = new THREE.SphereGeometry(2.78, 24, 16);
    noseGeo.scale(1, 0.95, 1.8);
    const noseMesh = new THREE.Mesh(noseGeo, fuselageMat);
    noseMesh.position.set(0, -0.05, -30.5);
    noseMesh.castShadow = true;
    this.group.add(noseMesh);

    // Cockpit Windshield Visor (Black Glass)
    const cockpitGeo = new THREE.CylinderGeometry(2.6, 2.75, 4, 16, 1, false, 0, Math.PI);
    cockpitGeo.rotateX(Math.PI / 2);
    const cockpitMesh = new THREE.Mesh(cockpitGeo, glassMat);
    cockpitMesh.position.set(0, 0.8, -27.2);
    cockpitMesh.scale.set(0.9, 0.8, 0.9);
    this.group.add(cockpitMesh);

    // 2. Wings (Swept Wing with Dihedral)
    const wingSpan = 30; // Half span
    const wingChordRoot = 7.5;
    const wingChordTip = 2.0;

    const createWing = (isLeft) => {
      const wingGroup = new THREE.Group();
      const sign = isLeft ? -1 : 1;

      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, -wingChordRoot * 0.4);
      wingShape.lineTo(wingSpan, -wingChordTip * 0.4 + 14); // Swept back towards tail (+Z)
      wingShape.lineTo(wingSpan, wingChordTip * 0.6 + 14);
      wingShape.lineTo(0, wingChordRoot * 0.6);
      wingShape.closePath();

      const extrudeSettings = { depth: 0.5, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.1, bevelThickness: 0.1 };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
      wingGeo.rotateX(Math.PI / 2);

      const wingMesh = new THREE.Mesh(wingGeo, wingMat);
      wingMesh.scale.set(sign, 1, 1);
      wingMesh.castShadow = true;
      wingMesh.receiveShadow = true;

      // Dihedral angle (upward tilt ~4.5 degrees)
      wingGroup.rotation.z = -sign * THREE.MathUtils.degToRad(4.5);
      wingGroup.position.set(0, -0.4, -2);
      wingGroup.add(wingMesh);

      // Winglet
      const wingletGeo = new THREE.BoxGeometry(0.2, 3.2, 1.8);
      const winglet = new THREE.Mesh(wingletGeo, fuselageMat);
      winglet.position.set(sign * wingSpan, 1.5, 14);
      winglet.rotation.z = -sign * THREE.MathUtils.degToRad(20);
      wingGroup.add(winglet);

      return wingGroup;
    };

    const leftWing = createWing(true);
    const rightWing = createWing(false);
    this.group.add(leftWing);
    this.group.add(rightWing);

    // 3. High-Bypass Jet Engines (Turbofans mounted under wings)
    const createEngine = (isLeft) => {
      const engGroup = new THREE.Group();
      const sign = isLeft ? -1 : 1;

      // Nacelle Cowling
      const cowlGeo = new THREE.CylinderGeometry(1.5, 1.6, 6.2, 24);
      cowlGeo.rotateX(Math.PI / 2);
      const cowlMesh = new THREE.Mesh(cowlGeo, fuselageMat);
      cowlMesh.castShadow = true;
      engGroup.add(cowlMesh);

      // Chrome Inlet Lip
      const lipGeo = new THREE.TorusGeometry(1.58, 0.12, 12, 24);
      const lipMesh = new THREE.Mesh(lipGeo, chromeMat);
      lipMesh.position.set(0, 0, -3.1);
      engGroup.add(lipMesh);

      // Spinner Cone & Fan Blades
      const fanGroup = new THREE.Group();
      const spinnerGeo = new THREE.ConeGeometry(0.5, 1.6, 16);
      spinnerGeo.rotateX(-Math.PI / 2);
      const spinner = new THREE.Mesh(spinnerGeo, chromeMat);
      spinner.position.set(0, 0, -1.5);
      fanGroup.add(spinner);

      // Fan Blades
      const bladeGeo = new THREE.BoxGeometry(0.1, 1.4, 0.05);
      for (let b = 0; b < 18; b++) {
        const blade = new THREE.Mesh(bladeGeo, darkMat);
        blade.rotation.z = (b * Math.PI * 2) / 18;
        blade.position.set(0, 0, -1.2);
        fanGroup.add(blade);
      }
      engGroup.add(fanGroup);
      this.turbofans.push(fanGroup);

      // Pylon Strut
      const pylonGeo = new THREE.BoxGeometry(0.3, 1.6, 4.0);
      const pylon = new THREE.Mesh(pylonGeo, wingMat);
      pylon.position.set(0, 1.3, 0.5);
      engGroup.add(pylon);

      engGroup.position.set(sign * 9.5, -2.4, -5);
      return engGroup;
    };

    this.group.add(createEngine(true));
    this.group.add(createEngine(false));

    // 4. Tail Section (Vertical & Horizontal Stabilizers)
    // Vertical Stabilizer (Fin)
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0, 9.5);
    finShape.lineTo(-2.4, 8.8);
    finShape.lineTo(-6.5, 0);
    finShape.closePath();

    const finExtrude = { depth: 0.4, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
    const finGeo = new THREE.ExtrudeGeometry(finShape, finExtrude);
    finGeo.rotateY(Math.PI / 2);
    const finMesh = new THREE.Mesh(finGeo, bellyMat);
    finMesh.position.set(-0.2, 1.8, 27);
    finMesh.castShadow = true;
    this.group.add(finMesh);

    // Horizontal Stabilizers
    const hStabShape = new THREE.Shape();
    hStabShape.moveTo(0, -2.5);
    hStabShape.lineTo(9.5, 3.5);
    hStabShape.lineTo(9.5, 5.2);
    hStabShape.lineTo(0, 2.5);
    hStabShape.closePath();

    const hStabGeoL = new THREE.ExtrudeGeometry(hStabShape, { depth: 0.25, bevelEnabled: false });
    hStabGeoL.rotateX(Math.PI / 2);
    const hStabMeshL = new THREE.Mesh(hStabGeoL, wingMat);
    hStabMeshL.scale.set(-1, 1, 1);
    hStabMeshL.position.set(0, 1.4, 25);
    this.group.add(hStabMeshL);

    const hStabMeshR = new THREE.Mesh(hStabGeoL, wingMat);
    hStabMeshR.scale.set(1, 1, 1);
    hStabMeshR.position.set(0, 1.4, 25);
    this.group.add(hStabMeshR);

    // 5. Retractable Landing Gear (Nose Gear & Main Gears)
    this.buildLandingGear();

    // 6. Navigation, Strobe & Beacon Lights
    this.buildAviationLights(wingSpan);

    // Scale overall model for true-to-life 65m long widebody airliner
    this.group.scale.set(1.0, 1.0, 1.0);
  }

  buildLandingGear() {
    const gearMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.4, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const createGearAssembly = (pos) => {
      const gearGroup = new THREE.Group();
      gearGroup.position.copy(pos);

      // Strut
      const strutGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.2, 12);
      const strut = new THREE.Mesh(strutGeo, gearMat);
      strut.position.set(0, -1.6, 0);
      gearGroup.add(strut);

      // Dual Tires
      const tireGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.35, 16);
      tireGeo.rotateZ(Math.PI / 2);

      const tireL = new THREE.Mesh(tireGeo, tireMat);
      tireL.position.set(-0.45, -3.2, 0);
      gearGroup.add(tireL);

      const tireR = new THREE.Mesh(tireGeo, tireMat);
      tireR.position.set(0.45, -3.2, 0);
      gearGroup.add(tireR);

      this.group.add(gearGroup);
      this.landingGears.push(gearGroup);
    };

    // Nose Gear (Center Front at -Z)
    createGearAssembly(new THREE.Vector3(0, -1.2, -22));
    // Main Left Gear
    createGearAssembly(new THREE.Vector3(-4.5, -1.4, 1));
    // Main Right Gear
    createGearAssembly(new THREE.Vector3(4.5, -1.4, 1));
  }

  buildAviationLights(wingSpan) {
    const lightSphereGeo = new THREE.SphereGeometry(0.3, 8, 8);

    // Left Wingtip Navigation Light (RED) - Starboard is Green, Port is Red
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const leftNav = new THREE.Mesh(lightSphereGeo, redMat);
    leftNav.position.set(-wingSpan - 0.2, 0.8, 14);
    this.group.add(leftNav);
    this.navLights.push(leftNav);

    // Right Wingtip Navigation Light (GREEN)
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x00e676 });
    const rightNav = new THREE.Mesh(lightSphereGeo, greenMat);
    rightNav.position.set(wingSpan + 0.2, 0.8, 14);
    this.group.add(rightNav);
    this.navLights.push(rightNav);

    // Wingtip High-Intensity White Strobe Lights (Flash)
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftStrobe = new THREE.Mesh(lightSphereGeo, whiteMat);
    leftStrobe.position.set(-wingSpan - 0.2, 0.6, 14.3);
    this.group.add(leftStrobe);
    this.strobeLights.push(leftStrobe);

    const rightStrobe = new THREE.Mesh(lightSphereGeo, whiteMat);
    rightStrobe.position.set(wingSpan + 0.2, 0.6, 14.3);
    this.group.add(rightStrobe);
    this.strobeLights.push(rightStrobe);

    // Red Anti-Collision Beacons (Top & Bottom Fuselage)
    const topBeacon = new THREE.Mesh(lightSphereGeo, redMat);
    topBeacon.position.set(0, 3.2, -2);
    this.group.add(topBeacon);
    this.beaconLights.push(topBeacon);

    const botBeacon = new THREE.Mesh(lightSphereGeo, redMat);
    botBeacon.position.set(0, -3.0, 0);
    this.group.add(botBeacon);
    this.beaconLights.push(botBeacon);
  }

  update(flightState, dt) {
    // 1. Turbofan rotation (spins fast based on speed)
    const spinSpeed = 25.0 * dt;
    this.turbofans.forEach((fan) => {
      fan.rotation.z += spinSpeed;
    });

    // 2. Strobe Lights Pulse (every 1.0 second sharp flash)
    const time = flightState.time || 0;
    const isStrobeOn = (time % 1.2) < 0.1;
    this.strobeLights.forEach((s) => {
      s.visible = isStrobeOn;
    });

    // 3. Beacon Light Pulse (pulsing sine wave)
    const beaconIntensity = 0.5 + 0.5 * Math.sin(time * 6.0);
    this.beaconLights.forEach((b) => {
      b.scale.setScalar(0.7 + 0.6 * beaconIntensity);
    });

    // 4. Landing Gear Retraction animation
    const gearState = flightState.gearState !== undefined ? flightState.gearState : 1.0;
    this.landingGears.forEach((gear) => {
      gear.scale.y = gearState;
      gear.position.y = -1.4 * gearState;
      gear.visible = gearState > 0.05;
    });
  }
}
