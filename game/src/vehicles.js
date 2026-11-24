// Sculpted Multi-Part 3D Vehicles & Destructible CALIMA-1 Police Helicopter for Calima Bay: Sunset Syndicate.
// Features aerodynamic sloped hoods, beveled reflective cabins, 5-spoke alloy wheels, LED lightbars,
// neon underglow, CBPD push-bumper interceptors with pulsing road-glow, tire drift skid marks,
// and a destructible sculpted helicopter with blurred rotor disc & volumetric searchlight.

import * as THREE from 'three';
import { VEHICLE_TYPES } from './config.js';

const tireGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.36, 16);
tireGeo.rotateZ(Math.PI / 2);
const rimOuterGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.37, 12);
rimOuterGeo.rotateZ(Math.PI / 2);
const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.39, 8);
hubGeo.rotateZ(Math.PI / 2);
const spokeGeo = new THREE.BoxGeometry(0.38, 0.055, 0.46);
const brakeGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.32, 10);
brakeGeo.rotateZ(Math.PI / 2);

const tireMat = new THREE.MeshStandardMaterial({ color: 0x12141b, roughness: 0.92 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xe6eef9, metalness: 0.9, roughness: 0.16 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xedf2fa, metalness: 0.92, roughness: 0.14 });
const brakeMat = new THREE.MeshStandardMaterial({ color: 0xff3b5c, metalness: 0.5, roughness: 0.35 });
const glassMat = new THREE.MeshStandardMaterial({
  color: 0x0c1526,
  metalness: 0.9,
  roughness: 0.08,
});
const headlightMat = new THREE.MeshStandardMaterial({
  color: 0xfffce8,
  emissive: 0xfff0b0,
  emissiveIntensity: 2.8,
});
const taillightMat = new THREE.MeshStandardMaterial({
  color: 0xff2442,
  emissive: 0xff1e3c,
  emissiveIntensity: 2.6,
});
const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x181e2c, metalness: 0.58, roughness: 0.42 });
const grilleMat = new THREE.MeshStandardMaterial({ color: 0x0e121b, metalness: 0.72, roughness: 0.35 });

function buildAlloyWheel() {
  const wg = new THREE.Group();
  wg.add(new THREE.Mesh(tireGeo, tireMat));
  wg.add(new THREE.Mesh(rimOuterGeo, darkMetalMat));
  wg.add(new THREE.Mesh(brakeGeo, brakeMat));
  wg.add(new THREE.Mesh(hubGeo, rimMat));
  // 5 bright metallic alloy spokes
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Mesh(spokeGeo, rimMat);
    sp.rotation.x = (i / 5) * Math.PI;
    wg.add(sp);
  }
  return wg;
}

function buildExtrudedSideProfile(points, width) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  // Extrude is in XY with depth along +Z; rotate so shape X -> car +Z (forward), shape Y -> +Y, depth -> X
  geo.translate(0, 0, -width * 0.5);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export class Vehicle {
  constructor(scene, typeId, x, z, rotY = 0, colorOverride = null) {
    this.scene = scene;
    this.spec = VEHICLE_TYPES[typeId] || VEHICLE_TYPES.palma_coupe;
    this.typeId = this.spec.id;
    this.colorHex =
      colorOverride ?? this.spec.colors[Math.floor(Math.random() * this.spec.colors.length)];

    this.x = x;
    this.y = 0.05;
    this.z = z;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.rotY = rotY;
    this.speed = 0;
    this.steerAngle = 0;
    this.drifting = false;
    this.nitro = 100;
    this.nitroActive = false;
    this.health = this.spec.health;
    this.maxHealth = this.spec.health;
    this.destroyed = false;
    this.sirenOn = !!this.spec.police;
    this.isPolice = !!this.spec.police;
    this.driver = null; // 'player' | 'npc' | 'police' | null
    this.ai = null;
    this.wheels = [];
    this.sirenPhase = Math.random() * 10;
    this.airTime = 0;
    this.airStartPos = null;
    this.upgradeTurbo = 0;
    this.upgradeArmor = 0;
    this.upgradeNitro = 0;
    this.skidTimer = 0;

    this.group = new THREE.Group();
    this._buildMesh();
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.rotY;
    this.scene.add(this.group);
  }

  _buildMesh() {
    const s = this.spec;
    const halfL = s.length * 0.5;
    const lowerH = s.height * 0.46;
    const bodyBaseY = 0.34;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.colorHex,
      metalness: s.police ? 0.42 : 0.68,
      roughness: s.police ? 0.28 : 0.18,
    });
    this.bodyMat = bodyMat;

    // 1. Lower aerodynamic carbon/dark rocker skirt & front splitter + rear diffuser
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(s.width * 0.96, 0.16, s.length * 0.98),
      darkMetalMat,
    );
    skirt.position.set(0, bodyBaseY, 0);
    skirt.castShadow = true;
    this.group.add(skirt);

    const diffuser = new THREE.Mesh(
      new THREE.BoxGeometry(s.width * 0.84, 0.22, 0.28),
      darkMetalMat,
    );
    diffuser.position.set(0, bodyBaseY + 0.06, -halfL + 0.04);
    this.group.add(diffuser);

    // Twin chrome exhaust tips
    for (const ex of [-s.width * 0.26, s.width * 0.26]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.36, 10), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, bodyBaseY + 0.04, -halfL - 0.06);
      this.group.add(pipe);
    }

    // 2. Sculpted side-profile aerodynamic lower body with sloped wedge hood & raised rear haunches
    const noseH = s.armored ? lowerH * 0.92 : lowerH * 0.54;
    const deckH = s.armored ? lowerH * 1.05 : lowerH * 1.08;
    const bodyProfile = [
      [-halfL, bodyBaseY],
      [halfL, bodyBaseY],
      [halfL + 0.08, bodyBaseY + noseH * 0.65],
      [halfL - 0.16, bodyBaseY + noseH],
      [halfL * 0.28, bodyBaseY + lowerH * 0.96],
      [-halfL * 0.58, bodyBaseY + deckH],
      [-halfL + 0.08, bodyBaseY + deckH * 0.92],
      [-halfL - 0.04, bodyBaseY + lowerH * 0.35],
    ];
    const mainBody = new THREE.Mesh(
      buildExtrudedSideProfile(bodyProfile, s.width * 0.92),
      bodyMat,
    );
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    this.group.add(mainBody);

    // Sculpted wheel-arch fender flares (dark inset wells so 5-spoke wheels read cleanly)
    const wz = s.length * 0.31;
    for (const fx of [-s.width * 0.45, s.width * 0.45]) {
      for (const fz of [wz, -wz]) {
        const well = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.22, 12), grilleMat);
        well.rotation.z = Math.PI / 2;
        well.position.set(fx, 0.44, fz);
        this.group.add(well);
      }
    }

    // 3. CBPD High-Contrast Black & White Interceptor Livery + Blue/Gold Stripe + Push-Bumper Bullbar
    if (s.police && !s.armored) {
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf6f9ff, roughness: 0.26, metalness: 0.25 });
      const stripeBlue = new THREE.MeshStandardMaterial({ color: 0x1d70ff, metalness: 0.4, roughness: 0.3 });
      const stripeGold = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.6, roughness: 0.25 });

      const doorBand = new THREE.Mesh(
        new THREE.BoxGeometry(s.width + 0.03, lowerH * 0.84, s.length * 0.44),
        whiteMat,
      );
      doorBand.position.set(0, bodyBaseY + lowerH * 0.5, -0.08);
      this.group.add(doorBand);

      // Painted blue & gold CBPD side stripe
      const bStripe = new THREE.Mesh(
        new THREE.BoxGeometry(s.width + 0.055, 0.11, s.length * 0.84),
        stripeBlue,
      );
      bStripe.position.set(0, bodyBaseY + lowerH * 0.38, -0.02);
      this.group.add(bStripe);

      const gStripe = new THREE.Mesh(
        new THREE.BoxGeometry(s.width + 0.06, 0.045, s.length * 0.82),
        stripeGold,
      );
      gStripe.position.set(0, bodyBaseY + lowerH * 0.47, -0.02);
      this.group.add(gStripe);

      // Heavy tactical front push-bumper bullbar with vertical uprights
      const barH = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.68, 0.1, 0.14), darkMetalMat);
      barH.position.set(0, bodyBaseY + 0.36, halfL + 0.2);
      this.group.add(barH);
      const barLow = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.72, 0.1, 0.14), darkMetalMat);
      barLow.position.set(0, bodyBaseY + 0.14, halfL + 0.2);
      this.group.add(barLow);
      for (const ux of [-s.width * 0.22, s.width * 0.22]) {
        const upright = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.52, 0.24), darkMetalMat);
        upright.position.set(ux, bodyBaseY + 0.26, halfL + 0.18);
        this.group.add(upright);
      }
    }

    // 4. Sculpted Sloped Cabin / Fastback Greenhouse with Reflective Tinted Glass
    const cabBaseY = bodyBaseY + lowerH * 0.88;
    const cabH = s.height * 0.48;
    if (!s.convertible) {
      const cabMat =
        s.police && !s.armored
          ? new THREE.MeshStandardMaterial({ color: 0xf6f9ff, roughness: 0.24, metalness: 0.2 })
          : bodyMat;

      const cabFront = s.armored ? halfL * 0.55 : halfL * 0.34;
      const cabRoofFront = s.armored ? halfL * 0.42 : halfL * 0.04;
      const cabRoofRear = s.armored ? -halfL * 0.88 : -halfL * 0.48;
      const cabRear = s.armored ? -halfL * 0.94 : -halfL * 0.78;

      const cabProfile = [
        [cabRear, cabBaseY],
        [cabFront, cabBaseY],
        [cabRoofFront, cabBaseY + cabH],
        [cabRoofRear, cabBaseY + cabH],
      ];
      const cabin = new THREE.Mesh(
        buildExtrudedSideProfile(cabProfile, s.width * 0.76),
        cabMat,
      );
      cabin.castShadow = true;
      this.group.add(cabin);

      // Sleek recessed tinted wraparound glass envelope (slightly wider/longer in window zone)
      const glassProfile = [
        [cabRear + 0.04, cabBaseY + 0.05],
        [cabFront + 0.04, cabBaseY + 0.05],
        [cabRoofFront - 0.06, cabBaseY + cabH - 0.06],
        [cabRoofRear + 0.06, cabBaseY + cabH - 0.06],
      ];
      const glass = new THREE.Mesh(
        buildExtrudedSideProfile(glassProfile, s.width * 0.785),
        glassMat,
      );
      this.group.add(glass);

      // Subtle roof cap strip so roof paint reads cleanly above the glass
      const roofLen = Math.max(0.6, cabRoofFront - cabRoofRear);
      const roofCap = new THREE.Mesh(
        new THREE.BoxGeometry(s.width * 0.76, 0.09, roofLen),
        cabMat,
      );
      roofCap.position.set(0, cabBaseY + cabH + 0.02, (cabRoofFront + cabRoofRear) * 0.5);
      this.group.add(roofCap);
    } else {
      // Convertible angled raked windshield + chrome roll hoops + luxury seats
      const ws = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.8, 0.5, 0.1), glassMat);
      ws.position.set(0, cabBaseY + 0.22, s.length * 0.14);
      ws.rotation.x = -0.52;
      this.group.add(ws);
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(s.width * 0.72, 0.4, s.length * 0.32),
        new THREE.MeshStandardMaterial({ color: 0x4a2c24, roughness: 0.75 }),
      );
      seat.position.set(0, cabBaseY + 0.14, -0.35);
      this.group.add(seat);
      for (const hx of [-0.45, 0.45]) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 12, Math.PI), chromeMat);
        hoop.position.set(hx, cabBaseY + 0.28, -0.78);
        this.group.add(hoop);
      }
    }

    // Side mirrors
    for (const mx of [-s.width * 0.49, s.width * 0.49]) {
      const mir = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.16), bodyMat);
      mir.position.set(mx, cabBaseY + 0.12, s.length * 0.12);
      this.group.add(mir);
    }

    // 5. Rear sculpted sport wing spoiler
    if (s.spoiler) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.96, 0.08, 0.42), darkMetalMat);
      wing.position.set(0, bodyBaseY + deckH + 0.34, -halfL + 0.2);
      wing.rotation.x = 0.08;
      this.group.add(wing);
      for (const sx of [-s.width * 0.32, s.width * 0.32]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.22), darkMetalMat);
        strut.position.set(sx, bodyBaseY + deckH + 0.16, -halfL + 0.22);
        this.group.add(strut);
      }
      for (const ex of [-s.width * 0.48, s.width * 0.48]) {
        const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.46), bodyMat);
        endplate.position.set(ex, bodyBaseY + deckH + 0.34, -halfL + 0.2);
        this.group.add(endplate);
      }
    }

    // 6. Neon Underglow plane + soft street glow spill on Sunset GT & sports coupes
    if (s.underglow || s.category === 'sport') {
      const ugColor = s.underglow ? 0x2cf2e8 : 0xff5e7e;
      const ugMat = new THREE.MeshBasicMaterial({
        color: ugColor,
        transparent: true,
        opacity: s.underglow ? 0.58 : 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ug = new THREE.Mesh(new THREE.PlaneGeometry(s.width * 1.32, s.length * 1.06), ugMat);
      ug.rotation.x = -Math.PI / 2;
      ug.position.y = 0.075;
      this.group.add(ug);
    }

    // 7. Chrome Front Grille + Recessed LED Headlights with subtle forward light halos + Wide LED Tail-Light Bar
    const grille = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.5, 0.22, 0.12), grilleMat);
    grille.position.set(0, bodyBaseY + 0.22, halfL + 0.04);
    this.group.add(grille);
    const grilleTrim = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.54, 0.04, 0.14), chromeMat);
    grilleTrim.position.set(0, bodyBaseY + 0.34, halfL + 0.04);
    this.group.add(grilleTrim);

    const hlHaloMat = new THREE.MeshBasicMaterial({
      color: 0xfff0b8,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (const sx of [-s.width * 0.34, s.width * 0.34]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.12), headlightMat);
      hl.position.set(sx, bodyBaseY + noseH * 0.68, halfL + 0.04);
      this.group.add(hl);

      const halo = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 10, 1, true), hlHaloMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.set(sx, bodyBaseY + noseH * 0.56, halfL + 0.82);
      this.group.add(halo);
    }

    // Wide glowing crimson LED tail-light bar across the rear
    const tailBar = new THREE.Mesh(
      new THREE.BoxGeometry(s.width * 0.88, 0.15, 0.1),
      taillightMat,
    );
    tailBar.position.set(0, bodyBaseY + deckH * 0.72, -halfL - 0.03);
    this.group.add(tailBar);

    // Taxi roof sign
    if (s.taxiSign) {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.24, 0.32),
        new THREE.MeshStandardMaterial({
          color: 0xfff3b0,
          emissive: 0xffd166,
          emissiveIntensity: 1.8,
        }),
      );
      sign.position.set(0, cabBaseY + cabH + 0.16, -0.18);
      this.group.add(sign);
    }

    // 8. Emergency Twin-Module Red/Blue Roof Lightbar + Pulsing Road-Glow on Police & SWAT
    if (s.police) {
      const topY = cabBaseY + cabH + 0.1;
      const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.1, 0.34), darkMetalMat);
      barBase.position.set(0, topY, -0.12);
      this.group.add(barBase);

      this.redBarMat = new THREE.MeshStandardMaterial({
        color: 0xff2244,
        emissive: 0xff1e44,
        emissiveIntensity: 3.4,
      });
      this.blueBarMat = new THREE.MeshStandardMaterial({
        color: 0x2288ff,
        emissive: 0x2288ff,
        emissiveIntensity: 3.4,
      });
      const redBar = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.18, 0.3), this.redBarMat);
      redBar.position.set(-0.38, topY + 0.08, -0.12);
      this.group.add(redBar);

      const blueBar = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.18, 0.3), this.blueBarMat);
      blueBar.position.set(0.38, topY + 0.08, -0.12);
      this.group.add(blueBar);

      const centerWhite = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.28), headlightMat);
      centerWhite.position.set(0, topY + 0.08, -0.12);
      this.group.add(centerWhite);

      const haloGeo = new THREE.SphereGeometry(0.62, 10, 8);
      this.redHalo = new THREE.Mesh(
        haloGeo,
        new THREE.MeshBasicMaterial({
          color: 0xff2244,
          transparent: true,
          opacity: 0.48,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      this.redHalo.position.set(-0.44, topY + 0.15, -0.12);
      this.group.add(this.redHalo);

      this.blueHalo = new THREE.Mesh(
        haloGeo,
        new THREE.MeshBasicMaterial({
          color: 0x2d8bff,
          transparent: true,
          opacity: 0.48,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      this.blueHalo.position.set(0.44, topY + 0.15, -0.12);
      this.group.add(this.blueHalo);

      // Pulsing road-glow pool cast onto asphalt around cruiser
      this.sirenRoadGlow = new THREE.Mesh(
        new THREE.CircleGeometry(4.2, 20),
        new THREE.MeshBasicMaterial({
          color: 0xff2244,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      this.sirenRoadGlow.rotation.x = -Math.PI / 2;
      this.sirenRoadGlow.position.set(0, 0.08, -0.1);
      this.group.add(this.sirenRoadGlow);

      this.sirenLight = new THREE.PointLight(0xff2244, 3.6, 22);
      this.sirenLight.position.set(0, topY + 0.9, -0.1);
      this.group.add(this.sirenLight);
    }

    // 9. Dual cyan nitro exhaust glow cones
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x3bf5ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.nitroFlames = [];
    for (const sx of [-s.width * 0.26, s.width * 0.26]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.75, 10), flameMat);
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(sx, bodyBaseY + 0.06, -halfL - 0.85);
      cone.visible = false;
      this.group.add(cone);
      this.nitroFlames.push(cone);
    }

    // 10. 4 clearly visible wider rubber tires + 5-spoke bright metallic alloy rims
    const wx = s.width * 0.48 + 0.04;
    const wheelCoords = [
      [-wx, 0.43, wz],
      [wx, 0.43, wz],
      [-wx, 0.43, -wz],
      [wx, 0.43, -wz],
    ];
    for (const [x, y, z] of wheelCoords) {
      const wg = buildAlloyWheel();
      wg.position.set(x, y, z);
      this.group.add(wg);
      this.wheels.push(wg);
    }
  }

  repaint(hexColor) {
    this.colorHex = hexColor;
    if (this.bodyMat) this.bodyMat.color.setHex(hexColor);
  }

  repair() {
    this.destroyed = false;
    this.maxHealth = this.spec.health + this.upgradeArmor * 60;
    this.health = this.maxHealth;
    this.nitro = 100;
    if (this.bodyMat) this.bodyMat.color.setHex(this.colorHex);
  }

  applyDamage(amount, fx) {
    if (this.destroyed) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.destroyed = true;
      this.sirenOn = false;
      if (this.bodyMat) this.bodyMat.color.setHex(0x232024);
      if (this.sirenRoadGlow) this.sirenRoadGlow.visible = false;
      if (fx) fx.spawnExplosion(this.x, this.y + 1.1, this.z, 1.35);
    }
  }

  stepPhysics(dt, controls, city, fx, onStuntJump) {
    const s = this.spec;
    const fwdX = Math.sin(this.rotY);
    const fwdZ = Math.cos(this.rotY);
    const rightX = Math.cos(this.rotY);
    const rightZ = -Math.sin(this.rotY);

    let forwardVel = this.vx * fwdX + this.vz * fwdZ;
    let lateralVel = this.vx * rightX + this.vz * rightZ;

    const turboMult = 1 + this.upgradeTurbo * 0.16;
    const maxSpd = s.maxSpeed * turboMult;
    const accel = s.accel * turboMult;

    if (!this.destroyed) {
      const throttle = controls.throttle || 0;
      const steer = controls.steer || 0;
      const handbrake = !!controls.handbrake;
      const boostReq = !!controls.nitro && this.nitro > 4 && throttle > 0;
      this.nitroActive = boostReq;

      if (boostReq) {
        forwardVel += accel * 1.15 * dt;
        this.nitro = Math.max(0, this.nitro - (28 - this.upgradeNitro * 5) * dt);
      } else {
        this.nitro = Math.min(100, this.nitro + (7 + this.upgradeNitro * 3) * dt);
      }

      if (throttle > 0) {
        forwardVel += accel * throttle * dt;
      } else if (throttle < 0) {
        if (forwardVel > 2) forwardVel -= s.brake * dt;
        else forwardVel += accel * 0.55 * throttle * dt;
      } else {
        forwardVel *= Math.exp(-1.5 * dt);
      }

      const cap = boostReq ? maxSpd * 1.34 : maxSpd;
      forwardVel = Math.max(-maxSpd * 0.35, Math.min(cap, forwardVel));

      const speedFactor = Math.min(1, Math.abs(forwardVel) / 8);
      const dirSign = forwardVel >= -0.5 ? 1 : -1;
      const turnMult = handbrake ? 1.32 : 1.0;
      this.rotY += steer * s.turnRate * turnMult * speedFactor * dirSign * dt;
      this.steerAngle = steer * 0.42;

      const grip = handbrake ? s.driftGrip : s.grip;
      lateralVel *= Math.exp(-grip * dt);
      this.drifting = (handbrake || Math.abs(lateralVel) > 5.5) && Math.abs(forwardVel) > 12;

      const nfX = Math.sin(this.rotY);
      const nfZ = Math.cos(this.rotY);
      const nrX = Math.cos(this.rotY);
      const nrZ = -Math.sin(this.rotY);
      this.vx = nfX * forwardVel + nrX * lateralVel;
      this.vz = nfZ * forwardVel + nrZ * lateralVel;
    } else {
      this.nitroActive = false;
      this.drifting = false;
      this.vx *= Math.exp(-3.5 * dt);
      this.vz *= Math.exp(-3.5 * dt);
    }

    // Stunt ramp launch check
    for (const ramp of city.ramps) {
      if (
        ramp.cooldown <= 0 &&
        Math.hypot(this.x - ramp.x, this.z - ramp.z) < 5.6 &&
        this.speed > 18 &&
        this.y < 1.5
      ) {
        this.vy = Math.min(19, 8.5 + this.speed * 0.25);
        ramp.cooldown = 3.0;
        this.airStartPos = { x: this.x, z: this.z, ramp };
        this.airTime = 0.01;
      }
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    const groundY = city.getGroundHeight(this.x, this.z);

    if (this.y > groundY || this.vy > 0) {
      this.vy -= 26 * dt;
      this.y += this.vy * dt;
      this.airTime += dt;
      if (this.y <= groundY) {
        this.y = groundY;
        this.vy = 0;
        if (this.airStartPos && this.airTime > 0.65 && onStuntJump && this.driver === 'player') {
          const dist = Math.round(Math.hypot(this.x - this.airStartPos.x, this.z - this.airStartPos.z));
          if (dist >= 16) onStuntJump(this.airStartPos.ramp, dist);
        }
        this.airStartPos = null;
        this.airTime = 0;
      }
    } else {
      this.y = groundY;
    }

    // Building & shoreline collision
    const col = city.resolveCircleCollision(
      this.x,
      this.z,
      Math.max(this.spec.width, this.spec.length) * 0.44,
    );
    if (col.hit) {
      this.x = col.x;
      this.z = col.z;
      const impact = Math.hypot(this.vx, this.vz);
      if (impact > 20 && !this.destroyed) {
        this.applyDamage((impact - 18) * 0.5, fx);
        if (fx) fx.spawnSparks(this.x, this.y + 0.9, this.z, 6);
      }
      this.vx *= -0.22;
      this.vz *= -0.22;
    }

    this.speed = Math.hypot(this.vx, this.vz);

    // Visual animations
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.rotY;
    this.group.rotation.x =
      this.y > groundY + 0.2 ? Math.max(-0.32, Math.min(0.28, -this.vy * 0.018)) : 0;
    this.group.rotation.z = this.drifting ? -Math.sign(lateralVel) * 0.075 : 0;

    for (let i = 0; i < this.wheels.length; i++) {
      this.wheels[i].rotation.x += forwardVel * dt * 1.4;
      if (i < 2) this.wheels[i].rotation.y = this.steerAngle;
    }

    for (const flame of this.nitroFlames) {
      flame.visible = this.nitroActive;
      if (this.nitroActive) {
        const sc = 0.85 + Math.random() * 0.45;
        flame.scale.set(1, sc, 1);
      }
    }

    // Flashing CBPD sirens + pulsing road glow
    if (this.isPolice && this.redBarMat && this.blueBarMat) {
      this.sirenPhase += dt * 11;
      const flash = Math.sin(this.sirenPhase) > 0;
      const active = this.sirenOn && !this.destroyed;
      this.redBarMat.emissiveIntensity = active ? (flash ? 4.4 : 0.35) : 0.2;
      this.blueBarMat.emissiveIntensity = active ? (!flash ? 4.4 : 0.35) : 0.2;
      if (this.redHalo) this.redHalo.visible = active && flash;
      if (this.blueHalo) this.blueHalo.visible = active && !flash;
      if (this.sirenRoadGlow) {
        this.sirenRoadGlow.visible = active;
        this.sirenRoadGlow.material.color.setHex(flash ? 0xff2244 : 0x2d8bff);
      }
      if (this.sirenLight) {
        this.sirenLight.intensity = active ? 3.8 : 0;
        this.sirenLight.color.setHex(flash ? 0xff2244 : 0x2d8bff);
      }
    }

    // Drift tire smoke, persistent skid marks & burning wreck plumes
    if (fx) {
      if (this.drifting && this.y <= groundY + 0.15) {
        const rearX = this.x - fwdX * (s.length * 0.33);
        const rearZ = this.z - fwdZ * (s.length * 0.33);
        this.skidTimer -= dt;
        if (this.skidTimer <= 0 && fx.spawnSkidMark) {
          this.skidTimer = 0.045;
          const velYaw = Math.atan2(this.vx, this.vz);
          const halfTrack = s.width * 0.46;
          fx.spawnSkidMark(rearX + rightX * halfTrack, groundY + 0.03, rearZ + rightZ * halfTrack, velYaw);
          fx.spawnSkidMark(rearX - rightX * halfTrack, groundY + 0.03, rearZ - rightZ * halfTrack, velYaw);
        }
        if (Math.random() < 0.72) {
          fx.spawnSmoke(rearX + rightX * 0.85, this.y + 0.25, rearZ + rightZ * 0.85, 0xe8eef8, 0.72);
          fx.spawnSmoke(rearX - rightX * 0.85, this.y + 0.25, rearZ - rightZ * 0.85, 0xe8eef8, 0.72);
        }
      }
      if (this.destroyed && Math.random() < 0.42) {
        fx.spawnFire(this.x + (Math.random() - 0.5) * 1.4, this.y + 1.1, this.z + (Math.random() - 0.5) * 1.4);
        fx.spawnSmoke(this.x, this.y + 1.9, this.z, 0x1a1a22, 1.3);
      } else if (this.health < this.maxHealth * 0.38 && Math.random() < 0.22) {
        fx.spawnSmoke(this.x + fwdX * 1.6, this.y + 1.2, this.z + fwdZ * 1.6, 0x3b3f4a, 0.8);
      }
    }
  }
}

export class PoliceHelicopter {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.x = 120;
    this.y = 32;
    this.z = -120;
    this.rotY = 0;
    this.orbitAngle = 0;
    this.fireTimer = 0;
    this.health = 350;
    this.maxHealth = 350;
    this.crashing = false;
    this.crashTimer = 0;
    this.respawnCooldown = 0;

    this.group = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x1e2c4a,
      emissive: 0x0b152a,
      emissiveIntensity: 0.35,
      metalness: 0.55,
      roughness: 0.26,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xf6faff,
      emissive: 0x99d9ff,
      emissiveIntensity: 0.25,
      roughness: 0.28,
    });
    const accentGold = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      metalness: 0.65,
      roughness: 0.25,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x36e6f5,
      emissive: 0x147096,
      emissiveIntensity: 0.72,
      metalness: 0.88,
      roughness: 0.1,
    });

    // Sculpted tapered fuselage body
    const fuseGeo = new THREE.CylinderGeometry(1.18, 1.42, 4.8, 14);
    fuseGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(fuseGeo, hullMat);
    body.scale.set(1.06, 0.88, 1);
    body.castShadow = true;
    this.group.add(body);

    // Side livery stripe & tactical pods
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.44, 4.1), stripeMat);
    stripe.position.set(0, -0.05, 0.1);
    this.group.add(stripe);
    const goldBand = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.12, 3.8), accentGold);
    goldBand.position.set(0, 0.2, 0.1);
    this.group.add(goldBand);

    // Sleek rounded glass cockpit nose dome
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.36, 14, 12), canopyMat);
    nose.scale.set(0.96, 0.82, 1.38);
    nose.position.set(0, -0.04, 2.35);
    this.group.add(nose);

    // Turbine intake housing on roof
    const turbine = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.86, 2.8, 12), hullMat);
    turbine.rotation.x = Math.PI / 2;
    turbine.position.set(0, 1.12, -0.3);
    this.group.add(turbine);

    // Elongated tapered tail boom + vertical stabilizer fin + horizontal tailplane
    const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.64, 7.2, 10), hullMat);
    tailBoom.rotation.x = Math.PI / 2;
    tailBoom.position.set(0, 0.36, -5.6);
    this.group.add(tailBoom);

    const hStab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.68), stripeMat);
    hStab.position.set(0, 0.42, -7.8);
    this.group.add(hStab);

    const vFinProfile = [
      [-0.7, -0.3],
      [0.65, -0.3],
      [0.15, 2.15],
      [-0.85, 2.05],
    ];
    const vFin = new THREE.Mesh(buildExtrudedSideProfile(vFinProfile, 0.16), stripeMat);
    vFin.position.set(0, 0.35, -8.8);
    this.group.add(vFin);

    // Detailed tubular landing skids with diagonal struts
    for (const sx of [-1.42, 1.42]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.4, 8), darkMetalMat);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(sx, -1.78, 0.25);
      this.group.add(skid);
      for (const sz of [-1.1, 1.3]) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.25, 6), darkMetalMat);
        strut.position.set(sx * 0.78, -1.22, sz);
        strut.rotation.z = sx > 0 ? 0.38 : -0.38;
        this.group.add(strut);
      }
    }

    // Main rotor mast + translucent blurred spinning disc + 4 crisp blades
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.85, 8), darkMetalMat);
    mast.position.set(0, 1.68, 0);
    this.group.add(mast);

    this.mainRotor = new THREE.Group();
    this.mainRotor.position.set(0, 2.02, 0);
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.07, 0.34), darkMetalMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 12.2), darkMetalMat);
    const blurDisc = new THREE.Mesh(
      new THREE.CircleGeometry(6.1, 28),
      new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    blurDisc.rotation.x = -Math.PI / 2;
    this.mainRotor.add(blade1, blade2, blurDisc);
    this.group.add(this.mainRotor);

    // Spinning tail rotor + blurred disc
    this.tailRotor = new THREE.Group();
    this.tailRotor.position.set(0.34, 1.38, -8.9);
    const tb1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 0.2), darkMetalMat);
    const tb2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 2.1), darkMetalMat);
    this.tailRotor.add(tb1, tb2);
    this.group.add(this.tailRotor);

    // Blinking red/blue belly strobes
    this.strobeRed = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2e55 }),
    );
    this.strobeRed.position.set(-1.35, -0.92, 1.1);
    this.group.add(this.strobeRed);

    this.strobeBlue = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x38b6ff }),
    );
    this.strobeBlue.position.set(1.35, -0.92, 1.1);
    this.group.add(this.strobeBlue);

    // Volumetric searchlight cone
    const coneGeo = new THREE.ConeGeometry(8.2, 36, 24, 1, true);
    coneGeo.translate(0, -18, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xc2f6ff,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.searchCone = new THREE.Mesh(coneGeo, coneMat);
    this.searchCone.position.set(0, -1.0, 2.75);
    this.group.add(this.searchCone);

    // Bright ground spotlight pool
    const poolMat = new THREE.MeshBasicMaterial({
      color: 0xc2f6ff,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.spotPool = new THREE.Mesh(new THREE.CircleGeometry(6.8, 24), poolMat);
    this.spotPool.rotation.x = -Math.PI / 2;
    this.spotPool.visible = false;
    this.scene.add(this.spotPool);

    this.group.visible = false;
    this.scene.add(this.group);
  }

  setActive(flag) {
    if (flag && !this.active && !this.crashing && this.respawnCooldown <= 0) {
      this.health = this.maxHealth;
      this.crashing = false;
    }
    this.active = flag && this.respawnCooldown <= 0;
    this.group.visible = this.active || this.crashing;
    this.spotPool.visible = this.active && !this.crashing;
  }

  applyDamage(amount, fx, audio, onDestroyed) {
    if (!this.active || this.crashing) return false;
    this.health = Math.max(0, this.health - amount);
    if (fx) fx.spawnSparks(this.x, this.y - 0.5, this.z, 8);
    if (this.health <= 0) {
      this.crashing = true;
      this.crashTimer = 2.4;
      this.spotPool.visible = false;
      this.searchCone.visible = false;
      if (fx) fx.spawnExplosion(this.x, this.y, this.z, 1.7);
      if (audio) audio.playExplosion();
      if (onDestroyed) onDestroyed();
      return true; // killed!
    }
    return false;
  }

  placeForStaging(hx, hy, hz, targetX, targetZ) {
    this.respawnCooldown = 0;
    this.crashing = false;
    this.health = this.maxHealth;
    this.searchCone.visible = true;
    this.setActive(true);
    this.x = hx;
    this.y = hy;
    this.z = hz;
    this.rotY = Math.atan2(targetX - hx, targetZ - hz);
    this.group.position.set(hx, hy, hz);
    this.group.rotation.set(0.1, this.rotY, 0);
    this.group.updateMatrixWorld();
    this._aimSpotlightAt(targetX, targetZ);
  }

  _aimSpotlightAt(tx, tz) {
    this.spotPool.position.set(tx, 0.16, tz);
    const origin = new THREE.Vector3(0, -1.0, 2.75).applyMatrix4(this.group.matrixWorld);
    const target = new THREE.Vector3(tx, 0.15, tz);
    const dist = origin.distanceTo(target);
    this.searchCone.scale.set(1, dist / 36, 1);
    const localTarget = this.group.worldToLocal(target.clone());
    const dir = localTarget.sub(this.searchCone.position).normalize();
    const down = new THREE.Vector3(0, -1, 0);
    this.searchCone.quaternion.setFromUnitVectors(down, dir);
  }

  update(dt, elapsed, targetX, targetZ, combat, onPlayerHit, audio) {
    if (this.respawnCooldown > 0) {
      this.respawnCooldown = Math.max(0, this.respawnCooldown - dt);
      if (this.respawnCooldown === 0) {
        this.searchCone.visible = true;
      }
    }

    // Fiery spiral crash sequence when shot down!
    if (this.crashing) {
      this.crashTimer -= dt;
      this.y -= 13 * dt;
      this.x += Math.sin(elapsed * 5) * 8 * dt;
      this.z += Math.cos(elapsed * 5) * 8 * dt;
      this.rotY += dt * 7.5;
      this.group.position.set(this.x, Math.max(1.2, this.y), this.z);
      this.group.rotation.set(0.45, this.rotY, 0.55);
      this.mainRotor.rotation.y += dt * 10;
      if (combat && Math.random() < 0.75) {
        combat.spawnFire(this.x, this.y, this.z, 1.3);
        combat.spawnSmoke(this.x, this.y + 1.2, this.z, 0x1b1b24, 1.6);
      }
      if (this.y <= 1.6 || this.crashTimer <= 0) {
        if (combat) combat.spawnExplosion(this.x, 1.4, this.z, 2.4);
        if (audio) audio.playExplosion();
        this.crashing = false;
        this.active = false;
        this.group.visible = false;
        this.spotPool.visible = false;
        this.respawnCooldown = 25;
      }
      return;
    }

    if (!this.active) return;

    this.orbitAngle += dt * 0.45;
    const goalX = targetX + Math.cos(this.orbitAngle) * 26;
    const goalZ = targetZ + Math.sin(this.orbitAngle) * 26;
    const goalY = 25 + Math.sin(elapsed * 1.4) * 2.2;

    this.x += (goalX - this.x) * Math.min(1, dt * 1.8);
    this.y += (goalY - this.y) * Math.min(1, dt * 1.8);
    this.z += (goalZ - this.z) * Math.min(1, dt * 1.8);
    this.rotY = Math.atan2(targetX - this.x, targetZ - this.z);

    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.set(0.12, this.rotY, 0);
    this.group.updateMatrixWorld();

    this.mainRotor.rotation.y += dt * 24;
    this.tailRotor.rotation.x += dt * 32;
    const flash = Math.sin(elapsed * 12) > 0;
    this.strobeRed.visible = flash;
    this.strobeBlue.visible = !flash;

    // Damaged smoke plume when below 60% HP
    if (this.health < this.maxHealth * 0.6 && combat && Math.random() < 0.45) {
      combat.spawnSmoke(this.x, this.y + 0.4, this.z, 0x262833, 1.25);
      if (this.health < this.maxHealth * 0.3) {
        combat.spawnFire(this.x, this.y, this.z, 0.85);
      }
    }

    this._aimSpotlightAt(targetX, targetZ);

    // Periodic aerial tracer bursts
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && combat) {
      this.fireTimer = 2.6 + Math.random() * 1.5;
      const ox = this.x;
      const oy = this.y - 1.4;
      const oz = this.z;
      const tx = targetX + (Math.random() - 0.5) * 6;
      const tz = targetZ + (Math.random() - 0.5) * 6;
      combat.spawnTracer(ox, oy, oz, tx, 0.8, tz, 0xff5e6c);
      if (Math.hypot(tx - targetX, tz - targetZ) < 2.2 && onPlayerHit) {
        onPlayerHit(7);
      }
    }
  }
}
