/* Procedural art: wall textures, sky, pixel-art sprites, rifle, minimap base. */

export const MAP_STRINGS = [
  "111111111111111111111111",
  "1......................1",
  "1.22...4....33....4..2.1",
  "1.2..................2.1",
  "1...33....2222....33...1",
  "1...3..............3...1",
  "1.......44....44.......1",
  "1......................1",
  "1..222....4..4....222..1",
  "1......................1",
  "1...3....222222....3...1",
  "1...3..............3...1",
  "1.......2......2.......1",
  "1......................1",
  "1..44.....3333.....44..1",
  "1......................1",
  "1...33....2222....33...1",
  "1...3..............3...1",
  "1.......44....44.......1",
  "1.2..................2.1",
  "1.22...4....33....4..2.1",
  "1......................1",
  "1......................1",
  "111111111111111111111111",
];

export const MAP_W = MAP_STRINGS[0].length;
export const MAP_H = MAP_STRINGS.length;

export function parseMap(): Uint8Array {
  const m = new Uint8Array(MAP_W * MAP_H);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const c = MAP_STRINGS[y][x];
      m[y * MAP_W + x] = c === "." ? 0 : parseInt(c, 10);
    }
  }
  return m;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/* ---------------- wall textures (64x64) ---------------- */

function stoneBase(rnd: () => number, base: string, mortar: string): HTMLCanvasElement {
  const c = canvas(64, 64);
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 64);
  const rows = 4;
  const bh = 64 / rows;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 === 0 ? 0 : 16;
    for (let bx = -1; bx < 3; bx++) {
      const x0 = bx * 32 + off;
      const shade = 0.86 + rnd() * 0.24;
      g.fillStyle = `rgba(${Math.floor(107 * shade)},${Math.floor(98 * shade)},${Math.floor(84 * shade)},1)`;
      g.fillRect(x0 + 1, r * bh + 1, 30, bh - 2);
    }
    g.fillStyle = mortar;
    g.fillRect(0, r * bh, 64, 1.4);
  }
  for (let i = 0; i < 240; i++) {
    const v = rnd();
    g.fillStyle = v > 0.5 ? "rgba(0,0,0,0.10)" : "rgba(240,230,207,0.05)";
    g.fillRect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 1, 1);
  }
  for (let i = 0; i < 3; i++) {
    g.fillStyle = "rgba(0,0,0,0.16)";
    let x = Math.floor(rnd() * 60);
    let y = Math.floor(rnd() * 60);
    for (let s = 0; s < 6; s++) {
      g.fillRect(x, y, 1.6, 1.6);
      x += Math.floor(rnd() * 4) - 2;
      y += Math.floor(rnd() * 3);
    }
  }
  return c;
}

function makeTextures(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  // [1] temple stone
  out[1] = stoneBase(mulberry32(11), "#6b6254", "#332e26");
  // [2] mossy stone
  {
    const c = stoneBase(mulberry32(23), "#5f5d4e", "#2e3024");
    const g = c.getContext("2d")!;
    const rnd = mulberry32(77);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 64;
      const y = 20 + rnd() * 44;
      const r = 2 + rnd() * 6;
      g.fillStyle = rnd() > 0.5 ? "rgba(74,116,52,0.55)" : "rgba(96,143,66,0.45)";
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 60; i++) {
      g.fillStyle = "rgba(127,191,77,0.35)";
      g.fillRect(Math.floor(rnd() * 64), 30 + Math.floor(rnd() * 34), 1, 2);
    }
    out[2] = c;
  }
  // [3] vine wall
  {
    const c = stoneBase(mulberry32(41), "#4c4a40", "#26261f");
    const g = c.getContext("2d")!;
    const rnd = mulberry32(99);
    for (let v = 0; v < 6; v++) {
      let x = 4 + v * 10 + rnd() * 5;
      g.strokeStyle = "rgba(43,84,38,0.9)";
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(x, -2);
      for (let y = 0; y <= 66; y += 6) {
        x += Math.sin(y * 0.3 + v) * 2.4;
        g.lineTo(x, y);
      }
      g.stroke();
      for (let l = 0; l < 7; l++) {
        const ly = 6 + l * 9 + rnd() * 4;
        g.fillStyle = l % 2 ? "#4c8a3d" : "#3d7031";
        g.fillRect(x + (l % 2 ? 2 : -4), ly, 3, 2);
      }
    }
    out[3] = c;
  }
  // [4] carved temple brick
  {
    const c = stoneBase(mulberry32(57), "#57503f", "#241f16");
    const g = c.getContext("2d")!;
    const rnd = mulberry32(123);
    g.fillStyle = "rgba(0,0,0,0.28)";
    for (let i = 0; i < 5; i++) {
      const x = 6 + rnd() * 48;
      const y = 6 + rnd() * 48;
      // glyph scratches
      g.fillRect(x, y, 6, 1.4);
      g.fillRect(x + 2, y + 2, 1.4, 5);
      if (rnd() > 0.5) g.fillRect(x + 4, y + 4, 4, 1.4);
    }
    g.fillStyle = "rgba(178,141,74,0.5)";
    g.fillRect(0, 30, 64, 2);
    for (let x = 4; x < 64; x += 12) g.fillRect(x, 27, 4, 8);
    out[4] = c;
  }
  return out;
}

/* ---------------- sky ---------------- */

function makeSky(): HTMLCanvasElement {
  const c = canvas(640, 200);
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, "#020a06");
  grad.addColorStop(0.55, "#072012");
  grad.addColorStop(1, "#0a2a17");
  g.fillStyle = grad;
  g.fillRect(0, 0, 640, 200);
  const rnd = mulberry32(5);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(214,240,200,${0.2 + rnd() * 0.5})`;
    g.fillRect(Math.floor(rnd() * 640), Math.floor(rnd() * 110), 1, 1);
  }
  // moon
  g.fillStyle = "rgba(207,232,201,0.16)";
  g.beginPath();
  g.arc(500, 52, 26, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(216,238,206,0.85)";
  g.beginPath();
  g.arc(500, 52, 13, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(150,180,150,0.5)";
  g.beginPath();
  g.arc(496, 49, 3, 0, Math.PI * 2);
  g.arc(505, 56, 2, 0, Math.PI * 2);
  g.fill();
  // canopy silhouettes (two layers)
  const layer = (color: string, baseY: number, amp: number, seed: number) => {
    const r2 = mulberry32(seed);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, 200);
    let x = 0;
    g.lineTo(0, baseY);
    while (x < 660) {
      const w = 14 + r2() * 30;
      const h = baseY - (r2() * amp + amp * 0.4);
      g.quadraticCurveTo(x + w * 0.5, h - r2() * 14, x + w, baseY - r2() * 6);
      x += w;
    }
    g.lineTo(660, 200);
    g.closePath();
    g.fill();
  };
  layer("rgba(6,22,13,0.9)", 172, 40, 31);
  layer("rgba(4,15,9,1)", 186, 26, 67);
  return c;
}

/* ---------------- pixel sprites ---------------- */

export type SpriteKind =
  | "raptor"
  | "spitter"
  | "brute"
  | "trex"
  | "health"
  | "ammo"
  | "blob";

type Palette = Record<string, string>;

function paintArt(rows: string[], pal: Palette, scale = 1): HTMLCanvasElement {
  const h = rows.length;
  const w = rows[0].length;
  const c = canvas(w * scale, h * scale);
  const g = c.getContext("2d")!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = pal[rows[y][x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

const RAPTOR_PAL: Palette = {
  G: "#5a8f3c",
  D: "#3e6629",
  B: "#c9b478",
  E: "#ff4b3e",
  W: "#e8e4d8",
  C: "#d8d4c4",
  K: "#16240f",
};

// 24 x 16, facing left
const RAPTOR_A = [
  "........................",
  "..GGG...................",
  ".GGGGG..................",
  ".GEGGGGG................",
  ".GWGWGGGG...............",
  "..GGGGGGGG..............",
  "...DGGGGGGGGGG..........",
  "...DGGGGGGGGGGGGGG......",
  "....BBGGGGGGGGGGGGGGG...",
  "....BBGGGGGGGGGGGGGGGGG.",
  ".....GGGGGGGGGGGGGGGG...",
  ".....GGGGGGGGGGGGG......",
  "......GGG..DGG.DGG......",
  "......GG...DGG.DGG......",
  "......GG....GG..GG......",
  "......CC....CC..CC......",
];
const RAPTOR_B = [
  "........................",
  "..GGG...................",
  ".GGGGG..................",
  ".GEGGGGG................",
  ".GWGWGGGG...............",
  "..GGGGGGGG..............",
  "...DGGGGGGGGGG..........",
  "...DGGGGGGGGGGGGGG......",
  "....BBGGGGGGGGGGGGGGG...",
  "....BBGGGGGGGGGGGGGGGGG.",
  ".....GGGGGGGGGGGGGGGG...",
  ".....GGGGGGGGGGGGG......",
  "......DGG.DGG..GGG......",
  "......DGG.DGG..GGG......",
  ".......GG..GG...GG......",
  ".......CC..CC...CC......",
];

const SPITTER_PAL: Palette = {
  G: "#4f9e5a",
  D: "#35703f",
  B: "#b9c478",
  E: "#ffd23e",
  R: "#e0432e",
  C: "#d8d4c4",
};
const SPITTER_A = [
  "........................",
  "..RRRR..................",
  ".RGGRR..................",
  ".RGGGR..................",
  "..GEGGGGG...............",
  "..GWGGGGGG..............",
  "...DGGGGGGGGGG..........",
  "...DGGGGGGGGGGGGG.......",
  "....BBGGGGGGGGGGGGGGG...",
  "....BBGGGGGGGGGGGGGGGG..",
  ".....GGGGGGGGGGGGGGG....",
  ".....GGGGGGGGGGGG.......",
  "......GGG..DGG.DGG......",
  "......GG...DGG.DGG......",
  "......GG....GG..GG......",
  "......CC....CC..CC......",
];
const SPITTER_B = [
  "........................",
  "..RRRR..................",
  ".RGGRR..................",
  ".RGGGR..................",
  "..GEGGGGG...............",
  "..GWGGGGGG..............",
  "...DGGGGGGGGGG..........",
  "...DGGGGGGGGGGGGG.......",
  "....BBGGGGGGGGGGGGGGG...",
  "....BBGGGGGGGGGGGGGGGG..",
  ".....GGGGGGGGGGGGGGG....",
  ".....GGGGGGGGGGGG.......",
  "......DGG.DGG..GGG......",
  "......DGG.DGG..GGG......",
  ".......GG..GG...GG......",
  ".......CC..CC...CC......",
];

const BRUTE_PAL: Palette = {
  G: "#6e7d45",
  D: "#4c5830",
  A: "#8a8f74",
  S: "#5c6148",
  B: "#c4b078",
  E: "#ff4b3e",
  K: "#3a3324",
  C: "#c9c4b0",
};
const BRUTE_A = [
  "........................",
  "........................",
  "........................",
  "........................",
  ".....S..S..S..S.........",
  "....AAAAAAAAAAAA........",
  "...AAAGGGGGGGGAAAA......",
  "..EAAAGGGGGGGGGGGAAAKK..",
  ".EGGGGGBBBGGGGGGGGGKKK..",
  ".GGGGGBBBBGGGGGGGGGGG...",
  "..GGGGGGGGGGGGGGGGGG....",
  "..GGGGGGGGGGGGGGGGG.....",
  "...GG.GGG.GGG.GGG.GG....",
  "...CC.CCC.CCC.CCC.CC....",
  "........................",
  "........................",
];
const BRUTE_B = [
  "........................",
  "........................",
  "........................",
  "........................",
  ".....S..S..S..S.........",
  "....AAAAAAAAAAAA........",
  "...AAAGGGGGGGGAAAA......",
  "..EAAAGGGGGGGGGGGAAAKK..",
  ".EGGGGGBBBGGGGGGGGGKKK..",
  ".GGGGGBBBBGGGGGGGGGGG...",
  "..GGGGGGGGGGGGGGGGGG....",
  "..GGGGGGGGGGGGGGGGG.....",
  "...GGG.GGG.GGG.GGG.G....",
  "...CCC.CCC.CCC.CCC.C....",
  "........................",
  "........................",
];

const TREX_PAL: Palette = {
  T: "#6b7d3f",
  D: "#49592a",
  B: "#d8c48a",
  E: "#ff3b30",
  W: "#efe8d4",
  C: "#d8d4c4",
  K: "#1c2412",
};
const TREX_A = [
  "................................",
  "...TTTTTT.......................",
  "..TTTTTTTT......................",
  "..TEETTTTTT.....................",
  "..TTTTTTTTTT....................",
  "..TWTWTWTTTTTT..................",
  "...TTTTTTTTTTT..................",
  "....DDTTTTTTTTTTT...............",
  "....DDTTTTTTTTTTTTTT............",
  ".....BBTTTTTTTTTTTTTTTTT........",
  ".....BBTTTTTTTTTTTTTTTTTTTTTT...",
  "......TTTTTTTTTTTTTTTTTTTTTTTT..",
  "......TTTTTTTTTTTTTTTTTTTTTTT...",
  ".......TTTTTTTTTTTTTTTTTTTTT....",
  ".......TTTTT..TTTTTT.TTTTTT.....",
  "........TTTT..TTTTTT.TTTTTT.....",
  "........TTTT...TTTTT..TTTTT.....",
  "........TTTT...TTTTT..TTTTT.....",
  "........CCCC...CCCCC..CCCCC.....",
  "................................",
];

const HEALTH_PAL: Palette = {
  W: "#e8e4da",
  S: "#b8b2a4",
  R: "#e03131",
  K: "#2c2a24",
};
const HEALTH_ART = [
  ".KKKKKKKKKKKK.",
  "KWWWWWWWWWWWSK",
  "KWWWRRWWWWWWSK".replace("WWWWS", "WWWWS"),
  "KWWWRRWWWWWWSK",
  "KWWRRRRRRWWWSK",
  "KWWRRRRRRWWWSK",
  "KWWWRRWWWWWWSK",
  "KWWWRRWWWWWWSK",
  "KWWWWWWWWWWWSK",
  "KSSSSSSSSSSSSK",
  ".KKKKKKKKKKKK.",
];

const AMMO_PAL: Palette = {
  O: "#6b6f3f",
  D: "#4a4d2b",
  B: "#d9a441",
  K: "#23241a",
};
const AMMO_ART = [
  ".KKKKKKKKKKKK.",
  "KOOOOOOOOOOODK",
  "KDKKKKKKKKKKDK",
  "KOBKOBKOBKODK.",
  "KOBKOBKOBKODK.",
  "KDKKKKKKKKKKDK",
  "KOOOOOOOOOOODK",
  "KDDDDDDDDDDDDK",
  ".KKKKKKKKKKKK.",
];

const BLOB_PAL: Palette = {
  G: "#a4ff4f",
  D: "#4f9e2f",
  K: "#2c5e1a",
};
const BLOB_ART = [
  "..KKKK..",
  ".KDDDDK.",
  "KDDGGDDK",
  "KDGGAADD".replace("AA", "GG"),
  "KDGGBBDD".replace("BB", "GG"),
  "KDDGGDDK",
  ".KDDDDK.",
  "..KKKK..",
];

function makeGlow(color: string, size: number, inner: number): HTMLCanvasElement {
  const c = canvas(size, size);
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(inner, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/* ---------------- rifle ---------------- */

export const GUN_MUZZLE = { x: 0, y: -150 };

function makeGun(): HTMLCanvasElement {
  const c = canvas(300, 260);
  const g = c.getContext("2d")!;
  g.translate(150, 235);
  g.rotate(0.32);
  // stock (wood)
  g.fillStyle = "#4a3120";
  g.beginPath();
  g.moveTo(-20, 20);
  g.lineTo(26, 10);
  g.lineTo(34, 60);
  g.lineTo(-6, 66);
  g.closePath();
  g.fill();
  // grip
  g.fillStyle = "#33241a";
  g.fillRect(-2, 6, 14, 30);
  // receiver (steel)
  g.fillStyle = "#3a4046";
  g.fillRect(-18, -52, 36, 76);
  g.fillStyle = "#2b3036";
  g.fillRect(-18, -52, 10, 76);
  g.fillStyle = "#565e66";
  g.fillRect(6, -52, 4, 76);
  // trigger guard
  g.strokeStyle = "#22262b";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(2, 26, 9, 0, Math.PI);
  g.stroke();
  // magazine
  g.fillStyle = "#262b30";
  g.save();
  g.translate(-4, -14);
  g.rotate(-0.18);
  g.fillRect(-10, 0, 20, 34);
  g.restore();
  // handguard wood over barrel
  g.fillStyle = "#5a3d24";
  g.fillRect(-13, -108, 26, 58);
  g.fillStyle = "#6e4c2d";
  g.fillRect(-13, -108, 6, 58);
  // barrel
  g.fillStyle = "#23262b";
  g.fillRect(-6, -150, 12, 46);
  g.fillStyle = "#15171b";
  g.fillRect(-6, -150, 4, 46);
  // front sight + muzzle brake
  g.fillStyle = "#23262b";
  g.fillRect(-9, -158, 18, 9);
  g.fillRect(-2, -166, 4, 9);
  // bolt handle
  g.fillStyle = "#565e66";
  g.fillRect(16, -40, 8, 5);
  g.beginPath();
  g.arc(26, -38, 4, 0, Math.PI * 2);
  g.fill();
  // engraved ammo counter plate
  g.fillStyle = "#101312";
  g.fillRect(-12, -34, 24, 12);
  g.fillStyle = "#c6f24e";
  g.font = "bold 9px monospace";
  g.fillText("12GA", -9, -25);
  return c;
}

/* ---------------- minimap base ---------------- */

function makeMinimapBase(map: Uint8Array): HTMLCanvasElement {
  const px = 5;
  const c = canvas(MAP_W * px, MAP_H * px);
  const g = c.getContext("2d")!;
  const cols = ["", "#4a6b4f", "#3f6b52", "#37604a", "#6b624a"];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = map[y * MAP_W + x];
      if (!t) continue;
      g.fillStyle = cols[t];
      g.fillRect(x * px, y * px, px, px);
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fillRect(x * px, y * px + px - 1, px, 1);
    }
  }
  return c;
}

/* ---------------- bundle ---------------- */

export interface Assets {
  textures: HTMLCanvasElement[];
  sky: HTMLCanvasElement;
  sprites: Record<SpriteKind, HTMLCanvasElement[]>;
  gun: HTMLCanvasElement;
  mist: HTMLCanvasElement;
  firefly: HTMLCanvasElement;
  minimap: HTMLCanvasElement;
}

export function buildAssets(map: Uint8Array): Assets {
  const sprites: Record<SpriteKind, HTMLCanvasElement[]> = {
    raptor: [paintArt(RAPTOR_A, RAPTOR_PAL), paintArt(RAPTOR_B, RAPTOR_PAL)],
    spitter: [paintArt(SPITTER_A, SPITTER_PAL), paintArt(SPITTER_B, SPITTER_PAL)],
    brute: [paintArt(BRUTE_A, BRUTE_PAL), paintArt(BRUTE_B, BRUTE_PAL)],
    trex: [paintArt(TREX_A, TREX_PAL)],
    health: [paintArt(HEALTH_ART, HEALTH_PAL)],
    ammo: [paintArt(AMMO_ART, AMMO_PAL)],
    blob: [paintArt(BLOB_ART, BLOB_PAL)],
  };
  return {
    textures: makeTextures(),
    sky: makeSky(),
    sprites,
    gun: makeGun(),
    mist: makeGlow("rgba(150,205,150,0.10)", 128, 0.1),
    firefly: makeGlow("rgba(216,255,122,0.9)", 12, 0.2),
    minimap: makeMinimapBase(map),
  };
}
