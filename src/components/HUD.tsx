import type { HudState } from "../game/engine";

function healthColor(hp: number) {
  if (hp > 60) return "#c6f24e";
  if (hp > 30) return "#ffb03a";
  return "#e03131";
}

export function HUD({ hud, visible }: { hud: HudState; visible: boolean }) {
  if (!visible) return null;
  const hp = hud.health;
  const col = healthColor(hp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none font-body">
      {/* low health throb */}
      {hp <= 30 && <div className="lowhp-overlay absolute inset-0" />}

      {/* top-left: score */}
      <div className="absolute left-5 top-5">
        <div className="text-[10px] font-bold tracking-[0.3em] text-[#7d9a7f]">SCORE</div>
        <div className="font-display text-3xl leading-none text-[#ffb03a] drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]">
          {hud.score.toLocaleString()}
        </div>
        <div className="mt-1 text-[11px] font-semibold tracking-widest text-[#f0e6cf]/70">
          KILLS <span className="text-[#c6f24e]">{hud.kills}</span>
          <span className="mx-2 text-[#7d9a7f]">·</span>
          BEST <span className="text-[#f0e6cf]/80">{hud.best.toLocaleString()}</span>
        </div>
      </div>

      {/* top-center: wave */}
      <div className="absolute left-1/2 top-5 -translate-x-1/2 text-center">
        <div className="clip-cut-sm inline-block border border-[#ffb03a]/40 bg-[#0a2415]/70 px-4 py-1">
          <span className="font-display text-lg leading-none text-[#f0e6cf]">
            WAVE {String(Math.max(1, hud.wave)).padStart(2, "0")}
          </span>
        </div>
        <div className="mt-1 text-[11px] font-bold tracking-[0.25em] text-[#ff5c1f]">
          HOSTILES ×{hud.hostiles}
        </div>
      </div>

      {/* bottom-left: vitals */}
      <div className="absolute bottom-5 left-5">
        <div className="flex items-end gap-3">
          <div
            className="font-display text-5xl leading-none transition-colors duration-200"
            style={{ color: col, textShadow: "2px 2px 0 rgba(0,0,0,0.65)" }}
          >
            {hp}
          </div>
          <div className="pb-1">
            <div className="text-[10px] font-bold tracking-[0.3em] text-[#7d9a7f]">VITALS</div>
            <div className="clip-cut-sm mt-1 h-2.5 w-48 border border-[#7d9a7f]/40 bg-[#04120a]/80 sm:w-56">
              <div
                className="h-full transition-[width] duration-200 ease-out"
                style={{
                  width: `${hp}%`,
                  background: `linear-gradient(to right, ${col}88, ${col})`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* bottom-right: weapon */}
      <div className="absolute bottom-5 right-5 text-right">
        <div className="text-[10px] font-bold tracking-[0.3em] text-[#7d9a7f]">
          SPARROWHAWK · 12GA
        </div>
        {hud.reloading ? (
          <div className="hud-blink font-display text-3xl leading-none text-[#ffb03a]">
            RELOADING
          </div>
        ) : (
          <div className="font-display text-5xl leading-none text-[#f0e6cf] drop-shadow-[2px_2px_0_rgba(0,0,0,0.65)]">
            {hud.ammo}
            <span className="ml-2 text-xl text-[#7d9a7f]">/ {hud.reserve}</span>
          </div>
        )}
        {hud.ammo === 0 && !hud.reloading && hud.reserve > 0 && (
          <div className="hud-blink mt-1 text-[11px] font-bold tracking-widest text-[#ff5c1f]">
            PRESS [R] TO RELOAD
          </div>
        )}
        {hud.ammo === 0 && hud.reserve === 0 && (
          <div className="hud-blink mt-1 text-[11px] font-bold tracking-widest text-[#e03131]">
            DRY — HUNT AMMO CRATES
          </div>
        )}
      </div>

      {/* bottom-center: key hints */}
      <div className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-[10px] font-semibold tracking-wider text-[#7d9a7f] md:flex">
        <span className="flex items-center gap-1">
          <kbd className="keycap">W</kbd>
          <kbd className="keycap">A</kbd>
          <kbd className="keycap">S</kbd>
          <kbd className="keycap">D</kbd> MOVE
        </span>
        <span className="text-[#3d5340]">|</span>
        <span>
          <kbd className="keycap">LMB</kbd> FIRE
        </span>
        <span className="text-[#3d5340]">|</span>
        <span>
          <kbd className="keycap">R</kbd> RELOAD
        </span>
        <span className="text-[#3d5340]">|</span>
        <span>
          <kbd className="keycap">SHIFT</kbd> SPRINT
        </span>
        <span className="text-[#3d5340]">|</span>
        <span>
          <kbd className="keycap">P</kbd> PAUSE
        </span>
      </div>
    </div>
  );
}
