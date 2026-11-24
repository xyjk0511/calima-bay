// Main runtime for Calima Bay: Sunset Syndicate (v2 Full Upgrade).
// Initializes Three.js WebGLRenderer, CalimaCity, Vehicles, Player, Traffic, PoliceDispatch,
// CombatAndFX (true 3D ray aiming, full-world lethality, drive-by, grenades), MissionManager,
// AudioEngine, SaveManager, HUD (crosshair + hitmarker + kill feed + Atlas ops), and shot staging.

import * as THREE from 'three';
import { SHOPS, TIME_PRESETS } from './config.js';
import { CalimaCity } from './city.js';
import { Player } from './player.js';
import { TrafficAndNPCManager } from './traffic.js';
import { PoliceDispatch } from './police.js';
import { CombatAndFX } from './combat.js';
import { MissionManager } from './missions.js';
import { AudioEngine } from './audio.js';
import { SaveManager } from './save.js';
import { HudController } from './hud.js';
import { applyShotStaging } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
const seedParam = Number(params.get('seed') || 1) || 1;

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.14;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.25, 1100);

const city = new CalimaCity(scene, seedParam);
const player = new Player(scene);
const traffic = new TrafficAndNPCManager(scene);
const police = new PoliceDispatch(scene);
const combat = new CombatAndFX(scene);
const missions = new MissionManager(scene);
const audio = new AudioEngine();
const save = new SaveManager();

let gameMode = 'title'; // 'title' | 'play'
let pausedAtlas = false;
let activeShop = null;
let wheelOpen = false;
let timeIndex = 0;
let freezeCamera = false;
let elapsed = 0;

const input = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  space: false,
  shift: false,
  fire: false,
  mouseLookActive: false,
  mouseTimer: 0,
};

function releasePointerLock() {
  if (document.pointerLockElement && document.exitPointerLock) {
    try {
      document.exitPointerLock();
    } catch {
      // Ignore browser gesture restriction errors
    }
  }
}

function getCombatCallbacks() {
  return {
    onEnemyKilled: (enemy) => missions.onEnemyKilled(enemy, traffic, police, player, audio),
    onCrime: (heat) => police.addHeat(heat),
    onHitFeedback: ({ kill }) => {
      hud.flashHitmarker(kill);
    },
    onChopperDowned: () => {
      player.cash += 1500;
      player.respect += 160;
      player.stats.choppersDowned = (player.stats.choppersDowned || 0) + 1;
      player.stats.takedowns += 1;
      hud.pushKillFeed('CALIMA-1 AIR ONE DOWN · +$1,500', 'headshot', 4.2);
      missions.showToast('CALIMA-1 SHOT DOWN!', '+$1,500 BOUNTY · +160 RESPECT', 4.2);
    },
    onKillFeed: (msg, kind) => hud.pushKillFeed(msg, kind),
  };
}

function startNewGame() {
  audio.unlock();
  gameMode = 'play';
  pausedAtlas = false;
  activeShop = null;
  wheelOpen = false;
  hud.setMode('play');
  hud.openAtlas(false);
  hud.openShop(null, player);
  missions.startStage(traffic, police);
}

function continueCareer() {
  audio.unlock();
  const slots = save.listSlots();
  const existing = slots.find((s) => s.data);
  if (existing) {
    save.loadSlot(existing.slot, player, missions, city, audio, traffic, police);
  }
  startNewGame();
}

function loadCareerSlot(slot) {
  audio.unlock();
  const ok = save.loadSlot(slot, player, missions, city, audio, traffic, police);
  if (ok) {
    missions.showToast(`CAREER SLOT ${slot} LOADED`, 'Welcome back to Calima Bay', 3.5);
  }
  startNewGame();
}

function saveCareerSlot(slot) {
  const ok = save.saveSlot(slot, player, missions, timeIndex, audio.radioIndex);
  if (ok) {
    audio.playChime(740);
    missions.showToast(`SAVED TO SLOT ${slot}`, 'Career progress stored locally', 3.2);
    hud.refreshTitleSlots(save.listSlots());
    if (pausedAtlas) {
      hud.openAtlas(true, { player, missions, city, police, save });
    }
  }
}

function selectMissionFromAtlas(idx) {
  missions.missionIndex = idx;
  missions.stageIndex = 0;
  pausedAtlas = false;
  hud.openAtlas(false);
  missions.startStage(traffic, police);
  audio.playChime(680);
  missions.showToast(`LAUNCHED: ${missions.activeMission.title}`, 'Follow the gold beacon on radar', 3.4);
}

function handleShopPurchase(item) {
  if (player.cash < item.price) {
    missions.showToast('INSUFFICIENT FUNDS', `Need $${item.price.toLocaleString()}`, 2.5);
    return;
  }
  player.cash -= item.price;
  audio.playChime(720);

  if (item.id === 'respray') {
    police.clearHeat();
    if (player.vehicle) {
      const colors = [0xff3b5c, 0x2cf2e8, 0xffd166, 0xff9a3c, 0xa855f7];
      player.vehicle.repaint(colors[Math.floor(Math.random() * colors.length)]);
      player.vehicle.repair();
    }
    missions.showToast('RESPRAY COMPLETE', 'CBPD Wanted Level Cleared!', 3.8);
  } else if (item.id === 'turbo') {
    if (player.vehicle) player.vehicle.upgradeTurbo += 1;
    missions.showToast('TWIN-TURBO INSTALLED', 'Acceleration & Top Speed boosted', 3.2);
  } else if (item.id === 'armor_veh') {
    if (player.vehicle) {
      player.vehicle.upgradeArmor += 1;
      player.vehicle.repair();
    }
    missions.showToast('CHASSIS ARMOR UPGRADED', 'Vehicle Hull Reinforced', 3.2);
  } else if (item.id === 'nitro_tank') {
    if (player.vehicle) {
      player.vehicle.upgradeNitro += 1;
      player.vehicle.nitro = 100;
    }
    missions.showToast('EXTENDED NITRO CELL', 'Boost capacity expanded', 3.2);
  } else if (item.id === 'vest') {
    player.armor = player.maxArmor;
    missions.showToast('BALLISTIC VEST EQUIPPED', 'Armor restored to 100%', 2.8);
  } else if (item.id === 'ammo_pack') {
    for (const w of player.weapons) {
      if (w.owned && !w.melee) w.ammo = w.maxAmmo;
    }
    missions.showToast('AMMO RESUPPLIED', 'All weapons fully loaded', 2.8);
  } else if (item.id.startsWith('weapon_')) {
    const wid = item.id.slice(7);
    const idx = player.weapons.findIndex((w) => w.id === wid);
    if (idx >= 0) {
      player.weapons[idx].owned = true;
      player.weapons[idx].ammo = player.weapons[idx].maxAmmo;
      player.selectWeapon(idx);
      missions.showToast(`${player.weapons[idx].name} READY`, 'Equipped to active slot', 3.0);
    }
  }
}

const hud = new HudController({
  onStartNew: startNewGame,
  onContinue: continueCareer,
  onLoadSlot: loadCareerSlot,
  onSaveSlot: saveCareerSlot,
  onSelectMission: selectMissionFromAtlas,
  onToggleAtlas: (open) => {
    pausedAtlas = open;
    if (open) releasePointerLock();
    hud.openAtlas(open, { player, missions, city, police, save });
  },
  onCloseShop: () => {
    activeShop = null;
    hud.openShop(null, player);
  },
});
hud.refreshTitleSlots(save.listSlots());

function findNearbyShop() {
  for (const s of SHOPS) {
    if (Math.hypot(player.x - s.x, player.z - s.z) < 12) return s;
  }
  return null;
}

function triggerCrewAbility() {
  if (player.crewCooldown > 0) return;
  const idx = player.crewAbilityIndex % 3;
  audio.playChime(620);
  if (idx === 0) {
    police.activateRadioJammer();
    missions.showCommlink('NADIA CRUZ', 'Jammer live! CBPD dispatch frequency scrambled for 14 seconds.', 4.5);
  } else if (idx === 1) {
    if (player.vehicle) {
      player.vehicle.repair();
      missions.showCommlink('TITO MORALES', 'Remote bypass patch complete — hull repaired and nitro topped off!', 4.5);
    } else {
      player.health = Math.min(player.maxHealth, player.health + 45);
      missions.showCommlink('TITO MORALES', 'Emergency med-kit patched — get back in the fight!', 4.0);
    }
  } else {
    if (player.cash >= 600 && police.stars > 0) {
      player.cash -= 600;
      police.setWantedLevel(Math.max(0, police.stars - 1));
      missions.showCommlink('NADIA CRUZ', 'Wire cleared — dispatch just dropped one star off our tail.', 4.5);
    } else {
      missions.showToast('BRIBE SKIPPED', 'Requires $600 & active wanted stars', 2.4);
    }
  }
  player.crewCooldown = 18;
  player.crewAbilityIndex = (player.crewAbilityIndex + 1) % 3;
}

// Keyboard controls
window.addEventListener('keydown', (e) => {
  const code = e.code;
  if (code === 'KeyW' || code === 'ArrowUp') input.forward = true;
  if (code === 'KeyS' || code === 'ArrowDown') input.backward = true;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = true;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = true;
  if (code === 'Space') input.space = true;
  if (code === 'ShiftLeft' || code === 'ShiftRight') input.shift = true;

  if (gameMode !== 'play') {
    if (code === 'Enter') startNewGame();
    return;
  }

  audio.unlock();

  if (code === 'Tab' || code === 'Escape') {
    e.preventDefault();
    if (activeShop) {
      activeShop = null;
      hud.openShop(null, player);
      return;
    }
    if (wheelOpen) {
      wheelOpen = false;
      hud.setWeaponWheel(false, player);
      return;
    }
    pausedAtlas = !pausedAtlas;
    if (pausedAtlas) releasePointerLock();
    hud.openAtlas(pausedAtlas, { player, missions, city, police, save });
    return;
  }

  if (code === 'F5') {
    e.preventDefault();
    saveCareerSlot(1);
    return;
  }

  if (pausedAtlas) return;

  if (code === 'KeyF') {
    if (player.vehicle) {
      player.exitVehicle();
    } else {
      const nearV = traffic.findNearestVehicle(player.x, player.z, 7.8);
      if (nearV) {
        const wasNpc = nearV.driver === 'npc' || nearV.isPolice;
        player.enterVehicle(nearV);
        if (wasNpc) police.addHeat(nearV.isPolice ? 95 : 42);
      }
    }
  } else if (code === 'KeyG') {
    // Quick physical bouncing grenade throw!
    const thrown = combat.throwGrenade(player, camera, traffic, police, audio, getCombatCallbacks());
    if (thrown) {
      hud.pulseCrosshairFire();
    } else {
      missions.showToast('NO GRENADES LEFT', 'Restock at Underground Armory [E]', 2.0);
    }
  } else if (code === 'KeyE') {
    if (activeShop) {
      activeShop = null;
      hud.openShop(null, player);
    } else {
      const shop = findNearbyShop();
      if (shop) {
        releasePointerLock();
        activeShop = shop;
        hud.openShop(shop, player, handleShopPurchase);
      }
    }
  } else if (code === 'KeyQ') {
    wheelOpen = !wheelOpen;
    if (wheelOpen) releasePointerLock();
    hud.setWeaponWheel(wheelOpen, player, (idx) => {
      if (player.selectWeapon(idx)) {
        wheelOpen = false;
        hud.setWeaponWheel(false, player);
      }
    });
  } else if (code === 'KeyR') {
    const st = audio.cycleRadio();
    missions.showToast(st.name, st.genre, 2.2);
  } else if (code === 'KeyT') {
    timeIndex = (timeIndex + 1) % TIME_PRESETS.length;
    city.applyTimePreset(timeIndex);
    missions.showToast(TIME_PRESETS[timeIndex].label, 'Calima Bay Atmospheric Lighting', 2.2);
  } else if (code === 'KeyC') {
    triggerCrewAbility();
  } else if (code >= 'Digit1' && code <= 'Digit6') {
    player.selectWeapon(Number(code.slice(5)) - 1);
    if (wheelOpen) hud.setWeaponWheel(true, player, (idx) => player.selectWeapon(idx));
  }
});

window.addEventListener('keyup', (e) => {
  const code = e.code;
  if (code === 'KeyW' || code === 'ArrowUp') input.forward = false;
  if (code === 'KeyS' || code === 'ArrowDown') input.backward = false;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = false;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = false;
  if (code === 'Space') input.space = false;
  if (code === 'ShiftLeft' || code === 'ShiftRight') input.shift = false;
});

// Seamless Pointer-Lock Mouse Look + Fallback Drag/Free-Aim + Firing & ADS
let lastMouseX = null;
let lastMouseY = null;

canvas.addEventListener('mousedown', (e) => {
  if (gameMode !== 'play' || pausedAtlas || activeShop || wheelOpen) return;
  audio.unlock();
  if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
    try {
      const pr = canvas.requestPointerLock();
      if (pr && typeof pr.catch === 'function') pr.catch(() => {});
    } catch {
      // Fallback non-locked aiming remains active
    }
  }
  if (e.button === 0) input.fire = true;
  if (e.button === 2) player.aiming = true;
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) input.fire = false;
  if (e.button === 2) player.aiming = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousemove', (e) => {
  if (gameMode !== 'play' || pausedAtlas || activeShop || wheelOpen || freezeCamera) return;
  const locked = document.pointerLockElement === canvas;
  let dx = 0;
  let dy = 0;
  if (locked) {
    dx = e.movementX || 0;
    dy = e.movementY || 0;
  } else {
    if (lastMouseX !== null) {
      dx = e.clientX - lastMouseX;
      dy = e.clientY - lastMouseY;
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    // Allow drag-look OR effortless on-foot cursor steering when pointer lock isn't active
    if (e.buttons === 0 && player.vehicle) return;
    dx *= e.buttons > 0 ? 1.0 : 0.55;
    dy *= e.buttons > 0 ? 1.0 : 0.45;
  }
  if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
    player.camYaw -= dx * 0.0042;
    player.camPitch = Math.max(-0.42, Math.min(0.62, player.camPitch + dy * 0.003));
    input.mouseLookActive = true;
    input.mouseTimer = 1.6;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Apply deterministic shot staging if ?shot= query param is present
if (shotParam) {
  const res = applyShotStaging(shotParam, {
    scene,
    camera,
    city,
    player,
    traffic,
    police,
    combat,
    missions,
    hud,
  });
  freezeCamera = !!res.freezeCamera;
  gameMode = res.mode || 'play';
}

// Expose read-only state hook + combat smoke-test helper for automated verification
window.__CALIMA_STATE__ = () => ({
  mode: gameMode,
  district: city.currentPreset?.label,
  cash: Math.round(player.cash),
  wanted: police.stars,
  inVehicle: !!player.vehicle,
  speedKmh: player.vehicle ? Math.round(player.vehicle.speed * 3.4) : 0,
  mission: missions.activeMission.title,
  radio: audio.currentStation.name,
  timeOfDay: TIME_PRESETS[timeIndex].label,
  takedowns: player.stats.takedowns,
  pedestriansKilled: traffic.pedestriansKilled,
  enemiesAlive: traffic.enemies.filter((e) => e.alive).length,
  pickupsCount: traffic.pickups.length,
  helicopterHp: police.helicopter.health,
  grenadesLeft: player.weapons.find((w) => w.id === 'grenade')?.ammo ?? 0,
});

window.__CALIMA_TEST__ = {
  aimAndFireAtNearestPedestrian() {
    const alivePeds = traffic.pedestrians.filter((p) => p.alive);
    if (!alivePeds.length) return { ok: false, reason: 'no_peds' };
    alivePeds.sort(
      (a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z),
    );
    const target = alivePeds[0];
    // Position Rico cleanly in front of target if far
    if (Math.hypot(target.x - player.x, target.z - player.z) > 18) {
      player.x = target.x - 8;
      player.z = target.z;
    }
    player.camYaw = Math.atan2(target.x - player.x, target.z - player.z);
    player.camPitch = 0.06;
    player.updateCamera(camera, 1.0);
    camera.lookAt(target.x, 1.35, target.z);
    camera.updateMatrixWorld();
    let res = null;
    for (let i = 0; i < 4 && target.alive; i++) {
      player.fireCooldown = 0;
      res = combat.firePlayerWeapon(player, camera, traffic, police, audio, getCombatCallbacks());
    }
    return { ok: true, targetAlive: target.alive, res };
  },
  aimAndFireAtNearestEnemy() {
    const aliveEnemies = traffic.enemies.filter((e) => e.alive);
    if (!aliveEnemies.length) return { ok: false, reason: 'no_enemies' };
    aliveEnemies.sort(
      (a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z),
    );
    const target = aliveEnemies[0];
    if (Math.hypot(target.x - player.x, target.z - player.z) > 22) {
      player.x = target.x - 10;
      player.z = target.z;
    }
    player.camYaw = Math.atan2(target.x - player.x, target.z - player.z);
    player.camPitch = 0.06;
    player.updateCamera(camera, 1.0);
    camera.lookAt(target.x, 1.35, target.z);
    camera.updateMatrixWorld();
    let res = null;
    for (let i = 0; i < 6 && target.alive; i++) {
      player.fireCooldown = 0;
      res = combat.firePlayerWeapon(player, camera, traffic, police, audio, getCombatCallbacks());
    }
    return { ok: true, targetAlive: target.alive, res };
  },
  collectNearestPickup() {
    if (!traffic.pickups.length) return false;
    const pk = traffic.pickups[0];
    player.x = pk.x;
    player.z = pk.z;
    return true;
  },
  throwTestGrenade() {
    player.grenadeCooldown = 0;
    return combat.throwGrenade(player, camera, traffic, police, audio, getCombatCallbacks());
  },
};

let lastTs = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
  lastTs = now;
  elapsed += dt;

  if (input.mouseTimer > 0) {
    input.mouseTimer -= dt;
    if (input.mouseTimer <= 0) input.mouseLookActive = false;
  }

  city.update(dt, elapsed);

  if (gameMode === 'title') {
    if (!freezeCamera) {
      const ang = elapsed * 0.14;
      camera.position.set(125 + Math.cos(ang) * 78, 34 + Math.sin(ang * 0.7) * 5, 30 + Math.sin(ang) * 78);
      camera.lookAt(48, 12, -24);
    }
    traffic.update(dt, city, player, null, combat, null);
    combat.update(dt, city);
    renderer.render(scene, camera);
    return;
  }

  if (!pausedAtlas && !activeShop) {
    if (!freezeCamera) {
      player.update(dt, input, city, traffic.vehicles, combat, (ramp, dist) => {
        player.cash += ramp.reward;
        player.respect += 85;
        player.stats.stuntsDone += 1;
        audio.playChime(880);
        missions.showToast(
          `STUNT JUMP: ${ramp.name.toUpperCase()}`,
          `+$${ramp.reward.toLocaleString()} · ${dist}m DISTANCE`,
          4.2,
        );
      });

      if (player.dead && player.respawnTimer <= 0) {
        player.respawn(city);
        police.clearHeat();
      }

      player.updateCamera(camera, dt);

      // Firing works both on-foot AND drive-by inside vehicles!
      if (input.fire) {
        const res = combat.firePlayerWeapon(
          player,
          camera,
          traffic,
          police,
          audio,
          getCombatCallbacks(),
        );
        if (res.fired) hud.pulseCrosshairFire();
      }

      traffic.update(dt, city, player, combat, combat, (dmg) => player.takeDamage(dmg), {
        audio,
        onCrime: (heat) => police.addHeat(heat),
        onEnemyKilled: (enemy) => missions.onEnemyKilled(enemy, traffic, police, player, audio),
        onCashPickup: (amt) => hud.pushKillFeed(`CASH PICKUP · +$${amt}`, 'cash', 2.4),
        onKillFeed: (msg, kind) => hud.pushKillFeed(msg, kind),
      });
      police.update(dt, elapsed, city, player, combat, combat, (dmg) => player.takeDamage(dmg), audio);
      missions.update(dt, elapsed, player, traffic, police, audio);
    } else {
      if (police.helicopter.active) {
        police.helicopter.mainRotor.rotation.y += dt * 18;
        police.helicopter.tailRotor.rotation.x += dt * 24;
      }
    }

    if (!freezeCamera) combat.update(dt, city);
    audio.update(dt, elapsed, player, police, true);
  }

  const nearVehicle = !player.vehicle ? traffic.findNearestVehicle(player.x, player.z, 7.8) : null;
  const nearShop = findNearbyShop();
  hud.update(dt, elapsed, {
    player,
    city,
    police,
    missions,
    audio,
    traffic,
    nearVehicle,
    nearShop,
    input,
    modalOpen: pausedAtlas || !!activeShop || wheelOpen,
  });

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
