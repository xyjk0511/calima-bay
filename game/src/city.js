// Calima Bay 3D world builder (v2 Visual Overhaul): sunset gradient sky dome, shimmering ocean
// with animated sun-reflection path, layered surf foam, 6 detailed 3D harbor yachts & sailboats,
// arched multi-segment 3D palm trees, 120+ sunlit Art-Deco & glass buildings with framed 3D neon
// marquee signs & rooftop spires, wet-sheen asphalt roads with streetlamp glow pools,
// Puerto Azul harbor cranes, Cayo Brisa Causeway & Lighthouse, stunt ramps, and AABB colliders.

import * as THREE from 'three';
import { WORLD, TIME_PRESETS, SHOPS, STUNT_RAMPS } from './config.js';
import {
  createRoadTexture,
  createIntersectionTexture,
  createBuildingFacadeTexture,
  createContainerTexture,
  createNeonSignTexture,
  createBeachTexture,
  createSidewalkTexture,
} from './textures.js';

function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class CalimaCity {
  constructor(scene, seed = 1) {
    this.scene = scene;
    this.rng = createRng(seed * 7919 + 42);
    this.colliders = []; // { minX, maxX, minZ, maxZ, maxY }
    this.buildings = []; // For minimap rendering { x, z, w, d, color }
    this.ramps = [];
    this.shopBeacons = [];
    this.neonMaterials = [];
    this.palmTrees = [];
    this.yachts = [];
    this.surfFoams = [];
    this.waterMesh = null;
    this.waterGeo = null;
    this.waterBaseY = null;
    this.sunGlintMesh = null;
    this.skyUniforms = null;
    this.lights = {};
    this.lighthouseBeam = null;

    this._buildLighting();
    this._buildSkyAndWater();
    this._buildTerrainAndRoads();
    this._buildCausewayAndIsland();
    this._buildHarborYachts();
    this._buildDistrictBuildings();
    this._buildHarborProps();
    this._buildBeachAndPalms();
    this._buildStreetlamps();
    this._buildStuntRamps();
    this._buildShopMarkers();
    this.applyTimePreset(0);
  }

  _buildLighting() {
    this.lights.ambient = new THREE.AmbientLight(0xffb38a, 0.82);
    this.scene.add(this.lights.ambient);

    this.lights.hemi = new THREE.HemisphereLight(0xff8a65, 0x2a2444, 0.78);
    this.scene.add(this.lights.hemi);

    const sun = new THREE.DirectionalLight(0xffe49e, 2.4);
    sun.position.set(260, 56, -150);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 750;
    sun.shadow.camera.left = -260;
    sun.shadow.camera.right = 260;
    sun.shadow.camera.top = 260;
    sun.shadow.camera.bottom = -260;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.lights.sun = sun;

    const rim = new THREE.DirectionalLight(0x36e6dc, 0.62);
    rim.position.set(-180, 75, 160);
    this.scene.add(rim);
    this.lights.rim = rim;
  }

  _buildSkyAndWater() {
    this.skyUniforms = {
      uTop: { value: new THREE.Color(0x1c1747) },
      uMid: { value: new THREE.Color(0xb83b6e) },
      uHorizon: { value: new THREE.Color(0xff9347) },
      uSunDir: { value: new THREE.Vector3(0.75, 0.18, -0.5).normalize() },
      uSunColor: { value: new THREE.Color(0xffe49e) },
    };

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.24, h));
          col = mix(col, uTop, smoothstep(0.22, 0.78, h));
          float sunAmt = max(dot(dir, uSunDir), 0.0);
          col += uSunColor * pow(sunAmt, 14.0) * 0.58;
          col += vec3(1.0, 0.96, 0.85) * smoothstep(0.996, 0.9992, sunAmt) * 1.45;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(780, 32, 20), skyMat);
    this.scene.add(skyDome);

    // Stylized coastal sunset clouds
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffc6a8,
      transparent: true,
      opacity: 0.42,
    });
    this.cloudMat = cloudMat;
    for (let i = 0; i < 18; i++) {
      const group = new THREE.Group();
      const angle = (i / 18) * Math.PI * 2;
      const dist = 290 + this.rng() * 240;
      const y = 85 + this.rng() * 55;
      group.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(14 + this.rng() * 16, 10, 8),
          cloudMat,
        );
        puff.scale.set(2.2, 0.45, 1.1);
        puff.position.set((p - 1) * 18, (p % 2) * 3, (this.rng() - 0.5) * 8);
        group.add(puff);
      }
      this.scene.add(group);
    }

    // Animated shimmering turquoise bay ocean
    const waterGeo = new THREE.PlaneGeometry(1400, 1400, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);
    const pos = waterGeo.attributes.position;
    this.waterBaseY = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      this.waterBaseY[i] = pos.getY(i);
    }
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1295a8,
      roughness: 0.12,
      metalness: 0.45,
      emissive: 0x093a4d,
      emissiveIntensity: 0.42,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(160, -1.15, 20);
    water.receiveShadow = true;
    this.scene.add(water);
    this.waterMesh = water;
    this.waterGeo = waterGeo;

    // Animated glinting sunset sun-reflection shimmer path across Calima Bay water!
    this.glintUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xffc978) },
    };
    const glintMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: this.glintUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float center = 1.0 - abs(vUv.x - 0.5) * 2.0;
          center = pow(max(center, 0.0), 2.4);
          float ripples = sin(vUv.y * 95.0 - uTime * 3.8 + sin(vUv.x * 22.0) * 2.0) * 0.5 + 0.5;
          float spark = smoothstep(0.45, 0.95, ripples);
          float fade = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.15, vUv.y);
          float alpha = center * (0.22 + spark * 0.48) * fade;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
    const sunGlint = new THREE.Mesh(new THREE.PlaneGeometry(92, 460), glintMat);
    sunGlint.rotation.x = -Math.PI / 2;
    sunGlint.rotation.z = -0.42;
    sunGlint.position.set(270, -0.78, -95);
    this.scene.add(sunGlint);
    this.sunGlintMesh = sunGlint;
  }

  _buildTerrainAndRoads() {
    const sidewalkTex = createSidewalkTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.88,
      metalness: 0.05,
    });
    const mainland = new THREE.Mesh(new THREE.BoxGeometry(386, 2.2, 488), groundMat);
    mainland.position.set(-77, -1.1, -24);
    mainland.receiveShadow = true;
    this.scene.add(mainland);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x767f91, roughness: 0.8 });
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(388, 2.4, 4), wallMat);
    southWall.position.set(-77, -0.8, 220);
    southWall.receiveShadow = true;
    this.scene.add(southWall);

    // Golden Palma Beach sloping smoothly into the turquoise bay
    const beachTex = createBeachTexture();
    const beachMat = new THREE.MeshStandardMaterial({
      map: beachTex,
      roughness: 0.9,
      metalness: 0.03,
    });
    const beach = new THREE.Mesh(new THREE.BoxGeometry(52, 1.0, 488), beachMat);
    beach.rotation.z = -0.042;
    beach.position.set(141, -1.08, -24);
    beach.receiveShadow = true;
    this.scene.add(beach);

    // Multi-layered bright animated white surf foam bands along Palma Beach shoreline!
    const foamConfigs = [
      { x: 153.2, y: -0.86, w: 3.4, op: 0.56, phase: 0 },
      { x: 157.8, y: -0.88, w: 2.2, op: 0.38, phase: 1.8 },
      { x: 162.5, y: -0.9, w: 1.5, op: 0.24, phase: 3.6 },
    ];
    for (const fc of foamConfigs) {
      const fm = new THREE.MeshBasicMaterial({
        color: 0xf0fdff,
        transparent: true,
        opacity: fc.op,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(fc.w, 486), fm);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(fc.x, fc.y, -24);
      this.scene.add(mesh);
      this.surfFoams.push({ mesh, baseX: fc.x, baseOp: fc.op, phase: fc.phase });
    }

    // Palma Boardwalk timber deck separating Strip & Beach (split cleanly for Causeway at Z=40)
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xa47148, roughness: 0.82 });
    const bwNorth = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 272), boardMat);
    bwNorth.position.set(109, 0.14, -104);
    bwNorth.receiveShadow = true;
    this.scene.add(bwNorth);
    const bwSouth = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 172), boardMat);
    bwSouth.position.set(109, 0.14, 134);
    bwSouth.receiveShadow = true;
    this.scene.add(bwSouth);

    // Glossy coastal wet-sheen asphalt road grid
    const roadTexV = createRoadTexture(true);
    const roadTexH = createRoadTexture(false);
    const interTex = createIntersectionTexture();

    const roadMatV = new THREE.MeshStandardMaterial({
      map: roadTexV,
      roughness: 0.38,
      metalness: 0.18,
    });
    const roadMatH = new THREE.MeshStandardMaterial({
      map: roadTexH,
      roughness: 0.38,
      metalness: 0.18,
    });
    const interMat = new THREE.MeshStandardMaterial({
      map: interTex,
      roughness: 0.38,
      metalness: 0.18,
    });

    for (const ax of WORLD.avenuesX) {
      for (let i = 0; i < WORLD.streetsZ.length - 1; i++) {
        const z1 = WORLD.streetsZ[i] + WORLD.roadWidth * 0.5;
        const z2 = WORLD.streetsZ[i + 1] - WORLD.roadWidth * 0.5;
        const segLen = z2 - z1;
        const m = roadMatV.clone();
        m.map = roadTexV.clone();
        m.map.needsUpdate = true;
        m.map.repeat.set(1, Math.max(1, Math.round(segLen / 18)));
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, segLen), m);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(ax, 0.04, (z1 + z2) * 0.5);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      }
    }

    for (const sz of WORLD.streetsZ) {
      for (let i = 0; i < WORLD.avenuesX.length - 1; i++) {
        const x1 = WORLD.avenuesX[i] + WORLD.roadWidth * 0.5;
        const x2 = WORLD.avenuesX[i + 1] - WORLD.roadWidth * 0.5;
        const segLen = x2 - x1;
        const m = roadMatH.clone();
        m.map = roadTexH.clone();
        m.map.needsUpdate = true;
        m.map.repeat.set(Math.max(1, Math.round(segLen / 18)), 1);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(segLen, WORLD.roadWidth), m);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set((x1 + x2) * 0.5, 0.04, sz);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      }
    }

    for (const ax of WORLD.avenuesX) {
      for (const sz of WORLD.streetsZ) {
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.roadWidth),
          interMat,
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(ax, 0.05, sz);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      }
    }
  }

  _buildCausewayAndIsland() {
    const roadTexH = createRoadTexture(false);
    roadTexH.repeat.set(10, 1);
    const deckMat = new THREE.MeshStandardMaterial({
      map: roadTexH,
      roughness: 0.36,
      metalness: 0.18,
    });

    // Single seamless flush causeway deck from Palma Strip (X=96) straight to Cayo Brisa Island
    const deckStart = 96;
    const deckLen = WORLD.causewayEndX - deckStart;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(deckLen, 0.8, 16), deckMat);
    deck.position.set((deckStart + WORLD.causewayEndX) * 0.5, 0.28, WORLD.causewayZ);
    deck.receiveShadow = true;
    this.scene.add(deck);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
    const neonTrimMat = new THREE.MeshStandardMaterial({
      color: 0x2cf2e8,
      emissive: 0x2cf2e8,
      emissiveIntensity: 1.45,
    });
    this.neonMaterials.push(neonTrimMat);

    for (const side of [-7.6, 7.6]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(deckLen - 14, 1.0, 0.5), railMat);
      rail.position.set((deckStart + 14 + WORLD.causewayEndX) * 0.5, 0.96, WORLD.causewayZ + side);
      this.scene.add(rail);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(deckLen - 14, 0.22, 0.56), neonTrimMat);
      strip.position.set((deckStart + 14 + WORLD.causewayEndX) * 0.5, 1.38, WORLD.causewayZ + side);
      this.scene.add(strip);
    }

    for (let x = 128; x <= WORLD.causewayEndX - 16; x += 28) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(3.2, 6, 14), pillarMat);
      pier.position.set(x, -2.8, WORLD.causewayZ);
      this.scene.add(pier);
    }

    for (const ax of [162, 206]) {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(9.2, 0.6, 10, 28, Math.PI),
        pillarMat,
      );
      arch.rotation.y = Math.PI / 2;
      arch.position.set(ax, 0.7, WORLD.causewayZ);
      this.scene.add(arch);
    }

    // Cayo Brisa Island
    const islandMat = new THREE.MeshStandardMaterial({ color: 0xe6cb94, roughness: 0.9 });
    const island = new THREE.Mesh(new THREE.CylinderGeometry(42, 49, 2.6, 20), islandMat);
    island.position.set(WORLD.islandCenterX, -0.7, WORLD.islandCenterZ);
    island.receiveShadow = true;
    this.scene.add(island);

    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xc2bab0, roughness: 0.8 });
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(28, 29, 0.35, 18), plazaMat);
    plaza.position.set(WORLD.islandCenterX, 0.55, WORLD.islandCenterZ);
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    // Iconic Calima Bay Lighthouse on Cayo Brisa Island
    const lhX = 304;
    const lhZ = 22;
    const lhWhite = new THREE.MeshStandardMaterial({ color: 0xfff8f0, roughness: 0.45 });
    const lhCoral = new THREE.MeshStandardMaterial({ color: 0xff5e6c, roughness: 0.45 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.4, 8, 14), lhWhite);
    base.position.set(lhX, 4.5, lhZ);
    base.castShadow = true;
    this.scene.add(base);
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3.4, 7, 14), lhCoral);
    mid.position.set(lhX, 12, lhZ);
    mid.castShadow = true;
    this.scene.add(mid);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.7, 6, 14), lhWhite);
    upper.position.set(lhX, 18.5, lhZ);
    upper.castShadow = true;
    this.scene.add(upper);

    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfff3b0,
      emissive: 0xffd166,
      emissiveIntensity: 2.5,
    });
    this.neonMaterials.push(lanternMat);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 3.2, 12), lanternMat);
    lantern.position.set(lhX, 23, lhZ);
    this.scene.add(lantern);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.6, 12), lhCoral);
    cap.position.set(lhX, 25.8, lhZ);
    this.scene.add(cap);

    const beamGeo = new THREE.ConeGeometry(7, 65, 16, 1, true);
    beamGeo.rotateZ(Math.PI / 2);
    beamGeo.translate(32.5, 0, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamPivot = new THREE.Group();
    beamPivot.position.set(lhX, 23, lhZ);
    beamPivot.add(new THREE.Mesh(beamGeo, beamMat));
    this.scene.add(beamPivot);
    this.lighthouseBeam = beamPivot;

    this._addCollider(lhX, lhZ, 8.6, 8.6, 26);
    this.buildings.push({ x: lhX, z: lhZ, w: 9, d: 9, color: '#ff5e6c' });
  }

  _buildHarborYachts() {
    // 6 detailed 3D white motor-yachts & sailboats bobbing in Calima Bay near the causeway,
    // Palma Beach, and Cayo Brisa Lighthouse!
    const hullWhite = new THREE.MeshStandardMaterial({ color: 0xf8fbff, roughness: 0.25, metalness: 0.18 });
    const stripeNavy = new THREE.MeshStandardMaterial({ color: 0x163861, roughness: 0.3, metalness: 0.35 });
    const stripeCyan = new THREE.MeshStandardMaterial({ color: 0x17b8c9, roughness: 0.28, metalness: 0.35 });
    const teakMat = new THREE.MeshStandardMaterial({ color: 0xb98350, roughness: 0.72 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x101c33, metalness: 0.9, roughness: 0.1 });
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xfffaf2,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const cabinGlow = new THREE.MeshStandardMaterial({
      color: 0xffe299,
      emissive: 0xffc864,
      emissiveIntensity: 1.6,
    });
    this.neonMaterials.push(cabinGlow);

    const buildMotorYacht = (scale = 1, accentMat = stripeNavy) => {
      const g = new THREE.Group();
      // Tapered sculpted hull
      const hullShape = new THREE.Shape();
      hullShape.moveTo(-5.8, 0);
      hullShape.lineTo(3.8, 0);
      hullShape.lineTo(6.6, 1.35);
      hullShape.lineTo(5.2, 1.65);
      hullShape.lineTo(-5.8, 1.45);
      hullShape.closePath();
      const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
        depth: 3.4,
        bevelEnabled: true,
        bevelSize: 0.15,
        bevelThickness: 0.15,
        bevelSegments: 2,
      });
      hullGeo.translate(0, 0, -1.7);
      hullGeo.rotateY(-Math.PI / 2);
      const hull = new THREE.Mesh(hullGeo, hullWhite);
      hull.castShadow = true;
      g.add(hull);

      // Waterline stripe & teak deck
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.34, 11.4), accentMat);
      stripe.position.set(0, 0.72, -0.3);
      g.add(stripe);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.12, 10.6), teakMat);
      deck.position.set(0, 1.56, -0.2);
      g.add(deck);

      // Wraparound cabin superstructure + tinted bridge windows + glowing warm portholes
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.35, 5.4), hullWhite);
      cabin.position.set(0, 2.22, -0.8);
      cabin.castShadow = true;
      g.add(cabin);

      const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.62, 4.6), glassMat);
      bridgeGlass.position.set(0, 2.38, -0.45);
      g.add(bridgeGlass);

      const porthole = new THREE.Mesh(new THREE.BoxGeometry(3.64, 0.24, 3.2), cabinGlow);
      porthole.position.set(0, 1.15, -0.6);
      g.add(porthole);

      // Flybridge radar arch
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.12, 6, 14, Math.PI), hullWhite);
      arch.position.set(0, 2.9, -1.6);
      g.add(arch);

      // Subtle white water wake ring
      const wake = new THREE.Mesh(
        new THREE.RingGeometry(2.2, 4.6, 18),
        new THREE.MeshBasicMaterial({
          color: 0xe6fcff,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      wake.rotation.x = -Math.PI / 2;
      wake.position.set(0, 0.12, 0);
      wake.scale.set(0.7, 1.65, 1);
      g.add(wake);

      g.scale.setScalar(scale);
      return g;
    };

    const buildSailboat = (scale = 1) => {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.7, 8.4, 10), hullWhite);
      hull.rotation.x = Math.PI / 2;
      hull.scale.set(1.2, 0.85, 1);
      hull.position.set(0, 0.65, 0);
      g.add(hull);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, 7.6), stripeCyan);
      stripe.position.set(0, 0.72, 0);
      g.add(stripe);

      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.68, 3.2), hullWhite);
      cab.position.set(0, 1.25, -0.4);
      g.add(cab);

      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 11.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xdbe4f0, metalness: 0.75, roughness: 0.25 }),
      );
      mast.position.set(0, 6.8, 0.4);
      g.add(mast);

      // Crisp triangular mainsail & jib sail
      const mainSailShape = new THREE.Shape();
      mainSailShape.moveTo(0, 0);
      mainSailShape.lineTo(0, 9.6);
      mainSailShape.lineTo(-4.4, 0.6);
      mainSailShape.closePath();
      const mainSail = new THREE.Mesh(new THREE.ShapeGeometry(mainSailShape), sailMat);
      mainSail.rotation.y = Math.PI / 2;
      mainSail.position.set(0.08, 2.2, 0.35);
      g.add(mainSail);

      const jibShape = new THREE.Shape();
      jibShape.moveTo(0, 0);
      jibShape.lineTo(0, 8.2);
      jibShape.lineTo(3.2, 0.4);
      jibShape.closePath();
      const jib = new THREE.Mesh(new THREE.ShapeGeometry(jibShape), sailMat);
      jib.rotation.y = Math.PI / 2;
      jib.position.set(-0.08, 2.1, 0.5);
      g.add(jib);

      g.scale.setScalar(scale);
      return g;
    };

    const yachtSpecs = [
      { kind: 'motor', x: 186, z: 12, rotY: -0.55, scale: 1.25, accent: stripeNavy },
      { kind: 'sail', x: 214, z: -18, rotY: 0.38, scale: 1.2 },
      { kind: 'motor', x: 224, z: 72, rotY: 2.35, scale: 1.2, accent: stripeCyan },
      { kind: 'sail', x: 184, z: 76, rotY: -1.1, scale: 1.1 },
      { kind: 'motor', x: 188, z: -48, rotY: 0.72, scale: 1.22, accent: stripeNavy },
      { kind: 'sail', x: 242, z: -38, rotY: -0.45, scale: 1.18 },
    ];

    yachtSpecs.forEach((ys, i) => {
      const mesh = ys.kind === 'motor' ? buildMotorYacht(ys.scale, ys.accent) : buildSailboat(ys.scale);
      mesh.position.set(ys.x, -1.02, ys.z);
      mesh.rotation.y = ys.rotY;
      this.scene.add(mesh);
      this.yachts.push({ mesh, baseY: -1.02, phase: i * 1.15 });
    });
  }

  _buildDistrictBuildings() {
    const styleTextures = {
      artdeco: [0, 1, 2, 3, 4].map((s) => createBuildingFacadeTexture('artdeco', s)),
      glass: [0, 1, 2, 3].map((s) => createBuildingFacadeTexture('glass', s)),
      barrio: [0, 1, 2, 3, 4].map((s) => createBuildingFacadeTexture('barrio', s)),
      villa: [0, 1, 2, 3].map((s) => createBuildingFacadeTexture('villa', s)),
      warehouse: [0, 1, 2, 3].map((s) => createBuildingFacadeTexture('warehouse', s)),
    };

    const neonSigns = [
      { text: 'HOTEL PALMA', bg: '#1a0e2e', fg: '#ff5e8c', accent: '#2cf2e8' },
      { text: 'SOLSTICE CLUB', bg: '#0e1630', fg: '#2cf2e8', accent: '#ff5e6c' },
      { text: 'OCEAN DRIVE', bg: '#161134', fg: '#ffd166', accent: '#ff5e8c' },
      { text: 'CALIMA BANK', bg: '#0c162e', fg: '#4df0a9', accent: '#ffd166' },
      { text: 'MORALES CUSTOMS', bg: '#0e192f', fg: '#2cf2e8', accent: '#ffd166' },
      { text: 'PUERTO AZUL', bg: '#131d36', fg: '#64f5e9', accent: '#ff9a3c' },
      { text: 'SUNSET LOUNGE', bg: '#26112d', fg: '#ff9a3c', accent: '#ff5e6c' },
      { text: 'BARRIO CANTINA', bg: '#2c151f', fg: '#ffb703', accent: '#fb5607' },
    ];
    const signTextures = neonSigns.map((s) => createNeonSignTexture(s.text, s.bg, s.fg, s.accent));

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x353b4f, roughness: 0.85 });
    const acMat = new THREE.MeshStandardMaterial({ color: 0x7b8599, roughness: 0.65 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x161c2c, metalness: 0.7, roughness: 0.35 });

    const neonColors = [0xff5e7e, 0x2cf2e8, 0xffd166, 0xff8c42, 0xc77dff];
    const neonMats = neonColors.map((c) => {
      const m = new THREE.MeshStandardMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: 1.65,
      });
      this.neonMaterials.push(m);
      return m;
    });

    let signIdx = 0;
    for (let xi = 0; xi < WORLD.avenuesX.length - 1; xi++) {
      const bx1 = WORLD.avenuesX[xi] + WORLD.roadWidth * 0.5 + WORLD.sidewalkWidth;
      const bx2 = WORLD.avenuesX[xi + 1] - WORLD.roadWidth * 0.5 - WORLD.sidewalkWidth;
      const blockW = bx2 - bx1;

      for (let zi = 0; zi < WORLD.streetsZ.length - 1; zi++) {
        const bz1 = WORLD.streetsZ[zi] + WORLD.roadWidth * 0.5 + WORLD.sidewalkWidth;
        const bz2 = WORLD.streetsZ[zi + 1] - WORLD.roadWidth * 0.5 - WORLD.sidewalkWidth;
        const blockD = bz2 - bz1;
        const cx = (bx1 + bx2) * 0.5;
        const cz = (bz1 + bz2) * 0.5;

        const isSolsticePlaza = xi === 2 && zi === 2;
        const isGarageLot = xi === 0 && zi === 2;
        const isHarborYard = zi === 4 && xi <= 2;

        if (isSolsticePlaza) {
          this._buildSolsticePlaza(cx, cz, blockW, blockD);
          continue;
        }
        if (isHarborYard) {
          this._spawnBuilding(
            bx1 + blockW * 0.25,
            bz1 + blockD * 0.28,
            blockW * 0.44,
            blockD * 0.42,
            11 + this.rng() * 5,
            'warehouse',
            styleTextures,
            roofMat,
            acMat,
            frameMat,
            neonMats,
            signTextures,
            signIdx++,
          );
          continue;
        }

        let style = 'glass';
        if (xi === 3) style = 'artdeco';
        else if (zi === 0) style = 'barrio';
        else if (xi === 0) style = 'villa';
        else if (zi === 4) style = 'warehouse';

        const cols = 2;
        const rows = isGarageLot ? 1 : 2;
        const lotW = blockW / cols;
        const lotD = blockD / rows;

        for (let lc = 0; lc < cols; lc++) {
          for (let lr = 0; lr < rows; lr++) {
            const lx = bx1 + lotW * (lc + 0.5);
            const lz = bz1 + lotD * (lr + 0.5);
            if (SHOPS.some((s) => Math.hypot(s.x - lx, s.z - lz) < 17)) continue;

            const w = lotW * (0.74 + this.rng() * 0.16);
            const d = lotD * (0.74 + this.rng() * 0.16);
            let h = 16;
            if (style === 'glass') h = 28 + this.rng() * 44;
            else if (style === 'artdeco') h = 17 + this.rng() * 22;
            else if (style === 'barrio') h = 10 + this.rng() * 12;
            else if (style === 'villa') h = 8 + this.rng() * 8;
            else h = 10 + this.rng() * 8;

            this._spawnBuilding(
              lx,
              lz,
              w,
              d,
              h,
              style,
              styleTextures,
              roofMat,
              acMat,
              frameMat,
              neonMats,
              signTextures,
              signIdx++,
            );
          }
        }
      }
    }

    // Iconic Art-Deco oceanfront boutique facades along west side of Palma Strip
    for (let z = -170; z <= 170; z += 44) {
      if (Math.abs(z - 40) < 28) continue;
      const h = 17 + (Math.abs(z) % 14);
      this._spawnBuilding(
        60,
        z,
        16,
        22,
        h,
        'artdeco',
        styleTextures,
        roofMat,
        acMat,
        frameMat,
        neonMats,
        signTextures,
        signIdx++,
      );
    }
  }

  _spawnBuilding(
    x,
    z,
    w,
    d,
    h,
    style,
    styleTextures,
    roofMat,
    acMat,
    frameMat,
    neonMats,
    signTextures,
    idx,
  ) {
    const texList = styleTextures[style];
    const tex = texList[idx % texList.length];
    const sideMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: style === 'glass' ? 0.22 : 0.64,
      metalness: style === 'glass' ? 0.52 : 0.08,
    });
    const mats = [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    mesh.position.set(x, h * 0.5, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Rooftop architectural crown, antenna spire & AC units
    if (h > 22) {
      const crownH = 4.2 + (idx % 6);
      const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, crownH, d * 0.62), mats);
      crown.position.set(x, h + crownH * 0.5, z);
      crown.castShadow = true;
      this.scene.add(crown);

      if (style === 'glass' && idx % 2 === 0) {
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 11, 6), acMat);
        spire.position.set(x, h + crownH + 5.5, z);
        this.scene.add(spire);
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 8, 8),
          neonMats[0],
        );
        beacon.position.set(x, h + crownH + 11.2, z);
        this.scene.add(beacon);
      }
    } else {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 2.2), acMat);
      ac.position.set(x + w * 0.15, h + 0.7, z - d * 0.12);
      this.scene.add(ac);
    }

    // Glowing neon trim bands on Art-Deco hotels, Solstice towers & Barrio cantinas
    if (style === 'artdeco' || style === 'glass' || (style === 'barrio' && idx % 2 === 0)) {
      const neonMat = neonMats[idx % neonMats.length];
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.55, d + 0.4), neonMat);
      trim.position.set(x, h - 0.55, z);
      this.scene.add(trim);
    }

    // Framed 3D Neon Marquee Signs facing Palma Strip & Solstice boulevards!
    if ((style === 'artdeco' || style === 'glass') && (idx % 2 === 0 || x > 38)) {
      const sTex = signTextures[idx % signTextures.length];
      const signMat = new THREE.MeshBasicMaterial({ map: sTex });
      const signW = Math.min(Math.max(w, d) * 0.86, 14.5);
      const signH = signW * 0.27;
      const marquee = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(signW + 0.4, signH + 0.36, 0.55), frameMat);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), signMat);
      face.position.z = 0.29;
      marquee.add(box, face);

      if (x > 38) {
        // Face east toward Palma Strip & Beach
        marquee.rotation.y = Math.PI / 2;
        marquee.position.set(x + w * 0.5 + 0.32, Math.min(h - 2.6, 13.5), z);
      } else {
        // Face south toward Solstice Plaza / cross street
        marquee.position.set(x, Math.min(h - 2.6, 15.5), z + d * 0.5 + 0.32);
      }
      this.scene.add(marquee);
    }

    const mapColors = {
      artdeco: '#e08b9e',
      glass: '#4776a8',
      barrio: '#c97b5d',
      villa: '#b8b09c',
      warehouse: '#647082',
    };
    this._addCollider(x, z, w, d, h);
    this.buildings.push({ x, z, w, d, color: mapColors[style] || '#5a6680' });
  }

  _buildSolsticePlaza(cx, cz, w, d) {
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0x3b4462, roughness: 0.62 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), plazaMat);
    floor.position.set(cx, 0.12, cz);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const plazaLight = new THREE.PointLight(0xffb878, 2.4, 58);
    plazaLight.position.set(cx, 11, cz);
    this.scene.add(plazaLight);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2cf2e8,
      emissive: 0x168b96,
      emissiveIntensity: 0.9,
      roughness: 0.14,
    });
    this.neonMaterials.push(waterMat);
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.8, 1.1, 18),
      new THREE.MeshStandardMaterial({ color: 0xd8dce8, roughness: 0.5 }),
    );
    basin.position.set(cx, 0.6, cz);
    this.scene.add(basin);

    const pool = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.2, 18), waterMat);
    pool.position.set(cx, 1.12, cz);
    this.scene.add(pool);

    const obeliskMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      metalness: 0.75,
      roughness: 0.22,
    });
    const obelisk = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 0), obeliskMat);
    obelisk.scale.set(0.8, 2.4, 0.8);
    obelisk.position.set(cx, 5.2, cz);
    this.scene.add(obelisk);
    this._addCollider(cx, cz, 14.2, 14.2, 6);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x9aa4ba, roughness: 0.6 });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xff5e6c,
      emissive: 0xff5e6c,
      emissiveIntensity: 1.4,
    });
    this.neonMaterials.push(trimMat);
    const offsets = [
      [-14, -14],
      [14, -14],
      [-14, 14],
      [14, 14],
    ];
    for (const [ox, oz] of offsets) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.35, 1.8), wallMat);
      box.position.set(cx + ox, 0.7, cz + oz);
      box.castShadow = true;
      this.scene.add(box);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.18, 1.9), trimMat);
      glow.position.set(cx + ox, 1.36, cz + oz);
      this.scene.add(glow);
      this._addCollider(cx + ox, cz + oz, 6.5, 1.8, 1.5);
    }
  }

  _buildHarborProps() {
    const colors = ['#d94848', '#228b99', '#e59528', '#2f4b7c'];
    const mats = colors.map(
      (c) => new THREE.MeshStandardMaterial({ map: createContainerTexture(c), roughness: 0.65 }),
    );
    const spots = [
      [-150, 160, 0],
      [-136, 160, 0],
      [-150, 174, 0],
      [-76, 152, Math.PI / 2],
      [-62, 168, 0],
      [-8, 172, 0],
      [6, 172, 0],
      [-10, 184, 0],
    ];
    spots.forEach(([x, z, rot], i) => {
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(10.5, 3.6, 4.2), mats[i % mats.length]);
      c1.position.set(x, 1.8, z);
      c1.rotation.y = rot;
      c1.castShadow = true;
      this.scene.add(c1);
      if (i % 2 === 0) {
        const c2 = new THREE.Mesh(new THREE.BoxGeometry(10.5, 3.6, 4.2), mats[(i + 1) % mats.length]);
        c2.position.set(x, 5.4, z);
        c2.rotation.y = rot;
        c2.castShadow = true;
        this.scene.add(c2);
      }
      const cw = rot === 0 ? 10.5 : 4.2;
      const cd = rot === 0 ? 4.2 : 10.5;
      this._addCollider(x, z, cw, cd, 7.2);
    });

    const craneRed = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.55 });
    const craneGold = new THREE.MeshStandardMaterial({ color: 0xffbe0b, roughness: 0.5 });
    for (const cx of [-148, -18]) {
      const cz = 210;
      const g = new THREE.Group();
      g.position.set(cx, 0, cz);
      for (const lx of [-5, 5]) {
        for (const lz of [-4, 4]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 28, 1.1), craneRed);
          leg.position.set(lx, 14, lz);
          leg.castShadow = true;
          g.add(leg);
        }
      }
      const boom = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 42), craneGold);
      boom.position.set(0, 27, 8);
      boom.castShadow = true;
      g.add(boom);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 4.5), craneRed);
      cab.position.set(0, 23.5, 0);
      g.add(cab);
      this.scene.add(g);
    }
  }

  _buildBeachAndPalms() {
    // Arched Multi-Segment 3D Palm Trees: curved ringed trunks + coconut clusters +
    // 8 gracefully arched drooping palm fronds (3 curved leaflet segments per frond!)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x82583c, roughness: 0.88 });
    const trunkDarkMat = new THREE.MeshStandardMaterial({ color: 0x613f29, roughness: 0.92 });
    const coconutMat = new THREE.MeshStandardMaterial({ color: 0x56351e, roughness: 0.78 });
    const frondMatA = new THREE.MeshStandardMaterial({
      color: 0x2ba859,
      roughness: 0.58,
      side: THREE.DoubleSide,
    });
    const frondMatB = new THREE.MeshStandardMaterial({
      color: 0x3ec268,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });

    // Reusable arched 3-segment drooping frond builder
    const buildArchedFrond = (scale, mat) => {
      const frondGroup = new THREE.Group();
      // Segment 1: rising arch from crown
      const seg1 = new THREE.Mesh(new THREE.BoxGeometry(1.7 * scale, 0.08 * scale, 0.82 * scale), mat);
      seg1.position.set(0.82 * scale, 0.28 * scale, 0);
      seg1.rotation.z = 0.28;
      // Segment 2: mid sweeping arch
      const seg2 = new THREE.Mesh(new THREE.BoxGeometry(1.9 * scale, 0.07 * scale, 0.92 * scale), mat);
      seg2.position.set(2.45 * scale, 0.16 * scale, 0);
      seg2.rotation.z = -0.26;
      // Segment 3: drooping tapered tip
      const tipGeo = new THREE.ConeGeometry(0.48 * scale, 2.0 * scale, 4);
      tipGeo.rotateZ(-Math.PI / 2);
      const seg3 = new THREE.Mesh(tipGeo, mat);
      seg3.scale.set(1, 0.18, 0.95);
      seg3.position.set(4.05 * scale, -0.58 * scale, 0);
      seg3.rotation.z = -0.68;
      frondGroup.add(seg1, seg2, seg3);
      return frondGroup;
    };

    const spawnPalm = (x, z, scale = 1) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      const lean = (this.rng() - 0.5) * 0.34;
      let curX = 0;
      let curY = 0;
      const segCount = 5;
      for (let seg = 0; seg < segCount; seg++) {
        const h = 2.25 * scale;
        const rBot = (0.4 - seg * 0.052) * scale;
        const rTop = (0.35 - seg * 0.052) * scale;
        const tilt = -lean * (seg + 0.6) * 0.14;
        const piece = new THREE.Mesh(
          new THREE.CylinderGeometry(rTop, rBot, h, 8),
          seg % 2 === 0 ? trunkMat : trunkDarkMat,
        );
        piece.position.set(curX - Math.sin(tilt) * h * 0.5, curY + Math.cos(tilt) * h * 0.5, 0);
        piece.rotation.z = tilt;
        piece.castShadow = true;
        group.add(piece);
        curX -= Math.sin(tilt) * h * 0.95;
        curY += Math.cos(tilt) * h * 0.95;
      }

      const crown = new THREE.Group();
      crown.position.set(curX, curY + 0.1, 0);

      // Coconut cluster under crown
      for (let c = 0; c < 3; c++) {
        const ca = (c / 3) * Math.PI * 2;
        const nut = new THREE.Mesh(new THREE.SphereGeometry(0.24 * scale, 7, 6), coconutMat);
        nut.position.set(Math.cos(ca) * 0.34 * scale, -0.22 * scale, Math.sin(ca) * 0.34 * scale);
        crown.add(nut);
      }

      // 8 arched drooping palm fronds arranged in two natural tiers
      const frondCount = 8;
      for (let f = 0; f < frondCount; f++) {
        const angle = (f / frondCount) * Math.PI * 2 + this.rng() * 0.22;
        const fScale = scale * (0.9 + (f % 2) * 0.14);
        const frond = buildArchedFrond(fScale, f % 2 === 0 ? frondMatA : frondMatB);
        frond.rotation.y = angle;
        frond.rotation.z = f % 2 === 0 ? 0.12 : -0.14;
        crown.add(frond);
      }
      group.add(crown);
      group.rotation.y = this.rng() * Math.PI * 2;
      this.scene.add(group);
      this.palmTrees.push({ crown, phase: this.rng() * Math.PI * 2 });
    };

    for (let z = -205; z <= 195; z += 18) {
      if (Math.abs(z - 40) < 16) continue;
      spawnPalm(101.5, z, 0.95 + this.rng() * 0.26);
      if (z % 36 === 0) spawnPalm(120 + this.rng() * 8, z + 6, 0.92 + this.rng() * 0.26);
      if (z % 36 !== 0) spawnPalm(75.5, z + 5, 0.88 + this.rng() * 0.22);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      spawnPalm(WORLD.islandCenterX + Math.cos(a) * 32, WORLD.islandCenterZ + Math.sin(a) * 32, 1.05);
    }
    for (let z = -180; z <= 60; z += 36) {
      spawnPalm(-107, z, 0.9);
      spawnPalm(-187, z + 12, 0.95);
    }

    // Colorful beach umbrellas along Palma Beach
    const umbColors = [0xff5e6c, 0x2cf2e8, 0xffd166, 0xff9a3c, 0xa855f7];
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    for (let z = -170; z <= 170; z += 22) {
      if (Math.abs(z - 40) < 22) continue;
      const ux = 128 + (Math.abs(z) % 10);
      const g = new THREE.Group();
      g.position.set(ux, -0.15, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 6), poleMat);
      pole.position.y = 1.4;
      g.add(pole);
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(2.3, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: umbColors[Math.abs(z) % umbColors.length], roughness: 0.6 }),
      );
      canopy.position.y = 2.85;
      g.add(canopy);
      this.scene.add(g);
    }
  }

  _buildStreetlamps() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c3347, metalness: 0.55, roughness: 0.38 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffe6a3,
      emissive: 0xffc864,
      emissiveIntensity: 2.2,
    });
    const poolMat = new THREE.MeshBasicMaterial({
      color: 0xffcf78,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.neonMaterials.push(bulbMat);

    const addLamp = (x, z, rotY = 0) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7.6, 6), poleMat);
      pole.position.y = 3.8;
      g.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.16), poleMat);
      arm.position.set(0.88, 7.5, 0);
      g.add(arm);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.45), bulbMat);
      bulb.position.set(1.55, 7.35, 0);
      g.add(bulb);
      const glowPool = new THREE.Mesh(new THREE.CircleGeometry(3.8, 16), poolMat);
      glowPool.rotation.x = -Math.PI / 2;
      glowPool.position.set(2.2, 0.08, 0);
      g.add(glowPool);
      this.scene.add(g);
    };

    for (const ax of [88, 24, -40, -120]) {
      for (let z = -180; z <= 180; z += 40) {
        if (WORLD.streetsZ.some((sz) => Math.abs(sz - z) < 13)) continue;
        addLamp(ax + 10.5, z, Math.PI);
        addLamp(ax - 10.5, z + 20, 0);
      }
    }
  }

  _buildStuntRamps() {
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x262f47, roughness: 0.55 });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xff9a3c,
      emissiveIntensity: 1.5,
    });
    this.neonMaterials.push(stripeMat);

    for (const def of STUNT_RAMPS) {
      const g = new THREE.Group();
      g.position.set(def.x, 0, def.z);
      g.rotation.y = def.rotY;

      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(10, 0);
      shape.lineTo(10, 2.7);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 5.4, bevelEnabled: false });
      geo.translate(-5, 0, -2.7);
      geo.rotateY(-Math.PI / 2);
      const wedge = new THREE.Mesh(geo, rampMat);
      wedge.castShadow = true;
      wedge.receiveShadow = true;
      g.add(wedge);

      for (const sx of [-2.55, 2.55]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 10.4), stripeMat);
        rail.position.set(sx, 1.45, 0);
        rail.rotation.x = -0.265;
        g.add(rail);
      }
      this.scene.add(g);
      this.ramps.push({ ...def, cooldown: 0 });
    }
  }

  _buildShopMarkers() {
    for (const shop of SHOPS) {
      const mat = new THREE.MeshBasicMaterial({
        color: shop.color,
        transparent: true,
        opacity: 0.44,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.4, 28), mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(shop.x, 0.14, shop.z);
      this.scene.add(ring);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 1.6, 12, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: shop.color,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      pillar.position.set(shop.x, 6, shop.z);
      this.scene.add(pillar);
      this.shopBeacons.push({ ...shop, ring, pillar });
    }
  }

  _addCollider(x, z, w, d, maxY = 20) {
    this.colliders.push({
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
      maxY,
    });
  }

  resolveCircleCollision(x, z, radius) {
    let rx = x;
    let rz = z;
    let hit = false;

    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const closestX = Math.max(c.minX, Math.min(rx, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(rz, c.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        hit = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        } else {
          const dLeft = Math.abs(rx - c.minX);
          const dRight = Math.abs(c.maxX - rx);
          const dTop = Math.abs(rz - c.minZ);
          const dBot = Math.abs(c.maxZ - rz);
          const m = Math.min(dLeft, dRight, dTop, dBot);
          if (m === dLeft) rx = c.minX - radius;
          else if (m === dRight) rx = c.maxX + radius;
          else if (m === dTop) rz = c.minZ - radius;
          else rz = c.maxZ + radius;
        }
      }
    }

    const onCauseway =
      rx >= WORLD.causewayStartX - 6 &&
      rx <= WORLD.causewayEndX + 10 &&
      Math.abs(rz - WORLD.causewayZ) <= 7.8;
    const distIsland = Math.hypot(rx - WORLD.islandCenterX, rz - WORLD.islandCenterZ);
    const onIsland = distIsland <= 39;

    if (!onCauseway && !onIsland) {
      if (rx > 144) {
        rx = 144;
        hit = true;
      }
      if (rz > WORLD.southBayZ - 2) {
        rz = WORLD.southBayZ - 2;
        hit = true;
      }
    }
    if (rx < WORLD.minX + 6) { rx = WORLD.minX + 6; hit = true; }
    if (rx > WORLD.maxX - 8) { rx = WORLD.maxX - 8; hit = true; }
    if (rz < WORLD.minZ + 6) { rz = WORLD.minZ + 6; hit = true; }
    if (rz > WORLD.maxZ - 8) { rz = WORLD.maxZ - 8; hit = true; }

    return { x: rx, z: rz, hit };
  }

  getGroundHeight(x, z) {
    if (x >= WORLD.causewayStartX && x <= WORLD.causewayEndX && Math.abs(z - WORLD.causewayZ) <= 8.5) {
      return 0.65;
    }
    if (Math.hypot(x - WORLD.islandCenterX, z - WORLD.islandCenterZ) <= 40) {
      return 0.65;
    }
    if (x > 116 && x <= 148) {
      return Math.max(-0.55, 0.05 - (x - 116) * 0.02);
    }
    return 0.05;
  }

  applyTimePreset(index) {
    const preset = TIME_PRESETS[index % TIME_PRESETS.length];
    this.currentPreset = preset;
    this.skyUniforms.uTop.value.setHex(preset.skyTop);
    this.skyUniforms.uMid.value.setHex(preset.skyMid);
    this.skyUniforms.uHorizon.value.setHex(preset.skyHorizon);
    this.skyUniforms.uSunColor.value.setHex(preset.sunColor);
    this.skyUniforms.uSunDir.value.set(...preset.sunPos).normalize();

    this.scene.fog = new THREE.Fog(preset.fogColor, preset.fogNear, preset.fogFar);
    this.lights.ambient.color.setHex(preset.ambientColor);
    this.lights.ambient.intensity = preset.ambientInt;
    this.lights.hemi.color.setHex(preset.hemiSky);
    this.lights.hemi.groundColor.setHex(preset.hemiGround);
    this.lights.hemi.intensity = preset.hemiInt;
    this.lights.sun.color.setHex(preset.sunColor);
    this.lights.sun.intensity = preset.sunInt;
    this.lights.sun.position.set(...preset.sunPos);

    if (this.waterMesh) {
      this.waterMesh.material.color.setHex(preset.waterColor);
      this.waterMesh.material.emissive.setHex(preset.waterColor);
      this.waterMesh.material.emissiveIntensity = 0.26;
    }
    if (this.glintUniforms) {
      this.glintUniforms.uColor.value.setHex(preset.waterHighlight);
    }
    if (this.cloudMat) {
      this.cloudMat.color.setHex(preset.waterHighlight);
    }
    for (const m of this.neonMaterials) {
      if ('emissiveIntensity' in m) {
        m.emissiveIntensity = preset.neonBoost;
      }
    }
  }

  update(dt, elapsed) {
    // Animate ocean waves & sun reflection shimmer
    if (this.waterGeo) {
      const pos = this.waterGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        const wave = Math.sin(vx * 0.05 + elapsed * 1.9) * 0.22 + Math.cos(vz * 0.06 + elapsed * 1.4) * 0.18;
        pos.setY(i, this.waterBaseY[i] + wave);
      }
      pos.needsUpdate = true;
    }
    if (this.glintUniforms) {
      this.glintUniforms.uTime.value = elapsed;
    }

    // Layered surf foam ebb & flow
    for (const sf of this.surfFoams) {
      sf.mesh.position.x = sf.baseX + Math.sin(elapsed * 1.5 + sf.phase) * 0.85;
      sf.mesh.material.opacity = sf.baseOp * (0.75 + Math.sin(elapsed * 1.9 + sf.phase) * 0.25);
    }

    // Gentle harbor yacht bobbing
    for (const y of this.yachts) {
      y.mesh.position.y = y.baseY + Math.sin(elapsed * 1.4 + y.phase) * 0.16;
      y.mesh.rotation.z = Math.sin(elapsed * 1.1 + y.phase) * 0.032;
      y.mesh.rotation.x = Math.cos(elapsed * 0.9 + y.phase) * 0.022;
    }

    // Coastal breeze swaying arched palm crowns
    for (let i = 0; i < this.palmTrees.length; i++) {
      const p = this.palmTrees[i];
      p.crown.rotation.z = Math.sin(elapsed * 1.4 + p.phase) * 0.06;
      p.crown.rotation.x = Math.cos(elapsed * 1.1 + p.phase) * 0.04;
    }

    if (this.lighthouseBeam) {
      this.lighthouseBeam.rotation.y = elapsed * 0.55;
    }

    for (const b of this.shopBeacons) {
      const s = 1 + Math.sin(elapsed * 3.5) * 0.08;
      b.ring.scale.set(s, s, 1);
    }

    for (const r of this.ramps) {
      if (r.cooldown > 0) r.cooldown = Math.max(0, r.cooldown - dt);
    }
  }
}
