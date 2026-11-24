// Visceral Combat & FX Engine for Calima Bay: Sunset Syndicate.
// True 3D camera center ray aiming (zero parallax miss), full-world lethality (enemies,
// pedestrians, vehicles, destructible CALIMA-1 helicopter), headshot 2x bonus, drive-by shooting,
// bouncing physical arc grenades, hit bursts, tracers, muzzle flashes, shockwaves & drift skid marks.

import * as THREE from 'three';

const sphereGeo = new THREE.SphereGeometry(0.42, 7, 6);
const sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.32);
const hitChunkGeo = new THREE.SphereGeometry(0.16, 6, 5);
const skidGeo = new THREE.PlaneGeometry(0.44, 1.35);
const grenadeGeo = new THREE.SphereGeometry(0.22, 10, 8);
const grenadeLedGeo = new THREE.SphereGeometry(0.09, 6, 6);

const grenadeMat = new THREE.MeshStandardMaterial({
  color: 0x263142,
  metalness: 0.72,
  roughness: 0.3,
});

function raySphereDist(rayOrigin, rayDir, center, radius) {
  const ox = center.x - rayOrigin.x;
  const oy = center.y - rayOrigin.y;
  const oz = center.z - rayOrigin.z;
  const t = ox * rayDir.x + oy * rayDir.y + oz * rayDir.z;
  if (t < 0.25) return -1;
  const dx = ox - rayDir.x * t;
  const dy = oy - rayDir.y * t;
  const dz = oz - rayDir.z * t;
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 > radius * radius) return -1;
  return Math.max(0.25, t - Math.sqrt(radius * radius - d2));
}

export class CombatAndFX {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.tracers = [];
    this.shockwaves = [];
    this.muzzleLights = [];
    this.skidMarks = [];
    this.grenades = [];
    this._raycaster = new THREE.Raycaster();
    this._centerNDC = new THREE.Vector2(0, 0);
  }

  spawnSmoke(x, y, z, colorHex = 0xe8eef8, scale = 0.8) {
    if (this.particles.length > 260) return;
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const m = new THREE.Mesh(sphereGeo, mat);
    m.position.set(x, y, z);
    m.scale.setScalar(scale);
    this.scene.add(m);
    this.particles.push({
      mesh: m,
      vx: (Math.random() - 0.5) * 1.6,
      vy: 1.6 + Math.random() * 1.8,
      vz: (Math.random() - 0.5) * 1.6,
      grow: 1.4,
      life: 0.9 + Math.random() * 0.5,
      maxLife: 1.2,
    });
  }

  spawnFire(x, y, z, scale = 0.75) {
    if (this.particles.length > 260) return;
    const col = Math.random() < 0.5 ? 0xff7b24 : 0xffd166;
    const mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const m = new THREE.Mesh(sphereGeo, mat);
    m.position.set(x, y, z);
    m.scale.setScalar(scale);
    this.scene.add(m);
    this.particles.push({
      mesh: m,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 2.8 + Math.random() * 2.2,
      vz: (Math.random() - 0.5) * 1.4,
      grow: -0.45,
      life: 0.45 + Math.random() * 0.25,
      maxLife: 0.65,
    });
  }

  spawnSparks(x, y, z, count = 8) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 280) break;
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xffe49e : 0xff7a33,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const m = new THREE.Mesh(sparkGeo, mat);
      m.position.set(x, y, z);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 14,
        vy: 3 + Math.random() * 9,
        vz: (Math.random() - 0.5) * 14,
        gravity: 22,
        grow: -0.3,
        life: 0.32 + Math.random() * 0.2,
        maxLife: 0.5,
      });
    }
  }

  spawnHitBurst(x, y, z, isKill = false) {
    const count = isKill ? 14 : 7;
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 280) break;
      const col = i % 3 === 0 ? 0xff9a3c : i % 2 === 0 ? 0xff2948 : 0xd91636;
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const m = new THREE.Mesh(hitChunkGeo, mat);
      m.position.set(x, y, z);
      m.scale.setScalar(isKill ? 1.15 : 0.8);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 8.5,
        vy: 2.2 + Math.random() * 5.2,
        vz: (Math.random() - 0.5) * 8.5,
        gravity: 19,
        grow: -0.5,
        life: 0.38 + Math.random() * 0.22,
        maxLife: 0.55,
      });
    }
  }

  spawnSkidMark(x, y, z, rotY, opacity = 0.42) {
    if (this.skidMarks.length >= 160) {
      const old = this.skidMarks.shift();
      this.scene.remove(old.mesh);
      old.mesh.material.dispose();
    }
    const mat = new THREE.MeshBasicMaterial({
      color: 0x0b0c12,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const m = new THREE.Mesh(skidGeo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.position.set(x, y, z);
    this.scene.add(m);
    this.skidMarks.push({ mesh: m, life: 14.0, maxLife: 14.0, baseOpacity: opacity });
  }

  spawnMuzzleFlash(x, y, z, colorHex = 0xffd166) {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 8, 8),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    flash.position.set(x, y, z);
    this.scene.add(flash);
    const light = new THREE.PointLight(colorHex, 5.5, 16);
    light.position.set(x, y, z);
    this.scene.add(light);
    this.muzzleLights.push({ flash, light, life: 0.08 });
  }

  spawnTracer(x1, y1, z1, x2, y2, z2, colorHex = 0xffd166, ttl = 0.14) {
    const p1 = new THREE.Vector3(x1, y1, z1);
    const p2 = new THREE.Vector3(x2, y2, z2);
    const dist = p1.distanceTo(p2);
    if (dist < 0.2) return;

    const geo = new THREE.CylinderGeometry(0.055, 0.055, dist, 6);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(p1).lerp(p2, 0.5);
    mesh.lookAt(p2);
    this.scene.add(mesh);
    this.tracers.push({ mesh, life: ttl, maxLife: ttl });
  }

  spawnExplosion(x, y, z, scale = 1.0) {
    for (let i = 0; i < 16; i++) {
      this.spawnFire(
        x + (Math.random() - 0.5) * 2.8 * scale,
        y + Math.random() * 1.9 * scale,
        z + (Math.random() - 0.5) * 2.8 * scale,
        1.15 * scale,
      );
    }
    for (let i = 0; i < 11; i++) {
      this.spawnSmoke(
        x + (Math.random() - 0.5) * 3.4 * scale,
        y + 1.2 + Math.random() * 1.6,
        z + (Math.random() - 0.5) * 3.4 * scale,
        0x222028,
        1.55 * scale,
      );
    }
    this.spawnSparks(x, y + 0.5, z, 18);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.4, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffa63d,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.24, z);
    this.scene.add(ring);
    this.shockwaves.push({ mesh: ring, life: 0.48, maxLife: 0.48, scale });
  }

  _getAimRay(player, camera) {
    if (camera) {
      camera.updateMatrixWorld();
      this._raycaster.setFromCamera(this._centerNDC, camera);
      return {
        origin: this._raycaster.ray.origin.clone(),
        dir: this._raycaster.ray.direction.clone().normalize(),
      };
    }
    const sinY = Math.sin(player.camYaw);
    const cosY = Math.cos(player.camYaw);
    return {
      origin: new THREE.Vector3(player.x, player.y + 1.5, player.z),
      dir: new THREE.Vector3(sinY, -Math.sin(player.camPitch) * 0.35, cosY).normalize(),
    };
  }

  throwGrenade(player, camera, traffic, police, audio, callbacks = {}) {
    if (player.dead || player.grenadeCooldown > 0) return false;
    const gWeapon = player.weapons.find((w) => w.id === 'grenade');
    if (!gWeapon || !gWeapon.owned || gWeapon.ammo <= 0) return false;

    gWeapon.ammo = Math.max(0, gWeapon.ammo - 1);
    player.grenadeCooldown = 0.85;
    player.fireCooldown = Math.max(player.fireCooldown, 0.45);
    if (audio) audio.playShot('baton');

    const ray = this._getAimRay(player, camera);
    const startX = player.x + ray.dir.x * 1.1;
    const startY = player.y + (player.vehicle ? 1.55 : 1.6);
    const startZ = player.z + ray.dir.z * 1.1;

    const group = new THREE.Group();
    const body = new THREE.Mesh(grenadeGeo, grenadeMat);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    const led = new THREE.Mesh(grenadeLedGeo, ledMat);
    led.position.y = 0.24;
    group.add(body, led);
    group.position.set(startX, startY, startZ);
    this.scene.add(group);

    const speed = 26;
    this.grenades.push({
      mesh: group,
      led,
      x: startX,
      y: startY,
      z: startZ,
      vx: ray.dir.x * speed + (player.vehicle ? player.vehicle.vx * 0.4 : 0),
      vy: Math.max(4.5, ray.dir.y * speed + 6.5),
      vz: ray.dir.z * speed + (player.vehicle ? player.vehicle.vz * 0.4 : 0),
      fuse: 0.68,
      bounced: false,
      smokeTimer: 0,
      player,
      traffic,
      police,
      audio,
      callbacks,
    });
    return true;
  }

  _detonateGrenade(g) {
    const { x, y, z, player, traffic, police, audio, callbacks } = g;
    const { onEnemyKilled, onCrime, onHitFeedback, onChopperDowned, onKillFeed } = callbacks || {};

    this.spawnExplosion(x, Math.max(0.6, y), z, 1.65);
    if (audio) audio.playExplosion();
    if (traffic) traffic.triggerPanicNear(x, z, 50);
    if (onCrime) onCrime(95);

    let anyKill = false;
    let anyHit = false;

    // Blast radius damage to enemies
    for (const e of traffic.enemies) {
      if (e.alive && Math.hypot(e.x - x, e.z - z) < 12.5) {
        e.health = 0;
        e.alive = false;
        e.rig.group.rotation.x = Math.PI / 2;
        e.rig.group.position.y = 0.24;
        traffic.spawnCashDrop(e.x, e.z, 110);
        this.spawnHitBurst(e.x, 1.1, e.z, true);
        if (onEnemyKilled) onEnemyKilled(e);
        anyKill = true;
        anyHit = true;
      }
    }

    // Blast radius damage to pedestrians
    for (const p of traffic.pedestrians) {
      if (p.alive && Math.hypot(p.x - x, p.z - z) < 12.5) {
        traffic.killPedestrian(p, this, onCrime, player, onKillFeed);
        anyKill = true;
        anyHit = true;
      }
    }

    // Blast radius damage & launch impulse to vehicles & CBPD cruisers
    for (const v of [...traffic.vehicles, ...police.units]) {
      const dist = Math.hypot(v.x - x, v.z - z);
      if (!v.destroyed && dist < 13.5) {
        v.applyDamage(185, this);
        const nx = (v.x - x) / Math.max(0.5, dist);
        const nz = (v.z - z) / Math.max(0.5, dist);
        v.vx += nx * 16;
        v.vz += nz * 16;
        v.vy = Math.max(v.vy, 7.5);
        anyHit = true;
      }
    }

    // Blast radius check against low-flying CALIMA-1
    if (police.helicopter && police.helicopter.active && !police.helicopter.crashing) {
      const hd = Math.hypot(police.helicopter.x - x, police.helicopter.y - y, police.helicopter.z - z);
      if (hd < 16) {
        const down = police.helicopter.applyDamage(180, this, audio, onChopperDowned);
        anyHit = true;
        if (down) anyKill = true;
      }
    }

    if (anyHit && onHitFeedback) {
      onHitFeedback({ hit: true, kill: anyKill, headshot: false });
      if (audio) audio.playHitConfirm(anyKill, false);
    }
  }

  firePlayerWeapon(player, camera, traffic, police, audio, callbacks = {}) {
    const { onEnemyKilled, onCrime, onHitFeedback, onChopperDowned, onKillFeed } = callbacks;
    if (player.fireCooldown > 0 || player.dead) return { fired: false };

    const isDriveBy = !!player.vehicle;
    const w = isDriveBy ? player.driveByWeapon : player.currentWeapon;
    if (!w) return { fired: false };

    // Handle explosive grenade slot via physical bouncing arc grenade
    if (w.explosive && !isDriveBy) {
      const thrown = this.throwGrenade(player, camera, traffic, police, audio, callbacks);
      return { fired: thrown, hit: false, kill: false };
    }

    if (!w.melee && w.ammo <= 0) return { fired: false };

    player.fireCooldown = w.fireRate;
    if (!w.melee) {
      w.ammo = Math.max(0, w.ammo - 1);
      player.addRecoil(w.id === 'shotgun' ? 0.055 : w.id === 'carbine' ? 0.022 : 0.016);
    }
    if (audio) audio.playShot(w.id);

    // Compute exact 3D Camera Center Ray
    const ray = this._getAimRay(player, camera);

    // Muzzle world position (gun barrel on foot, or driver window during drive-by)
    let ox;
    let oy;
    let oz;
    if (isDriveBy) {
      const v = player.vehicle;
      const sideX = Math.cos(v.rotY) * (v.spec.width * 0.52);
      const sideZ = -Math.sin(v.rotY) * (v.spec.width * 0.52);
      ox = v.x - sideX + ray.dir.x * 0.6;
      oy = v.y + v.spec.height * 0.92;
      oz = v.z - sideZ + ray.dir.z * 0.6;
    } else {
      const sinY = Math.sin(player.camYaw);
      const cosY = Math.cos(player.camYaw);
      const rightX = -cosY;
      const rightZ = sinY;
      ox = player.x + sinY * 0.95 + rightX * 0.34;
      oy = player.y + 1.48;
      oz = player.z + cosY * 0.95 + rightZ * 0.34;
    }

    if (!w.melee) {
      this.spawnMuzzleFlash(ox, oy, oz, w.tracerColor);
      traffic.triggerPanicNear(player.x, player.z, 42);
    }

    const allVehicles = [...traffic.vehicles, ...police.units];
    const tmpCenter = new THREE.Vector3();
    const tmpDir = new THREE.Vector3();

    let anyHit = false;
    let anyKill = false;
    let anyHeadshot = false;

    for (let p = 0; p < w.pellets; p++) {
      // Apply weapon spread around the exact 3D camera ray direction
      const spreadScale = player.aiming ? w.spread * 0.45 : w.spread;
      tmpDir.copy(ray.dir);
      if (spreadScale > 0) {
        tmpDir.x += (Math.random() - 0.5) * spreadScale * 1.4;
        tmpDir.y += (Math.random() - 0.5) * spreadScale * 1.1;
        tmpDir.z += (Math.random() - 0.5) * spreadScale * 1.4;
        tmpDir.normalize();
      }

      // Max distance along camera ray (add camera-to-player distance so range matches player range)
      const camToPlayer = Math.hypot(
        ray.origin.x - player.x,
        ray.origin.y - (player.y + 1.4),
        ray.origin.z - player.z,
      );
      let bestDist = w.range + camToPlayer;
      let hitType = null;
      let hitObj = null;
      let isHeadshot = false;
      const hitPoint = new THREE.Vector3();

      // 1. Test hostile Vargas Cartel & CBPD foot enemies (generous 1.45m torso + 0.25m head bonus!)
      for (const e of traffic.enemies) {
        if (!e.alive) continue;
        const pDist = Math.hypot(e.x - player.x, e.z - player.z);
        if (pDist > w.range + 1.5) continue;

        // Check headshot sphere first
        tmpCenter.set(e.x, (e.rig.group.position.y || 0.05) + 1.82, e.z);
        const headT = raySphereDist(ray.origin, tmpDir, tmpCenter, 0.52);
        if (headT > 0 && headT < bestDist) {
          bestDist = headT;
          hitType = 'enemy';
          hitObj = e;
          isHeadshot = true;
          hitPoint.copy(ray.origin).addScaledVector(tmpDir, headT);
          continue;
        }
        // Forgiving torso sphere
        tmpCenter.set(e.x, (e.rig.group.position.y || 0.05) + 1.15, e.z);
        const bodyT = raySphereDist(ray.origin, tmpDir, tmpCenter, 1.45);
        if (bodyT > 0 && bodyT < bestDist) {
          bestDist = bodyT;
          hitType = 'enemy';
          hitObj = e;
          isHeadshot = false;
          hitPoint.copy(ray.origin).addScaledVector(tmpDir, bodyT);
        }
      }

      // 2. Test ALL civilian pedestrians (full-world lethality!)
      for (const ped of traffic.pedestrians) {
        if (!ped.alive) continue;
        const pDist = Math.hypot(ped.x - player.x, ped.z - player.z);
        if (pDist > w.range + 1.5) continue;

        tmpCenter.set(ped.x, (ped.rig.group.position.y || 0.05) + 1.82, ped.z);
        const headT = raySphereDist(ray.origin, tmpDir, tmpCenter, 0.52);
        if (headT > 0 && headT < bestDist) {
          bestDist = headT;
          hitType = 'pedestrian';
          hitObj = ped;
          isHeadshot = true;
          hitPoint.copy(ray.origin).addScaledVector(tmpDir, headT);
          continue;
        }

        tmpCenter.set(ped.x, (ped.rig.group.position.y || 0.05) + 1.15, ped.z);
        const bodyT = raySphereDist(ray.origin, tmpDir, tmpCenter, 1.45);
        if (bodyT > 0 && bodyT < bestDist) {
          bestDist = bodyT;
          hitType = 'pedestrian';
          hitObj = ped;
          isHeadshot = false;
          hitPoint.copy(ray.origin).addScaledVector(tmpDir, bodyT);
        }
      }

      // 3. Test CALIMA-1 Police Helicopter (shootable out of the sky!)
      if (police.helicopter && police.helicopter.active && !police.helicopter.crashing) {
        const h = police.helicopter;
        const hDist = Math.hypot(h.x - player.x, h.y - player.y, h.z - player.z);
        if (hDist <= w.range + 35) {
          tmpCenter.set(h.x, h.y, h.z);
          const heliT = raySphereDist(ray.origin, tmpDir, tmpCenter, 4.6);
          if (heliT > 0 && heliT < bestDist) {
            bestDist = heliT;
            hitType = 'helicopter';
            hitObj = h;
            isHeadshot = false;
            hitPoint.copy(ray.origin).addScaledVector(tmpDir, heliT);
          }
        }
      }

      // 4. Test civilian & police vehicles
      for (const v of allVehicles) {
        if (v === player.vehicle) continue;
        const vDist = Math.hypot(v.x - player.x, v.z - player.z);
        if (vDist > w.range + 2) continue;
        const radius = Math.max(v.spec.width, v.spec.length) * 0.52;
        tmpCenter.set(v.x, v.y + v.spec.height * 0.55, v.z);
        const vehT = raySphereDist(ray.origin, tmpDir, tmpCenter, radius);
        if (vehT > 0 && vehT < bestDist) {
          bestDist = vehT;
          hitType = 'vehicle';
          hitObj = v;
          isHeadshot = false;
          hitPoint.copy(ray.origin).addScaledVector(tmpDir, vehT);
        }
      }

      // Default world impact point along camera ray if nothing hit
      if (!hitType) {
        hitPoint.copy(ray.origin).addScaledVector(tmpDir, bestDist);
        if (hitPoint.y < 0.08 && tmpDir.y < -0.005) {
          const groundT = (0.08 - ray.origin.y) / tmpDir.y;
          if (groundT > 0.5 && groundT < bestDist) {
            hitPoint.copy(ray.origin).addScaledVector(tmpDir, groundT);
          }
        }
      }

      // Spawn crisp 3D tracer from muzzle straight to aimed 3D point
      if (!w.melee) {
        this.spawnTracer(ox, oy, oz, hitPoint.x, hitPoint.y, hitPoint.z, w.tracerColor);
      }

      // Apply damage & feedback
      const dmg = isHeadshot ? w.damage * 2 : w.damage;

      if (hitType === 'enemy' && hitObj.alive) {
        anyHit = true;
        if (isHeadshot) anyHeadshot = true;
        hitObj.health -= dmg;
        this.spawnHitBurst(hitPoint.x, hitPoint.y, hitPoint.z, hitObj.health <= 0);
        if (hitObj.health <= 0) {
          hitObj.alive = false;
          hitObj.rig.group.rotation.x = Math.PI / 2;
          hitObj.rig.group.position.y = 0.24;
          anyKill = true;
          const dropAmt = 65 + Math.floor(Math.random() * 85);
          traffic.spawnCashDrop(hitObj.x, hitObj.z, dropAmt);
          if (onEnemyKilled) onEnemyKilled(hitObj, isHeadshot);
          if (onCrime) onCrime(hitObj.faction === 'cbpd' ? 85 : 35);
          if (onKillFeed) {
            const reward = hitObj.faction === 'cbpd' ? 180 : 320;
            onKillFeed(
              `${isHeadshot ? 'HEADSHOT' : '+1 TAKEDOWN'} · +$${reward}`,
              isHeadshot ? 'headshot' : 'kill',
            );
          }
        }
      } else if (hitType === 'pedestrian' && hitObj.alive) {
        anyHit = true;
        if (isHeadshot) anyHeadshot = true;
        hitObj.health -= dmg;
        hitObj.panicTimer = 8.0;
        this.spawnHitBurst(hitPoint.x, hitPoint.y, hitPoint.z, hitObj.health <= 0);
        if (hitObj.health <= 0) {
          anyKill = true;
          traffic.killPedestrian(hitObj, this, onCrime, player, onKillFeed);
        } else if (onCrime) {
          onCrime(18);
        }
      } else if (hitType === 'helicopter') {
        anyHit = true;
        const downed = hitObj.applyDamage(dmg, this, audio, onChopperDowned);
        if (downed) {
          anyKill = true;
          if (onCrime) onCrime(120);
        }
      } else if (hitType === 'vehicle') {
        anyHit = true;
        const wasDestroyed = hitObj.destroyed;
        hitObj.applyDamage(dmg * 0.9, this);
        this.spawnSparks(hitPoint.x, hitPoint.y, hitPoint.z, 7);
        if (!wasDestroyed && hitObj.destroyed) {
          anyKill = true;
          if (audio) audio.playExplosion();
          if (onKillFeed) onKillFeed('VEHICLE DESTROYED · +$250', 'kill');
          player.cash += 250;
        }
        if (hitObj.isPolice && onCrime) onCrime(55);
      }
    }

    if (anyHit) {
      if (audio) audio.playHitConfirm(anyKill, anyHeadshot);
      if (onHitFeedback) onHitFeedback({ hit: true, kill: anyKill, headshot: anyHeadshot });
    }

    return { fired: true, hit: anyHit, kill: anyKill, headshot: anyHeadshot };
  }

  update(dt, city = null) {
    // Update physical bouncing grenades
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.fuse -= dt;
      g.vy -= 26 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.z += g.vz * dt;

      const groundY = city ? city.getGroundHeight(g.x, g.z) : 0.05;
      if (g.y <= groundY + 0.22) {
        g.y = groundY + 0.22;
        if (!g.bounced && Math.abs(g.vy) > 2.5) {
          g.bounced = true;
          g.vy = Math.abs(g.vy) * 0.42;
          g.vx *= 0.62;
          g.vz *= 0.62;
          if (g.audio) g.audio.playGrenadeBounce();
        } else {
          g.vy = 0;
          g.vx *= 0.7;
          g.vz *= 0.7;
        }
      }

      if (city) {
        const col = city.resolveCircleCollision(g.x, g.z, 0.35);
        if (col.hit) {
          g.x = col.x;
          g.z = col.z;
          g.vx *= -0.45;
          g.vz *= -0.45;
        }
      }

      // Direct impact check on vehicles or enemies triggers instant detonation!
      let directHit = false;
      if (g.traffic) {
        for (const e of g.traffic.enemies) {
          if (e.alive && Math.hypot(e.x - g.x, e.z - g.z) < 1.35 && g.y < 2.2) {
            directHit = true;
            break;
          }
        }
        if (!directHit) {
          for (const v of [...g.traffic.vehicles, ...(g.police?.units || [])]) {
            if (v === g.player?.vehicle) continue;
            if (!v.destroyed && Math.hypot(v.x - g.x, v.z - g.z) < 2.2 && g.y < 2.1) {
              directHit = true;
              break;
            }
          }
        }
      }

      g.mesh.position.set(g.x, g.y, g.z);
      g.mesh.rotation.x += dt * 10;
      g.mesh.rotation.z += dt * 8;
      g.led.visible = Math.floor(g.fuse * 20) % 2 === 0;

      g.smokeTimer -= dt;
      if (g.smokeTimer <= 0) {
        g.smokeTimer = 0.04;
        this.spawnSmoke(g.x, g.y, g.z, 0xffd1b8, 0.36);
      }

      if (g.fuse <= 0 || directHit) {
        this.scene.remove(g.mesh);
        g.led.material.dispose();
        this.grenades.splice(i, 1);
        this._detonateGrenade(g);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      if (p.gravity) p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const s = Math.max(0.05, p.mesh.scale.x + p.grow * dt);
      p.mesh.scale.setScalar(s);
      p.mesh.material.opacity = Math.max(0, (p.life / p.maxLife) * 0.85);
    }

    // Update bullet tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mesh.material.dispose();
        this.tracers.splice(i, 1);
      } else {
        t.mesh.material.opacity = t.life / t.maxLife;
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
      } else {
        const prog = 1 - sw.life / sw.maxLife;
        sw.mesh.scale.setScalar((1 + prog * 11) * sw.scale);
        sw.mesh.material.opacity = (1 - prog) * 0.85;
      }
    }

    // Update muzzle flashes
    for (let i = this.muzzleLights.length - 1; i >= 0; i--) {
      const ml = this.muzzleLights[i];
      ml.life -= dt;
      if (ml.life <= 0) {
        this.scene.remove(ml.flash);
        this.scene.remove(ml.light);
        ml.flash.geometry.dispose();
        ml.flash.material.dispose();
        this.muzzleLights.splice(i, 1);
      }
    }

    // Fade persistent drift skid marks gradually
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const sk = this.skidMarks[i];
      sk.life -= dt;
      if (sk.life <= 0) {
        this.scene.remove(sk.mesh);
        sk.mesh.material.dispose();
        this.skidMarks.splice(i, 1);
      } else if (sk.life < 4.0) {
        sk.mesh.material.opacity = sk.baseOpacity * (sk.life / 4.0);
      }
    }
  }
}
