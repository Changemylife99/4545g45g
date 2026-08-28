import { useEffect, useRef, useState } from "react";
import {
  BannerMsg,
  HudState,
  Screen,
  TurokEngine,
} from "../game/engine";
import { HUD } from "./HUD";
import { DeathScreen, PauseScreen, TitleScreen, WaveBanner } from "./Screens";

const DEFAULT_HUD: HudState = {
  health: 100,
  ammo: 12,
  reserve: 72,
  score: 0,
  kills: 0,
  wave: 0,
  hostiles: 0,
  best: 0,
  reloading: false,
};

const FIREFLIES: Array<{ left: string; top: string; delay: string; dur: string }> = [
  { left: "8%", top: "22%", delay: "0s", dur: "9s" },
  { left: "18%", top: "68%", delay: "1.4s", dur: "11s" },
  { left: "31%", top: "38%", delay: "0.7s", dur: "8s" },
  { left: "44%", top: "80%", delay: "2.1s", dur: "10s" },
  { left: "58%", top: "18%", delay: "0.3s", dur: "12s" },
  { left: "66%", top: "55%", delay: "1.8s", dur: "9s" },
  { left: "78%", top: "30%", delay: "0.9s", dur: "11s" },
  { left: "87%", top: "72%", delay: "2.6s", dur: "8.5s" },
  { left: "93%", top: "44%", delay: "1.1s", dur: "10.5s" },
  { left: "50%", top: "50%", delay: "3s", dur: "9.5s" },
];

export function GameStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TurokEngine | null>(null);
  const bannerTimer = useRef<number | null>(null);
  const bannerId = useRef(0);

  const [screen, setScreen] = useState<Screen>("title");
  const [hud, setHud] = useState<HudState>(DEFAULT_HUD);
  const [banner, setBanner] = useState<{ id: number; msg: BannerMsg } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new TurokEngine(canvas, {
      onHud: setHud,
      onEvent: (e) => {
        if (e.type === "screen") setScreen(e.screen);
        else if (e.type === "banner") {
          bannerId.current += 1;
          setBanner({ id: bannerId.current, msg: e.banner });
          if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
          bannerTimer.current = window.setTimeout(() => setBanner(null), 2350);
        }
      },
    });
    engineRef.current = engine;
    return () => {
      if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const eng = () => engineRef.current;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#04120a]">
      {/* ambient layers behind the frame */}
      <div className="mist-layer" />
      <div className="mist-layer m2" />
      {FIREFLIES.map((f, i) => (
        <span
          key={i}
          className="firefly"
          style={{ left: f.left, top: f.top, animationDelay: f.delay, animationDuration: f.dur }}
        />
      ))}

      {/* play area */}
      <div className="absolute inset-0">
        <canvas ref={canvasRef} className="pixelated h-full w-full" width={640} height={400} />
      </div>

      {/* CRT dressing */}
      <div className="scanlines pointer-events-none absolute inset-0 z-10" />
      <div className="crt-vignette pointer-events-none absolute inset-0 z-10" />

      {/* in-game chrome */}
      <HUD hud={hud} visible={screen === "playing" || screen === "paused"} />
      {banner && screen === "playing" && <WaveBanner banner={banner.msg} id={banner.id} />}

      {screen === "title" && <TitleScreen hud={hud} onStart={() => eng()?.start()} />}
      {screen === "paused" && (
        <PauseScreen
          onResume={() => eng()?.resume()}
          onRestart={() => eng()?.start()}
          onTitle={() => eng()?.toTitle()}
        />
      )}
      {screen === "dead" && (
        <DeathScreen
          hud={hud}
          accuracy={eng()?.accuracy ?? 0}
          onRetry={() => eng()?.start()}
          onTitle={() => eng()?.toTitle()}
        />
      )}
    </div>
  );
}
