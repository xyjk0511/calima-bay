# Calima Bay: Sunset Syndicate — Experiment Log

## v1 (Initial Full 3D Release)

### Goals
- Deliver a 100% original-IP, offline-ready 3D WebGL (Three.js r169) open-world crime action game set in **Calima Bay**.
- Align across all five competition dimensions:
  1. Sun-soaked coastal atmosphere & golden-sunset visual readability.
  2. Seamless six-district world with living traffic, reacting pedestrians, and Cayo Brisa Causeway + Lighthouse.
  3. Deep gameplay loop: 8 multi-stage Story Operations, 5-star CBPD dispatch with `CALIMA-1` Air One volumetric searchlight helicopter, 6-weapon arsenal + weapon wheel, Morales Customs tuning/respray, Underground Armory, 8 stunt ramps, 4 procedural FM radio stations, dynamic time-of-day, and 3-slot career save.
  4. Strict 100% original IP & zero network requests.
  5. Clean modular ES module architecture under `game/src/`.

### Visual Verification & Polish Pass
- Captured all 4 real 1280×720 screenshots via headless Chrome CDP (`1-chase.jpg`, `2-combat.jpg`, `3-explore.jpg`, `4-title.jpg`) and inspected every frame.
- **Polish Pass 1**:
  - Upgraded `1-chase.jpg` cover staging so two pursuing CBPD interceptors with glowing red/blue lightbar halos frame the drifting Sunset GT alongside cyan nitro flames, `CALIMA-1` helicopter canopy/livery highlights, atmospheric volumetric spotlight cone, roadblock, and burning wreck.
  - Upgraded character silhouettes (`player.js`) from blocky boxes to tapered torsos, rounded shoulders/heads, sneakers, and multi-part rifle meshes; added warm Solstice Plaza illumination and `[F] HIJACK` action prompt in `2-combat.jpg`.
  - Replaced flat beach plane with a sloped coastal bank + surf foam ribbon and seamless flush Cayo Brisa Causeway approach (`city.js`), eliminating bridge/sand seam artifacts in `3-explore.jpg` and `4-title.jpg`.
  - Tightened title button label (`PLAY CALIMA BAY`) to stay single-line and framed `4-title.jpg` closer to the neon coastal skyline.
- **Verification**:
  - Interactive smoke test passed (`btn-play`, Radio `[R]`, Sky `[T]`, Weapon Wheel `[Q]`, City Atlas `[Tab]`, Quick Save `[F5]` -> `localStorage` persisted).
  - Zero runtime/console errors and zero external network requests.
  - Deterministic `main.ts` build verified byte-identical across two independent runs (`dossier.json` SHA-256 match).
