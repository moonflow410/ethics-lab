"use client";

/* 미니룸입니다. 그림 파일이 아니라 화면에서 직접 그립니다.
   우주를 떠다니는 캐릭터를 방향키로 움직일 수 있고,
   행성에 가까이 가면 그 행성의 이름이 뜹니다. */

import { useCallback, useEffect, useRef, useState } from "react";

/* 미니룸 안쪽 좌표계입니다. 실제 크기와 상관없이 이 안에서만 계산합니다. */
const W = 640;
const H = 360;
const STEP = 14;

/* 캐릭터가 다가가면 이름이 뜨는 행성들입니다. 문구는 마음대로 바꿔도 됩니다. */
const PLANETS = [
  { id: "justice", x: 120, y: 96, r: 30, color: "#9B7FD4", label: "정의" },
  { id: "freedom", x: 316, y: 66, r: 22, color: "#B8AED9", label: "자유" },
  { id: "virtue", x: 520, y: 118, r: 34, color: "#7C6FA6", label: "덕" },
  { id: "duty", x: 452, y: 268, r: 24, color: "#C9AEE8", label: "책임" },
  { id: "care", x: 168, y: 272, r: 26, color: "#A8C6E8", label: "배려" }
];

/* 배경 별입니다. 매번 달라지지 않도록 고정된 값으로 적어 둡니다. */
const STARS = [
  [28, 40, 1.6], [92, 22, 1.1], [176, 58, 1.3], [238, 30, 1.0], [300, 128, 1.5],
  [368, 40, 1.2], [420, 96, 1.0], [488, 52, 1.4], [560, 84, 1.1], [604, 36, 1.3],
  [56, 148, 1.2], [140, 196, 1.0], [214, 244, 1.4], [268, 176, 1.1], [352, 216, 1.3],
  [404, 158, 1.0], [472, 200, 1.2], [536, 250, 1.5], [598, 176, 1.1], [76, 300, 1.3],
  [246, 320, 1.0], [340, 292, 1.2], [420, 336, 1.1], [580, 314, 1.4], [12, 220, 1.0]
] as const;

function Astronaut() {
  return (
    <g>
      {/* 몸 */}
      <ellipse cx="0" cy="10" rx="15" ry="17" fill="#F7F5FB" stroke="#7C6FA6" strokeWidth="2" />
      {/* 팔 */}
      <rect x="-24" y="2" width="10" height="6" rx="3" fill="#EFEBF7" stroke="#7C6FA6" strokeWidth="1.6" />
      <rect x="14" y="2" width="10" height="6" rx="3" fill="#EFEBF7" stroke="#7C6FA6" strokeWidth="1.6" />
      {/* 다리 */}
      <rect x="-10" y="24" width="7" height="10" rx="3" fill="#EFEBF7" stroke="#7C6FA6" strokeWidth="1.6" />
      <rect x="3" y="24" width="7" height="10" rx="3" fill="#EFEBF7" stroke="#7C6FA6" strokeWidth="1.6" />
      {/* 헬멧 */}
      <circle cx="0" cy="-12" r="16" fill="#FBF9FE" stroke="#7C6FA6" strokeWidth="2" />
      <path d="M-10 -16a10 10 0 0 1 8-6" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* 얼굴 */}
      <circle cx="-5" cy="-12" r="1.9" fill="#4A4468" />
      <circle cx="5" cy="-12" r="1.9" fill="#4A4468" />
      <path d="M-4 -6q4 3 8 0" stroke="#4A4468" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* 들고 있는 돋보기 — 탐구 중입니다 */}
      <circle cx="26" cy="5" r="6" fill="none" stroke="#7A4FC7" strokeWidth="2" />
      <line x1="30" y1="9" x2="35" y2="14" stroke="#7A4FC7" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

export default function MiniRoom() {
  const [pos, setPos] = useState({ x: W / 2, y: H / 2 + 30 });
  const [active, setActive] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const move = useCallback((dx: number, dy: number) => {
    setPos(p => ({
      x: Math.min(W - 30, Math.max(30, p.x + dx)),
      y: Math.min(H - 34, Math.max(34, p.y + dy))
    }));
  }, []);

  /* 방향키는 미니룸을 누른 뒤에만 듣습니다.
     그래야 글을 읽으려고 스크롤할 때 캐릭터가 멋대로 움직이지 않습니다. */
  useEffect(() => {
    if (!active) return;

    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowLeft: [-STEP, 0],
        ArrowRight: [STEP, 0],
        ArrowUp: [0, -STEP],
        ArrowDown: [0, STEP]
      };
      const delta = map[event.key];
      if (!delta) return;
      event.preventDefault();
      move(delta[0], delta[1]);
    };

    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [active, move]);

  /* 캐릭터가 닿아 있는 행성을 찾습니다. */
  const near = PLANETS.find(
    planet => Math.hypot(planet.x - pos.x, planet.y - pos.y) < planet.r + 26
  );

  return (
    <div className="cy-room">
      <div
        ref={boxRef}
        className={`cy-room-stage${active ? " is-active" : ""}`}
        tabIndex={0}
        role="application"
        aria-label="우주 탐구 미니룸. 방향키로 캐릭터를 움직입니다."
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        onClick={() => boxRef.current?.focus()}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="cy-room-svg" aria-hidden="true">
          <defs>
            <radialGradient id="cy-space" cx="50%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#4A4468" />
              <stop offset="60%" stopColor="#332F52" />
              <stop offset="100%" stopColor="#211E3A" />
            </radialGradient>
            <radialGradient id="cy-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#B8AED9" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#B8AED9" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width={W} height={H} fill="url(#cy-space)" />

          {STARS.map(([x, y, r], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r}
              fill="#fff"
              opacity={0.85}
              className="cy-room-star"
              style={{ animationDelay: `${(i % 7) * 0.4}s` }}
            />
          ))}

          {/* 멀리 있는 성운 */}
          <ellipse cx="470" cy="70" rx="120" ry="52" fill="#7C6FA6" opacity="0.16" />
          <ellipse cx="150" cy="300" rx="140" ry="46" fill="#9B7FD4" opacity="0.12" />

          {PLANETS.map(planet => (
            <g key={planet.id}>
              <circle cx={planet.x} cy={planet.y} r={planet.r} fill={planet.color} />
              <circle
                cx={planet.x - planet.r * 0.3}
                cy={planet.y - planet.r * 0.3}
                r={planet.r * 0.45}
                fill="#fff"
                opacity="0.18"
              />
              {planet.id === "virtue" ? (
                <ellipse
                  cx={planet.x}
                  cy={planet.y}
                  rx={planet.r * 1.7}
                  ry={planet.r * 0.42}
                  fill="none"
                  stroke="#E8DFF5"
                  strokeWidth="2.5"
                  opacity="0.7"
                  transform={`rotate(-18 ${planet.x} ${planet.y})`}
                />
              ) : null}
              <text
                x={planet.x}
                y={planet.y + planet.r + 15}
                textAnchor="middle"
                className="cy-room-planet-label"
                opacity={near?.id === planet.id ? 1 : 0.45}
              >
                {planet.label}
              </text>
            </g>
          ))}

          {/* 캐릭터 */}
          <g transform={`translate(${pos.x} ${pos.y})`} className="cy-room-hero">
            <circle cx="0" cy="0" r="46" fill="url(#cy-glow)" />
            <Astronaut />
          </g>
        </svg>

        <div className="cy-room-hint">
          {active
            ? near
              ? `${near.label} 행성을 탐구하는 중`
              : "방향키로 움직여 보세요"
            : "여기를 누르고 방향키로 움직여 보세요"}
        </div>
      </div>

      {/* 휴대폰처럼 키보드가 없을 때 쓰는 버튼입니다. */}
      <div className="cy-room-pad" aria-hidden="false">
        <button type="button" onClick={() => move(0, -STEP)} aria-label="위로">▲</button>
        <div>
          <button type="button" onClick={() => move(-STEP, 0)} aria-label="왼쪽으로">◀</button>
          <button type="button" onClick={() => move(STEP, 0)} aria-label="오른쪽으로">▶</button>
        </div>
        <button type="button" onClick={() => move(0, STEP)} aria-label="아래로">▼</button>
      </div>
    </div>
  );
}
