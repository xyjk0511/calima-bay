// 3-Slot localStorage Save/Load persistence & Quick Save for Calima Bay: Sunset Syndicate.

const PREFIX = 'calima_bay_slot_';

export class SaveManager {
  listSlots() {
    const out = [];
    for (let i = 1; i <= 3; i++) {
      try {
        const raw = localStorage.getItem(PREFIX + i);
        out.push({ slot: i, data: raw ? JSON.parse(raw) : null });
      } catch {
        out.push({ slot: i, data: null });
      }
    }
    return out;
  }

  saveSlot(slot, player, missions, timeIndex, radioIndex) {
    const payload = {
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cash: Math.round(player.cash),
      respect: Math.round(player.respect),
      health: Math.round(player.health),
      armor: Math.round(player.armor),
      x: Math.round(player.x),
      z: Math.round(player.z),
      weaponIndex: player.weaponIndex,
      weapons: player.weapons.map((w) => ({ id: w.id, owned: w.owned, ammo: w.ammo })),
      stats: { ...player.stats },
      missionIndex: missions.missionIndex,
      stageIndex: missions.stageIndex,
      completedIds: [...missions.completedIds],
      districtStanding: { ...missions.districtStanding },
      timeIndex,
      radioIndex,
    };
    try {
      localStorage.setItem(PREFIX + slot, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  loadSlot(slot, player, missions, city, audio, traffic, police) {
    try {
      const raw = localStorage.getItem(PREFIX + slot);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (player.vehicle) player.exitVehicle();
      player.cash = d.cash ?? 12450;
      player.respect = d.respect ?? 320;
      player.health = d.health ?? 100;
      player.armor = d.armor ?? 60;
      player.x = d.x ?? 84;
      player.z = d.z ?? -24;
      player.y = city.getGroundHeight(player.x, player.z);
      player.weaponIndex = d.weaponIndex ?? 4;
      if (Array.isArray(d.weapons)) {
        for (const savedW of d.weapons) {
          const target = player.weapons.find((w) => w.id === savedW.id);
          if (target) {
            target.owned = !!savedW.owned;
            target.ammo = savedW.ammo ?? target.ammo;
          }
        }
      }
      if (d.stats) player.stats = { ...player.stats, ...d.stats };
      missions.missionIndex = d.missionIndex ?? 0;
      missions.stageIndex = d.stageIndex ?? 0;
      missions.completedIds = new Set(d.completedIds || []);
      if (d.districtStanding) missions.districtStanding = { ...d.districtStanding };
      if (typeof d.timeIndex === 'number') city.applyTimePreset(d.timeIndex);
      if (typeof d.radioIndex === 'number') audio.radioIndex = d.radioIndex;
      police.clearHeat();
      missions.startStage(traffic, police);
      return true;
    } catch {
      return false;
    }
  }
}
