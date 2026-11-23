// Combat ballistics, 6-weapon firing, glowing 3D bullet tracers, muzzle flashes,
// grenade explosions with shockwaves, and dynamic smoke/fire/spark particle system.

import * as THREE from 'three';

const sphereGeo = new THREE.SphereGeometry(0.42, 7, 6);
const sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.32);

export class CombatAndFX {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.tracers = [];
    this.shockwaves = [];
    this.muzzleLights = [];
  }

  spawnSmoke(x, y, z, colorHex = 0xe8eef8, scale = 0.8) {
    if (this.particles.length > 220) return;
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
    if (this.particles.length > 220) return;
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
      if (this.particles.length > 240) break;
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
    for (let i = 0; i < 14; i++) {
      this.spawnFire(
        x + (Math.random() - 0.5) * 2.6 * scale,
        y + Math.random() * 1.8 * scale,
        z + (Math.random() - 0.5) * 2.6 * scale,
        1.1 * scale,
      );
    }
    for (let i = 0; i < 10; i++) {
      this.spawnSmoke(
        x + (Math.random() - 0.5) * 3.2 * scale,
        y + 1.2 + Math.random() * 1.5,
        z + (Math.random() - 0.5) * 3.2 * scale,
        0x222028,
        1.5 * scale,
      );
    }
    this.spawnSparks(x, y + 0.5, z, 16);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.35, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffa63d,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.24, z);
    this.scene.add(ring);
    this.shockwaves.push({ mesh: ring, life: 0.45, maxLife: 0.45, scale });
  }

  firePlayerWeapon(player, traffic, police, audio, onEnemyKilled, onCrime) {
    const w = player.currentWeapon;
    if (player.fireCooldown > 0 || player.dead) return false;
    if (!w.melee && w.ammo <= 0) return false;

    player.fireCooldown = w.fireRate;
    if (!w.melee) {
      w.ammo = Math.max(0, w.ammo - 1);
    }
    if (audio) audio.playShot(w.id);

    const yaw = player.camYaw;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const ox = player.x + sinY * 0.9;
    const oy = player.y + 1.48;
    const oz = player.z + cosY * 0.9;

    if (!w.melee) {
      this.spawnMuzzleFlash(ox, oy, oz, w.tracerColor);
      traffic.triggerPanicNear(player.x, player.z, 42);
    }

    if (w.explosive) {
      const gx = player.x + sinY * 18;
      const gz = player.z + cosY * 18;
      this.spawnTracer(ox, oy, oz, gx, 0.8, gz, 0xff5e6c, 0.25);
      this.spawnExplosion(gx, 0.7, gz, 1.5);
      if (audio) audio.playExplosion();
      if (onCrime) onCrime(95);
      // Area splash damage to enemies & vehicles
      for (const e of traffic.enemies) {
        if (e.alive && Math.hypot(e.x - gx, e.z - gz) < 11) {
          e.health = 0;
          e.alive = false;
          e.rig.group.rotation.x = Math.PI / 2;
          e.rig.group.position.y = 0.24;
          if (onEnemyKilled) onEnemyKilled(e);
        }
      }
      for (const v of [...traffic.vehicles, ...police.units]) {
        if (!v.destroyed && Math.hypot(v.x - gx, v.z - gz) < 12) {
          v.applyDamage(180, this);
        }
      }
      return true;
    }

    // Ray/cone hitscan for bullets & melee baton
    const allVehicles = [...traffic.vehicles, ...police.units];
    for (let p = 0; p < w.pellets; p++) {
      const ang = yaw + (Math.random() - 0.5) * w.spread * 2;
      const dirX = Math.sin(ang);
      const dirZ = Math.cos(ang);
      let bestDist = w.range;
      let hitEnemy = null;
      let hitVeh = null;

      // Test enemies
      for (const e of traffic.enemies) {
        if (!e.alive) continue;
        const ex = e.x - ox;
        const ez = e.z - oz;
        const proj = ex * dirX + ez * dirZ;
        if (proj > 0.4 && proj < bestDist) {
          const perp = Math.abs(ex * dirZ - ez * dirX);
          if (perp < 1.25) {
            bestDist = proj;
            hitEnemy = e;
            hitVeh = null;
          }
        }
      }

      // Test vehicles
      for (const v of allVehicles) {
        if (v === player.vehicle) continue;
        const vx = v.x - ox;
        const vz = v.z - oz;
        const proj = vx * dirX + vz * dirZ;
        if (proj > 0.6 && proj < bestDist) {
          const perp = Math.abs(vx * dirZ - vz * dirX);
          if (perp < v.spec.width * 0.72) {
            bestDist = proj;
            hitVeh = v;
            hitEnemy = null;
          }
        }
      }

      const hx = ox + dirX * bestDist;
      const hz = oz + dirZ * bestDist;
      if (!w.melee) {
        this.spawnTracer(ox, oy, oz, hx, 1.35, hz, w.tracerColor);
      }

      if (hitEnemy) {
        hitEnemy.health -= w.damage;
        this.spawnSparks(hitEnemy.x, 1.35, hitEnemy.z, 5);
        if (hitEnemy.health <= 0 && hitEnemy.alive) {
          hitEnemy.alive = false;
          hitEnemy.rig.group.rotation.x = Math.PI / 2;
          hitEnemy.rig.group.position.y = 0.24;
          if (onEnemyKilled) onEnemyKilled(hitEnemy);
          if (onCrime) onCrime(hitEnemy.faction === 'cbpd' ? 85 : 35);
        }
      } else if (hitVeh) {
        hitVeh.applyDamage(w.damage * 0.85, this);
        this.spawnSparks(hx, 1.0, hz, 6);
        if (hitVeh.isPolice && onCrime) onCrime(55);
      }
    }
    return true;
  }

  update(dt) {
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
  }
}
