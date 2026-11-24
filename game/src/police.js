// 5-Star CBPD Tactical Dispatch: escalating cruisers, PIT pursuit, detailed highway roadblocks
// with striped barricades, flashing amber cones & armed officers, SWAT enforcers,
// destructible CALIMA-1 Air One helicopter spotlight pursuit, and evasion timer.

import * as THREE from 'three';
import { WANTED_TIERS } from './config.js';
import { Vehicle, PoliceHelicopter } from './vehicles.js';

export class PoliceDispatch {
  constructor(scene) {
    this.scene = scene;
    this.stars = 0;
    this.heat = 0;
    this.cooldownTimer = 0;
    this.jammerTimer = 0;
    this.units = [];
    this.barricades = [];
    this.amberBeacons = [];
    this.helicopter = new PoliceHelicopter(scene);
    this.spawnTimer = 0;
  }

  get tier() {
    return WANTED_TIERS[Math.min(5, Math.max(0, this.stars))];
  }

  addHeat(amount) {
    const mult = this.jammerTimer > 0 ? 0.35 : 1;
    this.heat = Math.min(500, this.heat + amount * mult);
    this.cooldownTimer = 18;
    const newStars = Math.min(5, Math.ceil(this.heat / 95));
    if (newStars > this.stars) {
      this.stars = newStars;
      return true;
    }
    return false;
  }

  setWantedLevel(stars) {
    this.stars = Math.max(0, Math.min(5, stars));
    this.heat = this.stars * 95;
    this.cooldownTimer = this.stars > 0 ? 22 : 0;
    if (this.stars === 0) {
      this.clearAllUnits();
    } else if (this.stars >= 4) {
      this.helicopter.setActive(true);
    }
  }

  clearHeat() {
    this.stars = 0;
    this.heat = 0;
    this.cooldownTimer = 0;
    this.clearAllUnits();
  }

  activateRadioJammer() {
    this.jammerTimer = 14;
    this.cooldownTimer = Math.min(this.cooldownTimer, 6);
  }

  clearAllUnits() {
    for (const u of this.units) {
      this.scene.remove(u.group);
    }
    this.units = [];
    this.clearBarricades();
    this.helicopter.setActive(false);
  }

  clearBarricades() {
    for (const b of this.barricades) {
      this.scene.remove(b);
    }
    this.barricades = [];
    this.amberBeacons = [];
  }

  spawnRoadblockAt(x, z, rotY = 0, traffic = null) {
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff6b1a, roughness: 0.48 });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffe4b5,
      emissiveIntensity: 0.45,
    });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x262c3d, metalness: 0.5, roughness: 0.5 });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xff9f1c,
      emissiveIntensity: 2.8,
    });

    // 3 detailed striped orange/white police barricades with A-frame legs & flashing beacons
    for (const offset of [-4.6, 0, 4.6]) {
      const g = new THREE.Group();
      const bx = x + Math.cos(rotY) * offset;
      const bz = z - Math.sin(rotY) * offset;
      g.position.set(bx, 0, bz);
      g.rotation.y = rotY;

      for (const lx of [-1.25, 1.25]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.72), legMat);
        leg.position.set(lx, 0.52, 0);
        g.add(leg);
      }
      // Striped plank rails
      const upper = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.34, 0.16), orangeMat);
      upper.position.set(0, 0.94, 0);
      upper.castShadow = true;
      g.add(upper);

      for (const sx of [-1.05, 0, 1.05]) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.35, 0.19), whiteMat);
        stripe.position.set(sx, 0.94, 0);
        g.add(stripe);
      }

      const lower = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.2, 0.14), whiteMat);
      lower.position.set(0, 0.48, 0);
      g.add(lower);

      // Flashing amber top beacon
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), beaconMat.clone());
      lamp.position.set(0, 1.24, 0);
      g.add(lamp);
      this.amberBeacons.push(lamp.material);

      this.scene.add(g);
      this.barricades.push(g);
    }

    // Flashing orange/white traffic cones flanking roadblock approaches
    for (const cx of [-6.8, -2.3, 2.3, 6.8]) {
      const coneGroup = new THREE.Group();
      const bx = x + Math.cos(rotY) * cx - Math.sin(rotY) * -2.2;
      const bz = z - Math.sin(rotY) * cx - Math.cos(rotY) * -2.2;
      coneGroup.position.set(bx, 0, bz);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 0.54), legMat);
      base.position.y = 0.04;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.78, 8), orangeMat);
      cone.position.y = 0.44;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.18, 8), whiteMat);
      ring.position.y = 0.52;
      coneGroup.add(base, cone, ring);
      this.scene.add(coneGroup);
      this.barricades.push(coneGroup);
    }

    // Armed CBPD officers taking cover behind the roadblock
    if (traffic) {
      for (const ox of [-2.4, 2.4]) {
        const px = x + Math.cos(rotY) * ox + Math.sin(rotY) * 1.6;
        const pz = z - Math.sin(rotY) * ox + Math.cos(rotY) * 1.6;
        traffic.spawnEnemy(px, pz, 'cbpd');
      }
    }
  }

  spawnUnit(typeId, x, z, rotY) {
    const unit = new Vehicle(this.scene, typeId, x, z, rotY);
    unit.driver = 'police';
    unit.sirenOn = true;
    this.units.push(unit);
    return unit;
  }

  update(dt, elapsed, city, player, combat, fx, onPlayerHit, audio) {
    if (this.jammerTimer > 0) this.jammerTimer = Math.max(0, this.jammerTimer - dt);

    // Pulse amber roadblock beacons
    const pulse = Math.sin(elapsed * 9) > 0 ? 3.2 : 0.4;
    for (const bm of this.amberBeacons) bm.emissiveIntensity = pulse;

    if (this.stars === 0) {
      this.helicopter.setActive(false);
      return;
    }

    const tier = this.tier;
    const desiredCount = tier.maxCruisers + tier.interceptors + tier.swat;

    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      const dist = Math.hypot(u.x - player.x, u.z - player.z);
      if (dist > 220) {
        this.scene.remove(u.group);
        this.units.splice(i, 1);
      }
    }

    this.spawnTimer -= dt;
    if (this.units.length < desiredCount && this.spawnTimer <= 0) {
      this.spawnTimer = 2.4;
      const angle = Math.random() * Math.PI * 2;
      const dist = 64 + Math.random() * 28;
      let sx = Math.max(-210, Math.min(104, player.x + Math.cos(angle) * dist));
      let sz = Math.max(-200, Math.min(200, player.z + Math.sin(angle) * dist));
      const col = city.resolveCircleCollision(sx, sz, 3.2);
      sx = col.x;
      sz = col.z;
      const rotY = Math.atan2(player.x - sx, player.z - sz);

      let typeId = 'cbpd_cruiser';
      if (tier.swat > 0 && this.units.filter((u) => u.typeId === 'swat_enforcer').length < tier.swat) {
        typeId = 'swat_enforcer';
      } else if (
        tier.interceptors > 0 &&
        this.units.filter((u) => u.typeId === 'cbpd_interceptor').length < tier.interceptors
      ) {
        typeId = 'cbpd_interceptor';
      }
      this.spawnUnit(typeId, sx, sz, rotY);
    }

    // Helicopter activation at 4★ and 5★
    this.helicopter.setActive(tier.chopper);
    if (tier.chopper || this.helicopter.crashing) {
      this.helicopter.update(dt, elapsed, player.x, player.z, combat, onPlayerHit, audio);
    }

    let anyUnitClose = false;
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (u.destroyed) {
        u.stepPhysics(dt, { throttle: 0, steer: 0 }, city, fx);
        continue;
      }
      const dist = Math.hypot(player.x - u.x, player.z - u.z);
      if (dist < 48) anyUnitClose = true;

      const leadX = player.vehicle ? player.x + player.vehicle.vx * 0.4 : player.x;
      const leadZ = player.vehicle ? player.z + player.vehicle.vz * 0.4 : player.z;
      const desiredRot = Math.atan2(leadX - u.x, leadZ - u.z);
      const diff = Math.atan2(Math.sin(desiredRot - u.rotY), Math.cos(desiredRot - u.rotY));
      const steer = Math.max(-1, Math.min(1, diff * 2.1));
      const throttle = dist > 7 ? (Math.abs(diff) > 1.2 ? 0.35 : 0.92) : 0.15;
      u.stepPhysics(dt, { throttle, steer }, city, fx);

      if (player.vehicle && dist < 4.1) {
        const pushX = (player.vehicle.x - u.x) / Math.max(0.5, dist);
        const pushZ = (player.vehicle.z - u.z) / Math.max(0.5, dist);
        player.vehicle.vx += pushX * 8 * dt;
        player.vehicle.vz += pushZ * 8 * dt;
        if (u.speed > 18 && fx) fx.spawnSparks((u.x + player.x) * 0.5, 0.9, (u.z + player.z) * 0.5, 4);
      }
    }

    if (!anyUnitClose && (!tier.chopper || !this.helicopter.active)) {
      this.cooldownTimer -= dt * (this.jammerTimer > 0 ? 2.2 : 1);
      if (this.cooldownTimer <= 0) {
        this.stars = Math.max(0, this.stars - 1);
        this.heat = this.stars * 95;
        this.cooldownTimer = this.stars > 0 ? 12 : 0;
        if (this.stars === 0) this.clearAllUnits();
      }
    } else if (this.jammerTimer > 0) {
      this.cooldownTimer -= dt * 1.4;
    }
  }
}
