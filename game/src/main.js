// Main runtime for Calima Bay: Sunset Syndicate.
// Initializes Three.js WebGLRenderer, CalimaCity, Vehicles, Player, Traffic, PoliceDispatch,
// CombatAndFX, MissionManager, AudioEngine, SaveManager, HUD, and deterministic shot staging.

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
renderer.toneMappingExposure = 1.12;

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
  onToggleAtlas: (open) => {
    pausedAtlas = open;
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
  } else if (code === 'KeyE') {
    if (activeShop) {
      activeShop = null;
      hud.openShop(null, player);
    } else {
      const shop = findNearbyShop();
      if (shop) {
        activeShop = shop;
        hud.openShop(shop, player, handleShopPurchase);
      }
    }
  } else if (code === 'KeyQ') {
    wheelOpen = !wheelOpen;
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

// Mouse look & firing
canvas.addEventListener('mousedown', (e) => {
  if (gameMode !== 'play' || pausedAtlas || activeShop || wheelOpen) return;
  audio.unlock();
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
  if (document.pointerLockElement === canvas || e.buttons > 0) {
    player.camYaw -= e.movementX * 0.0045;
    player.camPitch = Math.max(-0.25, Math.min(0.62, player.camPitch + e.movementY * 0.003));
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

// Expose minimal read-only state hook for automated verification
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
});

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
    combat.update(dt);
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

      if (input.fire && !player.vehicle) {
        combat.firePlayerWeapon(
          player,
          traffic,
          police,
          audio,
          (enemy) => missions.onEnemyKilled(enemy, traffic, police, player, audio),
          (heat) => police.addHeat(heat),
        );
      }

      traffic.update(dt, city, player, combat, combat, (dmg) => player.takeDamage(dmg));
      police.update(dt, elapsed, city, player, combat, combat, (dmg) => player.takeDamage(dmg));
      missions.update(dt, elapsed, player, traffic, police, audio);
      player.updateCamera(camera, dt);
    } else {
      // Keep helicopter rotors, sirens, and beacon gently alive in staged shot view
      if (police.helicopter.active) {
        police.helicopter.mainRotor.rotation.y += dt * 18;
        police.helicopter.tailRotor.rotation.x += dt * 24;
      }
    }

    if (!freezeCamera) combat.update(dt);
    audio.update(dt, elapsed, player, police, true);
  }

  const nearVehicle = !player.vehicle ? traffic.findNearestVehicle(player.x, player.z, 7.8) : null;
  const nearShop = findNearbyShop();
  hud.update(elapsed, {
    player,
    city,
    police,
    missions,
    audio,
    traffic,
    nearVehicle,
    nearShop,
  });

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
