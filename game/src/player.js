// Rico Vega protagonist: articulated 3D character mesh, on-foot & vehicle controls,
// weapon inventory, third-person over-shoulder & speed-reactive vehicle chase camera.

import * as THREE from 'three';
import { WEAPONS } from './config.js';

export function buildHumanoidMesh(palette) {
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: palette.skin || 0xd49a73, roughness: 0.65 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: palette.jacket, roughness: 0.5 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: palette.shirt || 0x2cf2e8, roughness: 0.55 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: palette.pants || 0x1e2436, roughness: 0.72 });
  const hairMat = new THREE.MeshStandardMaterial({ color: palette.hair || 0x1a1412, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fc, roughness: 0.5 });

  // Sculpted tapered torso & jacket shoulders
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.72, 10), jacketMat);
  torso.scale.set(1.08, 1, 0.64);
  torso.position.y = 1.24;
  torso.castShadow = true;
  g.add(torso);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), jacketMat);
  shoulders.scale.set(1.12, 0.38, 0.66);
  shoulders.position.y = 1.56;
  g.add(shoulders);

  // Inner shirt front
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.64, 0.34), shirtMat);
  shirt.position.set(0, 1.24, 0.05);
  g.add(shirt);

  // Sculpted head + styled hair + shades
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skinMat);
  head.scale.set(0.92, 1.08, 0.96);
  head.position.y = 1.84;
  head.castShadow = true;
  g.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), hairMat);
  hair.scale.set(0.98, 0.68, 1.02);
  hair.position.set(0, 1.94, -0.02);
  g.add(hair);

  if (palette.shades) {
    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0b0d16, metalness: 0.85, roughness: 0.12 }),
    );
    shades.position.set(0, 1.86, 0.17);
    g.add(shades);
  }

  // Sculpted cylindrical arms + hands
  const armGeo = new THREE.CylinderGeometry(0.085, 0.072, 0.6, 8);
  armGeo.translate(0, -0.28, 0);
  const leftArm = new THREE.Mesh(armGeo, jacketMat);
  leftArm.position.set(-0.38, 1.52, 0);
  leftArm.castShadow = true;
  g.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, jacketMat);
  rightArm.position.set(0.38, 1.52, 0);
  rightArm.castShadow = true;
  g.add(rightArm);

  // Detailed Carbine / Tactical Weapon attached to right arm
  const gun = new THREE.Group();
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x202636, metalness: 0.72, roughness: 0.28 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.6, roughness: 0.35 });
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.56), gunMat);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.42, 8), accentMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, 0.42);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.09), accentMat);
  mag.position.set(0, -0.12, 0.06);
  gun.add(receiver, barrel, mag);
  gun.position.set(0, -0.52, 0.36);
  gun.visible = !!palette.armed;
  rightArm.add(gun);

  // Sculpted legs + sneakers
  const legGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.74, 8);
  legGeo.translate(0, -0.37, 0);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.15, 0.86, 0);
  leftLeg.castShadow = true;
  const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.3), shoeMat);
  lShoe.position.set(0, -0.74, 0.05);
  leftLeg.add(lShoe);
  g.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.15, 0.86, 0);
  rightLeg.castShadow = true;
  const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.3), shoeMat);
  rShoe.position.set(0, -0.74, 0.05);
  rightLeg.add(rShoe);
  g.add(rightLeg);

  return { group: g, leftArm, rightArm, leftLeg, rightLeg, gun };
}

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.x = 84;
    this.y = 0.05;
    this.z = -24;
    this.vy = 0;
    this.rotY = 0;
    this.camYaw = 0;
    this.camPitch = 0.22;
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 60;
    this.maxArmor = 100;
    this.cash = 12450;
    this.respect = 320;
    this.vehicle = null;
    this.walkPhase = 0;
    this.aiming = false;
    this.fireCooldown = 0;
    this.dead = false;
    this.respawnTimer = 0;
    this.damageFlash = 0;
    this.crewCooldown = 0;
    this.crewAbilityIndex = 0; // 0: Radio Jammer, 1: Repair Drop, 2: Bribe Dispatch
    this.stats = {
      missionsDone: 0,
      stuntsDone: 0,
      takedowns: 0,
      carsBoosted: 0,
    };

    // Weapon inventory
    this.weapons = WEAPONS.map((w) => ({
      ...w,
      owned: w.id === 'baton' || w.id === 'pistol' || w.id === 'smg' || w.id === 'carbine',
      ammo: w.melee ? 0 : Math.round(w.maxAmmo * 0.75),
      mag: w.magSize,
    }));
    this.weaponIndex = 4; // Start equipped with Carbine Rifle for immediate punch

    this.rig = buildHumanoidMesh({
      jacket: 0xff5e6c,
      shirt: 0x2cf2e8,
      pants: 0x1a1f33,
      skin: 0xd89f74,
      hair: 0x1b1414,
      shades: true,
      armed: true,
    });
    this.rig.group.position.set(this.x, this.y, this.z);
    this.scene.add(this.rig.group);
  }

  get currentWeapon() {
    return this.weapons[this.weaponIndex];
  }

  selectWeapon(index) {
    if (index < 0 || index >= this.weapons.length) return false;
    if (!this.weapons[index].owned) return false;
    this.weaponIndex = index;
    return true;
  }

  enterVehicle(veh) {
    if (!veh || veh.destroyed) return false;
    if (this.vehicle) this.exitVehicle();
    this.vehicle = veh;
    if (veh.driver !== 'player') this.stats.carsBoosted += 1;
    veh.driver = 'player';
    veh.ai = null;
    this.rig.group.visible = false;
    this.camYaw = veh.rotY;
    return true;
  }

  exitVehicle() {
    if (!this.vehicle) return;
    const v = this.vehicle;
    v.driver = null;
    const sideX = Math.cos(v.rotY) * (v.spec.width * 0.6 + 1.2);
    const sideZ = -Math.sin(v.rotY) * (v.spec.width * 0.6 + 1.2);
    this.x = v.x - sideX;
    this.z = v.z - sideZ;
    this.y = v.y;
    this.rotY = v.rotY;
    this.vehicle = null;
    this.rig.group.visible = true;
    this.rig.group.position.set(this.x, this.y, this.z);
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.damageFlash = 0.35;
    let rem = amount;
    if (this.armor > 0) {
      const absorb = Math.min(this.armor, rem * 0.65);
      this.armor -= absorb;
      rem -= absorb;
    }
    this.health = Math.max(0, this.health - rem);
    if (this.health <= 0) {
      this.dead = true;
      this.respawnTimer = 3.2;
    }
  }

  respawn(city) {
    if (this.vehicle) this.exitVehicle();
    this.dead = false;
    this.health = this.maxHealth;
    this.armor = Math.max(this.armor, 40);
    this.cash = Math.max(0, this.cash - 450);
    this.x = 76;
    this.z = -18;
    this.y = city.getGroundHeight(this.x, this.z);
    this.rig.group.position.set(this.x, this.y, this.z);
  }

  update(dt, input, city, vehicles, fx, onStuntJump) {
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt);
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.crewCooldown > 0) this.crewCooldown = Math.max(0, this.crewCooldown - dt);

    if (this.dead) {
      this.respawnTimer -= dt;
      return;
    }

    if (this.vehicle) {
      const v = this.vehicle;
      const throttle = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      v.stepPhysics(
        dt,
        { throttle, steer, handbrake: input.space, nitro: input.shift },
        city,
        fx,
        onStuntJump,
      );
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      this.rotY = v.rotY;

      // Smoothly follow vehicle heading with slight lag unless mouse moved
      if (!input.mouseLookActive) {
        const diff = Math.atan2(Math.sin(v.rotY - this.camYaw), Math.cos(v.rotY - this.camYaw));
        this.camYaw += diff * Math.min(1, dt * 4.2);
      }

      if (v.destroyed) {
        this.takeDamage(35);
        this.exitVehicle();
      }
      return;
    }

    // On-foot movement relative to camera yaw
    const moveF = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const moveR = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const speed = input.shift ? 13.5 : 8.2;
    const fwdX = Math.sin(this.camYaw);
    const fwdZ = Math.cos(this.camYaw);
    const rightX = -Math.cos(this.camYaw);
    const rightZ = Math.sin(this.camYaw);

    let dx = fwdX * moveF + rightX * moveR;
    let dz = fwdZ * moveF + rightZ * moveR;
    const len = Math.hypot(dx, dz);
    if (len > 0.01) {
      dx /= len;
      dz /= len;
      this.x += dx * speed * dt;
      this.z += dz * speed * dt;
      const targetRot = Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(targetRot - this.rotY), Math.cos(targetRot - this.rotY));
      this.rotY += diff * Math.min(1, dt * 12);
      this.walkPhase += dt * (input.shift ? 13 : 9);
    } else if (input.fire || this.aiming) {
      this.rotY = this.camYaw;
    }

    // Jump & gravity
    const groundY = city.getGroundHeight(this.x, this.z);
    if (input.space && this.y <= groundY + 0.06) {
      this.vy = 8.4;
    }
    this.vy -= 22 * dt;
    this.y += this.vy * dt;
    if (this.y < groundY) {
      this.y = groundY;
      this.vy = 0;
    }

    const col = city.resolveCircleCollision(this.x, this.z, 0.65);
    this.x = col.x;
    this.z = col.z;

    // Avoid walking through parked cars
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      const d = Math.hypot(this.x - v.x, this.z - v.z);
      const minD = v.spec.width * 0.65 + 0.5;
      if (d < minD && d > 0.001) {
        const push = minD - d;
        this.x += ((this.x - v.x) / d) * push;
        this.z += ((this.z - v.z) / d) * push;
      }
    }

    // Articulated limb animation
    const swing = len > 0.01 ? Math.sin(this.walkPhase) * 0.65 : 0;
    this.rig.leftLeg.rotation.x = swing;
    this.rig.rightLeg.rotation.x = -swing;
    this.rig.leftArm.rotation.x = -swing * 0.7;
    if (input.fire || this.aiming || !this.currentWeapon.melee) {
      this.rig.rightArm.rotation.x = -Math.PI * 0.46;
      this.rig.gun.visible = !this.currentWeapon.melee;
    } else {
      this.rig.rightArm.rotation.x = swing * 0.7;
      this.rig.gun.visible = false;
    }

    this.rig.group.position.set(this.x, this.y, this.z);
    this.rig.group.rotation.y = this.rotY;
  }

  updateCamera(camera, dt) {
    if (this.vehicle) {
      const v = this.vehicle;
      const spdRatio = Math.min(1, v.speed / 55);
      const dist = 10.2 + spdRatio * 3.2;
      const height = 4.3 + spdRatio * 1.1;
      const targetX = v.x - Math.sin(this.camYaw) * dist;
      const targetZ = v.z - Math.cos(this.camYaw) * dist;
      const targetY = v.y + height;

      camera.position.x += (targetX - camera.position.x) * Math.min(1, dt * 7.5);
      camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 7.5);
      camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 7.5);
      camera.lookAt(v.x + Math.sin(v.rotY) * 5, v.y + 1.5, v.z + Math.cos(v.rotY) * 5);
    } else {
      const dist = 5.4;
      const rightOff = 1.15;
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      const targetX = this.x - sinY * dist - cosY * rightOff;
      const targetZ = this.z - cosY * dist + sinY * rightOff;
      const targetY = this.y + 2.55 + Math.sin(this.camPitch) * 2.2;

      camera.position.x += (targetX - camera.position.x) * Math.min(1, dt * 11);
      camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 11);
      camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 11);
      camera.lookAt(
        this.x + sinY * 14,
        this.y + 1.65 - Math.sin(this.camPitch) * 4.5,
        this.z + cosY * 14,
      );
    }
  }
}
