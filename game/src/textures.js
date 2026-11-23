// Procedural CanvasTexture generator for Calima Bay roads, buildings, oceanfront hotels,
// shipping containers, beaches, billboards, and vehicle decals. Zero external assets.

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
  tex.anisotropy = 4;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createRoadTexture(vertical = true) {
  const { canvas, ctx } = makeCanvas(256, 256);
  // Dark sun-warmed asphalt with subtle grain
  ctx.fillStyle = '#252936';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.07)';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.save();
  if (!vertical) {
    ctx.translate(128, 128);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-128, -128);
  }
  // Curb edges
  ctx.fillStyle = '#484f63';
  ctx.fillRect(0, 0, 10, 256);
  ctx.fillRect(246, 0, 10, 256);
  // White shoulder stripes
  ctx.fillStyle = 'rgba(255,250,235,0.75)';
  ctx.fillRect(14, 0, 4, 256);
  ctx.fillRect(238, 0, 4, 256);
  // Double amber centerline
  ctx.fillStyle = '#f6b93b';
  ctx.fillRect(122, 0, 4, 256);
  ctx.fillRect(130, 0, 4, 256);
  // Dashed lane lines
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let y = 12; y < 256; y += 52) {
    ctx.fillRect(68, y, 3, 24);
    ctx.fillRect(185, y, 3, 24);
  }
  ctx.restore();
  return finalizeTexture(canvas, 1, 1);
}

export function createIntersectionTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#242834';
  ctx.fillRect(0, 0, 256, 256);
  // Crosswalk zebra bars on all four sides
  ctx.fillStyle = 'rgba(255,248,236,0.78)';
  for (let i = 28; i < 228; i += 22) {
    ctx.fillRect(i, 8, 12, 26);
    ctx.fillRect(i, 222, 12, 26);
    ctx.fillRect(8, i, 26, 12);
    ctx.fillRect(222, i, 26, 12);
  }
  return finalizeTexture(canvas, 1, 1);
}

export function createBuildingFacadeTexture(style, seed = 1) {
  const { canvas, ctx } = makeCanvas(256, 512);
  const palettes = {
    artdeco: {
      base: ['#f5b8c2', '#f7dfd0', '#a7e9df', '#ffd5a5', '#f3c6e8'][seed % 5],
      trim: ['#ff5e7e', '#2cf2e8', '#ffd166', '#ff8c42'][seed % 4],
      winDark: '#1b2440',
      winGlow: '#ffdf9a',
      winGlowAlt: '#7df7f0',
    },
    glass: {
      base: ['#1a2944', '#16243d', '#223354', '#1d354f'][seed % 4],
      trim: ['#39c5e8', '#ffd166', '#67e8f9', '#f472b6'][seed % 4],
      winDark: '#0f1b30',
      winGlow: '#ffd485',
      winGlowAlt: '#64e7ff',
    },
    barrio: {
      base: ['#e07a5f', '#e9a46b', '#d96b6b', '#f2cc8f', '#c96f53'][seed % 5],
      trim: ['#fff2dc', '#3d405b', '#2ec4b6', '#ffbe0b'][seed % 4],
      winDark: '#261d2e',
      winGlow: '#ffd275',
      winGlowAlt: '#ff9b71',
    },
    villa: {
      base: ['#f6efe5', '#f2e3d0', '#ede8df', '#fae8d8'][seed % 4],
      trim: ['#d97757', '#2a9d8f', '#e9c46a'][seed % 3],
      winDark: '#243447',
      winGlow: '#ffdf9e',
      winGlowAlt: '#fff4d2',
    },
    warehouse: {
      base: ['#465163', '#5a5049', '#3d4f5c', '#524954'][seed % 4],
      trim: ['#ff9f1c', '#2ec4b6', '#e71d36'][seed % 3],
      winDark: '#1c222d',
      winGlow: '#ffcf70',
      winGlowAlt: '#8be9fd',
    },
  };
  const p = palettes[style] || palettes.artdeco;

  ctx.fillStyle = p.base;
  ctx.fillRect(0, 0, 256, 512);

  // Subtle vertical gradient (warm sunset reflection near top, grounded shadow near street)
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, 'rgba(255,214,160,0.22)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.0)');
  grad.addColorStop(1, 'rgba(15,18,36,0.34)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  // Architectural banding / pilasters
  ctx.fillStyle = p.trim;
  if (style === 'artdeco') {
    ctx.fillRect(0, 0, 256, 14);
    ctx.fillRect(0, 22, 256, 5);
    ctx.fillRect(0, 442, 256, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(10, 0, 8, 512);
    ctx.fillRect(238, 0, 8, 512);
  } else if (style === 'glass') {
    ctx.fillStyle = 'rgba(120,220,255,0.2)';
    for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 3, 512);
    ctx.fillStyle = p.trim;
    ctx.fillRect(0, 0, 256, 10);
  } else {
    ctx.fillRect(0, 0, 256, 12);
    ctx.fillRect(0, 440, 256, 8);
  }

  // Lit & reflective window grid
  const cols = style === 'glass' ? 6 : 4;
  const rows = style === 'warehouse' ? 4 : 9;
  const padX = style === 'glass' ? 12 : 22;
  const padTop = 36;
  const cellW = (256 - padX * 2) / cols;
  const cellH = (430 - padTop) / rows;
  let rng = (seed * 9301 + 49297) % 233280;
  const nextR = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = padX + c * cellW + 5;
      const wy = padTop + r * cellH + 6;
      const ww = cellW - 10;
      const wh = cellH - 12;
      const roll = nextR();
      if (roll < 0.48) {
        ctx.fillStyle = roll < 0.34 ? p.winGlow : p.winGlowAlt;
        ctx.fillRect(wx, wy, ww, wh);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(wx + 2, wy + 2, ww * 0.4, wh * 0.3);
      } else {
        ctx.fillStyle = p.winDark;
        ctx.fillRect(wx, wy, ww, wh);
        // Sunset reflection slash
        ctx.fillStyle = 'rgba(255,168,120,0.22)';
        ctx.fillRect(wx + 2, wy + 2, ww - 4, wh * 0.32);
      }
      if (style === 'artdeco' || style === 'barrio') {
        ctx.fillStyle = p.trim;
        ctx.fillRect(wx - 2, wy + wh, ww + 4, 3);
      }
    }
  }

  // Ground-floor storefront awning / lobby glow
  ctx.fillStyle = '#181c30';
  ctx.fillRect(14, 456, 228, 52);
  ctx.fillStyle = p.winGlow;
  ctx.fillRect(24, 464, 66, 38);
  ctx.fillRect(166, 464, 66, 38);
  ctx.fillStyle = p.trim;
  ctx.fillRect(102, 462, 52, 44);

  return finalizeTexture(canvas, 1, 1);
}

export function createContainerTexture(colorHex) {
  const { canvas, ctx } = makeCanvas(256, 128);
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 256, 128);
  for (let x = 0; x < 256; x += 12) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x, 0, 4, 128);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 4, 0, 2, 128);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PUERTO AZUL', 20, 40);
  return finalizeTexture(canvas, 1, 1);
}

export function createNeonSignTexture(text, bg, fg, accent) {
  const { canvas, ctx } = makeCanvas(512, 128);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.shadowColor = fg;
  ctx.shadowBlur = 18;
  ctx.fillStyle = fg;
  ctx.font = '900 54px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  return finalizeTexture(canvas, 1, 1);
}

export function createBeachTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, '#f4d599');
  grad.addColorStop(0.75, '#edc57e');
  grad.addColorStop(0.92, '#d8aa6a');
  grad.addColorStop(1, '#a9e9ee');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2000; i++) {
    const x = (i * 59) % 256;
    const y = (i * 113) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,248,225,0.18)' : 'rgba(145,98,42,0.12)';
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
