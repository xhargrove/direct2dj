import type { CSSProperties } from "react";

/** Decorative-only hero art — server-rendered, CSS-driven motion. */
export function ClubHeroVisual() {
  const barHeights = [42, 72, 55, 88, 48, 96, 62, 78, 52, 84, 58, 70];
  return (
    <div className="dj-visual-stage">
      <div className="dj-visual-deck" aria-hidden>
        <div className="dj-visual-deck__halo" />
        <div className="dj-visual-deck__plate dj-visual-deck__plate--left">
          <span className="dj-visual-deck__dot" />
        </div>
        <div className="dj-visual-deck__plate dj-visual-deck__plate--right">
          <span className="dj-visual-deck__dot" />
        </div>
        <div className="dj-visual-deck__bridge" />
        <div className="dj-visual-deck__meter">
          {barHeights.map((h, i) => (
            <span
              key={i}
              className="dj-visual-deck__bar"
              style={
                {
                  "--dj-bar-h": `${h}%`,
                  "--dj-bar-delay": `${i * 0.07}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
