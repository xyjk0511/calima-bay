// HUD controller, 2D Canvas Minimap & City Atlas renderer, Morales Customs Garage,
// Underground Armory shop modal, Weapon Wheel, and Title Screen bindings.

import {
  WORLD,
  DISTRICTS,
  SHOPS,
  STUNT_RAMPS,
  getDistrictAt,
  getRankName,
} from './config.js';

const CREW_ABILITIES = [
  { name: 'NADIA: RADIO JAMMER', desc: 'Scrambles CBPD dispatch & drops pursuit speed' },
  { name: 'TITO: RAPID REPAIR', desc: 'Instant vehicle hull repair & full nitro' },
  { name: 'SYNDICATE BRIBE ($600)', desc: 'Clears 1 wanted star via corrupt dispatch' },
];

export class HudController {
  constructor(callbacks) {
    this.cb = callbacks;
    this.el = {
      hud: document.getElementById('hud'),
      crosshair: document.getElementById('crosshair'),
      damageVignette: document.getElementById('damage-vignette'),
      nitroVignette: document.getElementById('nitro-vignette'),
      titleScreen: document.getElementById('title-screen'),
      titleSlots: document.getElementById('title-slot-list'),
      btnPlay: document.getElementById('btn-play'),
      btnContinue: document.getElementById('btn-continue'),
      districtName: document.getElementById('district-name'),
      timeBadge: document.getElementById('time-badge'),
      missionTag: document.getElementById('mission-tag'),
      missionDist: document.getElementById('mission-dist'),
      missionTitle: document.getElementById('mission-title'),
      missionObjective: document.getElementById('mission-objective'),
      missionProgWrap: document.getElementById('mission-progress-wrap'),
      missionProgBar: document.getElementById('mission-progress-bar'),
      radioStation: document.getElementById('radio-station'),
      stars: [...document.querySelectorAll('#wanted-stars .star')],
      dispatchBanner: document.getElementById('dispatch-banner'),
      dispatchText: document.getElementById('dispatch-text'),
      cash: document.getElementById('cash-display'),
      rank: document.getElementById('rank-badge'),
      healthBar: document.getElementById('health-bar'),
      healthVal: document.getElementById('health-val'),
      armorBar: document.getElementById('armor-bar'),
      armorVal: document.getElementById('armor-val'),
      weaponName: document.getElementById('weapon-name'),
      weaponAmmo: document.getElementById('weapon-ammo'),
      toastBanner: document.getElementById('toast-banner'),
      toastTitle: document.getElementById('toast-title'),
      toastSub: document.getElementById('toast-sub'),
      commlinkBar: document.getElementById('commlink-bar'),
      commlinkSpeaker: document.getElementById('commlink-speaker'),
      commlinkText: document.getElementById('commlink-text'),
      contextPrompt: document.getElementById('context-prompt'),
      contextKey: document.getElementById('context-key'),
      contextLabel: document.getElementById('context-label'),
      crewName: document.getElementById('crew-ability-name'),
      crewCooldown: document.getElementById('crew-cooldown'),
      vehPanel: document.getElementById('vehicle-panel'),
      vehName: document.getElementById('veh-name'),
      vehHealth: document.getElementById('veh-health-tag'),
      speedNum: document.getElementById('speed-num'),
      driftBadge: document.getElementById('drift-badge'),
      nitroBar: document.getElementById('nitro-bar'),
      minimap: document.getElementById('minimap-canvas'),
      atlasModal: document.getElementById('atlas-modal'),
      atlasCanvas: document.getElementById('atlas-canvas'),
      atlasStats: document.getElementById('atlas-stats'),
      atlasDistricts: document.getElementById('atlas-districts'),
      atlasSlots: document.getElementById('atlas-slots'),
      shopModal: document.getElementById('shop-modal'),
      shopEyebrow: document.getElementById('shop-eyebrow'),
      shopTitle: document.getElementById('shop-title'),
      shopCash: document.getElementById('shop-cash'),
      shopItems: document.getElementById('shop-items'),
      wheel: document.getElementById('weapon-wheel'),
      wheelSlots: document.getElementById('wheel-slots'),
      wheelName: document.getElementById('wheel-selected-name'),
      statusOverlay: document.getElementById('status-overlay'),
      statusHeadline: document.getElementById('status-headline'),
      statusDetail: document.getElementById('status-detail'),
    };
    this.miniCtx = this.el.minimap.getContext('2d');
    this.atlasCtx = this.el.atlasCanvas.getContext('2d');

    this.el.btnPlay.addEventListener('click', () => this.cb.onStartNew());
    this.el.btnContinue.addEventListener('click', () => this.cb.onContinue());
    document.getElementById('btn-close-atlas').addEventListener('click', () => this.cb.onToggleAtlas(false));
    document.getElementById('btn-close-shop').addEventListener('click', () => this.cb.onCloseShop());
  }

  setMode(mode) {
    const onTitle = mode === 'title';
    this.el.titleScreen.classList.toggle('hidden', !onTitle);
    this.el.hud.classList.toggle('hidden', onTitle);
  }

  refreshTitleSlots(slots) {
    this.el.titleSlots.innerHTML = '';
    const hasAny = slots.some((s) => s.data);
    this.el.btnContinue.style.opacity = hasAny ? '1' : '0.65';
    for (const s of slots) {
      const btn = document.createElement('button');
      btn.className = 'slot-btn';
      btn.innerHTML = s.data
        ? `<div class="slot-name">SLOT ${s.slot} · ${s.data.savedAt}</div><div class="slot-meta">$${s.data.cash.toLocaleString()} · OP ${(s.data.missionIndex ?? 0) + 1}</div>`
        : `<div class="slot-name">SLOT ${s.slot}</div><div class="slot-meta">Empty Career</div>`;
      btn.addEventListener('click', () => this.cb.onLoadSlot(s.slot));
      this.el.titleSlots.appendChild(btn);
    }
  }

  openAtlas(open, state) {
    this.el.atlasModal.classList.toggle('hidden', !open);
    if (!open) return;
    const { player, missions, city, police, save } = state;

    this.el.atlasStats.innerHTML = `
      <div class="stat-row"><span>Rank</span><strong>${getRankName(player.respect)}</strong></div>
      <div class="stat-row"><span>Syndicate Cash</span><strong>$${Math.round(player.cash).toLocaleString()}</strong></div>
      <div class="stat-row"><span>Operations Cleared</span><strong>${player.stats.missionsDone} / 8</strong></div>
      <div class="stat-row"><span>Stunt Jumps</span><strong>${player.stats.stuntsDone} / 8</strong></div>
      <div class="stat-row"><span>Takedowns</span><strong>${player.stats.takedowns}</strong></div>
    `;

    this.el.atlasDistricts.innerHTML = DISTRICTS.map(
      (d) =>
        `<div class="district-row"><span>${d.name}</span><span>${missions.districtStanding[d.id] || 15}%</span></div>`,
    ).join('');

    const slots = save.listSlots();
    this.el.atlasSlots.innerHTML = '';
    for (const s of slots) {
      const row = document.createElement('div');
      row.className = 'atlas-slot-row';
      row.innerHTML = `
        <span><b>Slot ${s.slot}:</b> ${s.data ? `$${s.data.cash.toLocaleString()} (${s.data.savedAt})` : 'Empty'}</span>
        <div class="atlas-slot-actions">
          <button class="mini-btn save-b">SAVE</button>
          ${s.data ? '<button class="mini-btn load-b">LOAD</button>' : ''}
        </div>
      `;
      row.querySelector('.save-b').addEventListener('click', () => this.cb.onSaveSlot(s.slot));
      const lb = row.querySelector('.load-b');
      if (lb) lb.addEventListener('click', () => this.cb.onLoadSlot(s.slot));
      this.el.atlasSlots.appendChild(row);
    }

    this._drawAtlasMap(city, player, missions, police);
  }

  openShop(shop, player, onBuy) {
    if (!shop) {
      this.el.shopModal.classList.add('hidden');
      return;
    }
    this.el.shopModal.classList.remove('hidden');
    this.el.shopCash.textContent = `$${Math.round(player.cash).toLocaleString()}`;
    this.el.shopEyebrow.textContent = shop.type === 'garage' ? 'MORALES CUSTOMS GARAGE' : 'UNDERGROUND ARMORY';
    this.el.shopTitle.textContent = shop.name;

    const items =
      shop.type === 'garage'
        ? [
            {
              id: 'respray',
              title: 'SUNSET RESPRAY & HEAT CLEAR',
              desc: 'Fresh pearlescent paint, full chassis repair & wipes all CBPD wanted stars.',
              price: 800,
            },
            {
              id: 'turbo',
              title: 'TWIN-TURBO TUNING',
              desc: '+16% top speed & acceleration on your active ride.',
              price: 1800,
            },
            {
              id: 'armor_veh',
              title: 'REINFORCED CHASSIS ARMOR',
              desc: '+60 hull integrity against CBPD rams & gunfire.',
              price: 1500,
            },
            {
              id: 'nitro_tank',
              title: 'EXTENDED NITRO CELL',
              desc: 'Longer nitro burn and faster boost recharge.',
              price: 1400,
            },
          ]
        : [
            { id: 'vest', title: 'KEVLAR BODY ARMOR', desc: 'Refills ballistic vest to 100% protection.', price: 500 },
            { id: 'ammo_pack', title: 'TACTICAL AMMO CRATE', desc: 'Refills ammunition for all owned firearms.', price: 450 },
            ...player.weapons
              .filter((w) => !w.melee && w.cost > 0)
              .map((w) => ({
                id: 'weapon_' + w.id,
                title: w.owned ? `${w.name} (REFILL)` : `BUY ${w.name}`,
                desc: `Damage ${w.damage} · Range ${w.range}m · Max Ammo ${w.maxAmmo}`,
                price: w.owned ? Math.round(w.cost * 0.25) : w.cost,
              })),
          ];

    this.el.shopItems.innerHTML = '';
    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'shop-item';
      card.innerHTML = `
        <div>
          <div class="shop-item-title">${item.title}</div>
          <div class="shop-item-desc">${item.desc}</div>
        </div>
        <div class="shop-item-foot">
          <span class="shop-price">$${item.price.toLocaleString()}</span>
          <button class="mini-btn">PURCHASE</button>
        </div>
      `;
      card.querySelector('button').addEventListener('click', () => {
        onBuy(item);
        this.el.shopCash.textContent = `$${Math.round(player.cash).toLocaleString()}`;
      });
      this.el.shopItems.appendChild(card);
    }
  }

  setWeaponWheel(open, player, onSelect) {
    this.el.wheel.classList.toggle('hidden', !open);
    if (!open) return;
    this.el.wheelName.textContent = player.currentWeapon.name;
    this.el.wheelSlots.innerHTML = '';
    const count = player.weapons.length;
    for (let i = 0; i < count; i++) {
      const w = player.weapons[i];
      const ang = (i / count) * Math.PI * 2 - Math.PI / 2;
      const sx = 180 + Math.cos(ang) * 124;
      const sy = 180 + Math.sin(ang) * 124;
      const slot = document.createElement('div');
      slot.className = `wheel-slot${i === player.weaponIndex ? ' selected' : ''}`;
      slot.style.left = `${sx}px`;
      slot.style.top = `${sy}px`;
      slot.style.opacity = w.owned ? '1' : '0.42';
      slot.innerHTML = `
        <div class="wheel-slot-key">[${w.slot}]</div>
        <div class="wheel-slot-name">${w.name}</div>
        <div class="wheel-slot-ammo">${w.melee ? 'MELEE' : w.owned ? w.ammo : 'LOCKED'}</div>
      `;
      slot.addEventListener('click', () => onSelect(i));
      this.el.wheelSlots.appendChild(slot);
    }
  }

  update(elapsed, state) {
    const { player, city, police, missions, audio, nearVehicle, nearShop } = state;
    const district = getDistrictAt(player.x, player.z);
    this.el.districtName.textContent = district.name;
    this.el.timeBadge.textContent = city.currentPreset ? city.currentPreset.label : 'GOLDEN SUNSET';
    this.el.radioStation.textContent = audio.currentStation.name;

    // Crosshair visible only when on foot
    this.el.crosshair.classList.toggle('hidden', !!player.vehicle || player.dead);

    // Damage & nitro screen edges
    this.el.damageVignette.style.opacity = String(Math.min(1, player.damageFlash * 2.4));
    this.el.nitroVignette.style.opacity = player.vehicle && player.vehicle.nitroActive ? '0.85' : '0';

    // Mission panel
    const mh = missions.getHudState(player);
    this.el.missionTag.textContent = mh.code;
    this.el.missionDist.textContent = `${mh.dist}m`;
    this.el.missionTitle.textContent = mh.title;
    this.el.missionObjective.textContent = mh.objective;
    if (mh.progress !== null) {
      this.el.missionProgWrap.classList.remove('hidden');
      this.el.missionProgBar.style.width = `${Math.round(mh.progress * 100)}%`;
    } else {
      this.el.missionProgWrap.classList.add('hidden');
    }

    // Toast & Commlink
    if (mh.toast) {
      this.el.toastBanner.classList.remove('hidden');
      this.el.toastTitle.textContent = mh.toast.title;
      this.el.toastSub.textContent = mh.toast.sub;
    } else {
      this.el.toastBanner.classList.add('hidden');
    }
    if (mh.commlink) {
      this.el.commlinkBar.classList.remove('hidden');
      this.el.commlinkSpeaker.textContent = mh.commlink.speaker;
      this.el.commlinkText.textContent = mh.commlink.line;
    } else {
      this.el.commlinkBar.classList.add('hidden');
    }

    // Wanted stars & CBPD dispatch
    const flashRed = Math.floor(elapsed * 5) % 2 === 0;
    for (let i = 0; i < 5; i++) {
      const s = this.el.stars[i];
      const on = i < police.stars;
      s.classList.toggle('active', on);
      s.classList.toggle('alert-red', on && police.stars >= 2 && flashRed);
      s.classList.toggle('alert-blue', on && police.stars >= 2 && !flashRed);
    }
    if (police.stars > 0) {
      this.el.dispatchBanner.classList.remove('hidden');
      this.el.dispatchText.textContent =
        police.jammerTimer > 0 ? 'NADIA JAMMER ACTIVE · EVADING' : police.tier.label;
    } else {
      this.el.dispatchBanner.classList.add('hidden');
    }

    // Cash, Rank, Vitals, Weapon
    this.el.cash.textContent = `$${Math.round(player.cash).toLocaleString()}`;
    this.el.rank.textContent = getRankName(player.respect);
    this.el.healthBar.style.width = `${Math.round((player.health / player.maxHealth) * 100)}%`;
    this.el.healthVal.textContent = String(Math.round(player.health));
    this.el.armorBar.style.width = `${Math.round((player.armor / player.maxArmor) * 100)}%`;
    this.el.armorVal.textContent = String(Math.round(player.armor));

    const w = player.currentWeapon;
    this.el.weaponName.textContent = w.name;
    this.el.weaponAmmo.textContent = w.melee ? 'MELEE' : `${w.ammo} / ${w.maxAmmo}`;

    // Crew ability pill
    const ability = CREW_ABILITIES[player.crewAbilityIndex % CREW_ABILITIES.length];
    this.el.crewName.textContent = ability.name;
    this.el.crewCooldown.textContent =
      player.crewCooldown > 0 ? `${Math.ceil(player.crewCooldown)}s` : 'READY';

    // Context prompts & vehicle telemetry
    if (nearShop) {
      this.el.contextPrompt.classList.remove('hidden');
      this.el.contextKey.textContent = 'E';
      this.el.contextLabel.textContent = `ENTER ${nearShop.name}`;
    } else if (!player.vehicle && nearVehicle) {
      this.el.contextPrompt.classList.remove('hidden');
      this.el.contextKey.textContent = 'F';
      this.el.contextLabel.textContent = `HIJACK ${nearVehicle.spec.name}`;
    } else {
      this.el.contextPrompt.classList.add('hidden');
    }

    if (player.vehicle) {
      const v = player.vehicle;
      this.el.vehPanel.classList.remove('hidden');
      this.el.vehName.textContent = v.spec.name;
      this.el.vehHealth.textContent = `HULL ${Math.round((v.health / v.maxHealth) * 100)}%`;
      this.el.speedNum.textContent = String(Math.round(v.speed * 3.4));
      this.el.driftBadge.classList.toggle('hidden', !v.drifting);
      this.el.nitroBar.style.width = `${Math.round(v.nitro)}%`;
    } else {
      this.el.vehPanel.classList.add('hidden');
    }

    // Wasted overlay
    this.el.statusOverlay.classList.toggle('hidden', !player.dead);

    // Live 2D Minimap
    this._drawMinimap(elapsed, city, player, missions, police, state.traffic);
  }

  _drawMinimap(elapsed, city, player, missions, police, traffic) {
    const ctx = this.miniCtx;
    const W = 212;
    const H = 212;
    const scale = 0.72; // world units -> pixels
    const toScreen = (wx, wz) => [W * 0.5 + (wx - player.x) * scale, H * 0.5 + (wz - player.z) * scale];

    // Ocean backdrop
    ctx.fillStyle = '#0e5874';
    ctx.fillRect(0, 0, W, H);

    // Mainland & Beach
    const [mlX, mlY] = toScreen(-270, -268);
    ctx.fillStyle = '#1f2940';
    ctx.fillRect(mlX, mlY, 386 * scale, 488 * scale);

    const [bx, by] = toScreen(116, -264);
    ctx.fillStyle = '#d9b578';
    ctx.fillRect(bx, by, 40 * scale, 480 * scale);

    // Cayo Brisa Causeway & Island
    const [cx, cy] = toScreen(WORLD.causewayStartX, WORLD.causewayZ - 8);
    ctx.fillStyle = '#384664';
    ctx.fillRect(cx, cy, (WORLD.causewayEndX - WORLD.causewayStartX) * scale, 16 * scale);
    const [ix, iy] = toScreen(WORLD.islandCenterX, WORLD.islandCenterZ);
    ctx.fillStyle = '#d9b578';
    ctx.beginPath();
    ctx.arc(ix, iy, 40 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Road grid
    ctx.fillStyle = '#3c4763';
    for (const ax of WORLD.avenuesX) {
      const [rx, ry] = toScreen(ax - 9, -209);
      ctx.fillRect(rx, ry, 18 * scale, 418 * scale);
    }
    for (const sz of WORLD.streetsZ) {
      const [rx, ry] = toScreen(-209, sz - 9);
      ctx.fillRect(rx, ry, 306 * scale, 18 * scale);
    }

    // Building footprints
    ctx.fillStyle = '#2b3856';
    for (const b of city.buildings) {
      const [sx, sy] = toScreen(b.x - b.w * 0.5, b.z - b.d * 0.5);
      ctx.fillRect(sx, sy, b.w * scale, b.d * scale);
    }

    // Shop icons
    for (const s of SHOPS) {
      const [sx, sy] = toScreen(s.x, s.z);
      ctx.fillStyle = s.type === 'garage' ? '#2cf2e8' : '#ff5e6c';
      ctx.beginPath();
      ctx.arc(sx, sy, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hostile cartel enemies
    ctx.fillStyle = '#ff6b6b';
    for (const e of traffic.enemies) {
      if (!e.alive) continue;
      const [ex, ey] = toScreen(e.x, e.z);
      ctx.fillRect(ex - 2.5, ey - 2.5, 5, 5);
    }

    // CBPD units blinking red/blue
    const blink = Math.floor(elapsed * 7) % 2 === 0;
    for (const u of police.units) {
      if (u.destroyed) continue;
      const [ux, uy] = toScreen(u.x, u.z);
      ctx.fillStyle = blink ? '#ff2e55' : '#2d8bff';
      ctx.beginPath();
      ctx.arc(ux, uy, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // CALIMA-1 Helicopter icon
    if (police.helicopter.active) {
      const [hx, hy] = toScreen(police.helicopter.x, police.helicopter.z);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy);
      ctx.lineTo(hx + 6, hy);
      ctx.moveTo(hx, hy - 6);
      ctx.lineTo(hx, hy + 6);
      ctx.stroke();
    }

    // Pulsing Gold Mission Waypoint (clamped to radar edge if far)
    const wp = missions.getWaypoint();
    let [wx, wy] = toScreen(wp.x, wp.z);
    wx = Math.max(10, Math.min(W - 10, wx));
    wy = Math.max(10, Math.min(H - 10, wy));
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(wx, wy, 5.5 + Math.sin(elapsed * 6) * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#12152a';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Player heading arrow at center
    ctx.save();
    ctx.translate(W * 0.5, H * 0.5);
    ctx.rotate(-player.rotY + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ff5e6c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  _drawAtlasMap(city, player, missions, police) {
    const ctx = this.atlasCtx;
    const W = 440;
    const H = 380;
    const toMap = (wx, wz) => [((wx + 270) / 610) * W, ((wz + 270) / 540) * H];

    ctx.fillStyle = '#0c4d66';
    ctx.fillRect(0, 0, W, H);

    const [mx, my] = toMap(-270, -268);
    ctx.fillStyle = '#1b243b';
    ctx.fillRect(mx, my, (386 / 610) * W, (488 / 540) * H);

    const [bx, by] = toMap(116, -264);
    ctx.fillStyle = '#d9b578';
    ctx.fillRect(bx, by, (40 / 610) * W, (480 / 540) * H);

    const [cx, cy] = toMap(WORLD.causewayStartX, WORLD.causewayZ - 8);
    ctx.fillStyle = '#3b4a6b';
    ctx.fillRect(cx, cy, ((WORLD.causewayEndX - WORLD.causewayStartX) / 610) * W, (16 / 540) * H);

    const [ix, iy] = toMap(WORLD.islandCenterX, WORLD.islandCenterZ);
    ctx.fillStyle = '#d9b578';
    ctx.beginPath();
    ctx.arc(ix, iy, (40 / 610) * W, 0, Math.PI * 2);
    ctx.fill();

    for (const b of city.buildings) {
      const [sx, sy] = toMap(b.x - b.w * 0.5, b.z - b.d * 0.5);
      ctx.fillStyle = b.color;
      ctx.fillRect(sx, sy, Math.max(2, (b.w / 610) * W), Math.max(2, (b.d / 540) * H));
    }

    for (const r of STUNT_RAMPS) {
      const [rx, ry] = toMap(r.x, r.z);
      ctx.fillStyle = '#4df0a9';
      ctx.fillRect(rx - 3, ry - 3, 6, 6);
    }
    for (const s of SHOPS) {
      const [sx, sy] = toMap(s.x, s.z);
      ctx.fillStyle = s.type === 'garage' ? '#2cf2e8' : '#ff5e6c';
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const u of police.units) {
      const [ux, uy] = toMap(u.x, u.z);
      ctx.fillStyle = '#ff2e55';
      ctx.beginPath();
      ctx.arc(ux, uy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    const wp = missions.getWaypoint();
    const [wx, wy] = toMap(wp.x, wp.z);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(wx, wy, 7, 0, Math.PI * 2);
    ctx.fill();

    const [px, py] = toMap(player.x, player.z);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff5e6c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // District labels
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 10px sans-serif';
    const labels = [
      ['MIRADOR', -175, -60],
      ['SOLSTICE', -45, -15],
      ['BARRIO CORAL', -15, -185],
      ['PALMA STRIP', 65, -40],
      ['PUERTO AZUL', -85, 165],
      ['CAYO BRISA', 245, 78],
    ];
    for (const [txt, lx, lz] of labels) {
      const [tx, ty] = toMap(lx, lz);
      ctx.fillText(txt, tx - 22, ty);
    }
  }
}
