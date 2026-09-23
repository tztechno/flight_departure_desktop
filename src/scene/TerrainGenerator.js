/**
 * TerrainGenerator.js
 * Builds realistic 3D terrain using real GeoTIFF elevation data (DEM) and
 * high-resolution aerial satellite orthoimagery from Geospatial Information Authority of Japan (GSI).
 * Accurately aligns Osaka International Airport (Itami - RJOO), Runway 32L/32R,
 * Rokko mountain range (elevation up to 925m), Hokusetsu mountains, rivers, and landmarks.
 */

import * as THREE from 'three';

export class TerrainGenerator {
  constructor(scene) {
    this.scene = scene;
    this.elevationData = null;
    this.meta = null;
    this.groundMesh = null;
    this.lights = [];
  }

  async build() {
    const group = new THREE.Group();
    group.name = 'TerrainGroup';

    // 1. Load elevation metadata & binary grid
    await this.loadElevationData();

    // 2. Build Realistic 3D Terrain Mesh with High-Resolution Aerial Orthophoto
    this.buildDemTerrain(group);

    // 3. Water Bodies (Ina River, Muko River, Koyaike Pond subtle water surface)
    this.buildWaterBodies(group);

    // 4. Airport Grounds & Pavement Base
    this.buildAirportBase(group);

    // 5. Runways 32L/14R & 32R/14L with Markings
    this.buildRunways(group);

    // 6. Airport Lighting (Runway Edge Lights, Threshold Lights, Approach Strobe)
    this.buildAirportLights(group);

    this.scene.add(group);
    return group;
  }

  async loadElevationData() {
    try {
      const metaRes = await fetch('/data/elevation_meta.json');
      if (metaRes.ok) {
        this.meta = await metaRes.json();
      }

      const binRes = await fetch('/data/elevation.bin');
      if (binRes.ok) {
        const buffer = await binRes.arrayBuffer();
        this.elevationData = new Float32Array(buffer);
        console.log('Successfully loaded GeoTIFF DEM elevation data:', this.meta);
      }
    } catch (e) {
      console.warn('Could not load elevation binary, falling back to procedural terrain:', e);
    }
  }

  getElevationAt(worldX, worldZ) {
    if (!this.elevationData || !this.meta) {
      // Procedural fallback
      if (worldX < -3000 || worldZ < -3000) {
        const distWest = Math.max(0, -worldX - 2500);
        const distNorth = Math.max(0, -worldZ - 2500);
        return Math.min(850, distWest * 0.12 + distNorth * 0.1);
      }
      return 12.0; // Standard Itami elevation ~12-15m
    }

    const { x_min, x_max, z_min, z_max, width, height } = this.meta;
    if (worldX < x_min || worldX > x_max || worldZ < z_min || worldZ > z_max) {
      return 0.0;
    }

    // Normalized UV [0, 1]
    const u = (worldX - x_min) / (x_max - x_min);
    const v = (worldZ - z_min) / (z_max - z_min);

    const px = Math.min(width - 1, Math.max(0, Math.floor(u * (width - 1))));
    const py = Math.min(height - 1, Math.max(0, Math.floor(v * (height - 1))));

    return this.elevationData[py * width + px] || 0.0;
  }

  buildDemTerrain(parent) {
    const texLoader = new THREE.TextureLoader();
    const orthoTex = texLoader.load('/textures/itami_ortho.jpg');
    orthoTex.wrapS = THREE.ClampToEdgeWrapping;
    orthoTex.wrapT = THREE.ClampToEdgeWrapping;
    orthoTex.generateMipmaps = true;
    orthoTex.minFilter = THREE.LinearMipmapLinearFilter;
    orthoTex.magFilter = THREE.LinearFilter;
    orthoTex.anisotropy = 16; // Maximum texture anisotropy for crisp, razor-sharp aerial imagery at all angles
    orthoTex.colorSpace = THREE.SRGBColorSpace;

    const totalW = this.meta ? this.meta.total_width_m : 34000;
    const totalD = this.meta ? this.meta.total_depth_m : 25000;
    const centerX = this.meta ? this.meta.center_x : -3931;
    const centerZ = this.meta ? this.meta.center_z : 3490;

    // High fidelity terrain geometry (384 x 384 grid for smooth mountain ridges)
    const segmentsX = 384;
    const segmentsZ = 384;
    const groundGeo = new THREE.PlaneGeometry(totalW, totalD, segmentsX, segmentsZ);
    groundGeo.rotateX(-Math.PI / 2);

    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const localX = pos.getX(i);
      const localZ = pos.getZ(i);

      // World coordinates for elevation lookup
      const worldX = localX + centerX;
      const worldZ = localZ + centerZ;

      const elev = this.getElevationAt(worldX, worldZ);
      pos.setY(i, elev);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      map: orthoTex,
      roughness: 0.75,
      metalness: 0.0,
      wireframe: false,
    });

    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.position.set(centerX, 0, centerZ);
    this.groundMesh.receiveShadow = true;
    parent.add(this.groundMesh);
  }

  buildWaterBodies(parent) {
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1b3b4f,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.75,
    });

    // Ina River (East of runway, flows alongside the airport)
    const inaRiverGeo = new THREE.PlaneGeometry(120, 8000, 16, 16);
    inaRiverGeo.rotateX(-Math.PI / 2);
    const inaMesh = new THREE.Mesh(inaRiverGeo, waterMat);
    inaMesh.position.set(450, 13.2, -1000);
    inaMesh.rotation.y = THREE.MathUtils.degToRad(44.5);
    parent.add(inaMesh);

    // Muko River (West boundary of Itami curve)
    const mukoRiverGeo = new THREE.PlaneGeometry(180, 9000, 16, 16);
    mukoRiverGeo.rotateX(-Math.PI / 2);
    const mukoMesh = new THREE.Mesh(mukoRiverGeo, waterMat);
    mukoMesh.position.set(-3800, 22.0, -1500);
    mukoMesh.rotation.y = -THREE.MathUtils.degToRad(15);
    parent.add(mukoMesh);

    // Koyaike Pond (Landmark circular pond with Japan-shaped island inside Itami Curve)
    const pondGeo = new THREE.CylinderGeometry(250, 250, 1, 32);
    const pondMesh = new THREE.Mesh(pondGeo, waterMat);
    pondMesh.position.set(-1800, 28.5, -2800);
    parent.add(pondMesh);

    // Japan island center of Koyaike
    const islandGeo = new THREE.CylinderGeometry(90, 110, 2.5, 16);
    const islandMat = new THREE.MeshLambertMaterial({ color: 0x2e5e3b });
    const islandMesh = new THREE.Mesh(islandGeo, islandMat);
    islandMesh.position.set(-1800, 29.8, -2800);
    parent.add(islandMesh);
  }

  buildAirportBase(parent) {
    // Airport Boundary Apron (Asphalt/Concrete)
    const apronShape = new THREE.Shape();
    apronShape.moveTo(-350, -500);
    apronShape.lineTo(350, -500);
    apronShape.lineTo(350, 3600);
    apronShape.lineTo(-350, 3600);
    apronShape.closePath();

    const apronGeo = new THREE.ShapeGeometry(apronShape);
    apronGeo.rotateX(-Math.PI / 2);

    const apronMat = new THREE.MeshStandardMaterial({
      color: 0x3a4247,
      roughness: 0.85,
    });
    const apronMesh = new THREE.Mesh(apronGeo, apronMat);
    const rwyHeadingRad = THREE.MathUtils.degToRad(315.5);
    apronMesh.rotation.y = -rwyHeadingRad;
    apronMesh.position.set(0, 13.0, 0);
    apronMesh.receiveShadow = true;
    parent.add(apronMesh);
  }

  buildRunways(parent) {
    const rwyHeadingRad = THREE.MathUtils.degToRad(315.5);

    // 1. Runway 32L / 14R (Main Runway: 3000m x 60m)
    const rwy32LGeo = new THREE.PlaneGeometry(60, 3000);
    rwy32LGeo.rotateX(-Math.PI / 2);
    const rwyMat = new THREE.MeshStandardMaterial({
      color: 0x222629,
      roughness: 0.9,
    });
    const rwy32LMesh = new THREE.Mesh(rwy32LGeo, rwyMat);
    rwy32LMesh.rotation.y = -rwyHeadingRad;
    const dirX = Math.sin(rwyHeadingRad);
    const dirZ = -Math.cos(rwyHeadingRad); // Three.js -Z is North
    rwy32LMesh.position.set(dirX * 1500, 13.4, dirZ * 1500);
    rwy32LMesh.receiveShadow = true;
    parent.add(rwy32LMesh);

    // 2. Runway 32R / 14L (Secondary Runway: 1828m x 45m, offset ~210m East)
    const rwy32RGeo = new THREE.PlaneGeometry(45, 1828);
    rwy32RGeo.rotateX(-Math.PI / 2);
    const rwy32RMesh = new THREE.Mesh(rwy32RGeo, rwyMat);
    rwy32RMesh.rotation.y = -rwyHeadingRad;

    const perpX = Math.cos(rwyHeadingRad);
    const perpZ = Math.sin(rwyHeadingRad);
    const r32ROffset = 210;
    rwy32RMesh.position.set(
      dirX * (1828 / 2 + 400) + perpX * r32ROffset,
      13.4,
      dirZ * (1828 / 2 + 400) + perpZ * r32ROffset
    );
    rwy32RMesh.receiveShadow = true;
    parent.add(rwy32RMesh);

    // 3. Markings: Centerlines & Thresholds
    this.buildRunwayMarkings(parent, dirX, dirZ, rwyHeadingRad);
  }

  buildRunwayMarkings(parent, dirX, dirZ, rwyHeadingRad) {
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Centerline Dashes for 32L (every 60m: 30m stripe + 30m gap)
    const stripeGeo = new THREE.PlaneGeometry(2.0, 30);
    stripeGeo.rotateX(-Math.PI / 2);

    for (let dist = 60; dist < 2940; dist += 60) {
      const stripe = new THREE.Mesh(stripeGeo, whiteMat);
      stripe.rotation.y = -rwyHeadingRad;
      stripe.position.set(dirX * dist, 13.5, dirZ * dist);
      parent.add(stripe);
    }

    // Threshold Piano Keys (Runway 32L Threshold)
    for (let i = -6; i <= 6; i++) {
      if (i === 0) continue;
      const keyGeo = new THREE.PlaneGeometry(2.2, 35);
      keyGeo.rotateX(-Math.PI / 2);
      const key = new THREE.Mesh(keyGeo, whiteMat);
      key.rotation.y = -rwyHeadingRad;
      const perpX = Math.cos(rwyHeadingRad);
      const perpZ = Math.sin(rwyHeadingRad);
      key.position.set(
        dirX * 30 + perpX * (i * 3.8),
        13.5,
        dirZ * 30 + perpZ * (i * 3.8)
      );
      parent.add(key);
    }

    // Touchdown Zone Markers
    for (const tDist of [150, 300, 450, 600, 750]) {
      const tdzGeo = new THREE.PlaneGeometry(3.0, 22);
      tdzGeo.rotateX(-Math.PI / 2);
      const tdzL = new THREE.Mesh(tdzGeo, whiteMat);
      const tdzR = new THREE.Mesh(tdzGeo, whiteMat);
      tdzL.rotation.y = -rwyHeadingRad;
      tdzR.rotation.y = -rwyHeadingRad;
      const perpX = Math.cos(rwyHeadingRad);
      const perpZ = Math.sin(rwyHeadingRad);
      tdzL.position.set(dirX * tDist - perpX * 12, 13.5, dirZ * tDist - perpZ * 12);
      tdzR.position.set(dirX * tDist + perpX * 12, 13.5, dirZ * tDist + perpZ * 12);
      parent.add(tdzL);
      parent.add(tdzR);
    }
  }

  buildAirportBuildings(parent) {
    const rwyHeadingRad = THREE.MathUtils.degToRad(315.5);
    const dirX = Math.sin(rwyHeadingRad);
    const dirZ = -Math.cos(rwyHeadingRad);
    const perpX = Math.cos(rwyHeadingRad);
    const perpZ = Math.sin(rwyHeadingRad);

    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0x90a4ae,
      roughness: 0.6,
      metalness: 0.3,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x37474f,
      roughness: 0.2,
      metalness: 0.9,
    });

    // 1. Terminal Main Building
    const termGeo = new THREE.BoxGeometry(120, 24, 750);
    const termMesh = new THREE.Mesh(termGeo, bldgMat);
    termMesh.rotation.y = -rwyHeadingRad;
    termMesh.position.set(
      dirX * 1400 + perpX * 380,
      25,
      dirZ * 1400 + perpZ * 380
    );
    termMesh.castShadow = true;
    termMesh.receiveShadow = true;
    parent.add(termMesh);

    // Terminal Glass Facade
    const glassGeo = new THREE.BoxGeometry(122, 14, 720);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.rotation.y = -rwyHeadingRad;
    glassMesh.position.set(
      dirX * 1400 + perpX * 380,
      27,
      dirZ * 1400 + perpZ * 380
    );
    parent.add(glassMesh);

    // 2. Control Tower (Iconic Itami ATC Tower)
    const towerBaseGeo = new THREE.CylinderGeometry(10, 14, 55, 16);
    const towerBase = new THREE.Mesh(towerBaseGeo, bldgMat);
    towerBase.position.set(
      dirX * 1550 + perpX * 450,
      40.5,
      dirZ * 1550 + perpZ * 450
    );
    towerBase.castShadow = true;
    parent.add(towerBase);

    const towerCabGeo = new THREE.CylinderGeometry(18, 14, 12, 16);
    const towerCab = new THREE.Mesh(towerCabGeo, glassMat);
    towerCab.position.set(
      dirX * 1550 + perpX * 450,
      71,
      dirZ * 1550 + perpZ * 450
    );
    parent.add(towerCab);

    const domeGeo = new THREE.SphereGeometry(6, 16, 16);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(
      dirX * 1550 + perpX * 450,
      80,
      dirZ * 1550 + perpZ * 450
    );
    parent.add(dome);

    // 3. Aircraft Maintenance Hangars (JAL & ANA Hangars)
    for (let h = 0; h < 3; h++) {
      const hangarGeo = new THREE.BoxGeometry(100, 30, 140);
      const hangar = new THREE.Mesh(hangarGeo, bldgMat);
      hangar.rotation.y = -rwyHeadingRad;
      hangar.position.set(
        dirX * (650 + h * 170) + perpX * 400,
        28,
        dirZ * (650 + h * 170) + perpZ * 400
      );
      hangar.castShadow = true;
      parent.add(hangar);
    }
  }

  buildCityBuildings(parent) {
    const rwyHeadingRad = THREE.MathUtils.degToRad(315.5);
    const dirX = Math.sin(rwyHeadingRad);
    const dirZ = -Math.cos(rwyHeadingRad);
    const perpX = Math.cos(rwyHeadingRad);
    const perpZ = Math.sin(rwyHeadingRad);

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const mats = [
      new THREE.MeshLambertMaterial({ color: 0x78909c }),
      new THREE.MeshLambertMaterial({ color: 0x607d8b }),
      new THREE.MeshLambertMaterial({ color: 0x546e7a }),
      new THREE.MeshLambertMaterial({ color: 0x455a64 }),
    ];

    const totalCount = 400;
    const instancesPerMat = Math.floor(totalCount / mats.length);
    const dummy = new THREE.Object3D();

    mats.forEach((mat) => {
      const instMesh = new THREE.InstancedMesh(boxGeo, mat, instancesPerMat);
      let placed = 0;
      let attempts = 0;
      const maxAttempts = instancesPerMat * 10;

      while (placed < instancesPerMat && attempts < maxAttempts) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const radius = 600 + Math.random() * 6000;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Project to runway coordinate system
        // s: along-runway distance from Runway 32L threshold (meters)
        // t: cross-runway distance (positive = East / terminal side, negative = West)
        const s = x * dirX + z * dirZ;
        const t = x * perpX + z * perpZ;

        // 1. Exclude Airport Zone (Runway 32L/32R, Taxiways, Apron, Terminal, Hangars)
        if (s >= -600 && s <= 3600 && t >= -450 && t <= 750) {
          continue;
        }

        // 2. Exclude Takeoff / Initial Climb Safety Funnel
        if (s > 3600 && s <= 5500 && Math.abs(t) < 450) {
          continue;
        }

        // 3. Exclude Extended Approach Corridor (Senrigawa approach end)
        if (s < -600 && s >= -4000 && Math.abs(t) < 400) {
          continue;
        }

        // 4. Exclude Koyaike Pond & Water Bodies
        const distToKoyaike = Math.hypot(x - (-1800), z - (-2800));
        if (distToKoyaike < 350) {
          continue;
        }

        const w = 25 + Math.random() * 45;
        const d = 25 + Math.random() * 45;
        const h = 15 + Math.random() * 60;

        const groundY = this.getElevationAt(x, z);

        dummy.position.set(x, groundY + h / 2, z);
        dummy.scale.set(w, h, d);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.updateMatrix();

        instMesh.setMatrixAt(placed, dummy.matrix);
        placed++;
      }

      instMesh.count = placed;
      instMesh.instanceMatrix.needsUpdate = true;
      instMesh.receiveShadow = true;
      instMesh.castShadow = true;
      parent.add(instMesh);
    });
  }

  buildAirportLights(parent) {
    const rwyHeadingRad = THREE.MathUtils.degToRad(315.5);
    const dirX = Math.sin(rwyHeadingRad);
    const dirZ = -Math.cos(rwyHeadingRad);
    const perpX = Math.cos(rwyHeadingRad);
    const perpZ = Math.sin(rwyHeadingRad);

    const lightGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });

    // Runway 32L Edge Lights (White)
    for (let d = 0; d <= 3000; d += 100) {
      const lLeft = new THREE.Mesh(lightGeo, whiteMat);
      const lRight = new THREE.Mesh(lightGeo, whiteMat);
      lLeft.position.set(dirX * d - perpX * 31, 13.6, dirZ * d - perpZ * 31);
      lRight.position.set(dirX * d + perpX * 31, 13.6, dirZ * d + perpZ * 31);
      parent.add(lLeft);
      parent.add(lRight);
    }

    // Runway 32L Threshold Green Lights
    for (let i = -14; i <= 14; i += 2) {
      const gLight = new THREE.Mesh(lightGeo, greenMat);
      gLight.position.set(perpX * (i * 2), 13.6, perpZ * (i * 2));
      parent.add(gLight);
    }

    // Runway 32L End Red Lights
    for (let i = -14; i <= 14; i += 2) {
      const rLight = new THREE.Mesh(lightGeo, redMat);
      rLight.position.set(dirX * 3000 + perpX * (i * 2), 13.6, dirZ * 3000 + perpZ * (i * 2));
      parent.add(rLight);
    }

    // Approach Light System (Senrigawa Riverbank Approach Lights)
    for (let d = -60; d >= -600; d -= 60) {
      const appLight = new THREE.Mesh(lightGeo, whiteMat);
      appLight.position.set(dirX * d, 14.2, dirZ * d);
      parent.add(appLight);
    }
  }
}

