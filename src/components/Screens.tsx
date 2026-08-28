import type { ReactNode } from "react";
import type { BannerMsg, HudState } from "../game/engine";

function Kbd({ k }: { k: string }) {
  return <kbd className="keycap">{k}</kbd>;
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-primary clip-cut pointer-events-auto bg-[#ffb03a] px-8 py-3.5 font-display text-lg tracking-wide text-[#12100a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c6f24e]"
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-ghost clip-cut-sm pointer-events-auto border border-[#7d9a7f]/60 bg-[#0a2415]/60 px-6 py-2.5 font-display text-sm tracking-wide text-[#f0e6cf] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c6f24e]"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------ title */

export function TitleScreen({
  hud,
  onStart,
}: {
  hud: HudState;
  onStart: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between overflow-hidden bg-gradient-to-t from-[#020a06]/95 via-[#020a06]/30 to-[#020a06]/70 p-6 sm:p-10">
      {/* top row: terminal + best */}
      <div className="flex items-start justify-between gap-4">
        <div className="rise-1 clip-cut-sm border border-[#7d9a7f]/30 bg-[#04120a]/85 p-3 font-mono text-[11px] leading-relaxed text-[#7d9a7f] sm:text-xs">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#e03131]/80" />
            <span className="h-2 w-2 rounded-full bg-[#ffb03a]/80" />
            <span className="h-2 w-2 rounded-full bg-[#7fbf4d]/80" />
            <span className="ml-2 tracking-widest text-[#f0e6cf]/60">~/Changemylife99/Turok-FPS</span>
          </div>
          <div><span className="text-[#c6f24e]">$</span> git init &amp;&amp; git commit -m "first commit"</div>
          <div className="text-[#f0e6cf]/50">[Origin 7f3a2c1] first commit — hunt protocol armed</div>
          <div>
            <span className="text-[#c6f24e]">$</span> git push -u origin Origin{" "}
            <span className="text-[#ffb03a]">✓</span>
            <span className="term-caret ml-1 inline-block h-3 w-1.5 translate-y-0.5 bg-[#c6f24e]" />
          </div>
        </div>
        <div className="rise-1 hidden text-right sm:block">
          <div className="text-[10px] font-bold tracking-[0.3em] text-[#7d9a7f]">BEST HAUL</div>
          <div className="font-display text-2xl text-[#ffb03a]">{hud.best.toLocaleString()}</div>
        </div>
      </div>

      {/* bottom row: logo + control panel */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <div className="rise-2 mb-2 flex items-center gap-3">
            <span className="h-px w-10 bg-[#ff5c1f]" />
            <span className="text-[11px] font-bold tracking-[0.4em] text-[#ff5c1f]">
              LOST LAND PROTOCOL // BROWSER BUILD
            </span>
          </div>
          <h1 className="rise-2 logo-glow font-display text-6xl leading-[0.95] text-[#f0e6cf] sm:text-7xl lg:text-8xl">
            TUROK
            <span className="text-[#ffb03a]">-FPS</span>
          </h1>
          <p className="rise-3 mt-4 max-w-md text-sm leading-relaxed text-[#b8c9b4] sm:text-base">
            The temple arena has reopened. Raptors pour through the fog, spitters venom the
            air, and every fifth wave the ground itself shakes. Endless waves. One rifle.
            <span className="font-semibold text-[#f0e6cf]"> Hunt, or be fossilized.</span>
          </p>
        </div>

        <div className="rise-4 clip-cut w-full max-w-sm border border-[#7fbf4d]/25 bg-[#071b10]/85 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-sm tracking-wide text-[#c6f24e]">FIELD MANUAL</span>
            <span className="text-[10px] font-semibold tracking-widest text-[#7d9a7f]">v1.0 · ENDLESS</span>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-[12px] text-[#b8c9b4]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex gap-1"><Kbd k="W" /><Kbd k="A" /><Kbd k="S" /><Kbd k="D" /></span>
              <span className="tracking-wider">MOVE</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span><Kbd k="MOUSE" /></span>
              <span className="tracking-wider">AIM · LOOK</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span><Kbd k="LMB" /></span>
              <span className="tracking-wider">FIRE (HOLD)</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex gap-1"><Kbd k="R" /><Kbd k="SHIFT" /></span>
              <span className="tracking-wider">RELOAD · SPRINT</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span><Kbd k="P / ESC" /></span>
              <span className="tracking-wider">PAUSE</span>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <PrimaryButton onClick={onStart}>START THE HUNT</PrimaryButton>
            <div className="text-center text-[10px] tracking-widest text-[#7d9a7f]">
              POINTER LOCKS ON DEPLOY — ESC TO RELEASE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------ pause */

export function PauseScreen({
  onResume,
  onRestart,
  onTitle,
}: {
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#020a06]/78 p-6 backdrop-blur-[2px]">
      <div className="clip-cut w-full max-w-md border border-[#7fbf4d]/30 bg-[#071b10]/95 p-8">
        <div className="mb-1 text-[11px] font-bold tracking-[0.4em] text-[#ff5c1f]">
          SIGNAL HELD
        </div>
        <h2 className="font-display text-4xl text-[#f0e6cf]">HUNT PAUSED</h2>
        <p className="mt-2 text-sm text-[#b8c9b4]">
          The jungle waits. It is very good at waiting.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <PrimaryButton onClick={onResume}>RESUME HUNT</PrimaryButton>
          <div className="flex gap-2.5">
            <GhostButton onClick={onRestart}>RESTART</GhostButton>
            <GhostButton onClick={onTitle}>ABANDON RUN</GhostButton>
          </div>
        </div>
        <div className="mt-5 border-t border-[#7d9a7f]/20 pt-3 text-[11px] tracking-wider text-[#7d9a7f]">
          <Kbd k="P" /> RESUME · <Kbd k="W" /><Kbd k="A" /><Kbd k="S" /><Kbd k="D" /> MOVE ·{" "}
          <Kbd k="R" /> RELOAD
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------ death */

export function DeathScreen({
  hud,
  accuracy,
  onRetry,
  onTitle,
}: {
  hud: HudState;
  accuracy: number;
  onRetry: () => void;
  onTitle: () => void;
}) {
  const newBest = hud.score > 0 && hud.score >= hud.best;
  const stats: Array<[string, string, string]> = [
    ["FINAL SCORE", hud.score.toLocaleString(), "#ffb03a"],
    ["WAVE REACHED", String(hud.wave).padStart(2, "0"), "#f0e6cf"],
    ["KILLS", String(hud.kills), "#c6f24e"],
    ["ACCURACY", `${accuracy}%`, "#f0e6cf"],
  ];
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-[#1a0505]/90 via-[#020a06]/60 to-[#020a06]/40 p-6 sm:items-center sm:p-10">
      <div className="w-full max-w-2xl">
        <div className="rise-1 mb-2 flex items-center gap-3">
          <span className="h-px w-10 bg-[#e03131]" />
          <span className="text-[11px] font-bold tracking-[0.4em] text-[#e03131]">
            TRANSMISSION LOST
          </span>
          {newBest && (
            <span className="hud-blink clip-cut-sm bg-[#ffb03a] px-2 py-0.5 font-display text-[11px] text-[#12100a]">
              NEW BEST
            </span>
          )}
        </div>
        <h2 className="rise-1 font-display text-5xl leading-[0.95] text-[#f0e6cf] sm:text-6xl">
          THE JUNGLE
          <br />
          <span className="text-[#e03131]">CLAIMS YOU</span>
        </h2>

        <div className="rise-2 mt-6 flex flex-wrap items-stretch gap-px border border-[#7d9a7f]/25 bg-[#7d9a7f]/25">
          {stats.map(([label, value, color]) => (
            <div key={label} className="min-w-[46%] flex-1 bg-[#04120a]/90 px-4 py-3 sm:min-w-0">
              <div className="text-[9px] font-bold tracking-[0.3em] text-[#7d9a7f]">{label}</div>
              <div className="font-display text-2xl" style={{ color }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="rise-3 mt-6 flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={onRetry}>HUNT AGAIN</PrimaryButton>
          <GhostButton onClick={onTitle}>MAIN MENU</GhostButton>
          <span className="ml-auto hidden text-[10px] tracking-widest text-[#7d9a7f] sm:block">
            BEST HAUL · {hud.best.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------ banner */

export function WaveBanner({ banner, id }: { banner: BannerMsg; id: number }) {
  const color =
    banner.tone === "red" ? "#ff5c1f" : banner.tone === "green" ? "#c6f24e" : "#ffb03a";
  return (
    <div key={id} className="pointer-events-none absolute inset-x-0 top-[20%] z-20 text-center">
      <div className="banner-anim">
        <div
          className="font-display text-5xl sm:text-6xl"
          style={{ color, textShadow: `3px 3px 0 rgba(0,0,0,0.7), 0 0 34px ${color}55` }}
        >
          {banner.title}
        </div>
        {banner.sub && (
          <div className="mt-2 text-[12px] font-bold tracking-[0.45em] text-[#f0e6cf]/85">
            {banner.sub}
          </div>
        )}
      </div>
    </div>
  );
}
