// High-resolution procedural CanvasTexture generator for Calima Bay wet-sheen roads,
// Art-Deco oceanfront hotels, glass towers, ground-floor lobbies, shipping containers,
// golden beaches, glowing 3D neon marquee signs, and vehicle livery stripes. Zero external assets.

import * as THREE from 'three';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

function finalizeTexture(canvas, repeatX = 1, repeatY = 1, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createRoadTexture(vertical = true) {
  const { canvas, ctx } = makeCanvas(512, 512);
  // Rich coastal wet-sheen asphalt base with subtle tire-track polish
  ctx.fillStyle = '#1f2330';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle darker worn tire lanes
  ctx.fillStyle = 'rgba(10, 12, 20, 0.26)';
  ctx.fillRect(92, 0, 60, 512);
  ctx.fillRect(168, 0, 56, 512);
  ctx.fillRect(288, 0, 56, 512);
  ctx.fillRect(360, 0, 60, 512);

  // Fine mineral asphalt speckle
  for (let i = 0; i < 4200; i++) {
    const x = (i * 97 + (i % 13) * 19) % 512;
    const y = (i * 193 + (i % 7) * 31) % 512;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.09)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.save();
  if (!vertical) {
    ctx.translate(256, 256);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-256, -256);
  }
  // Concrete curb shoulders
  ctx.fillStyle = '#535b70';
  ctx.fillRect(0, 0, 18, 512);
  ctx.fillRect(494, 0, 18, 512);
  ctx.fillStyle = '#33394a';
  ctx.fillRect(18, 0, 5, 512);
  ctx.fillRect(489, 0, 5, 512);

  // Crisp white shoulder lines
  ctx.fillStyle = 'rgba(255, 250, 238, 0.86)';
  ctx.fillRect(28, 0, 7, 512);
  ctx.fillRect(477, 0, 7, 512);

  // Vibrant double-amber centerline with subtle glow
  ctx.fillStyle = '#ffc145';
  ctx.fillRect(245, 0, 8, 512);
  ctx.fillRect(259, 0, 8, 512);

  // Crisp white dashed lane dividers
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  for (let y = 18; y < 512; y += 96) {
    ctx.fillRect(136, y, 6, 46);
    ctx.fillRect(370, y, 6, 46);
  }
  ctx.restore();
  return finalizeTexture(canvas, 1, 1);
}

export function createIntersectionTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = '#1f2330';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i++) {
    const x = (i * 89) % 512;
    const y = (i * 157) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.07)';
    ctx.fillRect(x, y, 2, 2);
  }
  // Crisp white stop bars + zebra crosswalk stripes on all four approaches
  ctx.fillStyle = 'rgba(255, 250, 240, 0.84)';
  for (let i = 54; i < 458; i += 40) {
    ctx.fillRect(i, 16, 22, 52);
    ctx.fillRect(i, 444, 22, 52);
    ctx.fillRect(16, i, 52, 22);
    ctx.fillRect(444, i, 52, 22);
  }
  // Subtle stop lines
  ctx.fillStyle = 'rgba(255, 210, 120, 0.32)';
  ctx.fillRect(78, 78, 356, 4);
  ctx.fillRect(78, 430, 356, 4);
  return finalizeTexture(canvas, 1, 1);
}

export function createBuildingFacadeTexture(style, seed = 1) {
  const { canvas, ctx } = makeCanvas(512, 512);
  const palettes = {
    artdeco: {
      base: ['#f7c2cc', '#fae5d6', '#a8efe5', '#ffdcb2', '#f4cbf0'][seed % 5],
      stucco: 'rgba(255, 248, 240, 0.14)',
      trim: ['#ff4d79', '#2cf2e8', '#ffd166', '#ff8c42'][seed % 4],
      winDark: '#16203b',
      winGlow: '#ffe099',
      winGlowAlt: '#7ffbf5',
    },
    glass: {
      base: ['#15243e', '#122038', '#1c2f4f', '#17314a'][seed % 4],
      stucco: 'rgba(130, 220, 255, 0.08)',
      trim: ['#39c5e8', '#ffd166', '#67e8f9', '#f472b6'][seed % 4],
      winDark: '#0b1528',
      winGlow: '#ffd88a',
      winGlowAlt: '#6beeff',
    },
    barrio: {
      base: ['#e47c60', '#eca86e', '#dc6c6c', '#f5cf92', '#cc7054'][seed % 5],
      stucco: 'rgba(255, 240, 220, 0.12)',
      trim: ['#fff4e0', '#3d405b', '#2ec4b6', '#ffbe0b'][seed % 4],
      winDark: '#23192b',
      winGlow: '#ffd578',
      winGlowAlt: '#ffa075',
    },
    villa: {
      base: ['#f8f1e7', '#f4e6d2', '#efeae1', '#fcebd9'][seed % 4],
      stucco: 'rgba(255, 255, 255, 0.14)',
      trim: ['#d97757', '#2a9d8f', '#e9c46a'][seed % 3],
      winDark: '#1f3042',
      winGlow: '#ffe2a2',
      winGlowAlt: '#fff5d6',
    },
    warehouse: {
      base: ['#434f61', '#584e47', '#3a4c59', '#4f4652'][seed % 4],
      stucco: 'rgba(255, 255, 255, 0.06)',
      trim: ['#ff9f1c', '#2ec4b6', '#e71d36'][seed % 3],
      winDark: '#181e28',
      winGlow: '#ffd274',
      winGlowAlt: '#8be9fd',
    },
  };
  const p = palettes[style] || palettes.artdeco;

  ctx.fillStyle = p.base;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle architectural stucco/panel texture grain
  ctx.fillStyle = p.stucco;
  for (let y = 0; y < 512; y += 8) {
    ctx.fillRect(0, y, 512, 2);
  }

  // Warm sunset bounce top gradient & grounded street shadow
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, 'rgba(255, 220, 168, 0.26)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
  grad.addColorStop(1, 'rgba(12, 16, 34, 0.38)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Art-Deco fluted pilasters, horizontal cornices & balcony ledges
  ctx.fillStyle = p.trim;
  if (style === 'artdeco') {
    ctx.fillRect(0, 0, 512, 16);
    ctx.fillRect(0, 24, 512, 6);
    ctx.fillRect(0, 424, 512, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(14, 0, 14, 512);
    ctx.fillRect(484, 0, 14, 512);
    ctx.fillRect(249, 28, 14, 396);
  } else if (style === 'glass') {
    ctx.fillStyle = 'rgba(130, 225, 255, 0.22)';
    for (let x = 0; x < 512; x += 64) ctx.fillRect(x, 0, 5, 512);
    ctx.fillStyle = p.trim;
    ctx.fillRect(0, 0, 512, 12);
    ctx.fillRect(0, 424, 512, 8);
  } else {
    ctx.fillRect(0, 0, 512, 14);
    ctx.fillRect(0, 424, 512, 10);
  }

  // Detailed recessed windows with frames, interior warm lighting & sunset reflections
  const cols = style === 'glass' ? 6 : 4;
  const rows = style === 'warehouse' ? 4 : 8;
  const padX = style === 'glass' ? 20 : 38;
  const padTop = 44;
  const cellW = (512 - padX * 2) / cols;
  const cellH = (414 - padTop) / rows;

  let rng = (seed * 9301 + 49297) % 233280;
  const nextR = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = padX + c * cellW + 9;
      const wy = padTop + r * cellH + 8;
      const ww = cellW - 18;
      const wh = cellH - 16;

      // Recessed dark window frame surround
      ctx.fillStyle = 'rgba(10, 14, 28, 0.55)';
      ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);

      const roll = nextR();
      if (roll < 0.54) {
        const winGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
        const lit = roll < 0.38 ? p.winGlow : p.winGlowAlt;
        winGrad.addColorStop(0, lit);
        winGrad.addColorStop(1, 'rgba(255, 190, 120, 0.65)');
        ctx.fillStyle = winGrad;
        ctx.fillRect(wx, wy, ww, wh);
        // Interior mullion bar & bright upper reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.fillRect(wx + 3, wy + 3, ww * 0.45, wh * 0.28);
        ctx.fillStyle = 'rgba(16, 22, 42, 0.35)';
        ctx.fillRect(wx + ww * 0.48, wy, 3, wh);
      } else {
        ctx.fillStyle = p.winDark;
        ctx.fillRect(wx, wy, ww, wh);
        // Diagonal golden sunset sky reflection
        ctx.fillStyle = 'rgba(255, 174, 122, 0.28)';
        ctx.fillRect(wx + 3, wy + 3, ww - 6, wh * 0.36);
        ctx.fillStyle = 'rgba(44, 242, 232, 0.14)';
        ctx.fillRect(wx + 3, wy + wh * 0.62, ww - 6, wh * 0.22);
      }

      // Sill / eyebrow ledge on Art-Deco & Barrio buildings
      if (style === 'artdeco' || style === 'barrio') {
        ctx.fillStyle = p.trim;
        ctx.fillRect(wx - 5, wy + wh + 2, ww + 10, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(wx - 5, wy - 5, ww + 10, 3);
      }
    }
  }

  // Glowing ground-floor glass lobby & storefront awning
  ctx.fillStyle = '#14192c';
  ctx.fillRect(20, 438, 472, 72);
  // Warm interior lobby bay windows
  const lobbyGrad = ctx.createLinearGradient(0, 446, 0, 504);
  lobbyGrad.addColorStop(0, p.winGlow);
  lobbyGrad.addColorStop(1, '#ff9f5a');
  ctx.fillStyle = lobbyGrad;
  ctx.fillRect(36, 448, 132, 54);
  ctx.fillRect(344, 448, 132, 54);
  // Glass doorway reflections
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(46, 452, 24, 46);
  ctx.fillRect(354, 452, 24, 46);
  // Center arched entrance canopy
  ctx.fillStyle = p.trim;
  ctx.fillRect(192, 444, 128, 14);
  ctx.fillStyle = '#7ffbf5';
  ctx.fillRect(204, 460, 104, 46);
  ctx.fillStyle = '#18223d';
  ctx.fillRect(253, 460, 6, 46);

  return finalizeTexture(canvas, 1, 1);
}

export function createContainerTexture(colorHex) {
  const { canvas, ctx } = makeCanvas(256, 128);
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 256, 128);
  for (let x = 0; x < 256; x += 12) {
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.fillRect(x, 0, 4, 128);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(x + 4, 0, 2, 128);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.34)';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PUERTO AZUL', 20, 40);
  return finalizeTexture(canvas, 1, 1);
}

export function createNeonSignTexture(text, bg, fg, accent) {
  const { canvas, ctx } = makeCanvas(512, 128);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);

  // Subtle horizontal neon scanline texture
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < 128; y += 6) ctx.fillRect(0, y, 512, 2);

  // Double glowing neon border frame
  ctx.shadowColor = accent;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 7;
  ctx.strokeRect(10, 10, 492, 108);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(18, 18, 476, 92);

  // Multi-pass glowing neon tube lettering
  ctx.font = '900 50px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = fg;
  ctx.shadowBlur = 28;
  ctx.fillStyle = fg;
  ctx.fillText(text, 256, 66);
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 256, 66);

  return finalizeTexture(canvas, 1, 1);
}

export function createBeachTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, '#f6d89e');
  grad.addColorStop(0.72, '#efc880');
  grad.addColorStop(0.9, '#d8aa6a');
  grad.addColorStop(1, '#a9e9ee');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const x = (i * 59) % 256;
    const y = (i * 113) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,248,225,0.2)' : 'rgba(145,98,42,0.12)';
    ctx.fillRect(x, y, 2, 2);
  }
  return finalizeTexture(canvas, 1, 8);
}

export function createSidewalkTexture() {
  const { canvas, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = '#c8beae';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(70,64,58,0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 62, 62);
  ctx.strokeRect(65, 1, 62, 62);
  ctx.strokeRect(1, 65, 62, 62);
  ctx.strokeRect(65, 65, 62, 62);
  return finalizeTexture(canvas, 24, 24);
}
