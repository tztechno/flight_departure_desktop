/**
 * CameraController.js
 * Controls 6 multi-camera perspectives for flight simulation:
 * - Cockpit View (MuJoCo style & true cockpit perspective)
 * - Chase View (Smooth third-person behind-aircraft tracker with bank roll)
 * - Wing/Cabin View (Passenger window looking over wing and engines)
 * - Tower / Spotter Cam (ATC Tower tracking camera)
 * - Free Orbit Cam (OrbitControls)
 * - Radar / Top-Down View (High-altitude tactical radar overview)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraController {
  constructor(domElement) {
    this.domElement = domElement;
    this.currentMode = 'chase'; // 'cockpit', 'chase', 'wing', 'tower', 'free', 'radar'

    // Camera instance
    this.camera = new THREE.PerspectiveCamera(
      55,
      domElement.clientWidth / domElement.clientHeight,
      0.5,
      35000
    );

    // OrbitControls for free view
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 15000;
    this.controls.minDistance = 5;
    this.controls.enabled = false;

    // Smoothed state vectors
    this.currentCamPos = new THREE.Vector3(0, 100, 300);
    this.currentCamLook = new THREE.Vector3(0, 0, 0);

    // Tower Location (Itami ATC Tower: ~1550m along 32L, +450m East, 60m High)
    const toRad = (d) => (d * Math.PI) / 180;
    const hdgRad = toRad(315.5);
    const dirX = Math.sin(hdgRad);
    const dirZ = -Math.cos(hdgRad);
    const perpX = Math.cos(hdgRad);
    const perpZ = Math.sin(hdgRad);

    this.towerPosition = new THREE.Vector3(
      dirX * 1550 + perpX * 450,
      65,
      dirZ * 1550 + perpZ * 450
    );
  }

  setMode(mode) {
    this.currentMode = mode;
    this.controls.enabled = mode === 'free';
    if (mode === 'free') {
      this.camera.fov = 55;
      this.camera.updateProjectionMatrix();
    }
  }

  update(flightState, dt) {
    // Current aircraft position in Three.js coordinates
    // Three.js: tx = x (East), ty = z (Altitude) + 18.0, tz = -y (North)
    const planeX = flightState.position[0];
    const planeY = flightState.position[2] + 18.0;
    const planeZ = -flightState.position[1];
    const planePos = new THREE.Vector3(planeX, planeY, planeZ);

    // Heading and pitch angles
    const hdgRad = THREE.MathUtils.degToRad(flightState.heading);
    const pitchRad = THREE.MathUtils.degToRad(flightState.pitch);
    const bankRad = THREE.MathUtils.degToRad(flightState.bank);

    // Aircraft Forward, Right, Up vectors
    const forward = new THREE.Vector3(
      Math.sin(hdgRad) * Math.cos(pitchRad),
      Math.sin(pitchRad),
      -Math.cos(hdgRad) * Math.cos(pitchRad)
    ).normalize();

    // Right vector
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    // Apply roll around forward axis (bankRad for left bank tilting left wing down)
    const rollAngle = bankRad;
    right.applyAxisAngle(forward, rollAngle);
    up.applyAxisAngle(forward, rollAngle);

    const targetPos = new THREE.Vector3();
    const targetLook = new THREE.Vector3();

    switch (this.currentMode) {
      case 'cockpit': {
        // Cockpit view from the flight deck (Nose tip area)
        this.camera.fov = 60;
        this.camera.updateProjectionMatrix();

        // Eye position in cockpit (+28m forward, +1.2m up from center)
        targetPos.copy(planePos)
          .addScaledVector(forward, 27.5)
          .addScaledVector(up, 1.3);

        // Look forward along trajectory
        targetLook.copy(targetPos).addScaledVector(forward, 400);

        this.camera.position.copy(targetPos);
        this.camera.up.copy(up);
        this.camera.lookAt(targetLook);
        return;
      }

      case 'chase': {
        // Chase view: smooth follow behind and slightly above
        this.camera.fov = 55;
        this.camera.updateProjectionMatrix();

        targetPos.copy(planePos)
          .addScaledVector(forward, -65) // 65m behind
          .addScaledVector(up, 18);      // 18m above

        targetLook.copy(planePos).addScaledVector(forward, 60);

        // Smooth interpolation
        const lerpFactor = Math.min(1.0, 10.0 * dt);
        this.currentCamPos.lerp(targetPos, lerpFactor);
        this.currentCamLook.lerp(targetLook, lerpFactor);

        this.camera.position.copy(this.currentCamPos);
        this.camera.up.copy(up);
        this.camera.lookAt(this.currentCamLook);
        return;
      }

      case 'wing': {
        // Passenger Window View (Right wing looking forward/down over engine)
        this.camera.fov = 50;
        this.camera.updateProjectionMatrix();

        targetPos.copy(planePos)
          .addScaledVector(right, 3.2)   // Right cabin window
          .addScaledVector(forward, -4.0) // Just behind wing root
          .addScaledVector(up, 1.2);

        targetLook.copy(targetPos)
          .addScaledVector(forward, 50)
          .addScaledVector(right, 30)
          .addScaledVector(up, -8);

        this.camera.position.copy(targetPos);
        this.camera.up.copy(up);
        this.camera.lookAt(targetLook);
        return;
      }

      case 'tower': {
        // ATC Tower Telephoto Tracker
        this.camera.fov = 30; // Telephoto zoom
        this.camera.updateProjectionMatrix();

        this.camera.position.copy(this.towerPosition);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(planePos);
        return;
      }

      case 'radar': {
        // High Altitude Top-Down Radar
        this.camera.fov = 45;
        this.camera.updateProjectionMatrix();

        targetPos.set(planeX, 5500, planeZ);
        targetLook.set(planeX, 0, planeZ);

        this.camera.position.copy(targetPos);
        this.camera.up.set(0, 0, -1); // North is top of screen
        this.camera.lookAt(targetLook);
        return;
      }

      case 'free': {
        // Orbit Controls mode
        this.controls.target.copy(planePos);
        this.controls.update();
        return;
      }
    }
  }

  resize() {
    this.camera.aspect = this.domElement.clientWidth / this.domElement.clientHeight;
    this.camera.updateProjectionMatrix();
  }
}
