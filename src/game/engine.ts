import {
  Assets,
  buildAssets,
  GUN_MUZZLE,
  MAP_H,
  MAP_W,
  parseMap,
  SpriteKind,
} from "./assets";
import { Sfx } from "./audio";

export type Screen = "title" | "playing" | "paused" | "dead";

export interface HudState {
  health: number;
  ammo: number;
  reserve: number;
  score: number;
  kills: number;
  wave: number;
  hostiles: number;
  best: number;
  reloading: boolean;
}

export interface BannerMsg {
  title: string;
  sub?: string;
  tone: "amber" | "red" | "green";
}

export type EngineEvent =
  | { type: "screen"; screen: Screen }
  | { type: "banner"; banner: BannerMsg };

type EnemyKind = "raptor" | "spitter" | "brute" | "trex";
type EnemyState = "spawn" | "chase" | "windup" | "recover" | "aim" | "dying";

interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: EnemyState;
  t: number;
  anim: number;
  stagger: number;
  radius: number;
  speed: number;
  dmg: number;
  score: number;
  phase: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Pickup {
  kind: "health" | "ammo";
  x: number;
  y: number;
  phase: number;
}

interface Ambient {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  scale: number;
}

const KIND_DEF: Record<
  EnemyKind,
  { hp: number; speed: number; dmg: number; radius: number; score: number; scale: number; attackRange: number }
> = {
  raptor: { hp: 28, speed: 2.7, dmg: 9, radius: 0.32, score: 100, scale: 0.42, attackRange: 1.0 },
  spitter: { hp: 34, speed: 1.9, dmg: 12, radius: 0.32, score: 150, scale: 0.45, attackRange: 1.0 },
  brute: { hp: 125, speed: 1.35, dmg: 20, radius: 0.42, score: 300, scale: 0.52, attackRange: 1.35 },
  trex: { hp: 560, speed: 2.05, dmg: 34, radius: 0.55, score: 2500, scale: 1.12, attackRange: 1.75 },
};

const SPAWN_POINTS: Array<[number, number]> = [
  [1.5, 1.5],
  [22.5, 1.5],
  [1.5, 22.5],
  [22.5, 22.5],
  [12, 1.5],
  [12, 22.5],
  [1.5, 12],
  [22.5, 12],
];

const FOG_RGB = "8,34,18";
const BEST_KEY = "turok-fps-best";

export class TurokEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: { onHud: (h: HudState) => void; onEvent: (e: EngineEvent) => void };
  private assets: Assets;
  private sfx = new Sfx();
  private map: Uint8Array;

  private W = 640;
  private H = 400;
  private zbuf: Float32Array = new Float32Array(640);
  private fogCache = new Map<number, string>();

  screen: Screen = "title";

  // player
  private px = 12;
  private py = 12;
  private ang = -Math.PI / 2;
  private health = 100;
  private ammo = 12;
  private reserve = 72;
  private reloading = false;
  private reloadT = 0;
  private lastShot = 0;
  private firing = false;
  private emptyTick = 0;

  // stats
  private score = 0;
  private kills = 0;
  private shots = 0;
  private hits = 0;
  private best = 0;

  // world
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private pickups: Pickup[] = [];
  private mist: Ambient[] = [];
  private fireflies: Ambient[] = [];
  private spawnQueue: EnemyKind[] = [];
  private spawnT = 0;
  private wave = 0;
  private waveActive = false;
  private intermissionT = 0;
  private nextId = 1;

  // feel
  private keys = new Set<string>();
  private bobT = 0;
  private recoil = 0;
  private muzzleT = 0;
  private hitT = 0;
  private dmgFlash = 0;
  private pickFlash = 0;
  private shake = 0;
  private heartT = 0;
  private hudT = 0;
  private bloom = 0;

  private raf = 0;
  private lastT = 0;
  private destroyed = false;
  private time = 0;

  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onMouseDown: (e: MouseEvent) => void;
  private onMouseUp: () => void;
  private onLockChange: () => void;
  private onResize: () => void;
  private onCtxMenu: (e: Event) => void;

  constructor(
    canvas: HTMLCanvasElement,
    cb: { onHud: (h: HudState) => void; onEvent: (e: EngineEvent) => void },
  ) {
    this.canvas = canvas;
    this.cb = cb;
    this.ctx = canvas.getContext("2d")!;
    this.map = parseMap();
    this.assets = buildAssets(this.map);
    try {
      this.best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
    } catch {
      this.best = 0;
    }

    for (let i = 0; i < 24; i++) {
      this.mist.push(this.makeAmbient(1.6 + Math.random() * 0.9, true));
    }
    for (let i = 0; i < 20; i++) {
      this.fireflies.push(this.makeAmbient(0.06, false));
    }

    this.onKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      this.keys.add(e.code);
      if (e.code === "Space") this.firing = true;
      if (e.code === "KeyR") this.tryReload();
      if (e.code === "KeyP" || e.code === "Escape") {
        if (this.screen === "playing") this.pause();
        else if (this.screen === "paused" && e.code === "KeyP") this.resume();
      }
    };
    this.onKeyUp = (e) => {
      this.keys.delete(e.code);
      if (e.code === "Space") this.firing = false;
    };
    this.onMouseMove = (e) => {
      if (document.pointerLockElement === this.canvas && this.screen === "playing") {
        this.ang += e.movementX * 0.0022;
      }
    };
    this.onMouseDown = (e) => {
      if (e.button === 0) {
        this.sfx.ensure();
        if (this.screen === "playing" && document.pointerLockElement === this.canvas) {
          this.firing = true;
        }
      }
    };
    this.onMouseUp = () => {
      this.firing = false;
    };
    this.onLockChange = () => {
      if (document.pointerLockElement !== this.canvas && this.screen === "playing") {
        this.pause();
      }
    };
    this.onResize = () => this.resize();
    this.onCtxMenu = (e) => e.preventDefault();

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("pointerlockchange", this.onLockChange);
    this.canvas.addEventListener("contextmenu", this.onCtxMenu);

    this.resize();
    this.lastT = performance.now();
    const loop = (t: number) => {
      if (this.destroyed) return;
      const dt = Math.min((t - this.lastT) / 1000, 0.05);
      this.lastT = t;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    this.canvas.removeEventListener("contextmenu", this.onCtxMenu);
  }

  /* ---------------- public control ---------------- */

  start() {
    this.resetRun();
    this.setScreen("playing");
    this.lockPointer();
    this.sfx.ensure();
    this.sfx.wave();
  }

  resume() {
    if (this.screen !== "paused") return;
    this.setScreen("playing");
    this.lockPointer();
  }

  pause() {
    if (this.screen !== "playing") return;
    this.setScreen("paused");
    try {
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    } catch {
      /* noop */
    }
  }

  toTitle() {
    this.resetRun();
    this.setScreen("title");
    try {
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    } catch {
      /* noop */
    }
  }

  get accuracy(): number {
    return this.shots === 0 ? 0 : Math.round((this.hits / this.shots) * 100);
  }

  private lockPointer() {
    try {
      const p = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === "function") p.catch(() => undefined);
    } catch {
      /* noop */
    }
  }

  private setScreen(s: Screen) {
    this.screen = s;
    this.cb.onEvent({ type: "screen", screen: s });
    this.pushHud();
  }

  private resetRun() {
    this.px = 12;
    this.py = 12;
    this.ang = -Math.PI / 2;
    this.health = 100;
    this.ammo = 12;
    this.reserve = 72;
    this.reloading = false;
    this.score = 0;
    this.kills = 0;
    this.shots = 0;
    this.hits = 0;
    this.wave = 0;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.pickups = [];
    this.spawnQueue = [];
    this.waveActive = false;
    this.intermissionT = 1.2;
    this.dmgFlash = 0;
    this.pickFlash = 0;
    this.shake = 0;
    this.firing = false;
  }

  /* ---------------- helpers ---------------- */

  private resize() {
    const cw = this.canvas.clientWidth || window.innerWidth;
    const ch = this.canvas.clientHeight || window.innerHeight;
    this.W = Math.max(320, Math.min(1152, Math.round((400 * cw) / Math.max(1, ch))));
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.zbuf = new Float32Array(this.W);
    this.ctx.imageSmoothingEnabled = false;
  }

  private makeAmbient(scale: number, big: boolean): Ambient {
    return {
      x: 1.5 + Math.random() * (MAP_W - 3),
      y: 1.5 + Math.random() * (MAP_H - 3),
      vx: (Math.random() - 0.5) * (big ? 0.16 : 0.35),
      vy: (Math.random() - 0.5) * (big ? 0.16 : 0.35),
      phase: Math.random() * Math.PI * 2,
      scale: scale * (0.7 + Math.random() * 0.6),
    };
  }

  private solid(x: number, y: number): boolean {
    const mx = Math.floor(x);
    const my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) return true;
    return this.map[my * MAP_W + mx] !== 0;
  }

  private canStand(x: number, y: number, r: number): boolean {
    return (
      !this.solid(x - r, y - r) &&
      !this.solid(x + r, y - r) &&
      !this.solid(x - r, y + r) &&
      !this.solid(x + r, y + r)
    );
  }

  private moveWithCollision(o: { x: number; y: number }, dx: number, dy: number, r: number) {
    if (dx !== 0 && this.canStand(o.x + dx, o.y, r)) o.x += dx;
    if (dy !== 0 && this.canStand(o.x, o.y + dy, r)) o.y += dy;
  }

  /** DDA raycast; returns distance to nearest wall. */
  private castRay(ox: number, oy: number, dx: number, dy: number): number {
    let mapX = Math.floor(ox);
    let mapY = Math.floor(oy);
    const dX = Math.abs(dx) < 1e-9 ? 1e9 : Math.abs(1 / dx);
    const dY = Math.abs(dy) < 1e-9 ? 1e9 : Math.abs(1 / dy);
    const stepX = dx < 0 ? -1 : 1;
    const stepY = dy < 0 ? -1 : 1;
    let sideX = dx < 0 ? (ox - mapX) * dX : (mapX + 1 - ox) * dX;
    let sideY = dy < 0 ? (oy - mapY) * dY : (mapY + 1 - oy) * dY;
    for (let i = 0; i < 64; i++) {
      if (sideX < sideY) {
        sideX += dX;
        mapX += stepX;
        if (this.solid(mapX + 0.5, mapY + 0.5)) return sideX - dX;
      } else {
        sideY += dY;
        mapY += stepY;
        if (this.solid(mapX + 0.5, mapY + 0.5)) return sideY - dY;
      }
    }
    return 64;
  }

  private hasLOS(x0: number, y0: number, x1: number, y1: number): boolean {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return true;
    return this.castRay(x0, y0, dx / d, dy / d) > d - 0.05;
  }

  private fogStyle(d: number): string | null {
    const f = Math.min(0.88, Math.max(0, (d - 3.5) / 13));
    if (f < 0.03) return null;
    const q = Math.round(f * 20) / 20;
    let s = this.fogCache.get(q);
    if (!s) {
      s = `rgba(${FOG_RGB},${q})`;
      this.fogCache.set(q, s);
    }
    return s;
  }

  /* ---------------- run flow ---------------- */

  private startWave(n: number) {
    this.wave = n;
    this.waveActive = true;
    this.spawnQueue = [];
    if (n % 5 === 0) {
      this.spawnQueue.push("trex", "raptor", "raptor", "raptor", "spitter", "spitter");
      this.cb.onEvent({
        type: "banner",
        banner: { title: "APEX PREDATOR", sub: "THE GROUND ITSELF SHAKES", tone: "red" },
      });
      this.sfx.roar();
      this.shake = Math.max(this.shake, 10);
    } else {
      const count = Math.min(4 + n * 2, 15);
      for (let i = 0; i < count; i++) {
        const roll = Math.random() * 10;
        if (n >= 3 && roll < 2) this.spawnQueue.push("brute");
        else if (n >= 2 && roll < 5) this.spawnQueue.push("spitter");
        else this.spawnQueue.push("raptor");
      }
      this.cb.onEvent({
        type: "banner",
        banner: {
          title: `WAVE ${String(n).padStart(2, "0")}`,
          sub: `${this.spawnQueue.length} HOSTILES INBOUND`,
          tone: "amber",
        },
      });
      this.sfx.wave();
    }
    this.spawnT = 0.4;
    this.pushHud();
  }

  private pickSpawnPoint(): [number, number] {
    const far = SPAWN_POINTS.filter(([x, y]) => Math.hypot(x - this.px, y - this.py) > 5.5);
    const pool = far.length ? far : SPAWN_POINTS;
    const [bx, by] = pool[Math.floor(Math.random() * pool.length)];
    return [bx + (Math.random() - 0.5) * 0.8, by + (Math.random() - 0.5) * 0.8];
  }

  private spawnEnemy(kind: EnemyKind) {
    const def = KIND_DEF[kind];
    const hpMul = 1 + (this.wave - 1) * 0.1;
    const spdMul = Math.min(1 + (this.wave - 1) * 0.045, 1.55);
    let x = 12;
    let y = 1.5;
    for (let tries = 0; tries < 12; tries++) {
      const [sx, sy] = this.pickSpawnPoint();
      if (this.canStand(sx, sy, def.radius + 0.05)) {
        x = sx;
        y = sy;
        break;
      }
    }
    this.enemies.push({
      id: this.nextId++,
      kind,
      x,
      y,
      hp: def.hp * hpMul,
      maxHp: def.hp * hpMul,
      state: "spawn",
      t: 0.55,
      anim: Math.random() * 10,
      stagger: 0,
      radius: def.radius,
      speed: def.speed * spdMul,
      dmg: def.dmg,
      score: def.score,
      phase: Math.random() * Math.PI * 2,
    });
    this.sfx.portal();
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x,
        y,
        z: 0.1 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        vz: 0.6 + Math.random(),
        life: 0.5,
        maxLife: 0.5,
        color: "#c6f24e",
        size: 1.4,
      });
    }
  }

  private killEnemy(e: Enemy) {
    e.state = "dying";
    e.t = 0.45;
    this.kills++;
    this.hits++;
    this.score += e.score;
    this.sfx.kill();
    const n = e.kind === "trex" ? 42 : 14;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: e.x,
        y: e.y,
        z: 0.1 + Math.random() * 0.55,
        vx: (Math.random() - 0.5) * 3.2,
        vy: (Math.random() - 0.5) * 3.2,
        vz: Math.random() * 2.4,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        color: ["#8f1d1d", "#c22222", "#5e1414"][Math.floor(Math.random() * 3)],
        size: 1.6 + Math.random() * 1.6,
      });
    }
    if (e.kind === "trex") {
      this.shake = Math.max(this.shake, 16);
      this.sfx.roar();
      this.score += 500;
      this.cb.onEvent({
        type: "banner",
        banner: { title: "APEX DOWN", sub: "+3000 PTS // THE JUNGLE HOLDS ITS BREATH", tone: "green" },
      });
      this.dropPickup(e.x - 0.5, e.y, "health");
      this.dropPickup(e.x + 0.5, e.y, "ammo");
      this.health = 100;
    } else {
      const r = Math.random();
      if (r < 0.18) this.dropPickup(e.x, e.y, "health");
      else if (r < 0.38) this.dropPickup(e.x, e.y, "ammo");
    }
    this.pushHud();
  }

  private dropPickup(x: number, y: number, kind: "health" | "ammo") {
    const cx = Math.min(MAP_W - 1.5, Math.max(1.5, x));
    const cy = Math.min(MAP_H - 1.5, Math.max(1.5, y));
    if (this.canStand(cx, cy, 0.2)) {
      this.pickups.push({ kind, x: cx, y: cy, phase: Math.random() * 6 });
    }
  }

  private damagePlayer(d: number) {
    if (this.screen !== "playing") return;
    this.health = Math.max(0, this.health - d);
    this.dmgFlash = 1;
    this.shake = Math.max(this.shake, 8);
    this.sfx.hurt();
    if (this.health <= 0) {
      this.firing = false;
      if (this.score > this.best) {
        this.best = this.score;
        try {
          localStorage.setItem(BEST_KEY, String(this.best));
        } catch {
          /* noop */
        }
      }
      this.setScreen("dead");
      try {
        if (document.pointerLockElement === this.canvas) document.exitPointerLock();
      } catch {
        /* noop */
      }
      this.sfx.growl();
      this.sfx.roar();
    }
    this.pushHud();
  }

  /* ---------------- combat ---------------- */

  private tryReload() {
    if (this.screen !== "playing" || this.reloading) return;
    if (this.ammo >= 12 || this.reserve <= 0) return;
    this.reloading = true;
    this.reloadT = 1.15;
    this.sfx.reload();
    this.pushHud();
  }

  private shoot() {
    this.shots++;
    this.ammo--;
    this.lastShot = this.time;
    this.recoil = 1;
    this.muzzleT = 0.07;
    this.bloom = Math.min(1, this.bloom + 0.35);
    this.sfx.shoot();

    const spread = 0.008 + this.bloom * 0.012;
    const a = this.ang + (Math.random() - 0.5) * spread;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const wallD = this.castRay(this.px, this.py, dx, dy);

    let bestE: Enemy | null = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (e.state === "dying" || e.state === "spawn") continue;
      const rx = e.x - this.px;
      const ry = e.y - this.py;
      const along = rx * dx + ry * dy;
      if (along < 0.15 || along > wallD) continue;
      const perp = Math.abs(rx * dy - ry * dx);
      if (perp < e.radius + 0.06 && along < bestD) {
        bestD = along;
        bestE = e;
      }
    }

    if (bestE) {
      this.hits++;
      this.hitT = 0.13;
      bestE.hp -= 16;
      bestE.stagger = 0.16;
      this.sfx.hit();
      const n = 6;
      for (let i = 0; i < n; i++) {
        this.particles.push({
          x: bestE.x,
          y: bestE.y,
          z: 0.25 + Math.random() * 0.4,
          vx: dx * 1.4 + (Math.random() - 0.5) * 2,
          vy: dy * 1.4 + (Math.random() - 0.5) * 2,
          vz: Math.random() * 2,
          life: 0.3 + Math.random() * 0.25,
          maxLife: 0.55,
          color: ["#a02020", "#7c1616", "#c22222"][Math.floor(Math.random() * 3)],
          size: 1.3 + Math.random(),
        });
      }
      if (bestE.hp <= 0) this.killEnemy(bestE);
    } else {
      // wall sparks at impact point
      const ix = this.px + dx * (wallD - 0.05);
      const iy = this.py + dy * (wallD - 0.05);
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: ix,
          y: iy,
          z: 0.35 + Math.random() * 0.3,
          vx: -dx * 0.8 + (Math.random() - 0.5) * 1.4,
          vy: -dy * 0.8 + (Math.random() - 0.5) * 1.4,
          vz: Math.random() * 1.2,
          life: 0.22 + Math.random() * 0.12,
          maxLife: 0.34,
          color: "#d9cfa8",
          size: 1,
        });
      }
    }
    if (this.ammo === 0) this.tryReload();
    this.pushHud();
  }

  /* ---------------- update ---------------- */

  private update(dt: number) {
    this.time += dt;
    // ambient always drifts
    for (const m of this.mist) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.x < 1) m.x = MAP_W - 1.2;
      if (m.x > MAP_W - 1) m.x = 1.2;
      if (m.y < 1) m.y = MAP_H - 1.2;
      if (m.y > MAP_H - 1) m.y = 1.2;
    }
    for (const f of this.fireflies) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.phase += dt * 3;
      if (f.x < 1) f.x = MAP_W - 1.2;
      if (f.x > MAP_W - 1) f.x = 1.2;
      if (f.y < 1) f.y = MAP_H - 1.2;
      if (f.y > MAP_H - 1) f.y = 1.2;
    }

    // decay feel values
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.muzzleT = Math.max(0, this.muzzleT - dt);
    this.hitT = Math.max(0, this.hitT - dt);
    this.dmgFlash = Math.max(0, this.dmgFlash - dt * 2.4);
    this.pickFlash = Math.max(0, this.pickFlash - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 26);
    this.bloom = Math.max(0, this.bloom - dt * 2.2);

    if (this.screen === "title" || this.screen === "dead") {
      this.ang += dt * 0.1;
      this.updateParticles(dt);
      this.hudT += dt;
      if (this.hudT > 0.25) {
        this.hudT = 0;
        this.pushHud();
      }
      return;
    }
    if (this.screen === "paused") return;

    /* ----- movement ----- */
    const fwd = (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) -
      (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0);
    const strafe = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    const turn = (this.keys.has("ArrowRight") ? 1 : 0) - (this.keys.has("ArrowLeft") ? 1 : 0);
    this.ang += turn * dt * 2.6;
    const sprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const speed = (sprint ? 4.7 : 3.2);
    let mx = 0;
    let my = 0;
    if (fwd || strafe) {
      const cos = Math.cos(this.ang);
      const sin = Math.sin(this.ang);
      mx = (cos * fwd - sin * strafe) * speed * dt;
      my = (sin * fwd + cos * strafe) * speed * dt;
      const len = Math.hypot(mx, my);
      const max = speed * dt;
      if (len > max) {
        mx = (mx / len) * max;
        my = (my / len) * max;
      }
      const p = { x: this.px, y: this.py };
      this.moveWithCollision(p, mx, my, 0.28);
      this.px = p.x;
      this.py = p.y;
      this.bobT += dt * (sprint ? 11 : 8);
    }

    /* ----- weapon ----- */
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const take = Math.min(12 - this.ammo, this.reserve);
        this.ammo += take;
        this.reserve -= take;
        this.reloading = false;
        this.pushHud();
      }
    }
    if (this.firing && !this.reloading) {
      if (this.time - this.lastShot > 0.17) {
        if (this.ammo > 0) this.shoot();
        else if (this.reserve > 0) this.tryReload();
        else if (this.time - this.emptyTick > 0.3) {
          this.emptyTick = this.time;
          this.sfx.empty();
        }
      }
    }

    /* ----- waves ----- */
    if (!this.waveActive && this.enemies.length === 0) {
      this.intermissionT -= dt;
      if (this.intermissionT <= 0) this.startWave(this.wave + 1);
    }
    if (this.waveActive) {
      if (this.spawnQueue.length && this.enemies.length < 9) {
        this.spawnT -= dt;
        if (this.spawnT <= 0) {
          this.spawnEnemy(this.spawnQueue.shift()!);
          this.spawnT = 1.05;
        }
      }
      if (!this.spawnQueue.length && this.enemies.length === 0) {
        this.waveActive = false;
        const bonus = 200 * this.wave;
        this.score += bonus;
        this.health = Math.min(100, this.health + 12);
        this.intermissionT = 2.6;
        this.cb.onEvent({
          type: "banner",
          banner: {
            title: `WAVE ${String(this.wave).padStart(2, "0")} CLEARED`,
            sub: `+${bonus} PTS // VITALS PATCHED +12`,
            tone: "green",
          },
        });
        this.sfx.pickup();
        this.pushHud();
      }
    }

    /* ----- enemies ----- */
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);

    /* ----- pickups ----- */
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (Math.hypot(p.x - this.px, p.y - this.py) < 0.55) {
        if (p.kind === "health") this.health = Math.min(100, this.health + 25);
        else this.reserve += 24;
        this.score += 50;
        this.pickFlash = 0.7;
        this.sfx.pickup();
        this.pickups.splice(i, 1);
        this.pushHud();
      }
    }

    /* ----- heartbeat ----- */
    if (this.health > 0 && this.health < 30) {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.heartT = 0.85;
        this.sfx.heartbeat();
      }
    }

    this.hudT += dt;
    if (this.hudT > 0.1) {
      this.hudT = 0;
      this.pushHud();
    }
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.anim += dt;
      e.stagger = Math.max(0, e.stagger - dt);

      if (e.state === "dying") {
        e.t -= dt;
        if (e.t <= 0) this.enemies.splice(i, 1);
        continue;
      }
      if (e.state === "spawn") {
        e.t -= dt;
        if (e.t <= 0) e.state = "chase";
        continue;
      }

      const dx = this.px - e.x;
      const dy = this.py - e.y;
      const dist = Math.hypot(dx, dy);
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : 0;
      const def = KIND_DEF[e.kind];

      if (e.state === "windup") {
        e.t -= dt;
        if (e.t <= 0) {
          if (dist < def.attackRange + 0.4) {
            this.damagePlayer(e.dmg);
            this.sfx.growl();
          }
          e.state = "recover";
          e.t = e.kind === "raptor" ? 0.85 : e.kind === "brute" ? 1.25 : 1.5;
        }
        continue;
      }
      if (e.state === "recover") {
        e.t -= dt;
        if (e.t <= 0) e.state = "chase";
        continue;
      }
      if (e.state === "aim") {
        e.t -= dt;
        if (e.t <= 0) {
          const a = Math.atan2(dy, dx);
          this.projectiles.push({
            x: e.x + nx * 0.4,
            y: e.y + ny * 0.4,
            vx: Math.cos(a) * 6.5,
            vy: Math.sin(a) * 6.5,
            life: 3,
          });
          this.sfx.spit();
          e.state = "recover";
          e.t = 1.7;
        }
        continue;
      }

      /* chase */
      if (e.stagger > 0) continue;
      let mvx = 0;
      let mvy = 0;
      const wobble = Math.sin(this.time * 2.2 + e.phase) * 0.35;

      if (e.kind === "spitter") {
        if (dist < 2.4) {
          mvx = -nx;
          mvy = -ny;
        } else if (dist < 7.5 && this.hasLOS(e.x, e.y, this.px, this.py)) {
          e.state = "aim";
          e.t = 0.55;
          continue;
        } else {
          mvx = nx + -ny * wobble;
          mvy = ny + nx * wobble;
        }
      } else {
        mvx = nx + -ny * wobble;
        mvy = ny + nx * wobble;
        if (dist < def.attackRange && e.kind !== "trex") {
          e.state = "windup";
          e.t = e.kind === "raptor" ? 0.36 : 0.55;
          continue;
        }
        if (dist < def.attackRange && e.kind === "trex") {
          e.state = "windup";
          e.t = 0.6;
          if (Math.random() < 0.4) this.sfx.roar();
          continue;
        }
      }
      const ml = Math.hypot(mvx, mvy) || 1;
      const o = { x: e.x, y: e.y };
      this.moveWithCollision(o, (mvx / ml) * e.speed * dt, (mvy / ml) * e.speed * dt, e.radius);
      e.x = o.x;
      e.y = o.y;
    }

    /* separation */
    for (let a = 0; a < this.enemies.length; a++) {
      for (let b = a + 1; b < this.enemies.length; b++) {
        const e1 = this.enemies[a];
        const e2 = this.enemies[b];
        if (e1.state === "dying" || e2.state === "dying") continue;
        const dx = e2.x - e1.x;
        const dy = e2.y - e1.y;
        const d = Math.hypot(dx, dy);
        const min = e1.radius + e2.radius;
        if (d > 0.001 && d < min) {
          const push = (min - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          e1.x -= nx * push;
          e1.y -= ny * push;
          e2.x += nx * push;
          e2.y += ny * push;
        }
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      let dead = p.life <= 0;
      if (!dead && this.solid(p.x, p.y)) {
        dead = true;
        this.sfx.splat();
      }
      if (!dead && Math.hypot(p.x - this.px, p.y - this.py) < 0.35) {
        dead = true;
        this.damagePlayer(12);
        for (let k = 0; k < 8; k++) {
          this.particles.push({
            x: p.x,
            y: p.y,
            z: 0.3 + Math.random() * 0.3,
            vx: (Math.random() - 0.5) * 2.4,
            vy: (Math.random() - 0.5) * 2.4,
            vz: Math.random() * 1.6,
            life: 0.35,
            maxLife: 0.35,
            color: ["#7dc94f", "#4f9e2f"][k % 2],
            size: 1.4,
          });
        }
      }
      if (dead) this.projectiles.splice(i, 1);
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vz -= 4.5 * dt;
      if (p.z < 0.02) {
        p.z = 0.02;
        p.vz = 0;
        p.vx *= 0.8;
        p.vy *= 0.8;
      }
    }
  }

  private pushHud() {
    this.cb.onHud({
      health: Math.ceil(this.health),
      ammo: this.ammo,
      reserve: this.reserve,
      score: this.score,
      kills: this.kills,
      wave: this.wave,
      hostiles: this.enemies.filter((e) => e.state !== "dying").length + this.spawnQueue.length,
      best: this.best,
      reloading: this.reloading,
    });
  }

  /* ---------------- render ---------------- */

  private render() {
    const { ctx, W, H } = this;
    const t = this.time;
    ctx.save();
    if (this.shake > 0) {
      ctx.translate(
        Math.sin(t * 87) * this.shake * 0.5,
        Math.cos(t * 73) * this.shake * 0.4,
      );
    }

    const horizon = 208;
    const dirX = Math.cos(this.ang);
    const dirY = Math.sin(this.ang);
    const planeX = -dirY * 0.66;
    const planeY = dirX * 0.66;

    /* sky with parallax */
    const fov = 2 * Math.atan(0.66);
    let off = ((this.ang / fov) * W) % W;
    if (off < 0) off += W;
    const sky = this.assets.sky;
    ctx.drawImage(sky, -off, 0, W, horizon);
    ctx.drawImage(sky, W - off, 0, W, horizon);
    if (off > 0) ctx.drawImage(sky, -off - W, 0, W, horizon);

    /* floor */
    const fg = ctx.createLinearGradient(0, horizon, 0, H);
    fg.addColorStop(0, `rgb(${FOG_RGB})`);
    fg.addColorStop(0.45, "#0d2c18");
    fg.addColorStop(1, "#123a1e");
    ctx.fillStyle = fg;
    ctx.fillRect(0, horizon, W, H - horizon);
    // subtle floor bands for motion feel
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    for (let y = horizon + 8; y < H; y += 26) ctx.fillRect(0, y, W, 2);

    /* walls */
    for (let x = 0; x < W; x++) {
      const cameraX = (2 * x) / W - 1;
      const rx = dirX + planeX * cameraX;
      const ry = dirY + planeY * cameraX;
      let mapX = Math.floor(this.px);
      let mapY = Math.floor(this.py);
      const dX = Math.abs(rx) < 1e-9 ? 1e9 : Math.abs(1 / rx);
      const dY = Math.abs(ry) < 1e-9 ? 1e9 : Math.abs(1 / ry);
      const stepX = rx < 0 ? -1 : 1;
      const stepY = ry < 0 ? -1 : 1;
      let sideX = rx < 0 ? (this.px - mapX) * dX : (mapX + 1 - this.px) * dX;
      let sideY = ry < 0 ? (this.py - mapY) * dY : (mapY + 1 - this.py) * dY;
      let side = 0;
      let tile = 1;
      for (let i = 0; i < 64; i++) {
        if (sideX < sideY) {
          sideX += dX;
          mapX += stepX;
          side = 0;
        } else {
          sideY += dY;
          mapY += stepY;
          side = 1;
        }
        if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H) {
          tile = 1;
          break;
        }
        tile = this.map[mapY * MAP_W + mapX];
        if (tile !== 0) break;
      }
      const perp = Math.max(0.02, side === 0 ? sideX - dX : sideY - dY);
      this.zbuf[x] = perp;
      const lineH = H / perp;
      const y0 = H / 2 - lineH / 2;
      let wallX = side === 0 ? this.py + perp * ry : this.px + perp * rx;
      wallX -= Math.floor(wallX);
      let texX = Math.floor(wallX * 64);
      if ((side === 0 && rx > 0) || (side === 1 && ry < 0)) texX = 63 - texX;
      const tex = this.assets.textures[tile] || this.assets.textures[1];
      ctx.drawImage(tex, texX, 0, 1, 64, x, y0, 1, lineH);
      if (side === 1) {
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(x, y0, 1, lineH);
      }
      const fog = this.fogStyle(perp);
      if (fog) {
        ctx.fillStyle = fog;
        ctx.fillRect(x, y0, 1, lineH);
      }
    }

    /* sprites */
    this.renderSprites(dirX, dirY, planeX, planeY, t);
    this.renderParticles(dirX, dirY, planeX, planeY);

    if (this.screen === "playing" || this.screen === "paused") {
      this.renderGun(t);
      if (this.screen === "playing") this.renderCrosshair();
      this.renderMinimap();
    }

    /* vignettes */
    if (this.dmgFlash > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, "rgba(224,49,49,0)");
      g.addColorStop(1, `rgba(224,49,49,${0.55 * this.dmgFlash})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.pickFlash > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, "rgba(198,242,78,0)");
      g.addColorStop(1, `rgba(198,242,78,${0.22 * this.pickFlash})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.screen === "title" || this.screen === "dead") {
      ctx.fillStyle = "rgba(2,10,6,0.45)";
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  private renderSprites(
    dirX: number,
    dirY: number,
    planeX: number,
    planeY: number,
    t: number,
  ) {
    const { ctx, W, H } = this;
    const invDet = 1 / (planeX * dirY - dirX * planeY);

    interface R {
      x: number;
      y: number;
      tex: HTMLCanvasElement;
      scale: number;
      alpha: number;
      mode: "floor" | "center";
      lift: number;
      noFog: boolean;
      flip: boolean;
      squash: number;
      depth: number;
    }
    const list: R[] = [];

    for (const m of this.mist) {
      list.push({
        x: m.x, y: m.y, tex: this.assets.mist, scale: m.scale,
        alpha: 0.5, mode: "center", lift: 0, noFog: true, flip: false, squash: 1,
        depth: Math.hypot(m.x - this.px, m.y - this.py),
      });
    }
    for (const f of this.fireflies) {
      list.push({
        x: f.x, y: f.y, tex: this.assets.firefly, scale: 0.05 + Math.sin(f.phase) * 0.015,
        alpha: 0.4 + 0.5 * Math.abs(Math.sin(f.phase * 0.7)), mode: "center", lift: 0.28 + Math.sin(f.phase) * 0.06,
        noFog: false, flip: false, squash: 1,
        depth: Math.hypot(f.x - this.px, f.y - this.py),
      });
    }
    for (const p of this.pickups) {
      const bob = Math.sin(t * 3 + p.phase) * 0.03;
      list.push({
        x: p.x, y: p.y, tex: this.assets.sprites[p.kind][0], scale: 0.2,
        alpha: 1, mode: "floor", lift: 0.04 + bob, noFog: false, flip: false, squash: 1,
        depth: Math.hypot(p.x - this.px, p.y - this.py),
      });
    }
    for (const pr of this.projectiles) {
      list.push({
        x: pr.x, y: pr.y, tex: this.assets.sprites.blob[0], scale: 0.1,
        alpha: 1, mode: "floor", lift: 0.32, noFog: false, flip: false, squash: 1,
        depth: Math.hypot(pr.x - this.px, pr.y - this.py),
      });
    }
    for (const e of this.enemies) {
      const def = KIND_DEF[e.kind];
      const frames = this.assets.sprites[e.kind as SpriteKind];
      const moving = e.state === "chase";
      const fi = frames.length > 1 && moving ? Math.floor(e.anim * 7) % frames.length : 0;
      let alpha = 1;
      let squash = 1;
      if (e.state === "spawn") {
        const k = 1 - e.t / 0.55;
        alpha = k;
        squash = 0.4 + 0.6 * k;
      } else if (e.state === "dying") {
        const k = Math.max(0, e.t / 0.45);
        alpha = k;
        squash = 0.25 + 0.75 * k;
      }
      const toPlayer = Math.atan2(this.py - e.y, this.px - e.x);
      const flip = Math.cos(toPlayer) > 0;
      list.push({
        x: e.x, y: e.y, tex: frames[fi], scale: def.scale,
        alpha, mode: "floor", lift: 0, noFog: false, flip, squash,
        depth: Math.hypot(e.x - this.px, e.y - this.py),
      });
    }

    list.sort((a, b) => b.depth - a.depth);

    for (const r of list) {
      const relX = r.x - this.px;
      const relY = r.y - this.py;
      const tx = invDet * (dirY * relX - dirX * relY);
      const ty = invDet * (-planeY * relX + planeX * relY);
      if (ty < 0.1 || ty > 40) continue;
      const sx = (W / 2) * (1 + tx / ty);
      const unit = H / ty;
      const size = unit * r.scale;
      if (size < 1) continue;
      const h = size * r.squash;
      const bottom = H / 2 + unit / 2;
      const drawY = r.mode === "floor" ? bottom - h - unit * r.lift : H / 2 - h / 2 - unit * r.lift;
      const half = size / 2;
      const x0 = Math.max(0, Math.floor(sx - half));
      const x1 = Math.min(W - 1, Math.ceil(sx + half));
      if (x1 < 0 || x0 >= W) continue;

      let alpha = r.alpha;
      if (!r.noFog) {
        const f = Math.min(0.94, Math.max(0, (ty - 3) / 12));
        alpha *= 1 - f;
      }
      if (alpha < 0.03) continue;
      ctx.globalAlpha = alpha;
      const texW = r.tex.width;
      const texH = r.tex.height;
      const srcW = texW / size;
      for (let x = x0; x <= x1; x++) {
        if (this.zbuf[x] <= ty) continue;
        let texX = ((x - (sx - half)) / size) * texW;
        if (r.flip) texX = texW - texX - srcW;
        ctx.drawImage(r.tex, texX, 0, srcW, texH, x, drawY, 1, h);
      }
      ctx.globalAlpha = 1;
    }
  }

  private renderParticles(
    dirX: number,
    dirY: number,
    planeX: number,
    planeY: number,
  ) {
    const { ctx, W, H } = this;
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    for (const p of this.particles) {
      const relX = p.x - this.px;
      const relY = p.y - this.py;
      const tx = invDet * (dirY * relX - dirX * relY);
      const ty = invDet * (-planeY * relX + planeX * relY);
      if (ty < 0.12) continue;
      const sx = Math.floor((W / 2) * (1 + tx / ty));
      if (sx < 0 || sx >= W || this.zbuf[sx] <= ty) continue;
      const unit = H / ty;
      const y = H / 2 + unit / 2 - p.z * unit;
      const s = Math.max(1, unit * 0.022 * p.size);
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(sx - s / 2, y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  private renderGun(t: number) {
    const { ctx, W, H } = this;
    const moving = this.keys.has("KeyW") || this.keys.has("KeyS") || this.keys.has("KeyA") || this.keys.has("KeyD");
    const bobX = moving ? Math.sin(this.bobT) * 9 : Math.sin(t * 1.4) * 2;
    const bobY = moving ? Math.abs(Math.cos(this.bobT)) * 7 : Math.sin(t * 2.1) * 2;
    const kick = this.recoil * 26;
    const reloadDip = this.reloading ? Math.sin(Math.min(1, 1 - this.reloadT / 1.15) * Math.PI) * 70 : 0;

    const ax = W * 0.63 + bobX;
    const ay = H + 34 + bobY + kick * 0.6 + reloadDip;
    const scale = Math.max(0.85, W / 640);

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(0.05 + this.recoil * -0.1 + (this.reloading ? 0.35 : 0));
    ctx.scale(scale, scale);
    ctx.drawImage(this.assets.gun, -150, -235);

    if (this.muzzleT > 0) {
      const mx = GUN_MUZZLE.x;
      const my = GUN_MUZZLE.y - 16;
      const r = 26 + Math.random() * 12;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, r);
      g.addColorStop(0, "rgba(255,244,190,0.95)");
      g.addColorStop(0.35, "rgba(255,176,58,0.75)");
      g.addColorStop(1, "rgba(255,92,31,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,230,150,0.9)";
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(Math.random() * Math.PI);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillRect(-2, -r * 0.9, 4, r * 0.9);
      }
      ctx.restore();
    }
    ctx.restore();

    if (this.reloading) {
      ctx.fillStyle = "rgba(255,176,58,0.9)";
      ctx.font = "700 13px 'Chakra Petch', monospace";
      ctx.textAlign = "center";
      ctx.fillText("RELOADING", W * 0.63, H - 60 - reloadDip * 0.2);
      ctx.textAlign = "left";
    }
  }

  private renderCrosshair() {
    const { ctx, W, H } = this;
    const cx = W / 2;
    const cy = H / 2;
    const gap = 5 + this.bloom * 11 + this.recoil * 5;
    const len = 7;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 3;
    this.crosshair(ctx, cx, cy, gap, len);
    ctx.strokeStyle = this.hitT > 0 ? "rgba(255,92,31,1)" : "rgba(240,230,207,0.95)";
    ctx.lineWidth = 1.5;
    this.crosshair(ctx, cx, cy, gap, len);
    ctx.fillStyle = this.hitT > 0 ? "#ff5c1f" : "#f0e6cf";
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
    if (this.hitT > 0) {
      ctx.strokeStyle = "rgba(255,92,31,0.9)";
      ctx.lineWidth = 2;
      const o = 4;
      const l = 6;
      ctx.beginPath();
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        ctx.moveTo(cx + dx * o, cy + dy * o);
        ctx.lineTo(cx + dx * (o + l), cy + dy * (o + l));
      }
      ctx.stroke();
    }
  }

  private crosshair(ctx: CanvasRenderingContext2D, cx: number, cy: number, gap: number, len: number) {
    ctx.beginPath();
    ctx.moveTo(cx - gap - len, cy);
    ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + gap + len, cy);
    ctx.moveTo(cx, cy - gap - len);
    ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap);
    ctx.lineTo(cx, cy + gap + len);
    ctx.stroke();
  }

  private renderMinimap() {
    const { ctx, W } = this;
    const size = 118;
    const x0 = W - size - 14;
    const y0 = 14;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "rgba(3,14,8,0.72)";
    ctx.fillRect(x0 - 4, y0 - 4, size + 8, size + 8);
    ctx.drawImage(this.assets.minimap, x0, y0, size, size);
    const s = size / MAP_W;
    for (const p of this.pickups) {
      ctx.fillStyle = "#ffb03a";
      ctx.fillRect(x0 + p.x * s - 1.5, y0 + p.y * s - 1.5, 3, 3);
    }
    for (const e of this.enemies) {
      if (e.state === "dying") continue;
      ctx.fillStyle = e.kind === "trex" ? "#ff5c1f" : "#e03131";
      const r = e.kind === "trex" ? 3.4 : 2;
      ctx.beginPath();
      ctx.arc(x0 + e.x * s, y0 + e.y * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // player arrow
    ctx.translate(x0 + this.px * s, y0 + this.py * s);
    ctx.rotate(this.ang);
    ctx.fillStyle = "#c6f24e";
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-3.5, -3.5);
    ctx.lineTo(-3.5, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(198,242,78,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 4, y0 - 4, size + 8, size + 8);
    ctx.fillStyle = "rgba(198,242,78,0.75)";
    ctx.font = "700 9px 'Chakra Petch', monospace";
    ctx.fillText("TAC-MAP // SECTOR 7", x0 - 4, y0 + size + 14);
  }
}
