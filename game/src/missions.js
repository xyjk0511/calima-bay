// 8 multi-stage Story Operations for Calima Bay: Sunset Syndicate with glowing 3D
// waypoint beacons, street-race checkpoints, commlink briefings, and district standing.

import * as THREE from 'three';
import { MISSIONS, DISTRICTS } from './config.js';

export class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.missionIndex = 0;
    this.stageIndex = 0;
    this.raceIndex = 0;
    this.stageKills = 0;
    this.stageTargetKills = 0;
    this.completedIds = new Set();
    this.districtStanding = Object.fromEntries(DISTRICTS.map((d) => [d.id, 15]));
    this.commlink = null;
    this.commlinkTimer = 0;
    this.toast = null;
    this.toastTimer = 0;

    // Glowing 3D Mission Waypoint Pillar + Rotating Diamond Ring
    this.beaconGroup = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.8, 38, 16, 1, true), beamMat);
    this.beam.position.y = 19;
    this.beaconGroup.add(this.beam);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.4, 28), ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.22;
    this.beaconGroup.add(this.ring);

    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.45, 0),
      new THREE.MeshBasicMaterial({ color: 0xffd166 }),
    );
    diamond.position.y = 5.4;
    this.diamond = diamond;
    this.beaconGroup.add(diamond);

    this.scene.add(this.beaconGroup);
  }

  get activeMission() {
    return MISSIONS[this.missionIndex % MISSIONS.length];
  }

  get activeStage() {
    const m = this.activeMission;
    return m.stages[Math.min(this.stageIndex, m.stages.length - 1)];
  }

  getWaypoint() {
    const st = this.activeStage;
    if (st.type === 'race') {
      const cp = st.checkpoints[Math.min(this.raceIndex, st.checkpoints.length - 1)];
      return { x: cp.x, z: cp.z };
    }
    return { x: st.x, z: st.z };
  }

  showToast(title, sub, duration = 4.2) {
    this.toast = { title, sub };
    this.toastTimer = duration;
  }

  showCommlink(speaker, line, duration = 6.5) {
    this.commlink = { speaker, line };
    this.commlinkTimer = duration;
  }

  startStage(traffic, police) {
    const st = this.activeStage;
    this.stageKills = 0;
    this.stageTargetKills = st.count || 0;
    this.raceIndex = 0;

    if (st.speaker && st.line) {
      this.showCommlink(st.speaker, st.line, 7.0);
    }
    if (st.triggerWanted && police && police.stars < st.triggerWanted) {
      police.setWantedLevel(st.triggerWanted);
    }
    if (st.type === 'eliminate' && traffic) {
      for (let i = 0; i < st.count; i++) {
        const ang = (i / st.count) * Math.PI * 2;
        const dist = 6 + (i % 3) * 4.5;
        traffic.spawnEnemy(
          st.x + Math.cos(ang) * dist,
          st.z + Math.sin(ang) * dist,
          'vargas',
          this.activeMission.id,
        );
      }
    }
  }

  onEnemyKilled(enemy, traffic, police, player, audio) {
    player.stats.takedowns += 1;
    player.cash += enemy.faction === 'cbpd' ? 180 : 320;
    player.respect += 18;
    const st = this.activeStage;
    if (st.type === 'eliminate' && enemy.missionTag === this.activeMission.id) {
      this.stageKills += 1;
      if (this.stageKills >= this.stageTargetKills) {
        this._advanceStage(traffic, police, player, audio);
      }
    }
  }

  _advanceStage(traffic, police, player, audio) {
    const m = this.activeMission;
    if (this.stageIndex + 1 < m.stages.length) {
      this.stageIndex += 1;
      if (audio) audio.playChime(587);
      this.startStage(traffic, police);
    } else {
      // Mission complete!
      this.completedIds.add(m.id);
      player.cash += m.rewardCash;
      player.respect += m.rewardRespect;
      player.stats.missionsDone += 1;
      this.districtStanding[m.district] = Math.min(100, (this.districtStanding[m.district] || 15) + 35);
      this.showToast(
        `OPERATION COMPLETE: ${m.title}`,
        `+$${m.rewardCash.toLocaleString()} · +${m.rewardRespect} RESPECT`,
        5.0,
      );
      if (audio) audio.playChime(784);
      this.missionIndex = (this.missionIndex + 1) % MISSIONS.length;
      this.stageIndex = 0;
      this.startStage(traffic, police);
    }
  }

  update(dt, elapsed, player, traffic, police, audio) {
    if (this.commlinkTimer > 0) {
      this.commlinkTimer -= dt;
      if (this.commlinkTimer <= 0) this.commlink = null;
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast = null;
    }

    const wp = this.getWaypoint();
    this.beaconGroup.position.set(wp.x, 0, wp.z);
    this.diamond.rotation.y = elapsed * 2.4;
    this.diamond.position.y = 5.2 + Math.sin(elapsed * 3.2) * 0.7;
    const pulse = 1 + Math.sin(elapsed * 4.0) * 0.12;
    this.ring.scale.set(pulse, pulse, 1);

    const dist = Math.hypot(player.x - wp.x, player.z - wp.z);
    const st = this.activeStage;

    if (st.type === 'drive_to') {
      const okVeh = !st.requireVehicle || !!player.vehicle;
      if (dist <= (st.radius || 14) && okVeh) {
        this._advanceStage(traffic, police, player, audio);
      }
    } else if (st.type === 'race') {
      if (dist <= 13) {
        this.raceIndex += 1;
        if (audio) audio.playChime(660 + this.raceIndex * 55);
        if (this.raceIndex >= st.checkpoints.length) {
          this._advanceStage(traffic, police, player, audio);
        }
      }
    }
  }

  getHudState(player) {
    const m = this.activeMission;
    const st = this.activeStage;
    const wp = this.getWaypoint();
    const dist = Math.round(Math.hypot(player.x - wp.x, player.z - wp.z));
    let progress = null;
    if (st.type === 'eliminate' && this.stageTargetKills > 0) {
      progress = this.stageKills / this.stageTargetKills;
    } else if (st.type === 'race') {
      progress = this.raceIndex / st.checkpoints.length;
    }
    return {
      code: m.code,
      title: m.title,
      objective:
        st.type === 'eliminate'
          ? `${st.objective} (${this.stageKills}/${this.stageTargetKills})`
          : st.type === 'race'
            ? `${st.objective} (${this.raceIndex}/${st.checkpoints.length})`
            : st.objective,
      dist,
      progress,
      waypoint: wp,
      commlink: this.commlink,
      toast: this.toast,
    };
  }
}
