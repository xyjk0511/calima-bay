// 5-Star CBPD Tactical Dispatch: escalating cruisers, PIT pursuit, highway roadblocks,
// SWAT armored enforcers, CALIMA-1 Air One helicopter spotlight pursuit, and evasion timer.

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
  }

  spawnRoadblockAt(x, z, rotY = 0) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xff9a3c, roughness: 0.5 });
    const stripe = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffd166,
      emissiveIntensity: 0.65,
    });
    for (const offset of [-4.5, 0, 4.5]) {
      const g = new THREE.Group();
      const bx = x + Math.cos(rotY) * offset;
      const bz = z - Math.sin(rotY) * offset;
      g.position.set(bx, 0.55, bz);
      g.rotation.y = rotY;
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 0.65), mat);
      body.castShadow = true;
      g.add(body);
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.25, 0.7), stripe);
      top.position.y = 0.22;
      g.add(top);
      this.scene.add(g);
      this.barricades.push(g);
    }
  }

  spawnUnit(typeId, x, z, rotY) {
    const unit = new Vehicle(this.scene, typeId, x, z, rotY);
    unit.driver = 'police';
    unit.sirenOn = true;
    this.units.push(unit);
    return unit;
  }

  update(dt, elapsed, city, player, combat, fx, onPlayerHit) {
    if (this.jammerTimer > 0) this.jammerTimer = Math.max(0, this.jammerTimer - dt);

    if (this.stars === 0) {
      this.helicopter.setActive(false);
      return;
    }

    const tier = this.tier;
    const desiredCount = tier.maxCruisers + tier.interceptors + tier.swat;

    // Clean up far or long-destroyed units
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      const dist = Math.hypot(u.x - player.x, u.z - player.z);
      if (dist > 220) {
        this.scene.remove(u.group);
        this.units.splice(i, 1);
      }
    }

    // Spawn tactical reinforcements up to tier cap
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
    if (tier.chopper) {
      this.helicopter.update(dt, elapsed, player.x, player.z, combat, onPlayerHit);
    }

    // Pursuit steering & PIT aggression
    let anyUnitClose = false;
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (u.destroyed) {
        u.stepPhysics(dt, { throttle: 0, steer: 0 }, city, fx);
        continue;
      }
      const dist = Math.hypot(player.x - u.x, player.z - u.z);
      if (dist < 48) anyUnitClose = true;

      // Predict slightly ahead of moving player for PIT intercept
      const leadX = player.vehicle ? player.x + player.vehicle.vx * 0.4 : player.x;
      const leadZ = player.vehicle ? player.z + player.vehicle.vz * 0.4 : player.z;
      const desiredRot = Math.atan2(leadX - u.x, leadZ - u.z);
      const diff = Math.atan2(Math.sin(desiredRot - u.rotY), Math.cos(desiredRot - u.rotY));
      const steer = Math.max(-1, Math.min(1, diff * 2.1));
      const throttle = dist > 7 ? (Math.abs(diff) > 1.2 ? 0.35 : 0.92) : 0.15;
      u.stepPhysics(dt, { throttle, steer }, city, fx);

      // Ram collision with player vehicle
      if (player.vehicle && dist < 4.1) {
        const pushX = (player.vehicle.x - u.x) / Math.max(0.5, dist);
        const pushZ = (player.vehicle.z - u.z) / Math.max(0.5, dist);
        player.vehicle.vx += pushX * 8 * dt;
        player.vehicle.vz += pushZ * 8 * dt;
        if (u.speed > 18 && fx) fx.spawnSparks((u.x + player.x) * 0.5, 0.9, (u.z + player.z) * 0.5, 4);
      }
    }

    // Line-of-sight escape cooldown when out of sight
    if (!anyUnitClose && !tier.chopper) {
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
