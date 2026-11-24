// Living Calima Bay AI: autonomous lane-following civilian traffic, killable & reacting pedestrians
// on sidewalks & Palma Boardwalk, glowing collectible Cash Bundles, and hostile Vargas Cartel enforcers.

import * as THREE from 'three';
import { WORLD } from './config.js';
import { Vehicle } from './vehicles.js';
import { buildHumanoidMesh } from './player.js';

const CIV_TYPES = ['sunset_gt', 'palma_coupe', 'coral_cabrio', 'bay_taxi', 'mesa_suv'];
const PED_JACKETS = [0xff6b8b, 0x2cf2e8, 0xffd166, 0x4df0a9, 0xf8fafc, 0xff9a3c, 0xa78bfa];

const cashStackGeo = new THREE.BoxGeometry(0.68, 0.24, 0.38);
const cashBandGeo = new THREE.BoxGeometry(0.18, 0.26, 0.4);
const cashRingGeo = new THREE.RingGeometry(0.55, 0.82, 18);
const cashMat = new THREE.MeshStandardMaterial({
  color: 0x39e58c,
  emissive: 0x1fbf6b,
  emissiveIntensity: 0.9,
  roughness: 0.35,
});
const bandMat = new THREE.MeshStandardMaterial({
  color: 0xffd166,
  emissive: 0xffb703,
  emissiveIntensity: 0.7,
});

export class TrafficAndNPCManager {
  constructor(scene) {
    this.scene = scene;
    this.vehicles = [];
    this.pedestrians = [];
    this.enemies = [];
    this.pickups = [];
    this.pedestriansKilled = 0;
    this._spawnInitialTraffic();
    this._spawnInitialPedestrians();
    this._spawnInitialCartelPatrol();
  }

  _spawnInitialTraffic() {
    const lanes = [];
    for (const ax of WORLD.avenuesX) {
      lanes.push({ axis: 'z', fixed: ax + 4.2, dir: 1 });
      lanes.push({ axis: 'z', fixed: ax - 4.2, dir: -1 });
    }
    for (const sz of WORLD.streetsZ) {
      lanes.push({ axis: 'x', fixed: sz + 4.2, dir: 1 });
      lanes.push({ axis: 'x', fixed: sz - 4.2, dir: -1 });
    }

    for (let i = 0; i < 24; i++) {
      const lane = lanes[i % lanes.length];
      const pos =
        lane.axis === 'z'
          ? -175 + ((i * 67) % 340)
          : -190 + ((i * 67) % 270);
      const x = lane.axis === 'z' ? lane.fixed : pos;
      const z = lane.axis === 'z' ? pos : lane.fixed;
      const rotY =
        lane.axis === 'z'
          ? lane.dir > 0
            ? 0
            : Math.PI
          : lane.dir > 0
            ? Math.PI / 2
            : -Math.PI / 2;
      const type = CIV_TYPES[i % CIV_TYPES.length];
      const veh = new Vehicle(this.scene, type, x, z, rotY);
      veh.driver = 'npc';
      veh.ai = {
        axis: lane.axis,
        dir: lane.dir,
        fixed: lane.fixed,
        cruiseSpeed: 13 + (i % 5) * 2.2,
      };
      this.vehicles.push(veh);
    }

    // Signature hero Sunset GT parked right near Rico's Palma Strip starting point
    const heroCar = new Vehicle(this.scene, 'sunset_gt', 88, -36, 0, 0xff3b5c);
    heroCar.driver = null;
    this.vehicles.push(heroCar);
  }

  _spawnInitialPedestrians() {
    for (let i = 0; i < 38; i++) {
      const onBoardwalk = i < 14;
      let x = onBoardwalk
        ? 107 + (i % 3) * 1.8
        : WORLD.avenuesX[i % WORLD.avenuesX.length] + (i % 2 === 0 ? 11.2 : -11.2);
      let z = -170 + ((i * 29) % 340);
      // Place 3 lively pedestrians right along Rico's Palma Strip starting sidewalk for immediate world feel
      if (i === 35) { x = 77.5; z = -15; }
      if (i === 36) { x = 98.5; z = -22; }
      if (i === 37) { x = 77.5; z = -31; }

      const rig = buildHumanoidMesh({
        jacket: PED_JACKETS[i % PED_JACKETS.length],
        shirt: 0xfff8f0,
        pants: i % 2 === 0 ? 0x26324d : 0xd4c5a9,
        armed: false,
      });
      rig.group.position.set(x, 0.05, z);
      this.scene.add(rig.group);
      this.pedestrians.push({
        x,
        z,
        rotY: i % 2 === 0 ? 0 : Math.PI,
        speed: 2.3 + (i % 4) * 0.4,
        panicTimer: 0,
        alive: true,
        health: 40,
        maxHealth: 40,
        phase: i * 1.1,
        rig,
      });
    }
  }

  _spawnInitialCartelPatrol() {
    // Immediate street action: Vargas Cartel crews right on the edge of Palma Strip & Solstice Plaza,
    // plus Barrio Coral, Puerto Azul Docks, and Cayo Brisa Island!
    const spots = [
      // Palma Strip edge crew (seconds from start!)
      [74, -56],
      [69, -62],
      [77, -66],
      // Solstice Plaza crew
      [8, -14],
      [-7, -22],
      [13, -28],
      // Barrio Coral & Puerto Azul Docks
      [-18, -184],
      [14, -192],
      [-56, -172],
      [-34, 152],
      [-58, 168],
      [274, 48],
    ];
    for (const [x, z] of spots) {
      this.spawnEnemy(x, z, 'vargas');
    }
  }

  spawnEnemy(x, z, faction = 'vargas', missionTag = null) {
    const isCop = faction === 'cbpd';
    const rig = buildHumanoidMesh({
      jacket: isCop ? 0x162242 : 0x7c1d3e,
      shirt: isCop ? 0x38bdf8 : 0xffd166,
      pants: 0x151824,
      shades: true,
      armed: true,
    });
    rig.group.position.set(x, 0.05, z);
    this.scene.add(rig.group);
    const enemy = {
      x,
      z,
      rotY: 0,
      health: isCop ? 75 : 80,
      maxHealth: isCop ? 75 : 80,
      alive: true,
      faction,
      missionTag,
      fireCooldown: 0.7 + Math.random() * 0.8,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      phase: Math.random() * 6,
      rig,
    };
    this.enemies.push(enemy);
    return enemy;
  }

  spawnCashDrop(x, z, amount = 85) {
    const g = new THREE.Group();
    const stack = new THREE.Mesh(cashStackGeo, cashMat);
    stack.position.y = 0.45;
    const band = new THREE.Mesh(cashBandGeo, bandMat);
    band.position.y = 0.45;
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4df0a9,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(cashRingGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    g.add(stack, band, ring);
    g.position.set(x, 0.05, z);
    this.scene.add(g);
    this.pickups.push({
      x,
      z,
      amount,
      mesh: g,
      stack,
      band,
      ring,
      life: 45,
      phase: Math.random() * Math.PI * 2,
    });
    return g;
  }

  killPedestrian(p, combat, onCrime, player, onKillFeed) {
    if (!p || !p.alive) return false;
    p.alive = false;
    p.health = 0;
    p.rig.group.rotation.x = Math.PI / 2;
    p.rig.group.position.y = 0.22;
    this.pedestriansKilled += 1;
    if (player) {
      player.stats.pedestriansKilled = (player.stats.pedestriansKilled || 0) + 1;
      player.stats.takedowns += 1;
    }
    const dropAmt = 45 + Math.floor(Math.random() * 96); // $45-$140
    this.spawnCashDrop(p.x, p.z, dropAmt);
    if (combat && combat.spawnHitBurst) {
      combat.spawnHitBurst(p.x, 1.1, p.z, true);
    }
    this.triggerPanicNear(p.x, p.z, 34);
    if (onCrime) onCrime(44);
    if (onKillFeed) {
      onKillFeed(`CIVILIAN DOWN · DROPPED $${dropAmt}`, 'kill');
    }
    return true;
  }

  triggerPanicNear(x, z, radius = 38) {
    for (const p of this.pedestrians) {
      if (!p.alive) continue;
      const dist = Math.hypot(p.x - x, p.z - z);
      if (dist < radius) {
        p.panicTimer = 6.5;
        p.rotY = Math.atan2(p.x - x, p.z - z) + (Math.random() - 0.5) * 0.5;
      }
    }
  }

  findNearestVehicle(x, z, maxDist = 7.5) {
    let best = null;
    let bestD = maxDist;
    for (const v of this.vehicles) {
      if (v.destroyed) continue;
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  update(dt, city, player, combat, fx, onPlayerHit, hooks = {}) {
    const { audio, onCrime, onCashPickup, onEnemyKilled, onKillFeed } = hooks;

    // Update autonomous civilian vehicles
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.driver === 'player') continue;
      if (v.driver === 'npc' && v.ai && !v.destroyed) {
        let blocked = false;
        const fwdX = Math.sin(v.rotY);
        const fwdZ = Math.cos(v.rotY);
        const checkX = v.x + fwdX * 8;
        const checkZ = v.z + fwdZ * 8;
        if (Math.hypot(player.x - checkX, player.z - checkZ) < 6) blocked = true;
        if (!blocked) {
          for (let j = 0; j < this.vehicles.length; j++) {
            if (i === j) continue;
            const o = this.vehicles[j];
            if (Math.hypot(o.x - checkX, o.z - checkZ) < 6.2) {
              blocked = true;
              break;
            }
          }
        }
        const desiredSpeed = blocked ? 0 : v.ai.cruiseSpeed;
        const throttle = v.speed < desiredSpeed ? 0.65 : blocked ? -0.8 : 0;
        const targetRot =
          v.ai.axis === 'z'
            ? v.ai.dir > 0
              ? 0
              : Math.PI
            : v.ai.dir > 0
              ? Math.PI / 2
              : -Math.PI / 2;
        const diff = Math.atan2(Math.sin(targetRot - v.rotY), Math.cos(targetRot - v.rotY));
        const steer = Math.max(-1, Math.min(1, diff * 2.2));
        v.stepPhysics(dt, { throttle, steer }, city, fx);

        if (v.ai.axis === 'z' && Math.abs(v.z) > 205) {
          v.z = -Math.sign(v.z) * 198;
          v.x = v.ai.fixed;
        } else if (v.ai.axis === 'x' && (v.x < -210 || v.x > 100)) {
          v.x = v.ai.dir > 0 ? -204 : 94;
          v.z = v.ai.fixed;
        }
      } else {
        v.stepPhysics(dt, { throttle: 0, steer: 0 }, city, fx);
      }
    }

    // Update pedestrians
    for (const p of this.pedestrians) {
      if (!p.alive) continue;
      if (p.panicTimer > 0) p.panicTimer = Math.max(0, p.panicTimer - dt);
      const spd = p.panicTimer > 0 ? 7.2 : p.speed;
      p.x += Math.sin(p.rotY) * spd * dt;
      p.z += Math.cos(p.rotY) * spd * dt;
      if (Math.abs(p.z) > 195 || p.x < -220 || p.x > 136) {
        p.rotY += Math.PI;
      }
      const col = city.resolveCircleCollision(p.x, p.z, 0.5);
      if (col.hit) {
        p.x = col.x;
        p.z = col.z;
        p.rotY += Math.PI * 0.65;
      }

      // Vehicle hit check (now awards cash drop + escalates CBPD heat!)
      if (player.vehicle && player.vehicle.speed > 9) {
        if (Math.hypot(player.vehicle.x - p.x, player.vehicle.z - p.z) < 2.5) {
          this.killPedestrian(p, combat, onCrime, player, onKillFeed);
          if (audio) audio.playHitConfirm(true, false);
          continue;
        }
      }

      p.phase += dt * (p.panicTimer > 0 ? 14 : 6.5);
      const sw = Math.sin(p.phase) * 0.55;
      p.rig.leftLeg.rotation.x = sw;
      p.rig.rightLeg.rotation.x = -sw;
      p.rig.leftArm.rotation.x = p.panicTimer > 0 ? -2.4 : -sw * 0.6;
      p.rig.rightArm.rotation.x = p.panicTimer > 0 ? -2.4 : sw * 0.6;
      p.rig.group.position.set(p.x, city.getGroundHeight(p.x, p.z), p.z);
      p.rig.group.rotation.y = p.rotY;
    }

    // Update hostile Vargas Cartel & CBPD foot units
    for (const e of this.enemies) {
      if (!e.alive) continue;

      // Vehicle run-over check for enemies too!
      if (player.vehicle && player.vehicle.speed > 10) {
        if (Math.hypot(player.vehicle.x - e.x, player.vehicle.z - e.z) < 2.4) {
          e.health = 0;
          e.alive = false;
          e.rig.group.rotation.x = Math.PI / 2;
          e.rig.group.position.y = 0.24;
          this.spawnCashDrop(e.x, e.z, 95);
          if (combat && combat.spawnHitBurst) combat.spawnHitBurst(e.x, 1.1, e.z, true);
          if (audio) audio.playHitConfirm(true, false);
          if (onEnemyKilled) onEnemyKilled(e);
          if (onCrime) onCrime(e.faction === 'cbpd' ? 85 : 35);
          continue;
        }
      }

      const dist = Math.hypot(player.x - e.x, player.z - e.z);
      if (dist < 62 && !player.dead) {
        e.rotY = Math.atan2(player.x - e.x, player.z - e.z);
        const moveAngle = dist > 26 ? e.rotY : e.rotY + (Math.PI / 2) * e.strafeDir;
        e.x += Math.sin(moveAngle) * 3.8 * dt;
        e.z += Math.cos(moveAngle) * 3.8 * dt;
        const col = city.resolveCircleCollision(e.x, e.z, 0.6);
        e.x = col.x;
        e.z = col.z;

        e.phase += dt * 7.5;
        e.rig.leftLeg.rotation.x = Math.sin(e.phase) * 0.45;
        e.rig.rightLeg.rotation.x = -Math.sin(e.phase) * 0.45;
        e.rig.rightArm.rotation.x = -Math.PI * 0.46;

        e.fireCooldown -= dt;
        if (e.fireCooldown <= 0 && dist < 50 && combat) {
          e.fireCooldown = e.faction === 'cbpd' ? 0.95 : 1.15;
          const spread = (Math.random() - 0.5) * 3.2;
          const tx = player.x + spread;
          const tz = player.z + (Math.random() - 0.5) * 3.2;
          combat.spawnTracer(
            e.x,
            1.45,
            e.z,
            tx,
            player.vehicle ? 1.1 : 1.3,
            tz,
            e.faction === 'cbpd' ? 0x5cc8ff : 0xff5e6c,
          );
          if (Math.hypot(tx - player.x, tz - player.z) < 2.2 && onPlayerHit) {
            onPlayerHit(e.faction === 'cbpd' ? 7 : 6);
          }
        }
      }
      e.rig.group.position.set(e.x, city.getGroundHeight(e.x, e.z), e.z);
      e.rig.group.rotation.y = e.rotY;
    }

    // Update & auto-collect spinning Cash Bundle drops
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.life -= dt;
      pk.phase += dt * 3.2;
      pk.stack.rotation.y = pk.phase;
      pk.band.rotation.y = pk.phase;
      const bob = 0.48 + Math.sin(pk.phase * 1.4) * 0.14;
      pk.stack.position.y = bob;
      pk.band.position.y = bob;
      const sc = 1 + Math.sin(pk.phase * 2) * 0.12;
      pk.ring.scale.set(sc, sc, 1);

      const collectDist = player.vehicle ? 4.4 : 2.8;
      const d = Math.hypot(player.x - pk.x, player.z - pk.z);
      if (d < collectDist && !player.dead) {
        player.cash += pk.amount;
        if (audio) audio.playCashPickup();
        if (onCashPickup) onCashPickup(pk.amount);
        this.scene.remove(pk.mesh);
        pk.ring.material.dispose();
        this.pickups.splice(i, 1);
        continue;
      }

      if (pk.life <= 0) {
        this.scene.remove(pk.mesh);
        pk.ring.material.dispose();
        this.pickups.splice(i, 1);
      }
    }
  }
}
