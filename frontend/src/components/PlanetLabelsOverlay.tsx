import { useEffect, useRef } from 'react';

export interface ScreenLabel {
  id: number;
  name: string;
  type: string;
  color: string;
  x: number;
  y: number;
  dist: number;
  behind: boolean;
}

interface Props {
  labelsMapRef: React.MutableRefObject<Map<number, ScreenLabel>>;
  selectedBodyId: number | null;
  hoveredBodyId: number | null;
}

export function PlanetLabelsOverlay({ labelsMapRef, selectedBodyId, hoveredBodyId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const labelEls     = useRef<Map<number, HTMLDivElement>>(new Map());

  // Refs so rAF closure always sees latest state
  const selRef = useRef<number | null>(selectedBodyId);
  const hovRef = useRef<number | null>(hoveredBodyId);
  useEffect(() => { selRef.current = selectedBodyId; }, [selectedBodyId]);
  useEffect(() => { hovRef.current = hoveredBodyId; }, [hoveredBodyId]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d')!;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      const W = window.innerWidth;
      const H = window.innerHeight;
      if (canvas.width !== W)  canvas.width  = W;
      if (canvas.height !== H) canvas.height = H;
      ctx.clearRect(0, 0, W, H);

      const selId = selRef.current;
      const hovId = hovRef.current;

      const labels = Array.from(labelsMapRef.current.values()).filter(l => {
        if (l.behind) return false;
        if (l.x < -60 || l.x > W + 60 || l.y < -60 || l.y > H + 60) return false;
        return l.dist < 300;
      });

      // Remove divs for planets no longer visible
      const activeIds = new Set(labels.map(l => l.id));
      labelEls.current.forEach((el, id) => {
        if (!activeIds.has(id)) { el.remove(); labelEls.current.delete(id); }
      });

      labels.forEach(label => {
        const isSel  = label.id === selId;
        const isHov  = label.id === hovId;
        const isHigh = isSel || isHov;

        // Fade by distance (visible from 20–280 units away)
        const alpha = Math.max(0, Math.min(1, 1 - (label.dist - 20) / 260));
        if (alpha < 0.05) return;

        // ── Leader line direction ──────────────────────────────
        const goRight  = label.x < W * 0.55;
        const lineLen  = isHigh ? 75 : 48;
        const dx       = goRight ? lineLen * 0.65 : -lineLen * 0.65;
        const dy       = -lineLen * 0.55;
        const midX     = label.x + dx;
        const midY     = label.y + dy;
        const capLen   = isHigh ? 28 : 18;
        const capEndX  = midX + (goRight ? capLen : -capLen);
        const capEndY  = midY;

        // ── Draw on canvas ────────────────────────────────────
        ctx.save();
        ctx.globalAlpha = alpha;

        // Pulsing dot at planet screen centre
        const dotR = isHigh ? 4.5 : 2.5;
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.004);
        ctx.beginPath();
        ctx.arc(label.x, label.y, dotR * (isHigh ? pulse : 1), 0, Math.PI * 2);
        ctx.fillStyle = label.color;
        ctx.fill();

        // Outer ring on selected
        if (isSel) {
          ctx.beginPath();
          ctx.arc(label.x, label.y, dotR * 2.2 * pulse, 0, Math.PI * 2);
          ctx.strokeStyle = label.color;
          ctx.lineWidth = 0.8;
          ctx.globalAlpha = alpha * 0.4 * pulse;
          ctx.stroke();
          ctx.globalAlpha = alpha;
        }

        // Leader line: planet → elbow → horizontal cap
        ctx.beginPath();
        ctx.moveTo(label.x, label.y);
        ctx.lineTo(midX, midY);
        ctx.lineTo(capEndX, capEndY);
        ctx.strokeStyle = label.color;
        ctx.lineWidth   = isHigh ? 1.4 : 0.7;
        ctx.globalAlpha = alpha * (isHigh ? 0.85 : 0.45);
        // Dashed for normal, solid for highlighted
        if (!isHigh) ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();

        // ── DOM label card ────────────────────────────────────
        let el = labelEls.current.get(label.id);
        if (!el) {
          el = document.createElement('div');
          container.appendChild(el);
          labelEls.current.set(label.id, el);
        }

        const cardW = isHigh ? 148 : 88;
        const cardX = goRight ? capEndX + 4 : capEndX - 4 - cardW;
        const cardY = capEndY - (isHigh ? 22 : 13);

        el.style.cssText = `
          position: absolute;
          left: ${cardX}px;
          top: ${cardY}px;
          width: ${cardW}px;
          opacity: ${alpha};
          --pc: ${label.color};
          pointer-events: none;
          transition: width 0.25s ease, opacity 0.3s ease;
        `;

        if (isHigh) {
          el.innerHTML = `
            <div style="
              border: 1px solid ${label.color};
              border-radius: 5px;
              background: rgba(6,8,24,0.88);
              padding: 7px 10px;
              box-shadow: 0 0 18px -4px ${label.color}, inset 0 0 12px -8px ${label.color};
              backdrop-filter: blur(8px);
            ">
              <div style="
                display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
              ">
                <span style="
                  width: 6px; height: 6px; border-radius: 50%;
                  background: ${label.color};
                  box-shadow: 0 0 6px ${label.color};
                  flex-shrink: 0;
                  animation: none;
                "></span>
                <span style="
                  font-family: Inter, sans-serif;
                  font-size: 13px; font-weight: 800;
                  letter-spacing: 0.12em; text-transform: uppercase;
                  color: ${label.color};
                ">${label.name}</span>
              </div>
              <div style="
                font-family: Inter, sans-serif;
                font-size: 8px; font-weight: 600;
                letter-spacing: 0.18em; text-transform: uppercase;
                color: rgba(255,255,255,0.38);
                border-top: 1px solid rgba(255,255,255,0.08);
                padding-top: 4px; margin-top: 1px;
              ">${label.type}</div>
            </div>`;
        } else {
          el.innerHTML = `
            <div style="
              display: flex; align-items: center; gap: 5px;
            ">
              <span style="
                font-family: Inter, sans-serif;
                font-size: 9px; font-weight: 700;
                letter-spacing: 0.14em; text-transform: uppercase;
                color: ${label.color};
                text-shadow: 0 0 8px ${label.color};
                white-space: nowrap;
              ">${label.name}</span>
            </div>`;
        }
      });
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      labelEls.current.forEach(el => el.remove());
      labelEls.current.clear();
    };
  }, []); // stable — reads latest state via refs

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 9 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
