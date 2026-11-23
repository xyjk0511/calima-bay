// Deterministic real-simulation shot staging (?shot=chase|combat|explore|title&seed=1)
// Uses the exact live Three.js world, vehicles, police, helicopter, combat FX, and HUD.

import { Vehicle } from './vehicles.js';

export function applyShotStaging(shotName, ctx) {
  const { scene, camera, city, player, traffic, police, combat, missions, hud } = ctx;

  if (shotName === 'title') {
    // Cinematic coastal sunset skyline right across Palma Strip, Art-Deco hotels,
    // Solstice towers, turquoise bay, beach umbrellas & Cayo Brisa Causeway
    city.applyTimePreset(0);
    hud.setMode('title');
    const c1 = new Vehicle(scene, 'sunset_gt', 91.5, -24, 0, 0xff3358);
    const c2 = new Vehicle(scene, 'coral_cabrio', 84.5, 6, Math.PI, 0x2cf2e8);
    const c3 = new Vehicle(scene, 'palma_coupe', 136, 36.5, Math.PI / 2, 0xffd166);
    traffic.vehicles.push(c1, c2, c3);
    camera.position.set(164, 24, 96);
    camera.lookAt(56, 14, -22);
    return { freezeCamera: true, mode: 'title' };
  }

  hud.setMode('play');

  if (shotName === 'chase') {
    // COVER SHOT: High-speed 4-Star CBPD pursuit down Palma Strip at Golden Sunset —
    // Sunset GT drifting with blue nitro flames & tire smoke, 2 flanking/chasing CBPD cruisers
    // IN FRAME with glowing red/blue sirens, roadblock + burning SUV wreck ahead,
    // CALIMA-1 Helicopter shining volumetric spotlight beam, neon hotels + bay + Cayo Brisa arches!
    city.applyTimePreset(0);
    police.setWantedLevel(4);
    police.clearAllUnits();

    // Clear nearby random traffic along Palma Strip corridor so composition is razor-clean
    for (const v of traffic.vehicles) {
      if (Math.abs(v.x - 88) < 16 && v.z > -30 && v.z < 75) {
        v.x = -180;
        v.group.position.x = -180;
      }
    }

    // Hero crimson Sunset GT drifting hard with cyan nitro flames active
    const heroCar = new Vehicle(scene, 'sunset_gt', 88.5, 14, 0.34, 0xff2f55);
    heroCar.speed = 46;
    heroCar.vx = Math.sin(0.34) * 44;
    heroCar.vz = Math.cos(0.34) * 44;
    heroCar.drifting = true;
    heroCar.nitroActive = true;
    heroCar.nitro = 78;
    for (const flame of heroCar.nitroFlames) flame.visible = true;
    traffic.vehicles.push(heroCar);
    player.enterVehicle(heroCar);
    player.cash = 28650;
    player.respect = 1120;
    player.health = 92;
    player.armor = 74;

    // 2 close-up pursuing CBPD units VISIBLE IN FRAME chasing & flanking Rico!
    const chase1 = police.spawnUnit('cbpd_interceptor', 82.8, 4.5, 0.22);
    chase1.sirenPhase = 0.5;
    if (chase1.redHalo) chase1.redHalo.visible = true;
    if (chase1.blueHalo) chase1.blueHalo.visible = false;

    const chase2 = police.spawnUnit('cbpd_cruiser', 94.8, 7.2, -0.18);
    chase2.sirenPhase = 3.6;
    if (chase2.redHalo) chase2.redHalo.visible = false;
    if (chase2.blueHalo) chase2.blueHalo.visible = true;

    // Highway Roadblock + SWAT Enforcer ahead on Palma Strip
    police.spawnRoadblockAt(88, 52, 0);
    const blk1 = police.spawnUnit('cbpd_cruiser', 82.2, 55, 1.15);
    blk1.sirenPhase = 0.6;
    const blk2 = police.spawnUnit('swat_enforcer', 94.6, 54.5, -1.1);
    blk2.sirenPhase = 3.7;

    // Burning wrecked SUV near the roadblock
    const wreck = new Vehicle(scene, 'mesa_suv', 96.5, 36, 0.72, 0x222026);
    wreck.destroyed = true;
    wreck.health = 0;
    wreck.bodyMat.color.setHex(0x232024);
    traffic.vehicles.push(wreck);

    // CALIMA-1 Police Helicopter hovering dynamically above Palma Strip shining spotlight cone
    police.helicopter.placeForStaging(106, 21.5, 39, 89, 15.5);
    police.helicopter.mainRotor.rotation.y = 0.45;

    // Soft tire drift smoke behind Sunset GT + fiery explosion at wreck + glowing tracers
    for (let i = 0; i < 12; i++) {
      combat.spawnSmoke(
        86.6 - i * 0.42 + (i % 2) * 0.9,
        0.3 + (i % 3) * 0.26,
        11.2 - i * 0.58,
        0xf4f7ff,
        0.72 + i * 0.05,
      );
    }
    combat.spawnExplosion(96.5, 1.4, 36, 1.25);
    combat.spawnTracer(105.5, 20.2, 38.2, 91.5, 1.6, 21, 0xff5e6c, 5.0);
    combat.spawnTracer(83.2, 1.35, 6.0, 88.2, 1.1, 13.5, 0x5df7ff, 5.0);

    missions.missionIndex = 4;
    missions.stageIndex = 1;
    missions.showCommlink(
      'NADIA CRUZ',
      'CBPD interceptors on both flanks & CALIMA-1 locked on — punch SHIFT nitro past the roadblock!',
      12,
    );

    // Wide low chase angle capturing both pursuing cruisers, hero Sunset GT, neon hotels, beach & CALIMA-1
    camera.position.set(85.2, 4.9, -6.2);
    camera.lookAt(90.5, 3.8, 28);
    return { freezeCamera: true, mode: 'play' };
  }

  if (shotName === 'combat') {
    // ON-FOOT SHOOTOUT: Solstice Downtown neon plaza gunfight with sculpted Rico Vega
    // firing Carbine Rifle with bright muzzle flash & glowing tracers at Vargas Cartel
    // enforcers behind cover cars, arriving CBPD cruiser with flashing sirens & [F] HIJACK prompt!
    city.applyTimePreset(1); // Neon Dusk
    police.setWantedLevel(2);
    police.clearAllUnits();

    if (player.vehicle) player.exitVehicle();
    player.x = -3.2;
    player.z = -16.8;
    player.y = 0.25;
    player.rotY = 0.28;
    player.camYaw = 0.28;
    player.weaponIndex = 4; // Carbine Rifle
    player.aiming = true;
    player.cash = 19400;
    player.respect = 880;
    player.health = 84;
    player.armor = 58;
    player.rig.group.position.set(player.x, player.y, player.z);
    player.rig.group.rotation.y = player.rotY;
    player.rig.rightArm.rotation.x = -Math.PI * 0.48;
    player.rig.gun.visible = true;

    // Nearby getaway Palma Coupe (triggers [F] HIJACK prompt!) + cover car + CBPD cruiser
    const getaway = new Vehicle(scene, 'palma_coupe', 1.8, -14.2, 0.9, 0x1ee6dc);
    const cover2 = new Vehicle(scene, 'coral_cabrio', -8.6, -4.5, -1.25, 0xff708a);
    traffic.vehicles.push(getaway, cover2);

    const squad = police.spawnUnit('cbpd_cruiser', 11.2, 5.5, -2.35);
    squad.sirenPhase = 0.5;
    if (squad.redHalo) squad.redHalo.visible = true;

    // Close, clearly silhouetted Vargas Cartel enforcers & CBPD officer returning fire
    const e1 = traffic.spawnEnemy(2.4, -3.5, 'vargas', 'op2');
    const e2 = traffic.spawnEnemy(-4.6, 0.8, 'vargas', 'op2');
    const e3 = traffic.spawnEnemy(7.2, -5.2, 'vargas', 'op2');
    const e4 = traffic.spawnEnemy(5.6, 4.2, 'cbpd');
    for (const e of [e1, e2, e3, e4]) {
      e.rotY = Math.atan2(player.x - e.x, player.z - e.z);
      e.rig.group.rotation.y = e.rotY;
      e.rig.rightArm.rotation.x = -Math.PI * 0.46;
    }

    // Muzzle flash, crisp bullet tracers & metallic impact sparks
    combat.spawnMuzzleFlash(-2.45, 1.56, -15.7, 0xffd166);
    combat.spawnTracer(-2.45, 1.56, -15.7, 2.35, 1.42, -3.6, 0xffd166, 5.0);
    combat.spawnTracer(-2.45, 1.52, -15.7, 7.1, 1.38, -5.2, 0xffe49c, 5.0);
    combat.spawnTracer(-4.4, 1.48, 0.5, -3.0, 1.45, -15.5, 0xff5e6c, 5.0);
    combat.spawnTracer(5.4, 1.48, 3.8, -0.5, 1.32, -14.2, 0x5df7ff, 5.0);
    combat.spawnSparks(2.35, 1.42, -3.6, 12);
    combat.spawnSparks(7.1, 1.38, -5.2, 10);

    // Move mission waypoint to boardwalk so yellow pillar doesn't block center plaza action
    missions.missionIndex = 1;
    missions.stageIndex = 0;
    missions.stageKills = 2;
    missions.stageTargetKills = 4;
    missions.beaconGroup.position.set(92, 0, 86);
    missions.showCommlink(
      'TITO MORALES',
      'Watch the flanks in Solstice Plaza — boost that cyan Palma Coupe [F] once the cartel drops!',
      12,
    );

    camera.position.set(-6.4, 2.75, -21.8);
    camera.lookAt(2.8, 1.5, -2.5);
    return { freezeCamera: true, mode: 'play' };
  }

  if (shotName === 'explore') {
    // SUNLIT COASTAL OPEN-WORLD EXPLORATION: Bright Coastal Day overlooking Palma Strip's
    // pastel Art-Deco hotels, palm boardwalk, flush Cayo Brisa Causeway with lively traffic,
    // golden beach umbrellas, shimmering turquoise bay, and Calima Lighthouse on Cayo Brisa Island!
    city.applyTimePreset(2); // Crisp Coastal Day
    police.clearHeat();

    // Place Rico's golden-orange Sunset GT cleanly cruising onto the flush Cayo Brisa Causeway
    const cruiser = new Vehicle(scene, 'sunset_gt', 107, 43.2, Math.PI * 0.5, 0xff7d3b);
    cruiser.speed = 28;
    traffic.vehicles.push(cruiser);
    player.enterVehicle(cruiser);
    player.cash = 16250;
    player.respect = 640;
    player.health = 100;
    player.armor = 100;

    // Lively coastal traffic across the causeway & Palma Strip
    const t1 = new Vehicle(scene, 'coral_cabrio', 136, 43.5, Math.PI / 2, 0x2cf2e8);
    const t2 = new Vehicle(scene, 'bay_taxi', 162, 36.5, -Math.PI / 2, 0xffc42e);
    const t3 = new Vehicle(scene, 'palma_coupe', 91.5, 62, 0, 0xff6b8b);
    const t4 = new Vehicle(scene, 'sunset_gt', 84.5, 22, Math.PI, 0x3b82f6);
    traffic.vehicles.push(t1, t2, t3, t4);

    missions.missionIndex = 3; // Neon Drift Circuit across Cayo Brisa Causeway
    missions.stageIndex = 0;
    missions.raceIndex = 2;
    missions.beaconGroup.position.set(220, 0, 40);
    missions.showToast('CALIMA BAY FREE ROAM', '6 DISTRICTS · 8 STUNT RAMPS · MORALES CUSTOMS OPEN', 12);

    // Panoramic coastal camera framing Sunset GT entering Causeway, ocean, lighthouse & hotels
    camera.position.set(82, 8.2, 54);
    camera.lookAt(162, 3.6, 36);
    return { freezeCamera: true, mode: 'play' };
  }

  return { freezeCamera: false, mode: 'play' };
}
