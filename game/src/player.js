// Rico Vega protagonist: articulated 3D character mesh, on-foot & vehicle controls,
// weapon inventory, ADS over-shoulder aiming, subtle recoil kick, and dynamic chase camera.

import * as THREE from 'three';
import { WEAPONS } from './config.js';

export function buildHumanoidMesh(palette) {
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: palette.skin || 0xd49a73, roughness: 0.62 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: palette.jacket, roughness: 0.44, metalness: 0.08 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: palette.shirt || 0x2cf2e8, roughness: 0.52 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: palette.pants || 0x1e2436, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: palette.hair || 0x1a1412, roughness: 0.82 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fc, roughness: 0.45 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x151822, roughness: 0.5, metalness: 0.4 });

  // Sculpted tapered torso, collar & jacket shoulders
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.72, 12), jacketMat);
  torso.scale.set(1.08, 1, 0.64);
  torso.position.y = 1.24;
  torso.castShadow = true;
  g.add(torso);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), jacketMat);
  shoulders.scale.set(1.14, 0.38, 0.66);
  shoulders.position.y = 1.56;
  g.add(shoulders);

  // Inner shirt front & tactical belt
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.64, 0.34), shirtMat);
  shirt.position.set(0, 1.24, 0.05);
  g.add(shirt);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.1, 10), beltMat);
  belt.scale.set(1.08, 1, 0.68);
  belt.position.y = 0.89;
  g.add(belt);

  // Neck + sculpted head + styled hair + shades
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 8), skinMat);
  neck.position.y = 1.65;
  g.add(neck);

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
      new THREE.MeshStandardMaterial({ color: 0x0b0d16, metalness: 0.88, roughness: 0.1 }),
    );
    shades.position.set(0, 1.86, 0.17);
    g.add(shades);
  }

  // Sculpted cylindrical arms + hands
  const armGeo = new THREE.CylinderGeometry(0.085, 0.072, 0.56, 8);
  armGeo.translate(0, -0.26, 0);
  const handGeo = new THREE.SphereGeometry(0.072, 8, 6);

  const leftArm = new THREE.Mesh(armGeo, jacketMat);
  leftArm.position.set(-0.38, 1.52, 0);
  leftArm.castShadow = true;
  const lHand = new THREE.Mesh(handGeo, skinMat);
  lHand.position.set(0, -0.56, 0);
  leftArm.add(lHand);
  g.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, jacketMat);
  rightArm.position.set(0.38, 1.52, 0);
  rightArm.castShadow = true;
  const rHand = new THREE.Mesh(handGeo, skinMat);
  rHand.position.set(0, -0.56, 0);
  rightArm.add(rHand);
  g.add(rightArm);

  // Detailed Tactical Carbine Weapon attached to right arm
  const gun = new THREE.Group();
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x1d2332, metalness: 0.78, roughness: 0.24 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x525d70, metalness: 0.65, roughness: 0.32 });
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.58), gunMat);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.44, 8), accentMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, 0.44);
  const optic = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.16), accentMat);
  optic.position.set(0, 0.1, 0.04);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.09), accentMat);
  mag.position.set(0, -0.13, 0.07);
  gun.add(receiver, barrel, optic, mag);
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
    this.camPitch = 0.18;
    this.recoilPitch = 0;
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
    this.grenadeCooldown = 0;
    this.dead = false;
    this.respawnTimer = 0;
    this.damageFlash = 0;
    this.crewCooldown = 0;
    this.crewAbilityIndex = 0; // 0: Radio Jammer, 1: Repair Drop, 2: Bribe Dispatch
    this.stats = {
      missionsDone: 0,
      stuntsDone: 0,
      takedowns: 0,
      pedestriansKilled: 0,
      choppersDowned: 0,
      carsBoosted: 0,
    };

    // Weapon inventory (Baton, Pistol, SMG, Carbine & starter Grenades ready out of the box!)
    this.weapons = WEAPONS.map((w) => ({
      ...w,
      owned:
        w.id === 'baton' ||
        w.id === 'pistol' ||
        w.id === 'smg' ||
        w.id === 'carbine' ||
        w.id === 'grenade',
      ammo: w.melee ? 0 : w.id === 'grenade' ? 6 : Math.round(w.maxAmmo * 0.75),
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

  get driveByWeapon() {
    const smg = this.weapons.find((w) => w.id === 'smg' && w.owned && w.ammo > 0);
    if (smg) return smg;
    return this.weapons.find((w) => w.id === 'pistol' && w.owned) || this.weapons[1];
  }

  addRecoil(amount = 0.035) {
    this.recoilPitch = Math.min(0.14, this.recoilPitch + amount);
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
    if (this.grenadeCooldown > 0) this.grenadeCooldown = Math.max(0, this.grenadeCooldown - dt);
    if (this.crewCooldown > 0) this.crewCooldown = Math.max(0, this.crewCooldown - dt);
    if (this.recoilPitch > 0) this.recoilPitch = Math.max(0, this.recoilPitch - dt * 0.38);

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

      // Smoothly follow vehicle heading with slight lag unless mouse aiming/firing
      if (!input.mouseLookActive && !input.fire && !this.aiming) {
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
    const speed = input.shift ? 13.5 : this.aiming ? 6.0 : 8.4;
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
      const targetRot = input.fire || this.aiming ? this.camYaw : Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(targetRot - this.rotY), Math.cos(targetRot - this.rotY));
      this.rotY += diff * Math.min(1, dt * 14);
      this.walkPhase += dt * (input.shift ? 13 : 9);
    } else if (input.fire || this.aiming) {
      const diff = Math.atan2(Math.sin(this.camYaw - this.rotY), Math.cos(this.camYaw - this.rotY));
      this.rotY += diff * Math.min(1, dt * 18);
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
      this.rig.rightArm.rotation.x = -Math.PI * 0.48 - this.recoilPitch * 1.4;
      this.rig.gun.visible = !this.currentWeapon.melee;
    } else {
      this.rig.rightArm.rotation.x = swing * 0.7;
      this.rig.gun.visible = false;
    }

    this.rig.group.position.set(this.x, this.y, this.z);
    this.rig.group.rotation.y = this.rotY;
  }

  updateCamera(camera, dt) {
    // Smooth ADS FOV zoom on foot or drive-by aiming
    const targetFov = !this.vehicle && this.aiming ? 46 : this.vehicle && this.vehicle.nitroActive ? 70 : 62;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 10);
      camera.updateProjectionMatrix();
    }

    const pitch = this.camPitch - this.recoilPitch;

    if (this.vehicle) {
      const v = this.vehicle;
      const spdRatio = Math.min(1, v.speed / 55);
      const dist = 10.2 + spdRatio * 3.2;
      const height = 4.2 + spdRatio * 1.1 + Math.sin(pitch) * 2.4;
      const targetX = v.x - Math.sin(this.camYaw) * dist;
      const targetZ = v.z - Math.cos(this.camYaw) * dist;
      const targetY = v.y + height;

      camera.position.x += (targetX - camera.position.x) * Math.min(1, dt * 8.5);
      camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 8.5);
      camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 8.5);
      camera.lookAt(
        v.x + Math.sin(this.camYaw) * 14,
        v.y + 1.5 - Math.sin(pitch) * 4.5,
        v.z + Math.cos(this.camYaw) * 14,
      );
    } else {
      const dist = this.aiming ? 3.5 : 5.2;
      const rightOff = this.aiming ? 0.92 : 1.05;
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      const targetX = this.x - sinY * dist - cosY * rightOff;
      const targetZ = this.z - cosY * dist + sinY * rightOff;
      const targetY = this.y + (this.aiming ? 2.05 : 2.45) + Math.sin(pitch) * 2.2;

      camera.position.x += (targetX - camera.position.x) * Math.min(1, dt * 14);
      camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 14);
      camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 14);
      camera.lookAt(
        this.x + sinY * 22,
        this.y + 1.6 - Math.sin(pitch) * 8.5,
        this.z + cosY * 22,
      );
    }
  }
}
