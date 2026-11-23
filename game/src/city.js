// Calima Bay 3D world builder: sky dome, animated turquoise ocean, Palma Beach & boardwalk,
// 6 distinct districts with 120+ procedural buildings & neon signage, Puerto Azul harbor cranes,
// Cayo Brisa Causeway bridge & lighthouse, 8 glowing stunt ramps, shop markers, and AABB colliders.

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
    this.waterMesh = null;
    this.waterGeo = null;
    this.waterBaseY = null;
    this.skyUniforms = null;
    this.sunDisc = null;
    this.sunGlow = null;
    this.lights = {};
    this.lighthouseBeam = null;

    this._buildLighting();
    this._buildSkyAndWater();
    this._buildTerrainAndRoads();
    this._buildCausewayAndIsland();
    this._buildDistrictBuildings();
    this._buildHarborProps();
    this._buildBeachAndPalms();
    this._buildStreetlamps();
    this._buildStuntRamps();
    this._buildShopMarkers();
    this.applyTimePreset(0);
  }

  _buildLighting() {
    this.lights.ambient = new THREE.AmbientLight(0xffb38a, 0.8);
    this.scene.add(this.lights.ambient);

    this.lights.hemi = new THREE.HemisphereLight(0xff8a65, 0x2a2444, 0.75);
    this.scene.add(this.lights.hemi);

    const sun = new THREE.DirectionalLight(0xffe49e, 2.35);
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

    // Warm rim bounce from sunset side
    const rim = new THREE.DirectionalLight(0x36e6dc, 0.55);
    rim.position.set(-180, 75, 160);
    this.scene.add(rim);
    this.lights.rim = rim;
  }

  _buildSkyAndWater() {
    // Procedural shader sky dome with sunset gradient & soft atmospheric glow
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
          col += uSunColor * pow(sunAmt, 14.0) * 0.55;
          col += vec3(1.0, 0.96, 0.85) * smoothstep(0.996, 0.9992, sunAmt) * 1.4;
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
      roughness: 0.16,
      metalness: 0.35,
      emissive: 0x093a4d,
      emissiveIntensity: 0.45,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(160, -1.15, 20);
    water.receiveShadow = true;
    this.scene.add(water);
    this.waterMesh = water;
    this.waterGeo = waterGeo;
  }

  _buildTerrainAndRoads() {
    // Mainland landmass
    const sidewalkTex = createSidewalkTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.9,
      metalness: 0.04,
    });
    const mainland = new THREE.Mesh(new THREE.BoxGeometry(386, 2.2, 488), groundMat);
    mainland.position.set(-77, -1.1, -24);
    mainland.receiveShadow = true;
    this.scene.add(mainland);

    // Harbor concrete seawall rim along South Bay & East Boardwalk
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x767f91, roughness: 0.8 });
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(388, 2.4, 4), wallMat);
    southWall.position.set(-77, -0.8, 220);
    southWall.receiveShadow = true;
    this.scene.add(southWall);

    // Golden Palma Beach sloping smoothly into the turquoise bay (below Causeway road deck)
    const beachTex = createBeachTexture();
    const beachMat = new THREE.MeshStandardMaterial({
      map: beachTex,
      roughness: 0.92,
      metalness: 0.02,
    });
    const beach = new THREE.Mesh(new THREE.BoxGeometry(52, 1.0, 488), beachMat);
    beach.rotation.z = -0.042;
    beach.position.set(141, -1.08, -24);
    beach.receiveShadow = true;
    this.scene.add(beach);

    // Subtle shimmering surf foam ribbon along the shoreline
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xdffbff,
      transparent: true,
      opacity: 0.42,
    });
    const surfFoam = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 486), foamMat);
    surfFoam.rotation.x = -Math.PI / 2;
    surfFoam.position.set(154.5, -0.86, -24);
    this.scene.add(surfFoam);

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

    // Road asphalt grid
    const roadTexV = createRoadTexture(true);
    const roadTexH = createRoadTexture(false);
    const interTex = createIntersectionTexture();

    const roadMatV = new THREE.MeshStandardMaterial({ map: roadTexV, roughness: 0.78 });
    const roadMatH = new THREE.MeshStandardMaterial({ map: roadTexH, roughness: 0.78 });
    const interMat = new THREE.MeshStandardMaterial({ map: interTex, roughness: 0.78 });

    // North-South Avenues
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

    // East-West Streets
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

    // Intersections
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
    // Seamless flush approach road connecting Palma Strip (X=96) into Cayo Brisa Causeway
    const roadTexH = createRoadTexture(false);
    roadTexH.repeat.set(10, 1);
    const deckMat = new THREE.MeshStandardMaterial({ map: roadTexH, roughness: 0.72 });

    const approach = new THREE.Mesh(new THREE.BoxGeometry(24, 0.72, 16), deckMat);
    approach.position.set(108, 0.08, WORLD.causewayZ);
    approach.rotation.z = 0.018;
    approach.receiveShadow = true;
    this.scene.add(approach);

    // Main Causeway bridge deck spanning the turquoise bay
    const deckStart = 117;
    const deckLen = WORLD.causewayEndX - deckStart;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(deckLen, 0.8, 16), deckMat);
    deck.position.set((deckStart + WORLD.causewayEndX) * 0.5, 0.34, WORLD.causewayZ);
    deck.receiveShadow = true;
    this.scene.add(deck);

    // Bridge concrete piers & glowing neon arch pylons
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.65 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
    const neonTrimMat = new THREE.MeshStandardMaterial({
      color: 0x2cf2e8,
      emissive: 0x2cf2e8,
      emissiveIntensity: 1.4,
    });
    this.neonMaterials.push(neonTrimMat);

    for (const side of [-7.6, 7.6]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(deckLen + 14, 1.0, 0.5), railMat);
      rail.position.set((deckStart - 14 + WORLD.causewayEndX) * 0.5, 1.0, WORLD.causewayZ + side);
      this.scene.add(rail);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(deckLen + 14, 0.22, 0.56), neonTrimMat);
      strip.position.set((deckStart - 14 + WORLD.causewayEndX) * 0.5, 1.42, WORLD.causewayZ + side);
      this.scene.add(strip);
    }

    for (let x = deckStart + 12; x <= WORLD.causewayEndX - 16; x += 28) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(3.2, 6, 14), pillarMat);
      pier.position.set(x, -2.8, WORLD.causewayZ);
      this.scene.add(pier);
    }

    // Twin iconic bridge arches over the channel
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
    const lhWhite = new THREE.MeshStandardMaterial({ color: 0xfff8f0, roughness: 0.5 });
    const lhCoral = new THREE.MeshStandardMaterial({ color: 0xff5e6c, roughness: 0.5 });
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
      emissiveIntensity: 2.4,
    });
    this.neonMaterials.push(lanternMat);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 3.2, 12), lanternMat);
    lantern.position.set(lhX, 23, lhZ);
    this.scene.add(lantern);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.6, 12), lhCoral);
    cap.position.set(lhX, 25.8, lhZ);
    this.scene.add(cap);

    // Rotating volumetric lighthouse beam
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

  _buildDistrictBuildings() {
    // Pre-generate shared facade textures per architectural style for fast draw & rich variety
    const styleTextures = {
      artdeco: [0, 1, 2, 3, 4].map((s) => createBuildingFacadeTexture('artdeco', s)),
      glass: [0, 1, 2, 3].map((s) => createBuildingFacadeTexture('glass', s)),
      barrio: [0, 1, 2, 3, 4].map((s) => createBuildingFacadeTexture('barrio', s)),
      villa: [0, 1, 2, 3].map((s) => createBuildingFacadeTexture('villa', s)),
      warehouse: [0, 1, 2, 3].map((s) => createBuildingFacadeTexture('warehouse', s)),
    };

    const neonSigns = [
      { text: 'HOTEL SOL', bg: '#1c1030', fg: '#ff6e9c', accent: '#2cf2e8' },
      { text: 'PALMA CLUB', bg: '#101830', fg: '#2cf2e8', accent: '#ff5e6c' },
      { text: 'CALIMA TOWER', bg: '#0c162e', fg: '#ffd166', accent: '#38bdf8' },
      { text: 'SUNSET LOUNGE', bg: '#26112d', fg: '#ff9a3c', accent: '#ff5e6c' },
      { text: 'VAULT CALIMA', bg: '#0f172a', fg: '#4df0a9', accent: '#ffd166' },
      { text: 'OASIS RESORT', bg: '#161b3a', fg: '#64f5e9', accent: '#ffd166' },
      { text: 'BARRIO CANTINA', bg: '#2c151f', fg: '#ffb703', accent: '#fb5607' },
      { text: 'MORALES CUSTOMS', bg: '#0e192f', fg: '#2cf2e8', accent: '#ffd166' },
    ];
    const signTextures = neonSigns.map((s) => createNeonSignTexture(s.text, s.bg, s.fg, s.accent));

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x353b4f, roughness: 0.85 });
    const acMat = new THREE.MeshStandardMaterial({ color: 0x7b8599, roughness: 0.7 });

    const neonColors = [0xff5e7e, 0x2cf2e8, 0xffd166, 0xff8c42, 0xc77dff];
    const neonMats = neonColors.map((c) => {
      const m = new THREE.MeshStandardMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: 1.55,
      });
      this.neonMaterials.push(m);
      return m;
    });

    // Populate every city block between avenues & cross-streets
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

        // Leave central Solstice Plaza & shop courtyards open for shootouts and garages!
        const isSolsticePlaza = xi === 2 && zi === 2;
        const isGarageLot = xi === 0 && zi === 2;
        const isHarborYard = zi === 4 && xi <= 2;

        if (isSolsticePlaza) {
          this._buildSolsticePlaza(cx, cz, blockW, blockD);
          continue;
        }
        if (isHarborYard) {
          // Puerto Azul Docks: open container yard + 1 warehouse
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
            neonMats,
            signTextures,
            signIdx++,
          );
          continue;
        }

        // Determine district architectural style
        let style = 'glass';
        if (xi === 3) style = 'artdeco';
        else if (zi === 0) style = 'barrio';
        else if (xi === 0) style = 'villa';
        else if (zi === 4) style = 'warehouse';

        // Split block into 2x2 or 2x1 lots
        const cols = 2;
        const rows = isGarageLot ? 1 : 2;
        const lotW = blockW / cols;
        const lotD = blockD / rows;

        for (let lc = 0; lc < cols; lc++) {
          for (let lr = 0; lr < rows; lr++) {
            const lx = bx1 + lotW * (lc + 0.5);
            const lz = bz1 + lotD * (lr + 0.5);
            // Skip lots right on top of shop markers
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
              neonMats,
              signTextures,
              signIdx++,
            );
          }
        }
      }
    }

    // Extra iconic Art-Deco oceanfront boutique facades along west side of Palma Strip
    for (let z = -170; z <= 170; z += 44) {
      if (Math.abs(z - 40) < 28) continue; // Keep Causeway approach clear
      const h = 16 + (Math.abs(z) % 14);
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
        neonMats,
        signTextures,
        signIdx++,
      );
    }
  }

  _spawnBuilding(x, z, w, d, h, style, styleTextures, roofMat, acMat, neonMats, signTextures, idx) {
    const texList = styleTextures[style];
    const tex = texList[idx % texList.length];
    const sideMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: style === 'glass' ? 0.25 : 0.68,
      metalness: style === 'glass' ? 0.45 : 0.08,
    });
    const mats = [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    mesh.position.set(x, h * 0.5, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Rooftop architectural crown / setback on tall towers & Art-Deco hotels
    if (h > 22) {
      const crownH = 4 + (idx % 6);
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.62, crownH, d * 0.62),
        mats,
      );
      crown.position.set(x, h + crownH * 0.5, z);
      crown.castShadow = true;
      this.scene.add(crown);
    } else {
      // Rooftop AC unit
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 2.2), acMat);
      ac.position.set(x + w * 0.15, h + 0.7, z - d * 0.12);
      this.scene.add(ac);
    }

    // Glowing neon trim on Art-Deco hotels, Solstice towers & Barrio cantinas
    if (style === 'artdeco' || style === 'glass' || (style === 'barrio' && idx % 2 === 0)) {
      const neonMat = neonMats[idx % neonMats.length];
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.5, d + 0.35), neonMat);
      trim.position.set(x, h - 0.6, z);
      this.scene.add(trim);
    }

    // Glowing neon billboard signs facing main boulevards
    if ((style === 'artdeco' || style === 'glass') && (idx % 2 === 0 || x > 40)) {
      const sTex = signTextures[idx % signTextures.length];
      const signMat = new THREE.MeshBasicMaterial({ map: sTex });
      const signW = Math.min(w * 0.9, 13.5);
      const signH = signW * 0.28;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), signMat);
      if (x > 40) {
        // Face east toward Palma Strip & Beach
        sign.rotation.y = Math.PI / 2;
        sign.position.set(x + w * 0.5 + 0.3, Math.min(h - 2.6, 13.5), z);
      } else {
        // Face south toward cross street
        sign.position.set(x, Math.min(h - 2.6, 16), z + d * 0.5 + 0.3);
      }
      this.scene.add(sign);
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
    // Open neon plaza with fountain, cover planters, warm night lighting & Vault of Calima monument
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0x3b4462, roughness: 0.68 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), plazaMat);
    floor.position.set(cx, 0.12, cz);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Subtle illuminated plaza tile accent ring + warm streetlamp bounce light
    const plazaLight = new THREE.PointLight(0xffb878, 2.2, 54);
    plazaLight.position.set(cx, 11, cz);
    this.scene.add(plazaLight);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2cf2e8,
      emissive: 0x168b96,
      emissiveIntensity: 0.85,
      roughness: 0.15,
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
      metalness: 0.7,
      roughness: 0.25,
    });
    const obelisk = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 0), obeliskMat);
    obelisk.scale.set(0.8, 2.4, 0.8);
    obelisk.position.set(cx, 5.2, cz);
    this.scene.add(obelisk);
    this._addCollider(cx, cz, 14.2, 14.2, 6);

    // Low tactical cover walls around plaza perimeter
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x9aa4ba, roughness: 0.6 });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xff5e6c,
      emissive: 0xff5e6c,
      emissiveIntensity: 1.3,
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
    // Shipping containers & towering gantry cranes in Puerto Azul Docks
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

    // Two towering red-and-gold Puerto Azul harbor gantry cranes
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
    // Shared palm geometry/materials
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5439, roughness: 0.9 });
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x2f9e5b,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });

    const spawnPalm = (x, z, scale = 1) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      const lean = (this.rng() - 0.5) * 0.25;
      let prevY = 0;
      for (let seg = 0; seg < 4; seg++) {
        const h = 2.6 * scale;
        const rBot = (0.42 - seg * 0.06) * scale;
        const rTop = (0.36 - seg * 0.06) * scale;
        const piece = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 7), trunkMat);
        piece.position.set(lean * seg * seg * 0.7, prevY + h * 0.5, 0);
        piece.rotation.z = -lean * (seg + 1) * 0.12;
        piece.castShadow = true;
        group.add(piece);
        prevY += h * 0.94;
      }

      const crown = new THREE.Group();
      crown.position.set(lean * 9 * 0.7, prevY + 0.2, 0);
      const frondCount = 7;
      for (let f = 0; f < frondCount; f++) {
        const angle = (f / frondCount) * Math.PI * 2 + this.rng() * 0.25;
        const frond = new THREE.Mesh(
          new THREE.ConeGeometry(1.1 * scale, 5.2 * scale, 4),
          frondMat,
        );
        frond.scale.set(0.55, 1, 0.16);
        frond.rotation.z = Math.PI * 0.62;
        frond.rotation.y = angle;
        frond.position.set(
          Math.cos(angle) * 2.1 * scale,
          -0.3 * scale,
          Math.sin(angle) * 2.1 * scale,
        );
        crown.add(frond);
      }
      group.add(crown);
      group.rotation.y = this.rng() * Math.PI * 2;
      this.scene.add(group);
      this.palmTrees.push({ crown, phase: this.rng() * Math.PI * 2 });
    };

    // Lush rows of palms along Palma Strip, Boardwalk, Beach, and Cayo Brisa Island
    for (let z = -205; z <= 195; z += 18) {
      if (Math.abs(z - 40) < 16) continue;
      spawnPalm(101.5, z, 0.95 + this.rng() * 0.28);
      if (z % 36 === 0) spawnPalm(120 + this.rng() * 8, z + 6, 0.9 + this.rng() * 0.3);
      if (z % 36 !== 0) spawnPalm(75.5, z + 5, 0.88 + this.rng() * 0.22);
    }
    // Palms on Cayo Brisa Island & Mirador Heights
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      spawnPalm(WORLD.islandCenterX + Math.cos(a) * 32, WORLD.islandCenterZ + Math.sin(a) * 32, 1.05);
    }
    for (let z = -180; z <= 60; z += 36) {
      spawnPalm(-107, z, 0.9);
      spawnPalm(-187, z + 12, 0.95);
    }

    // Colorful beach umbrellas & loungers along Palma Beach
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
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c3347, metalness: 0.5, roughness: 0.4 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffe6a3,
      emissive: 0xffc864,
      emissiveIntensity: 2.0,
    });
    this.neonMaterials.push(bulbMat);

    const addLamp = (x, z, rotY = 0) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7.6, 6), poleMat);
      pole.position.y = 3.8;
      g.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 0.16), poleMat);
      arm.position.set(0.85, 7.5, 0);
      g.add(arm);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 0.45), bulbMat);
      bulb.position.set(1.5, 7.35, 0);
      g.add(bulb);
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
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x262f47, roughness: 0.6 });
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

      // Wedge ramp shape
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

      // Glowing chevron rails
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
        opacity: 0.42,
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
          // Inside AABB fallback: push out along nearest edge
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

    // Keep player/vehicles out of deep ocean except on Cayo Brisa Causeway & Island
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
    // Causeway deck slightly elevated
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
      this.waterMesh.material.emissiveIntensity = 0.25;
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
    // Animate ocean wave shimmer
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

    // Gentle coastal breeze swaying palm crowns
    for (let i = 0; i < this.palmTrees.length; i++) {
      const p = this.palmTrees[i];
      p.crown.rotation.z = Math.sin(elapsed * 1.4 + p.phase) * 0.055;
      p.crown.rotation.x = Math.cos(elapsed * 1.1 + p.phase) * 0.035;
    }

    // Rotate lighthouse beam
    if (this.lighthouseBeam) {
      this.lighthouseBeam.rotation.y = elapsed * 0.55;
    }

    // Pulse shop beacons
    for (const b of this.shopBeacons) {
      const s = 1 + Math.sin(elapsed * 3.5) * 0.08;
      b.ring.scale.set(s, s, 1);
    }

    // Ramp cooldowns
    for (const r of this.ramps) {
      if (r.cooldown > 0) r.cooldown = Math.max(0, r.cooldown - dt);
    }
  }
}
