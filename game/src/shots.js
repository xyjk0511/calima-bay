// Deterministic real-simulation shot staging (?shot=chase|combat|explore|title&seed=1)
// Uses the exact live Three.js v2 world, sculpted vehicles, destructible CALIMA-1 helicopter,
// arched palm trees, harbor yachts, neon marquees, crosshair + crimson hitmarker, cash drops & HUD.

import { Vehicle } from './vehicles.js';

export function applyShotStaging(shotName, ctx) {
  const { scene, camera, city, player, traffic, police, combat, missions, hud } = ctx;

  if (shotName === 'title') {
    // Panoramic Golden Sunset vista over upgraded neon skyline, arched palms,
    // golden beach, shimmering sunset ocean path, harbor yachts & causeway traffic!
    city.applyTimePreset(0);
    hud.setMode('title');
    const c1 = new Vehicle(scene, 'sunset_gt', 91.5, -24, 0, 0xff3358);
    const c2 = new Vehicle(scene, 'coral_cabrio', 84.5, 6, Math.PI, 0x2cf2e8);
    const c3 = new Vehicle(scene, 'palma_coupe', 142, 43.2, Math.PI / 2, 0xffd166);
    const c4 = new Vehicle(scene, 'sunset_gt', 166, 36.5, -Math.PI / 2, 0x2cf2e8);
    traffic.vehicles.push(c1, c2, c3, c4);
    camera.position.set(178, 25, 108);
    camera.lookAt(82, 11, -18);
    return { freezeCamera: true, mode: 'title' };
  }

  hud.setMode('play');

  if (shotName === 'chase') {
    // COVER SHOT: Golden Sunset Palma Strip 4-Star pursuit with sculpted Sunset GT +
    // cyan neon underglow + twin nitro flames + dark tire drift skid marks + smoke,
    // 2 sleek flanking CBPD interceptors with push-bars & pulsing road-glow,
    // striped orange/white roadblock with flashing cones & fiery explosion ahead,
    // sculpted CALIMA-1 helicopter with blurred rotor disc & spotlight cone, arched palms & harbor yachts!
    city.applyTimePreset(0);
    police.setWantedLevel(4);
    police.clearAllUnits();

    for (const v of traffic.vehicles) {
      if (Math.abs(v.x - 88) < 18 && v.z > -30 && v.z < 80) {
        v.x = -180;
        v.group.position.x = -180;
      }
    }

    const heroCar = new Vehicle(scene, 'sunset_gt', 88.5, 14, 0.34, 0xff2b52);
    heroCar.speed = 48;
    heroCar.vx = Math.sin(0.34) * 46;
    heroCar.vz = Math.cos(0.34) * 46;
    heroCar.drifting = true;
    heroCar.nitroActive = true;
    heroCar.nitro = 82;
    for (const flame of heroCar.nitroFlames) flame.visible = true;
    traffic.vehicles.push(heroCar);
    player.enterVehicle(heroCar);
    player.cash = 28650;
    player.respect = 1120;
    player.health = 92;
    player.armor = 74;

    // Persistent dark rubber drift skid marks trailing behind the drifting Sunset GT!
    for (let i = 0; i < 14; i++) {
      const t = i * 0.92;
      const sx = 88.0 - Math.sin(0.34) * (2.2 + t);
      const sz = 13.6 - Math.cos(0.34) * (2.2 + t);
      combat.spawnSkidMark(sx - 0.9, 0.08, sz + 0.3, 0.34, 0.48 - i * 0.02);
      combat.spawnSkidMark(sx + 0.9, 0.08, sz - 0.3, 0.34, 0.48 - i * 0.02);
    }

    // 2 sleek pursuing CBPD units framing the Sunset GT with pulsing lightbar halos & road glow
    const chase1 = police.spawnUnit('cbpd_interceptor', 82.6, 4.4, 0.22);
    chase1.sirenPhase = 0.5;
    if (chase1.redHalo) chase1.redHalo.visible = true;
    if (chase1.blueHalo) chase1.blueHalo.visible = false;
    if (chase1.sirenRoadGlow) chase1.sirenRoadGlow.material.color.setHex(0xff2244);

    const chase2 = police.spawnUnit('cbpd_cruiser', 94.6, 6.8, -0.18);
    chase2.sirenPhase = 3.6;
    if (chase2.redHalo) chase2.redHalo.visible = false;
    if (chase2.blueHalo) chase2.blueHalo.visible = true;
    if (chase2.sirenRoadGlow) chase2.sirenRoadGlow.material.color.setHex(0x2d8bff);

    // Upgraded striped orange/white CBPD roadblock + flashing cones + SWAT Enforcer ahead
    police.spawnRoadblockAt(88, 50, 0, traffic);
    const blk1 = police.spawnUnit('cbpd_cruiser', 82.2, 54, 1.15);
    blk1.sirenPhase = 0.6;
    const blk2 = police.spawnUnit('swat_enforcer', 94.6, 53.5, -1.1);
    blk2.sirenPhase = 3.7;

    // Burning wrecked SUV near the roadblock
    const wreck = new Vehicle(scene, 'mesa_suv', 96.5, 35, 0.72, 0x222026);
    wreck.destroyed = true;
    wreck.health = 0;
    wreck.bodyMat.color.setHex(0x232024);
    traffic.vehicles.push(wreck);

    // Sculpted CALIMA-1 Police Helicopter hovering dynamically above Palma Strip
    police.helicopter.placeForStaging(105, 21.5, 38, 89, 15.5);
    police.helicopter.mainRotor.rotation.y = 0.45;

    for (let i = 0; i < 12; i++) {
      combat.spawnSmoke(
        86.6 - i * 0.42 + (i % 2) * 0.9,
        0.3 + (i % 3) * 0.26,
        11.2 - i * 0.58,
        0xf4f7ff,
        0.7 + i * 0.05,
      );
    }
    combat.spawnExplosion(96.5, 1.4, 35, 1.3);
    combat.spawnTracer(104.5, 20.0, 37.2, 91.5, 1.6, 21, 0xff5e6c, 5.0);
    combat.spawnTracer(83.2, 1.35, 6.0, 88.2, 1.1, 13.5, 0x5df7ff, 5.0);

    missions.missionIndex = 4;
    missions.stageIndex = 1;
    missions.showCommlink(
      'NADIA CRUZ',
      'CBPD interceptors on both flanks & CALIMA-1 locked on — punch SHIFT nitro past the roadblock!',
      12,
    );

    camera.position.set(85.2, 4.9, -6.2);
    camera.lookAt(90.5, 3.8, 28);
    return { freezeCamera: true, mode: 'play' };
  }

  if (shotName === 'combat') {
    // NEON DUSK SOLSTICE PLAZA SHOOTOUT: Rico Vega with crisp center crosshair +
    // blazing crimson × hitmarker firing Carbine Rifle with muzzle flash & tracers,
    // Vargas cartel & sleek CBPD cruiser, downed enemy + glowing spinning cash drop +
    // floating +1 TAKEDOWN · +$320 kill-feed toast, neon marquees & [F] HIJACK prompt!
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
    player.cash = 19720;
    player.respect = 910;
    player.health = 84;
    player.armor = 58;
    player.rig.group.position.set(player.x, player.y, player.z);
    player.rig.group.rotation.y = player.rotY;
    player.rig.rightArm.rotation.x = -Math.PI * 0.48;
    player.rig.gun.visible = true;

    const getaway = new Vehicle(scene, 'palma_coupe', 1.8, -14.2, 0.9, 0x1ee6dc);
    const cover2 = new Vehicle(scene, 'coral_cabrio', -8.6, -4.5, -1.25, 0xff708a);
    traffic.vehicles.push(getaway, cover2);

    const squad = police.spawnUnit('cbpd_cruiser', 11.2, 5.5, -2.35);
    squad.sirenPhase = 0.5;
    if (squad.redHalo) squad.redHalo.visible = true;
    if (squad.sirenRoadGlow) squad.sirenRoadGlow.material.color.setHex(0xff2244);

    // Vargas Cartel enforcers + CBPD officer + 1 downed enforcer with glowing Cash Bundle drop!
    const e1 = traffic.spawnEnemy(2.4, -3.5, 'vargas', 'op2');
    const e2 = traffic.spawnEnemy(-4.6, 0.8, 'vargas', 'op2');
    const e3 = traffic.spawnEnemy(7.2, -5.2, 'vargas', 'op2');
    const e4 = traffic.spawnEnemy(5.6, 4.2, 'cbpd');
    for (const e of [e1, e2, e3, e4]) {
      e.rotY = Math.atan2(player.x - e.x, player.z - e.z);
      e.rig.group.rotation.y = e.rotY;
      e.rig.rightArm.rotation.x = -Math.PI * 0.46;
    }

    // Downed Vargas collector clearly visible in open plaza foreground + glowing Cash Bundle drop!
    const downed = traffic.spawnEnemy(0.6, -9.8, 'vargas', 'op2');
    downed.alive = false;
    downed.health = 0;
    downed.rig.group.rotation.x = Math.PI / 2;
    downed.rig.group.position.set(0.6, 0.28, -9.8);
    const cashMesh = traffic.spawnCashDrop(2.1, -11.2, 125);
    cashMesh.scale.setScalar(1.35);

    // Muzzle flash, crisp tracers, red/orange hit burst particles & sparks
    combat.spawnMuzzleFlash(-2.45, 1.56, -15.7, 0xffd166);
    combat.spawnTracer(-2.45, 1.56, -15.7, 2.35, 1.42, -3.6, 0xffd166, 5.0);
    combat.spawnTracer(-2.45, 1.52, -15.7, 7.1, 1.38, -5.2, 0xffe49c, 5.0);
    combat.spawnTracer(-4.4, 1.48, 0.5, -3.0, 1.45, -15.5, 0xff5e6c, 5.0);
    combat.spawnTracer(5.4, 1.48, 3.8, -0.5, 1.32, -14.2, 0x5df7ff, 5.0);
    combat.spawnHitBurst(2.35, 1.42, -3.6, true);
    combat.spawnSparks(7.1, 1.38, -5.2, 10);

    // Activate crisp crimson × hitmarker + floating kill-feed toast!
    hud.flashHitmarker(true, 99);
    hud.pushKillFeed('HEADSHOT · +$320 TAKEDOWN', 'headshot', 99);

    missions.missionIndex = 1;
    missions.stageIndex = 0;
    missions.stageKills = 2;
    missions.stageTargetKills = 4;
    missions.beaconGroup.position.set(92, 0, 86);
    missions.showCommlink(
      'TITO MORALES',
      'Watch the flanks in Solstice Plaza — grab the cash drop & boost that cyan Palma Coupe [F]!',
      12,
    );

    camera.position.set(-6.4, 2.75, -21.8);
    camera.lookAt(2.4, 1.42, -3.6);
    return { freezeCamera: true, mode: 'play' };
  }

  if (shotName === 'explore') {
    // SUNLIT COASTAL DAY: Sculpted Sunset GT cruising past arched palms & lively traffic
    // toward Cayo Brisa Causeway, 6 gleaming harbor yachts & sailboats on shimmering turquoise bay,
    // Calima Lighthouse beam, stunt ramp, glowing race gate beacon & District HUD!
    city.applyTimePreset(2); // Crisp Coastal Day
    police.clearHeat();

    // Keep beach sand clean of stray street traffic
    for (const v of traffic.vehicles) {
      if (v.x > 100) {
        v.x = -160;
        v.group.position.x = -160;
      }
    }

    const cruiser = new Vehicle(scene, 'sunset_gt', 107, 43.2, Math.PI * 0.5, 0xff6e3b);
    cruiser.speed = 28;
    traffic.vehicles.push(cruiser);
    player.enterVehicle(cruiser);
    player.cash = 16250;
    player.respect = 640;
    player.health = 100;
    player.armor = 100;

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

    camera.position.set(82, 8.2, 54);
    camera.lookAt(168, 3.6, 36);
    return { freezeCamera: true, mode: 'play' };
  }

  return { freezeCamera: false, mode: 'play' };
}
