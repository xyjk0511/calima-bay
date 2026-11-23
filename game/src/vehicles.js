// Multi-part 3D Vehicles & CALIMA-1 Police Helicopter for Calima Bay: Sunset Syndicate.
// Supports arcade driving, handbrake drift, nitro boost, sirens/flashing lightbars,
// damage/smoke/burning wrecks, and helicopter volumetric spotlight pursuit.

import * as THREE from 'three';
import { VEHICLE_TYPES } from './config.js';

const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 14);
wheelGeo.rotateZ(Math.PI / 2);
const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.36, 10);
rimGeo.rotateZ(Math.PI / 2);

const tireMat = new THREE.MeshStandardMaterial({ color: 0x161820, roughness: 0.9 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xdbe4f0, metalness: 0.85, roughness: 0.2 });
const glassMat = new THREE.MeshStandardMaterial({
  color: 0x111a2c,
  metalness: 0.8,
  roughness: 0.14,
});
const headlightMat = new THREE.MeshStandardMaterial({
  color: 0xfffbe6,
  emissive: 0xfff2b2,
  emissiveIntensity: 2.4,
});
const taillightMat = new THREE.MeshStandardMaterial({
  color: 0xff2948,
  emissive: 0xff2948,
  emissiveIntensity: 2.2,
});
const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e2433, metalness: 0.5, roughness: 0.5 });

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

    this.group = new THREE.Group();
    this._buildMesh();
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.rotY;
    this.scene.add(this.group);
  }

  _buildMesh() {
    const s = this.spec;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.colorHex,
      metalness: s.police ? 0.35 : 0.62,
      roughness: s.police ? 0.32 : 0.22,
    });
    this.bodyMat = bodyMat;

    // Lower sculpted chassis
    const lowerH = s.height * 0.48;
    const lower = new THREE.Mesh(
      new THREE.BoxGeometry(s.width, lowerH, s.length),
      bodyMat,
    );
    lower.position.y = 0.42 + lowerH * 0.5;
    lower.castShadow = true;
    lower.receiveShadow = true;
    this.group.add(lower);

    // Police white doors & hood accent
    if (s.police && !s.armored) {
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fc, roughness: 0.35, metalness: 0.2 });
      const doorBand = new THREE.Mesh(
        new THREE.BoxGeometry(s.width + 0.04, lowerH * 0.84, s.length * 0.44),
        whiteMat,
      );
      doorBand.position.set(0, 0.44 + lowerH * 0.5, -0.1);
      this.group.add(doorBand);

      // Push bumper ram bar
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.72, 0.42, 0.25), darkMetalMat);
      bumper.position.set(0, 0.58, s.length * 0.5 + 0.14);
      this.group.add(bumper);
    }

    // Cabin / Greenhouse
    if (!s.convertible) {
      const cabLen = s.armored ? s.length * 0.78 : s.length * 0.52;
      const cabH = s.height * 0.46;
      const cabZ = s.armored ? -0.15 : -0.25;
      const cabMat = s.police && !s.armored
        ? new THREE.MeshStandardMaterial({ color: 0xf4f7fc, roughness: 0.3 })
        : bodyMat;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.86, cabH, cabLen), cabMat);
      cabin.position.set(0, 0.42 + lowerH + cabH * 0.48, cabZ);
      cabin.castShadow = true;
      this.group.add(cabin);

      // Tinted wrap-around windshield & side windows
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(s.width * 0.88, cabH * 0.74, cabLen * 0.88),
        glassMat,
      );
      glass.position.set(0, 0.42 + lowerH + cabH * 0.5, cabZ + 0.03);
      this.group.add(glass);
    } else {
      // Convertible angled windshield + interior seats
      const ws = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.82, 0.48, 0.12), glassMat);
      ws.position.set(0, 0.42 + lowerH + 0.2, s.length * 0.12);
      ws.rotation.x = -0.45;
      this.group.add(ws);
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(s.width * 0.74, 0.38, s.length * 0.34),
        new THREE.MeshStandardMaterial({ color: 0x3b2824, roughness: 0.8 }),
      );
      seat.position.set(0, 0.42 + lowerH + 0.12, -0.35);
      this.group.add(seat);
    }

    // Rear sport spoiler
    if (s.spoiler) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(s.width * 0.94, 0.1, 0.44), darkMetalMat);
      wing.position.set(0, 0.42 + lowerH + 0.34, -s.length * 0.45);
      this.group.add(wing);
      for (const sx of [-0.65, 0.65]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.22), darkMetalMat);
        strut.position.set(sx, 0.42 + lowerH + 0.16, -s.length * 0.45);
        this.group.add(strut);
      }
    }

    // Underglow neon bar on supercars
    if (s.underglow) {
      const ugMat = new THREE.MeshBasicMaterial({
        color: 0x2cf2e8,
        transparent: true,
        opacity: 0.72,
      });
      const ug = new THREE.Mesh(new THREE.PlaneGeometry(s.width * 0.95, s.length * 0.82), ugMat);
      ug.rotation.x = -Math.PI / 2;
      ug.position.y = 0.08;
      this.group.add(ug);
    }

    // Taxi roof sign
    if (s.taxiSign) {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.24, 0.3),
        new THREE.MeshStandardMaterial({
          color: 0xfff3b0,
          emissive: 0xffd166,
          emissiveIntensity: 1.6,
        }),
      );
      sign.position.set(0, 0.42 + s.height + 0.08, -0.2);
      this.group.add(sign);
    }

    // Emergency flashing red/blue lightbar on police & SWAT units
    if (s.police) {
      const topY = 0.42 + s.height + 0.06;
      const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 0.34), darkMetalMat);
      barBase.position.set(0, topY, -0.1);
      this.group.add(barBase);

      this.redBarMat = new THREE.MeshStandardMaterial({
        color: 0xff2244,
        emissive: 0xff1e44,
        emissiveIntensity: 3.0,
      });
      this.blueBarMat = new THREE.MeshStandardMaterial({
        color: 0x2288ff,
        emissive: 0x2288ff,
        emissiveIntensity: 3.0,
      });
      const redBar = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.18, 0.3), this.redBarMat);
      redBar.position.set(-0.36, topY + 0.08, -0.1);
      this.group.add(redBar);

      const blueBar = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.18, 0.3), this.blueBarMat);
      blueBar.position.set(0.36, topY + 0.08, -0.1);
      this.group.add(blueBar);

      // Additive glow halos around lightbar for striking dusk/sunset readability
      const haloGeo = new THREE.SphereGeometry(0.55, 8, 8);
      this.redHalo = new THREE.Mesh(
        haloGeo,
        new THREE.MeshBasicMaterial({
          color: 0xff2244,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      this.redHalo.position.set(-0.42, topY + 0.14, -0.1);
      this.group.add(this.redHalo);

      this.blueHalo = new THREE.Mesh(
        haloGeo,
        new THREE.MeshBasicMaterial({
          color: 0x2d8bff,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      this.blueHalo.position.set(0.42, topY + 0.14, -0.1);
      this.group.add(this.blueHalo);

      this.sirenLight = new THREE.PointLight(0xff2244, 2.2, 18);
      this.sirenLight.position.set(0, topY + 0.8, -0.1);
      this.group.add(this.sirenLight);
    }

    // Headlights & Taillights
    for (const sx of [-s.width * 0.34, s.width * 0.34]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.1), headlightMat);
      hl.position.set(sx, 0.42 + lowerH * 0.56, s.length * 0.5 + 0.02);
      this.group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.1), taillightMat);
      tl.position.set(sx, 0.42 + lowerH * 0.6, -s.length * 0.5 - 0.02);
      this.group.add(tl);
    }

    // Dual nitro exhaust glow cones (hidden unless nitroActive)
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x3bf5ff,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.nitroFlames = [];
    for (const sx of [-0.45, 0.45]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.5, 8), flameMat);
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(sx, 0.46, -s.length * 0.5 - 0.72);
      cone.visible = false;
      this.group.add(cone);
      this.nitroFlames.push(cone);
    }

    // 4 spinning wheels with chrome rims
    const wx = s.width * 0.5 + 0.04;
    const wz = s.length * 0.32;
    const wheelCoords = [
      [-wx, 0.42, wz],
      [wx, 0.42, wz],
      [-wx, 0.42, -wz],
      [wx, 0.42, -wz],
    ];
    for (const [x, y, z] of wheelCoords) {
      const wg = new THREE.Group();
      wg.position.set(x, y, z);
      wg.add(new THREE.Mesh(wheelGeo, tireMat));
      wg.add(new THREE.Mesh(rimGeo, rimMat));
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

      // Recompute world velocity
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
      if (ramp.cooldown <= 0 && Math.hypot(this.x - ramp.x, this.z - ramp.z) < 5.6 && this.speed > 18 && this.y < 1.5) {
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
    const col = city.resolveCircleCollision(this.x, this.z, Math.max(this.spec.width, this.spec.length) * 0.44);
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

    // Visual animations: wheels, pitch/roll, sirens, smoke, drift trails
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.rotY;
    this.group.rotation.x = this.y > groundY + 0.2 ? Math.max(-0.32, Math.min(0.28, -this.vy * 0.018)) : 0;
    this.group.rotation.z = this.drifting ? -Math.sign(lateralVel) * 0.065 : 0;

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

    // Flashing CBPD sirens
    if (this.isPolice && this.redBarMat && this.blueBarMat) {
      this.sirenPhase += dt * 11;
      const flash = Math.sin(this.sirenPhase) > 0;
      const active = this.sirenOn && !this.destroyed;
      this.redBarMat.emissiveIntensity = active ? (flash ? 4.2 : 0.35) : 0.2;
      this.blueBarMat.emissiveIntensity = active ? (!flash ? 4.2 : 0.35) : 0.2;
      if (this.redHalo) this.redHalo.visible = active && flash;
      if (this.blueHalo) this.blueHalo.visible = active && !flash;
      if (this.sirenLight) {
        this.sirenLight.intensity = active ? 2.6 : 0;
        this.sirenLight.color.setHex(flash ? 0xff2244 : 0x2d8bff);
      }
    }

    // Drift tire smoke & burning wreck plumes
    if (fx) {
      if (this.drifting && Math.random() < 0.72) {
        const rearX = this.x - fwdX * (s.length * 0.42);
        const rearZ = this.z - fwdZ * (s.length * 0.42);
        fx.spawnSmoke(rearX + rightX * 0.8, this.y + 0.25, rearZ + rightZ * 0.8, 0xe8eef8, 0.75);
        fx.spawnSmoke(rearX - rightX * 0.8, this.y + 0.25, rearZ - rightZ * 0.8, 0xe8eef8, 0.75);
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

    this.group = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x263554,
      emissive: 0x101c34,
      emissiveIntensity: 0.45,
      metalness: 0.45,
      roughness: 0.3,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fbff,
      emissive: 0xbde8ff,
      emissiveIntensity: 0.35,
      roughness: 0.3,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x3adcf0,
      emissive: 0x1b7da8,
      emissiveIntensity: 0.65,
      metalness: 0.8,
      roughness: 0.12,
    });

    // Fuselage
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 5.8), hullMat);
    body.castShadow = true;
    this.group.add(body);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.56, 4.6), stripeMat);
    stripe.position.y = -0.1;
    this.group.add(stripe);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.65, 2.2), canopyMat);
    nose.position.set(0, -0.05, 3.3);
    this.group.add(nose);

    // Tail boom & vertical fin
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.76, 6.2), hullMat);
    tail.position.set(0, 0.35, -5.6);
    this.group.add(tail);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.26, 2.2, 1.4), stripeMat);
    fin.position.set(0, 1.1, -8.4);
    this.group.add(fin);

    // Landing skids
    for (const sx of [-1.45, 1.45]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 5.2), darkMetalMat);
      skid.position.set(sx, -1.75, 0.2);
      this.group.add(skid);
    }

    // Spinning main rotor
    this.mainRotor = new THREE.Group();
    this.mainRotor.position.set(0, 1.65, 0);
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.08, 0.42), darkMetalMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 11.5), darkMetalMat);
    this.mainRotor.add(blade1, blade2);
    this.group.add(this.mainRotor);

    // Spinning tail rotor
    this.tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.22), darkMetalMat);
    this.tailRotor.position.set(0.42, 0.85, -8.3);
    this.group.add(this.tailRotor);

    // Blinking red/blue belly strobes
    this.strobeRed = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2e55 }),
    );
    this.strobeRed.position.set(-1.35, -1.0, 1.2);
    this.group.add(this.strobeRed);

    this.strobeBlue = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x38b6ff }),
    );
    this.strobeBlue.position.set(1.35, -1.0, 1.2);
    this.group.add(this.strobeBlue);

    // Soft layered atmospheric searchlight cone
    const coneGeo = new THREE.ConeGeometry(8.2, 36, 24, 1, true);
    coneGeo.translate(0, -18, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xbaf4ff,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.searchCone = new THREE.Mesh(coneGeo, coneMat);
    this.searchCone.position.set(0, -1.1, 2.6);
    this.group.add(this.searchCone);

    // Bright ground spotlight pool
    const poolMat = new THREE.MeshBasicMaterial({
      color: 0xbaf4ff,
      transparent: true,
      opacity: 0.24,
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
    this.active = flag;
    this.group.visible = flag;
    this.spotPool.visible = flag;
  }

  placeForStaging(hx, hy, hz, targetX, targetZ) {
    this.setActive(true);
    this.x = hx;
    this.y = hy;
    this.z = hz;
    this.rotY = Math.atan2(targetX - hx, targetZ - hz);
    this.group.position.set(hx, hy, hz);
    this.group.rotation.y = this.rotY;
    this._aimSpotlightAt(targetX, targetZ);
  }

  _aimSpotlightAt(tx, tz) {
    this.spotPool.position.set(tx, 0.16, tz);
    const origin = new THREE.Vector3(0, -1.1, 2.6).applyMatrix4(this.group.matrixWorld);
    const target = new THREE.Vector3(tx, 0.15, tz);
    const dist = origin.distanceTo(target);
    this.searchCone.scale.set(1, dist / 36, 1);
    const localTarget = this.group.worldToLocal(target.clone());
    const dir = localTarget.sub(this.searchCone.position).normalize();
    const down = new THREE.Vector3(0, -1, 0);
    this.searchCone.quaternion.setFromUnitVectors(down, dir);
  }

  update(dt, elapsed, targetX, targetZ, combat, onPlayerHit) {
    if (!this.active) return;
    this.orbitAngle += dt * 0.45;
    const goalX = targetX + Math.cos(this.orbitAngle) * 26;
    const goalZ = targetZ + Math.sin(this.orbitAngle) * 26;
    const goalY = 27 + Math.sin(elapsed * 1.4) * 2.2;

    this.x += (goalX - this.x) * Math.min(1, dt * 1.8);
    this.y += (goalY - this.y) * Math.min(1, dt * 1.8);
    this.z += (goalZ - this.z) * Math.min(1, dt * 1.8);
    this.rotY = Math.atan2(targetX - this.x, targetZ - this.z);

    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.rotY;
    this.group.rotation.x = 0.12;
    this.group.updateMatrixWorld();

    this.mainRotor.rotation.y += dt * 24;
    this.tailRotor.rotation.x += dt * 32;
    const flash = Math.sin(elapsed * 12) > 0;
    this.strobeRed.visible = flash;
    this.strobeBlue.visible = !flash;

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
