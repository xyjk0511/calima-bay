# Calima Bay: Sunset Syndicate — Experiment Log

## v2 (Full Combat, 3D Visuals & Polish Overhaul)

### Goals
- Fix live playtest feedback (**full-world lethality & aiming**) so every target in Calima Bay (Vargas Cartel, CBPD officers, civilian pedestrians, vehicles, and `CALIMA-1` Police Helicopter) is responsive, visceral, and killable with zero parallax miss.
- Deliver a dramatic 3D visual leap across vehicles, `CALIMA-1` helicopter, arched tropical palms, shimmering sunset ocean + harbor yachts, wet-sheen roads, and 3D framed neon marquees.
- Make the `[TAB]` Pause City Atlas interactive with clickable Mission Operations launching.

### Gameplay & Combat Upgrades (`combat.js`, `traffic.js`, `player.js`, `audio.js`, `hud.js`, `main.js`)
- **True 3D Camera Center Ray Aiming + Seamless Mouse Look**:
  - Added Pointer Lock on canvas click (`canvas.requestPointerLock?.()`, cleanly released on `Tab`/`Esc`/Shop/Weapon Wheel) plus non-locked drag/cursor aiming fallback.
  - Added `THREE.Raycaster` from NDC `(0, 0)` through `camera` with forgiving `1.45m` humanoid hit sphere + `2x` vertical headshot bonus, firing tracers from Rico's barrel directly to the aimed 3D point.
  - Added dynamic center crosshair reticle (expands on fire, tightens on RMB ADS FOV zoom, flashes white/crimson `×` hitmarker on hit/kill) and floating Kill Feed toasts.
- **Full-World Lethality & Loot Loop**:
  - `traffic.pedestrians` (40 HP) are fully killable by firearms, baton, grenades, and high-speed vehicle impacts — emitting red/orange hit burst particles, collapsing, dropping glowing spinning collectible **Cash Bundles (`+$45–$140`)** auto-collected on foot or driving, triggering panic, and escalating CBPD wanted heat.
  - **`CALIMA-1` Police Helicopter** is shootable out of the sky (350 HP -> smoke/fire -> fiery spiral crash explosion -> `+$1,500` bounty).
  - Added **Drive-By Shooting** (LMB inside vehicles using Micro-SMG / Pistol) and **Quick Bouncing Arc Grenades** (`[G]` key & slot `[6]`) with blinking LED, smoke trail, bounce physics, and vehicle-launching blast shockwave.
  - Spawned 2 Vargas Cartel street crews near Palma Strip & Solstice Plaza for immediate action seconds after hitting Play.
  - Added procedural Web Audio hit-confirm ticks, cash pickup chimes, and grenade bounce thumps (`audio.js`).

### 3D Visual Overhaul (`vehicles.js`, `city.js`, `textures.js`, `police.js`)
- **Sculpted Multi-Part 3D Vehicles**: Replaced boxy chassis with extruded aerodynamic profiles (sloped wedge hoods, beveled reflective glass cabins, wheel wells, 5-spoke bright metallic alloy rims with brake calipers, chrome grilles, recessed LED headlights + wide crimson tail-light bars, twin chrome exhausts, cyan/coral neon underglow, and black/white CBPD interceptors with blue/gold livery, front push-bumper bullbars, twin lightbars & pulsing road-glow pools) plus persistent fading **tire drift skid marks**.
- **Sculpted `CALIMA-1` Helicopter**: Tapered fuselage, rounded glass cockpit nose, turbine housing, elongated tapered tail boom + stabilizers, tubular landing skids, and translucent blurred spinning main rotor disc.
- **Lush Tropical City & Harbor**: Arched 5-segment palm trunks with coconut clusters and 8 multi-segment drooping palm fronds, animated sunset water reflection shimmer path + 3-layer surf foam, **6 detailed 3D white motor-yachts & sailboats** bobbing in Calima Bay, upgraded `512×512` Art-Deco/glass facades with recessed windows & glowing lobbies, framed **3D Neon Marquee Signs**, wet-sheen asphalt with warm streetlamp glow pools, and striped orange/white CBPD roadblocks with flashing cones & cover officers.

### Verification & Visual Polish Pass 2
- **Live Chrome Combat Smoke Test (PASS)**:
  - Verified `0` console errors, `0` uncaught pageerrors, `0` external network requests.
  - Verified live pedestrian kill (`pedestriansKilled: 1`, `wanted: 1`), Cash Bundle pickup (`$12,450 -> $12,549`), Vargas Cartel enemy kill (`takedowns: 2`, `$12,549 -> $12,869`), bouncing grenade detonation (`6 -> 5`), interactive City Atlas 8-Operation launch (`HARBOR CONTRABAND`), Radio `[R]`, Sky `[T]`, and Quick Save `[F5]`.
- **Visual Polish Pass 2 (after inspecting all 4 screenshots)**:
  - Moved `#kill-feed` toast cleanly to `top: 108px` so Rico Vega, muzzle flash, tracers, crimson `×` hitmarker, and foreground glowing Cash Bundle drop are 100% unobstructed in `2-combat.jpg`.
  - Fixed top-right Drive-By weapon label wrapping (`MICRO-SMG` + `[DRIVE-BY · LMB / G GRENADE]`).
  - Unified Cayo Brisa Causeway into a single seamless flush bridge deck and clamped initial east-west traffic within the mainland street grid so Palma Beach sand stays spotless in `3-explore.jpg`.
  - Refined headlight halo cones and framed two white motor-yachts in the sunset turquoise bay in `4-title.jpg`.

---

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
