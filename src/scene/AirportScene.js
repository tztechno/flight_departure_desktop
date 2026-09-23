/**
 * AirportScene.js
 * Manages Three.js scene, lighting, atmospheric sky, trajectory ribbon visualization,
 * waypoint beacons, and day/sunset/night environment modes.
 */

import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator.js';
import { AircraftModel } from './AircraftModel.js';

export class AirportScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();

    // Lighting and Env State
    this.envMode = 'sunset'; // 'day', 'sunset', 'night'
    this.trajectoryRibbon = null;
    this.waypointMarkers = new THREE.Group();
    this.scene.add(this.waypointMarkers);

    this.initRenderer();
    this.initLighting();
    this.initTerrain();
    this.initAircraft();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);
  }

  initLighting() {
    // Clear atmospheric perspective with gentle fog (keeps satellite imagery vivid & sharp)
    this.scene.fog = new THREE.FogExp2(0x8ba4b9, 0.000035);

    // Hemisphere Light (Sky vs Ground)
    this.hemiLight = new THREE.HemisphereLight(0xfff8e1, 0x455a64, 0.7);
    this.scene.add(this.hemiLight);

    // Directional Sun Light
    this.sunLight = new THREE.DirectionalLight(0xfff3e0, 1.7);
    this.sunLight.position.set(-4000, 5000, -3000);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 500;
    this.sunLight.shadow.camera.far = 12000;
    const d = 2500;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Sky Dome Background
    this.buildSkyDome();
    this.setEnvironmentMode('sunset');
  }

  buildSkyDome() {
    const skyGeo = new THREE.SphereGeometry(15000, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x8ba4b9,
      side: THREE.BackSide,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  setEnvironmentMode(mode) {
    this.envMode = mode;
    if (mode === 'day') {
      this.scene.background = new THREE.Color(0x81d4fa);
      this.scene.fog.color.setHex(0xb3e5fc);
      this.skyMesh.material.color.setHex(0x81d4fa);
      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0x546e7a);
      this.hemiLight.intensity = 0.85;
      this.sunLight.color.setHex(0xffffff);
      this.sunLight.intensity = 1.9;
      this.sunLight.position.set(-2000, 6000, -2000);
    } else if (mode === 'sunset') {
      this.scene.background = new THREE.Color(0xfb8c00);
      this.scene.fog.color.setHex(0xf8bbd0);
      this.skyMesh.material.color.setHex(0xd84315);
      this.hemiLight.color.setHex(0xffb74d);
      this.hemiLight.groundColor.setHex(0x37474f);
      this.hemiLight.intensity = 0.65;
      this.sunLight.color.setHex(0xff7043);
      this.sunLight.intensity = 2.1;
      this.sunLight.position.set(-6000, 2500, -4000); // Low golden sun in West (Rokko mountains)
    } else if (mode === 'night') {
      this.scene.background = new THREE.Color(0x060c17);
      this.scene.fog.color.setHex(0x091424);
      this.skyMesh.material.color.setHex(0x050a12);
      this.hemiLight.color.setHex(0x37474f);
      this.hemiLight.groundColor.setHex(0x10151c);
      this.hemiLight.intensity = 0.25;
      this.sunLight.color.setHex(0x80d8ff);
      this.sunLight.intensity = 0.4;
      this.sunLight.position.set(-2000, 5000, -2000);
    }
  }

  initTerrain() {
    this.terrain = new TerrainGenerator(this.scene);
    this.terrain.build();
  }

  initAircraft() {
    this.aircraft = new AircraftModel();
    this.scene.add(this.aircraft.group);
  }

  /**
   * Rebuilds the 3D trajectory glow ribbon whenever parameters change.
   */
  updateTrajectoryVisuals(flightTrajectory) {
    if (this.trajectoryRibbon) {
      this.scene.remove(this.trajectoryRibbon);
      this.trajectoryRibbon.geometry.dispose();
      this.trajectoryRibbon = null;
    }

    const waypoints = flightTrajectory.generateWaypoints(600);
    const positions = [];
    const colors = [];

    const colorPh1 = new THREE.Color(0x00e676); // Neon Green
    const colorPh2 = new THREE.Color(0xff9100); // Neon Orange (Itami Curve)
    const colorPh3 = new THREE.Color(0xff1744); // Crimson Red

    waypoints.forEach((wp) => {
      // Map notebook/MuJoCo coords [East, North, Alt] to Three.js coords [X, Alt, -North]
      const tx = wp.position[0];
      const ty = wp.position[2] + 13.5;
      const tz = -wp.position[1];

      positions.push(tx, ty, tz);

      let c = colorPh1;
      if (wp.phase === 2) c = colorPh2;
      else if (wp.phase === 3) c = colorPh3;

      colors.push(c.r, c.g, c.b);
    });

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
    });

    this.trajectoryRibbon = new THREE.Line(lineGeo, lineMat);
    this.scene.add(this.trajectoryRibbon);

    // Rebuild Waypoint Beacons
    this.buildWaypointBeacons(flightTrajectory);
  }

  buildWaypointBeacons(sim) {
    while (this.waypointMarkers.children.length > 0) {
      const obj = this.waypointMarkers.children[0];
      this.waypointMarkers.remove(obj);
    }

    const createBeacon = (x, y, z, label, colorHex) => {
      const group = new THREE.Group();
      // Three.js coords: tx = x, ty = z (altitude) + 13.5, tz = -y (north)
      const altWorld = z + 13.5;
      group.position.set(x, altWorld, -y);

      // Vertical Pillar Line
      const pillarGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -z, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const pillarMat = new THREE.LineDashedMaterial({
        color: colorHex,
        dashSize: 10,
        gapSize: 6,
        transparent: true,
        opacity: 0.5,
      });
      const pillar = new THREE.Line(pillarGeo, pillarMat);
      pillar.computeLineDistances();
      group.add(pillar);

      // Glowing Sphere
      const sphereGeo = new THREE.SphereGeometry(6, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      group.add(sphere);

      // Pulsing Ring
      const ringGeo = new THREE.RingGeometry(10, 14, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);

      this.waypointMarkers.add(group);
    };

    // 1. Runway 32L Start
    createBeacon(0, 0, 0, 'Rwy 32L Start', 0x00e5ff);

    // 2. Liftoff Point
    const toRad = (d) => (d * Math.PI) / 180;
    const hdgRad = toRad(sim.hdgRwyDeg);
    const liftoffX = Math.sin(hdgRad) * sim.liftoffDist;
    const liftoffY = Math.cos(hdgRad) * sim.liftoffDist;
    createBeacon(liftoffX, liftoffY, 0, 'Liftoff Point', 0x00e676);

    // 3. Phase 1 End (Itami Curve Entry)
    createBeacon(sim.ph1End[0], sim.ph1End[1], sim.ph1End[2], 'Itami Curve Start', 0xff9100);

    // 4. Turn Center
    createBeacon(sim.turnCXY[0], sim.turnCXY[1], 0, 'Turn Center', 0xffd600);

    // 5. Phase 2 End (Itami Curve Exit)
    createBeacon(sim.ph2End[0], sim.ph2End[1], sim.ph2End[2], 'Itami Curve End', 0xff9100);

    // 6. Phase 3 End (Departure Exit)
    createBeacon(sim.ph3End[0], sim.ph3End[1], sim.ph3End[2], 'Kobe Dep End', 0xff1744);
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
  }
}
