/**
 * PoseFigure — FITLY's Realistic Anatomical Vector Pose Guide.
 *
 * Renders high-fidelity, gender-aware human line silhouettes from the pose's
 * joint data:
 *  - tapered limb bands (arms, legs) that follow any bend — standing, striding
 *    or seated,
 *  - a gender-contoured torso (narrower shoulders / waist, wider hips for
 *    women; broader frame for men),
 *  - garment detail: collar, sleeve hems, shirt hem stitch, waistband, fly,
 *    cargo pockets with flaps, fabric creases, stitched cuffs,
 *  - an anatomical head with jaw, ears and gendered hair,
 *  - detailed sneakers with sole, laces and toe cap,
 *  - optional environment props and a labelled camera-mark diagram.
 *
 * Pure vector artwork — no photographs of people.
 */

import type { PoseMark, PoseProp, PoseSpec, Pt } from "../lib/poses";

const WHITE = "#ffffff";
const BODY_FILL = "url(#fitlyBodyGrad)";
const SOFT_FILL = "rgba(255, 255, 255, 0.16)";
const SEAM = "rgba(255, 255, 255, 0.65)";
const OUTLINE_W = 2.3;

export type Gender = "men" | "women";

interface Props {
  pose: PoseSpec;
  className?: string;
  gender?: Gender;
  /** Background guides — chair, table, wall, mirror, stairs, drape. */
  showGuides?: boolean;
  /** Ground line + labelled camera marks (full detail diagram). */
  showLabels?: boolean;
  /** Show perspective ground ellipse under feet. Defaults to true. */
  showGround?: boolean;
  /** When phone tilt matches recommended camera angle, turns line art to emerald glow. */
  isMatched?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Geometry helpers                                                            */
/* -------------------------------------------------------------------------- */

const n2 = (v: number) => Math.round(v * 100) / 100;

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Unit normal of a→b (rotated 90°). */
function normalOf(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

/**
 * Closed outline around a polyline with per-point half-widths —
 * builds natural, tapered limbs (upper/lower arm, thigh/shin) that follow
 * any joint bend, with rounded caps at both ends.
 */
function bandPath(points: Pt[], widths: number[]): string {
  const n = points.length;
  if (n < 2) return "";
  const dirs: Pt[] = [];
  const norms: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dirs.push({ x: dx / len, y: dy / len });
    norms.push({ x: -dy / len, y: dx / len });
  }
  const left = points.map((p, i) => ({
    x: p.x + norms[i].x * widths[i],
    y: p.y + norms[i].y * widths[i],
  }));
  const right = points.map((p, i) => ({
    x: p.x - norms[i].x * widths[i],
    y: p.y - norms[i].y * widths[i],
  }));
  const last = n - 1;
  const endCap = {
    x: points[last].x + dirs[last].x * widths[last] * 2,
    y: points[last].y + dirs[last].y * widths[last] * 2,
  };
  const startCap = {
    x: points[0].x - dirs[0].x * widths[0] * 2,
    y: points[0].y - dirs[0].y * widths[0] * 2,
  };
  const seg = (p: Pt) => `${n2(p.x)} ${n2(p.y)}`;
  const parts: string[] = [`M ${seg(left[0])}`];
  for (let i = 1; i < n; i++) parts.push(`L ${seg(left[i])}`);
  parts.push(`Q ${seg(endCap)} ${seg(right[last])}`);
  for (let i = last - 1; i >= 0; i--) parts.push(`L ${seg(right[i])}`);
  parts.push(`Q ${seg(startCap)} ${seg(left[0])}`);
  parts.push("Z");
  return parts.join(" ");
}

/* -------------------------------------------------------------------------- */
/* Anatomical head                                                             */
/* -------------------------------------------------------------------------- */

function AnatomicalHead({
  x,
  y,
  r = 13,
  facing = "front",
  gender = "men",
  stroke = WHITE,
  seam = SEAM,
}: {
  x: number;
  y: number;
  r?: number;
  facing?: "front" | "back" | "side";
  gender?: Gender;
  stroke?: string;
  seam?: string;
}) {
  const isFemale = gender === "women";
  const craniumR = r * (isFemale ? 0.94 : 1.02);
  const jawW = r * (isFemale ? 0.60 : 0.74);
  const chinY = y + r * (isFemale ? 1.05 : 1.15);

  if (facing === "side") {
    const sideHeadPath = `
      M ${x - r * 0.3} ${y - r * 0.95}
      C ${x + r * 0.7} ${y - r * 0.95}, ${x + r * 1.1} ${y - r * 0.3}, ${x + r * 1.0} ${y + r * 0.2}
      L ${x + r * 1.12} ${y + r * 0.34}
      L ${x + r * 0.88} ${y + r * 0.5}
      L ${x + r * 0.94} ${y + r * 0.7}
      L ${x + r * 0.6} ${y + r * 1.05}
      L ${x - r * 0.1} ${chinY}
      L ${x - r * 0.5} ${y + r * 0.6}
      C ${x - r * 0.9} ${y + r * 0.3}, ${x - r * 0.9} ${y - r * 0.5}, ${x - r * 0.3} ${y - r * 0.95}
      Z
    `;
    return (
      <g>
        <path d={sideHeadPath} fill={SOFT_FILL} stroke={stroke} strokeWidth={OUTLINE_W} strokeLinejoin="round" />
        {/* Ear */}
        <path
          d={`M ${x - r * 0.15} ${y + r * 0.1} Q ${x - r * 0.42} ${y + r * 0.32} ${x - r * 0.12} ${y + r * 0.52}`}
          fill="none"
          stroke={seam}
          strokeWidth={1.2}
        />
        {/* Hair mass over the cranium */}
        <path
          d={`M ${x - r * 0.75} ${y - r * 0.35} C ${x - r * 0.7} ${y - r * 1.15}, ${x + r * 0.85} ${y - r * 1.2}, ${x + r * 0.95} ${y - r * 0.2}`}
          fill="none"
          stroke={isFemale ? stroke : seam}
          strokeWidth={1.5}
        />
      </g>
    );
  }

  // Front / back view head: cranium, cheeks, jaw, chin
  const headPath = `
    M ${x - craniumR} ${y}
    C ${x - craniumR} ${y - craniumR * 1.08}, ${x + craniumR} ${y - craniumR * 1.08}, ${x + craniumR} ${y}
    C ${x + craniumR} ${y + r * 0.52}, ${x + jawW} ${y + r * 0.82}, ${x + jawW * 0.5} ${chinY - 2}
    Q ${x} ${chinY + 2}, ${x - jawW * 0.5} ${chinY - 2}
    C ${x - jawW} ${y + r * 0.82}, ${x - craniumR} ${y + r * 0.52}, ${x - craniumR} ${y}
    Z
  `;

  return (
    <g>
      <path d={headPath} fill={SOFT_FILL} stroke={stroke} strokeWidth={OUTLINE_W} strokeLinejoin="round" />
      {/* Center alignment guide dot on face (as seen in reference design) */}
      <circle cx={x} cy={y + 3.5} r={1.4} fill={stroke} />
      {/* Ears */}
      <path
        d={`M ${x - craniumR + 0.8} ${y} Q ${x - craniumR - 3.2} ${y + 4.5} ${x - craniumR + 1.5} ${y + 8.5}`}
        fill="none"
        stroke={stroke}
        strokeWidth={1.3}
      />
      <path
        d={`M ${x + craniumR - 0.8} ${y} Q ${x + craniumR + 3.2} ${y + 4.5} ${x + craniumR - 1.5} ${y + 8.5}`}
        fill="none"
        stroke={stroke}
        strokeWidth={1.3}
      />
      {isFemale ? (
        /* Women: soft hair draping smoothly past ears to shoulders */
        <g>
          <path
            d={`M ${x - craniumR - 1} ${y + 12}
                C ${x - craniumR - 3} ${y + 2}, ${x - craniumR - 2} ${y - r * 1.25}, ${x} ${y - r * 1.25}
                C ${x + craniumR + 2} ${y - r * 1.25}, ${x + craniumR + 3} ${y + 2}, ${x + craniumR + 1} ${y + 12}
                C ${x + craniumR * 0.75} ${y - r * 0.55}, ${x - craniumR * 0.75} ${y - r * 0.55}, ${x - craniumR - 1} ${y + 12}
                Z`}
            fill="rgba(255, 255, 255, 0.22)"
            stroke={stroke}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        </g>
      ) : (
        /* Men: clean hairline */
        <path
          d={`M ${x - craniumR * 0.82} ${y - r * 0.6} Q ${x} ${y - r * 0.92} ${x + craniumR * 0.82} ${y - r * 0.6}`}
          fill="none"
          stroke={seam}
          strokeWidth={1.2}
        />
      )}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Sneaker                                                                     */
/* -------------------------------------------------------------------------- */

function Sneaker({
  ankle,
  toe,
  gender = "men",
  stroke = WHITE,
  seam = SEAM,
}: {
  ankle: Pt;
  toe: Pt;
  gender?: Gender;
  stroke?: string;
  seam?: string;
}) {
  const dx = toe.x - ankle.x;
  const dy = toe.y - ankle.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  let px = -uy;
  let py = ux;
  // Orient perpendicular so +p points towards the floor
  if (py < 0 || (py === 0 && px < 0)) {
    px = -px;
    py = -py;
  }

  const isFemale = gender === "women";
  const half = isFemale ? 5.6 : 6.8;
  const tipHalf = isFemale ? 4.0 : 4.8;
  const heel = { x: ankle.x - ux * 4, y: ankle.y - uy * 4 };

  const outline = [
    `M ${n2(heel.x + px * half)} ${n2(heel.y + py * half)}`,
    `L ${n2(toe.x + px * tipHalf)} ${n2(toe.y + py * tipHalf)}`,
    `Q ${n2(toe.x + ux * 6)} ${n2(toe.y + uy * 6)} ${n2(toe.x - px * tipHalf)} ${n2(toe.y - py * tipHalf)}`,
    `L ${n2(heel.x - px * half)} ${n2(heel.y - py * half)}`,
    `Q ${n2(heel.x - ux * 5)} ${n2(heel.y - uy * 5)} ${n2(heel.x + px * half)} ${n2(heel.y + py * half)}`,
    "Z",
  ].join(" ");

  // Double sole layer: outsole + midsole
  const sole = `M ${n2(heel.x + px * half * 0.72)} ${n2(heel.y + py * half * 0.72)} L ${n2(toe.x + px * tipHalf * 0.72)} ${n2(toe.y + py * tipHalf * 0.72)}`;
  const midSole = `M ${n2(heel.x + px * half * 0.42)} ${n2(heel.y + py * half * 0.42)} L ${n2(toe.x + px * tipHalf * 0.42)} ${n2(toe.y + py * tipHalf * 0.42)}`;

  // Lace rows across the instep / eyestay
  const laces = [0.28, 0.44, 0.60, 0.74]
    .map((t) => {
      const p = { x: ankle.x + ux * len * t, y: ankle.y + uy * len * t };
      const w = half * (1 - t * 0.28);
      return `M ${n2(p.x - px * w * 0.65)} ${n2(p.y - py * w * 0.65)} L ${n2(p.x - px * w * 0.05)} ${n2(p.y - py * w * 0.05)}`;
    })
    .join(" ");

  // Toe-cap seam
  const capT = 0.76;
  const capA = { x: ankle.x + ux * len * capT - px * tipHalf * 0.88, y: ankle.y + uy * len * capT - py * tipHalf * 0.88 };
  const capB = { x: ankle.x + ux * len * capT + px * tipHalf * 0.88, y: ankle.y + uy * len * capT + py * tipHalf * 0.88 };
  const capMid = { x: ankle.x + ux * len * capT + ux * 2.6, y: ankle.y + uy * len * capT + uy * 2.6 };

  // Tongue outline
  const tongueTop = { x: ankle.x - ux * 1.5 - px * 2, y: ankle.y - uy * 1.5 - py * 2 };

  return (
    <g>
      <path d={outline} fill="rgba(255, 255, 255, 0.22)" stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" />
      <path d={sole} stroke={stroke} strokeWidth={2} opacity={0.95} strokeLinecap="round" fill="none" />
      <path d={midSole} stroke={seam} strokeWidth={1} opacity={0.65} strokeLinecap="round" fill="none" />
      <path d={laces} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <path
        d={`M ${n2(capA.x)} ${n2(capA.y)} Q ${n2(capMid.x)} ${n2(capMid.y)} ${n2(capB.x)} ${n2(capB.y)}`}
        stroke={seam}
        strokeWidth={1.2}
        fill="none"
      />
      {/* Sneaker collar / heel tab */}
      <circle cx={n2(tongueTop.x)} cy={n2(tongueTop.y)} r={1.4} fill={stroke} />
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Environment props                                                           */
/* -------------------------------------------------------------------------- */

function Prop({ prop }: { prop: PoseProp }) {
  const common = { fill: "none", stroke: WHITE, strokeWidth: 1.6, opacity: 0.65 } as const;
  switch (prop.kind) {
    case "wall":
      return (
        <g>
          <line x1={prop.x} y1={prop.y1} x2={prop.x} y2={prop.y2} stroke={WHITE} strokeWidth={2.4} opacity={0.6} />
          {Array.from({ length: 8 }).map((_, i) => {
            const y = prop.y1 + ((prop.y2 - prop.y1) / 8) * (i + 0.5);
            return (
              <line key={i} x1={prop.x} y1={y} x2={prop.x - 8} y2={y + 6} stroke={WHITE} strokeWidth={1} opacity={0.35} />
            );
          })}
        </g>
      );
    case "chair":
      return (
        <g {...common}>
          {/* Seat */}
          <line x1={prop.x} y1={prop.y} x2={prop.x + 50} y2={prop.y} strokeWidth={2.2} />
          {/* Backrest */}
          <line x1={prop.x + 48} y1={prop.y} x2={prop.x + 48} y2={prop.y - 50} strokeWidth={2.2} />
          <line x1={prop.x + 40} y1={prop.y - 50} x2={prop.x + 48} y2={prop.y - 50} strokeWidth={2.2} />
          {/* Legs */}
          <line x1={prop.x + 4} y1={prop.y} x2={prop.x + 4} y2={prop.y + 90} />
          <line x1={prop.x + 46} y1={prop.y} x2={prop.x + 46} y2={prop.y + 90} />
        </g>
      );
    case "table":
      return (
        <g {...common}>
          <line x1={prop.x} y1={prop.y} x2={prop.x + 54} y2={prop.y} strokeWidth={2.4} />
          <line x1={prop.x + 6} y1={prop.y} x2={prop.x + 6} y2={prop.y + 115} />
          <line x1={prop.x + 48} y1={prop.y} x2={prop.x + 48} y2={prop.y + 115} opacity={0.45} />
        </g>
      );
    case "stairs":
      return (
        <g {...common}>
          {prop.steps.map((s, i) => (
            <g key={i}>
              <line x1={s.x} y1={s.y} x2={s.x + s.w} y2={s.y} strokeWidth={2} />
              {i < prop.steps.length - 1 && (
                <line x1={s.x + s.w} y1={s.y} x2={s.x + s.w} y2={prop.steps[i + 1].y} strokeWidth={2} />
              )}
            </g>
          ))}
        </g>
      );
    case "mirror":
      return (
        <rect
          x={prop.x}
          y={prop.y}
          width={prop.w}
          height={prop.h}
          rx={10}
          fill="rgba(255,255,255,0.05)"
          stroke={WHITE}
          strokeWidth={1.8}
          opacity={0.65}
        />
      );
    case "drape":
      /* Full-length garment silhouette behind the figure */
      return (
        <g fill="none" stroke={WHITE} strokeWidth={1.5} opacity={0.5} strokeLinejoin="round">
          <path d="M 78 84 C 60 160, 55 250, 59 316" />
          <path d="M 122 84 C 140 160, 145 250, 141 316" />
          <path d="M 59 316 Q 100 326 141 316" />
          <path d="M 66 128 Q 100 140 134 128" strokeDasharray="4 4" opacity={0.8} />
        </g>
      );
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Camera-mark diagram (preview modal)                                         */
/* -------------------------------------------------------------------------- */

function MarkLayer({ marks, showLabels }: { marks: PoseMark[]; showLabels: boolean }) {
  const label = {
    fill: WHITE,
    fontSize: 6.4,
    fontWeight: 700,
    stroke: "rgba(4, 13, 24, 0.75)",
    strokeWidth: 1.8,
    paintOrder: "stroke" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <g>
      {marks.map((m, i) => {
        switch (m.kind) {
          case "frame":
            return (
              <g key={i}>
                <rect
                  x={m.x}
                  y={m.y}
                  width={m.w}
                  height={m.h}
                  rx={7}
                  fill="none"
                  stroke={WHITE}
                  strokeWidth={1.2}
                  strokeDasharray="6 5"
                  opacity={0.55}
                />
                {showLabels && m.label && (
                  <text x={m.x + 5} y={m.y + 10} {...label} opacity={0.95}>
                    {m.label}
                  </text>
                )}
              </g>
            );
          case "line": {
            const midX = (m.from.x + m.to.x) / 2;
            return (
              <g key={i}>
                <line
                  x1={m.from.x}
                  y1={m.from.y}
                  x2={m.to.x}
                  y2={m.to.y}
                  stroke={WHITE}
                  strokeWidth={1.3}
                  strokeDasharray="5 4"
                  opacity={0.85}
                />
                <line x1={m.from.x} y1={m.from.y - 5} x2={m.from.x} y2={m.from.y + 5} stroke={WHITE} strokeWidth={1.3} opacity={0.85} />
                <line x1={m.to.x} y1={m.to.y - 5} x2={m.to.x} y2={m.to.y + 5} stroke={WHITE} strokeWidth={1.3} opacity={0.85} />
                {showLabels && m.label && (
                  <text x={midX} y={m.from.y - 5} textAnchor="middle" {...label}>
                    {m.label}
                  </text>
                )}
              </g>
            );
          }
          case "arrow": {
            const midX = (m.from.x + m.to.x) / 2;
            const midY = (m.from.y + m.to.y) / 2;
            return (
              <g key={i}>
                <line
                  x1={m.from.x}
                  y1={m.from.y}
                  x2={m.to.x}
                  y2={m.to.y}
                  stroke={WHITE}
                  strokeWidth={1.5}
                  opacity={0.9}
                  markerEnd="url(#fitlyPoseArrow)"
                />
                {showLabels && m.label && (
                  <text x={midX} y={midY - 5} textAnchor="middle" {...label}>
                    {m.label}
                  </text>
                )}
              </g>
            );
          }
          case "camera":
            return (
              <g key={i}>
                <line
                  x1={m.pos.x}
                  y1={m.pos.y}
                  x2={m.target.x}
                  y2={m.target.y}
                  stroke={WHITE}
                  strokeWidth={1.3}
                  strokeDasharray="4 3"
                  opacity={0.8}
                />
                <g transform={`translate(${m.pos.x - 6}, ${m.pos.y - 4.5})`} fill="none" stroke={WHITE} strokeWidth={1.4}>
                  <rect x={0} y={1.5} width={12} height={9} rx={2} />
                  <path d="M 4 1.5 L 5 0 L 9 0 L 10 1.5" />
                  <circle cx={6} cy={6} r={2.4} />
                </g>
                {showLabels && (
                  <text x={m.pos.x} y={m.pos.y + 13} textAnchor="middle" {...label} fontSize={6.2}>
                    {m.label}
                  </text>
                )}
              </g>
            );
          case "distance":
            return (
              <g key={i}>
                <line
                  x1={m.from.x}
                  y1={m.from.y}
                  x2={m.to.x}
                  y2={m.to.y}
                  stroke={WHITE}
                  strokeWidth={1.3}
                  strokeDasharray="5 4"
                  opacity={0.9}
                />
                <line x1={m.from.x} y1={m.from.y - 4} x2={m.from.x} y2={m.from.y + 4} stroke={WHITE} strokeWidth={1.4} opacity={0.9} />
                <line x1={m.to.x} y1={m.to.y - 4} x2={m.to.x} y2={m.to.y + 4} stroke={WHITE} strokeWidth={1.4} opacity={0.9} />
                {showLabels && (
                  <text x={(m.from.x + m.to.x) / 2} y={m.from.y - 4} textAnchor="middle" {...label}>
                    {m.label}
                  </text>
                )}
              </g>
            );
          default:
            return null;
        }
      })}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Figure                                                                      */
/* -------------------------------------------------------------------------- */

export default function PoseFigure({
  pose,
  className,
  gender = "men",
  showGuides = false,
  showLabels = false,
  showGround = true,
  isMatched = false,
}: Props) {
  const j = pose.figure;
  const isFemale = gender === "women";
  const facing = j.facing || "front";

  const strokeLine = isMatched ? "#34D399" : WHITE;
  const strokeSeam = isMatched ? "rgba(110, 231, 183, 0.85)" : SEAM;
  const haloColor = isMatched ? "#064E3B" : "#04101f";
  const dropFilter = isMatched
    ? "drop-shadow(0 0 16px rgba(52, 211, 153, 0.95)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.7))"
    : "drop-shadow(0 3px 10px rgba(0, 0, 0, 0.6))";

  const shoulderMidX = (j.shoulderL.x + j.shoulderR.x) / 2;
  const shoulderMidY = (j.shoulderL.y + j.shoulderR.y) / 2;
  const hipMidX = (j.hipL.x + j.hipR.x) / 2;
  const hipMidY = (j.hipL.y + j.hipR.y) / 2;
  const span = Math.abs(j.shoulderR.x - j.shoulderL.x) || 40;

  /* Gender-aware frame — women sit narrower through the shoulders with graceful silhouette */
  const shScale = isFemale ? 0.88 : 1.0;
  const shL: Pt = { x: shoulderMidX + (j.shoulderL.x - shoulderMidX) * shScale, y: j.shoulderL.y };
  const shR: Pt = { x: shoulderMidX + (j.shoulderR.x - shoulderMidX) * shScale, y: j.shoulderR.y };

  const waistW = span * (isFemale ? 0.52 : 0.73);
  const hipW = span * (isFemale ? 0.88 : 0.76);
  const waistY = j.waist ? j.waist.y : shoulderMidY + (hipMidY - shoulderMidY) * (isFemale ? 0.58 : 0.65);

  const waistL: Pt = { x: hipMidX - waistW / 2, y: waistY };
  const waistR: Pt = { x: hipMidX + waistW / 2, y: waistY };
  const hipL: Pt = { x: hipMidX - hipW / 2, y: hipMidY };
  const hipR: Pt = { x: hipMidX + hipW / 2, y: hipMidY };

  const isSeated = pose.id.includes("sitting") || pose.id.includes("chair");

  const armpitDrop = isFemale ? 15 : 18;
  const armpitIn = Math.min(isFemale ? 3 : 5, span * 0.2);
  const armpitL: Pt = { x: shL.x + armpitIn, y: shL.y + armpitDrop };
  const armpitR: Pt = { x: shR.x - armpitIn, y: shR.y + armpitDrop };
  const bust = isFemale ? 4.5 : 1.5;

  /* ── Torso: gender-contoured tee ── */
  const torsoPath = [
    `M ${n2(shL.x)} ${n2(shL.y)}`,
    `Q ${n2(shoulderMidX)} ${n2(shL.y - 5)} ${n2(shR.x)} ${n2(shR.y)}`,
    `C ${n2(shR.x - 1)} ${n2(shR.y + 12)} ${n2(armpitR.x)} ${n2(armpitR.y - 6)} ${n2(armpitR.x)} ${n2(armpitR.y)}`,
    `C ${n2(armpitR.x + 1)} ${n2(armpitR.y + 14)} ${n2(waistR.x + bust)} ${n2(waistR.y - 15)} ${n2(waistR.x)} ${n2(waistR.y)}`,
    `C ${n2(waistR.x + 1)} ${n2(waistR.y + 12)} ${n2(hipR.x + 1)} ${n2(hipR.y - 12)} ${n2(hipR.x)} ${n2(hipR.y)}`,
    `Q ${n2(hipMidX)} ${n2(hipR.y + 4)} ${n2(hipL.x)} ${n2(hipL.y)}`,
    `C ${n2(hipL.x - 1)} ${n2(hipL.y - 12)} ${n2(waistL.x - 1)} ${n2(waistL.y + 12)} ${n2(waistL.x)} ${n2(waistL.y)}`,
    `C ${n2(waistL.x - bust)} ${n2(waistL.y - 15)} ${n2(armpitL.x - 1)} ${n2(armpitL.y + 14)} ${n2(armpitL.x)} ${n2(armpitL.y)}`,
    `C ${n2(armpitL.x)} ${n2(armpitL.y - 6)} ${n2(shL.x + 1)} ${n2(shL.y + 12)} ${n2(shL.x)} ${n2(shL.y)}`,
    "Z",
  ].join(" ");

  const collarPath = isFemale
    ? `M ${shoulderMidX - 9} ${j.neck.y + 3} Q ${shoulderMidX} ${j.neck.y + 12} ${shoulderMidX + 9} ${j.neck.y + 3}`
    : `M ${shoulderMidX - 10.5} ${j.neck.y + 2} Q ${shoulderMidX} ${j.neck.y + 9.5} ${shoulderMidX + 10.5} ${j.neck.y + 2}`;

  const collarInner = isFemale
    ? `M ${shoulderMidX - 7.5} ${j.neck.y + 4.5} Q ${shoulderMidX} ${j.neck.y + 10.5} ${shoulderMidX + 7.5} ${j.neck.y + 4.5}`
    : `M ${shoulderMidX - 9} ${j.neck.y + 3.8} Q ${shoulderMidX} ${j.neck.y + 8} ${shoulderMidX + 9} ${j.neck.y + 3.8}`;

  const hemPath = `M ${n2(hipL.x + 3)} ${n2(hipL.y - 3)} Q ${n2(hipMidX)} ${n2(hipL.y - 0.5)} ${n2(hipR.x - 3)} ${n2(hipR.y - 3)}`;

  /* ── Legs: tapered trouser bands ── */
  const legStartL: Pt = { x: lerpPt(j.hipL, { x: hipMidX, y: j.hipL.y }, 0.35).x, y: j.hipL.y - 7 };
  const legStartR: Pt = { x: lerpPt(j.hipR, { x: hipMidX, y: j.hipR.y }, 0.35).x, y: j.hipR.y - 7 };
  const legW = isFemale ? [9.4, 7.0, 5.2] : [11.5, 8.8, 6.4];
  const legLPath = bandPath([legStartL, j.kneeL, j.ankleL], legW);
  const legRPath = bandPath([legStartR, j.kneeR, j.ankleR], legW);

  const crease = (start: Pt, knee: Pt, ankle: Pt) => {
    const a = lerpPt(start, knee, 0.4);
    const b = lerpPt(start, knee, 0.92);
    const c = lerpPt(knee, ankle, 0.12);
    const d = lerpPt(knee, ankle, 0.82);
    return {
      thigh: `M ${n2(a.x)} ${n2(a.y)} L ${n2(b.x)} ${n2(b.y)}`,
      shin: `M ${n2(c.x)} ${n2(c.y)} L ${n2(d.x)} ${n2(d.y)}`,
    };
  };
  const creaseL = crease(legStartL, j.kneeL, j.ankleL);
  const creaseR = crease(legStartR, j.kneeR, j.ankleR);

  const cuffPath = (knee: Pt, ankle: Pt, w: number) => {
    const dx = ankle.x - knee.x;
    const dy = ankle.y - knee.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const cx = ankle.x - ux * 3.5;
    const cy = ankle.y - uy * 3.5;
    return `M ${n2(cx + uy * w)} ${n2(cy - ux * w)} L ${n2(cx - uy * w)} ${n2(cy + ux * w)}`;
  };
  const cuffL = cuffPath(j.kneeL, j.ankleL, legW[2] - 0.6);
  const cuffR = cuffPath(j.kneeR, j.ankleR, legW[2] - 0.6);

  /* Cargo pockets on the outer lateral edge of the thigh (as seen in reference design) */
  const cargoPocket = (start: Pt, knee: Pt, isLeft: boolean) => {
    const p = lerpPt(start, knee, 0.43);
    const outX = isLeft ? -1 : 1;
    const w = isFemale ? 11 : 13;
    const h = isFemale ? 18 : 22;
    // Places pocket directly on the outer side flank of the thigh
    const cx = p.x + outX * (legW[0] * 0.90);
    return { cx, cy: p.y, w, h, outX };
  };
  const cargoL = cargoPocket(legStartL, j.kneeL, true);
  const cargoR = cargoPocket(legStartR, j.kneeR, false);

  /* ── Arms & sleeves ── */
  const armW = isFemale ? [6.0, 4.8, 3.4] : [7.4, 5.8, 4.1];
  const armLPath = bandPath([shL, j.elbowL, j.handL], armW);
  const armRPath = bandPath([shR, j.elbowR, j.handR], armW);

  const sleeveFor = (sh: Pt, el: Pt) => {
    const dx = el.x - sh.x;
    const dy = el.y - sh.y;
    const len = Math.hypot(dx, dy) || 1;
    const t = isFemale ? 0.52 : 0.58;
    const end: Pt = { x: sh.x + dx * t, y: sh.y + dy * t };
    const w0 = isFemale ? 7.2 : 8.8;
    const w1 = isFemale ? 6.2 : 7.6;
    const n = normalOf(sh, end);
    const hem = `M ${n2(end.x - n.x * w1)} ${n2(end.y - n.y * w1)} L ${n2(end.x + n.x * w1)} ${n2(end.y + n.y * w1)}`;
    const fold: Pt = { x: end.x - (dx / len) * 3, y: end.y - (dy / len) * 3 };
    const cuffStitch = `M ${n2(fold.x - n.x * w1 * 0.94)} ${n2(fold.y - n.y * w1 * 0.94)} L ${n2(fold.x + n.x * w1 * 0.94)} ${n2(fold.y + n.y * w1 * 0.94)}`;
    return { path: bandPath([sh, end], [w0, w1]), hem, cuffStitch };
  };
  const sleeveL = sleeveFor(shL, j.elbowL);
  const sleeveR = sleeveFor(shR, j.elbowR);

  /* ── Hand placement ── */
  const frontClasp =
    Math.abs(j.handL.x - shoulderMidX) < 15 &&
    Math.abs(j.handR.x - shoulderMidX) < 15 &&
    Math.abs(j.handL.y - j.handR.y) < 14;
  const handsInPockets =
    !isSeated &&
    !frontClasp &&
    Math.abs(j.handL.y - hipMidY) < 22 &&
    Math.abs(j.handR.y - hipMidY) < 22 &&
    Math.abs(j.handL.x - j.hipL.x) < 32 &&
    Math.abs(j.handR.x - j.hipR.x) < 36;
  const pocketL = handsInPockets && Math.abs(j.handL.x - j.hipL.x) < 26 && Math.abs(j.handL.y - hipMidY) < 26;
  const pocketR = handsInPockets && Math.abs(j.handR.x - j.hipR.x) < 26 && Math.abs(j.handR.y - hipMidY) < 26;

  // Ground contact height under sneakers
  const groundY = Math.max(j.toeL.y, j.toeR.y) + 3.5;

  return (
    <svg
      viewBox="0 0 200 340"
      className={className}
      role="img"
      aria-label={`${pose.name} pose silhouette (${isFemale ? "women" : "men"})`}
      style={{ filter: dropFilter, transition: "filter 0.35s ease" }}
    >
      <defs>
        <linearGradient id="fitlyBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.3} />
          <stop offset="55%" stopColor="#ffffff" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.28} />
        </linearGradient>
        {/* Dark halo so the white line art stays legible over any photo */}
        <filter id="fitlyHalo" x="-25%" y="-25%" width="150%" height="150%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="dilated" />
          <feFlood floodColor={haloColor} floodOpacity={0.85} result="color" />
          <feComposite in="color" in2="dilated" operator="in" result="halo" />
          <feMerge>
            <feMergeNode in="halo" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker
          id="fitlyPoseArrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5.5"
          markerHeight="5.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill={strokeLine} />
        </marker>
      </defs>

      {/* Environment props (chair, table, wall, mirror, stairs, drape) */}
      {showGuides && pose.props.map((p, i) => <Prop key={`prop-${i}`} prop={p} />)}

      <g filter="url(#fitlyHalo)">
      {/* ── 0. Ground Perspective Placement Ring ── */}
      {showGround && !isSeated && (
        <g id="ground-ring">
          <ellipse
            cx={shoulderMidX}
            cy={groundY}
            rx={56}
            ry={9.5}
            fill="none"
            stroke={strokeLine}
            strokeWidth={1.4}
            opacity={0.8}
          />
        </g>
      )}

      {/* ── 1. TROUSERS ── */}
      <g id="trousers">
        <path d={legLPath} fill={BODY_FILL} stroke={strokeLine} strokeWidth={OUTLINE_W} strokeLinejoin="round" />
        <path d={legRPath} fill={BODY_FILL} stroke={strokeLine} strokeWidth={OUTLINE_W} strokeLinejoin="round" />

        {/* Fabric press creases */}
        <path d={creaseL.thigh} stroke={strokeSeam} strokeWidth={1} opacity={0.45} fill="none" />
        <path d={creaseL.shin} stroke={strokeSeam} strokeWidth={1} opacity={0.45} fill="none" />
        <path d={creaseR.thigh} stroke={strokeSeam} strokeWidth={1} opacity={0.45} fill="none" />
        <path d={creaseR.shin} stroke={strokeSeam} strokeWidth={1} opacity={0.45} fill="none" />

        {/* Cargo pockets with top flaps on outer thigh flank (matching reference design) */}
        {!isSeated &&
          [cargoL, cargoR].map((c, i) => {
            const topY = c.cy - c.h / 2;
            return (
              <g key={`cargo-${i}`}>
                {/* Main pocket pouch */}
                <rect
                  x={n2(c.cx - c.w / 2)}
                  y={n2(topY)}
                  width={c.w}
                  height={c.h}
                  rx={2.5}
                  fill="rgba(255,255,255,0.08)"
                  stroke={strokeLine}
                  strokeWidth={1.4}
                />
                {/* Top flap with subtle peak */}
                <path
                  d={`M ${n2(c.cx - c.w / 2 - 0.8)} ${n2(topY)}
                      L ${n2(c.cx + c.w / 2 + 0.8)} ${n2(topY)}
                      L ${n2(c.cx + c.w / 2 + 0.8)} ${n2(topY + 5.5)}
                      Q ${n2(c.cx)} ${n2(topY + 6.8)} ${n2(c.cx - c.w / 2 - 0.8)} ${n2(topY + 5.5)}
                      Z`}
                  fill="rgba(255,255,255,0.18)"
                  stroke={strokeLine}
                  strokeWidth={1.3}
                />
                {/* Flap horizontal stitch */}
                <line
                  x1={n2(c.cx - c.w / 2 + 0.5)}
                  y1={n2(topY + 3)}
                  x2={n2(c.cx + c.w / 2 - 0.5)}
                  y2={n2(topY + 3)}
                  stroke={strokeSeam}
                  strokeWidth={1.0}
                  strokeDasharray="2 1.5"
                />
                {/* Center expansion pleat */}
                <line
                  x1={n2(c.cx)}
                  y1={n2(topY + 6.5)}
                  x2={n2(c.cx)}
                  y2={n2(c.cy + c.h / 2 - 2)}
                  stroke={strokeSeam}
                  strokeWidth={1.0}
                  strokeDasharray="3 2"
                />
              </g>
            );
          })}

        {/* Knee break creases */}
        <path
          d={`M ${j.kneeL.x - 5} ${j.kneeL.y - 2} Q ${j.kneeL.x} ${j.kneeL.y + 2.5} ${j.kneeL.x + 4.5} ${j.kneeL.y - 1}`}
          fill="none"
          stroke={strokeSeam}
          strokeWidth={1.1}
        />
        <path
          d={`M ${j.kneeR.x - 4.5} ${j.kneeR.y - 1} Q ${j.kneeR.x} ${j.kneeR.y + 2.5} ${j.kneeR.x + 5} ${j.kneeR.y - 2}`}
          fill="none"
          stroke={strokeSeam}
          strokeWidth={1.1}
        />

        {/* Waistband & fly */}
        <path
          d={`M ${n2(hipL.x)} ${n2(hipMidY + 6)} Q ${n2(hipMidX)} ${n2(hipMidY + 8.5)} ${n2(hipR.x)} ${n2(hipMidY + 6)}`}
          fill="none"
          stroke={strokeLine}
          strokeWidth={1.5}
        />
        <line
          x1={hipMidX}
          y1={hipMidY + 8}
          x2={hipMidX}
          y2={hipMidY + 18}
          stroke={strokeSeam}
          strokeWidth={1.3}
          strokeLinecap="round"
        />

        {/* Stitched cuffs */}
        <path d={cuffL} stroke={strokeLine} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        <path d={cuffR} stroke={strokeLine} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      </g>

      {/* ── 2. TORSO ── */}
      <g id="torso">
        <path d={torsoPath} fill={BODY_FILL} stroke={strokeLine} strokeWidth={OUTLINE_W} strokeLinejoin="round" />
        {/* Collar neckline (double crewneck line) */}
        <path d={collarPath} fill="none" stroke={strokeLine} strokeWidth={2.0} strokeLinecap="round" />
        <path d={collarInner} fill="none" stroke={strokeSeam} strokeWidth={1.1} strokeLinecap="round" />

        {/* Feminine collarbone subtle accent for women */}
        {isFemale && (
          <g>
            <path
              d={`M ${shoulderMidX - 13} ${j.neck.y + 8} Q ${shoulderMidX - 6} ${j.neck.y + 11} ${shoulderMidX - 2} ${j.neck.y + 10}`}
              fill="none"
              stroke={strokeSeam}
              strokeWidth={1.0}
              opacity={0.65}
            />
            <path
              d={`M ${shoulderMidX + 13} ${j.neck.y + 8} Q ${shoulderMidX + 6} ${j.neck.y + 11} ${shoulderMidX + 2} ${j.neck.y + 10}`}
              fill="none"
              stroke={strokeSeam}
              strokeWidth={1.0}
              opacity={0.65}
            />
          </g>
        )}

        {/* Center vertical dashed alignment line down the t-shirt */}
        <line
          x1={shoulderMidX}
          y1={j.neck.y + 7}
          x2={shoulderMidX}
          y2={hipMidY - 3}
          stroke={strokeLine}
          strokeWidth={1.3}
          strokeDasharray="3.5 3.5"
          opacity={0.7}
        />

        {/* Shirt hem stitch */}
        <path d={hemPath} fill="none" stroke={strokeLine} strokeWidth={1.6} />
        <path
          d={`M ${n2(hipL.x + 4)} ${n2(hipL.y - 5.5)} Q ${n2(hipMidX)} ${n2(hipL.y - 3)} ${n2(hipR.x - 4)} ${n2(hipR.y - 5.5)}`}
          fill="none"
          stroke={strokeSeam}
          strokeWidth={1.0}
          strokeDasharray="3 2"
        />
      </g>

      {/* ── 3. ARMS ── */}
      <g id="arms">
        <path d={armLPath} fill={BODY_FILL} stroke={strokeLine} strokeWidth={OUTLINE_W} strokeLinejoin="round" />
        <path d={armRPath} fill={BODY_FILL} stroke={strokeLine} strokeWidth={OUTLINE_W} strokeLinejoin="round" />
      </g>

      {/* ── 4. SLEEVES over the upper arms ── */}
      <g id="sleeves">
        <path d={sleeveL.path} fill={BODY_FILL} stroke={strokeLine} strokeWidth={OUTLINE_W} strokeLinejoin="round" />
        <path d={sleeveR.path} fill={BODY_FILL} stroke={strokeLine} strokeWidth={OUTLINE_W} strokeLinejoin="round" />
        <path d={sleeveL.hem} stroke={strokeLine} strokeWidth={1.5} fill="none" />
        <path d={sleeveR.hem} stroke={strokeLine} strokeWidth={1.5} fill="none" />
        <path d={sleeveL.cuffStitch} stroke={strokeSeam} strokeWidth={1.0} strokeDasharray="2 1.5" fill="none" />
        <path d={sleeveR.cuffStitch} stroke={strokeSeam} strokeWidth={1.0} strokeDasharray="2 1.5" fill="none" />
      </g>

      {/* ── 5. HANDS & POCKET ENTRIES ── */}
      <g id="hands">
        {frontClasp ? (
          <g>
            <ellipse
              cx={n2((j.handL.x + j.handR.x) / 2)}
              cy={n2((j.handL.y + j.handR.y) / 2)}
              rx={7.5}
              ry={5.2}
              fill={SOFT_FILL}
              stroke={strokeLine}
              strokeWidth={1.5}
            />
            <path
              d={`M ${n2((j.handL.x + j.handR.x) / 2 - 3)} ${n2((j.handL.y + j.handR.y) / 2 - 3)} Q ${n2(
                (j.handL.x + j.handR.x) / 2
              )} ${n2((j.handL.y + j.handR.y) / 2 + 1)} ${n2((j.handL.x + j.handR.x) / 2 + 3)} ${n2(
                (j.handL.y + j.handR.y) / 2 - 3
              )}`}
              fill="none"
              stroke={strokeSeam}
              strokeWidth={1}
            />
          </g>
        ) : (
          <g>
            {!pocketL && (
              <ellipse
                cx={n2(j.handL.x)}
                cy={n2(j.handL.y)}
                rx={isFemale ? 3.6 : 4.1}
                ry={isFemale ? 4.5 : 5}
                fill={SOFT_FILL}
                stroke={strokeLine}
                strokeWidth={1.4}
              />
            )}
            {!pocketR && (
              <ellipse
                cx={n2(j.handR.x)}
                cy={n2(j.handR.y)}
                rx={isFemale ? 3.6 : 4.1}
                ry={isFemale ? 4.5 : 5}
                fill={SOFT_FILL}
                stroke={strokeLine}
                strokeWidth={1.4}
              />
            )}
            {/* Pocket opening slits where the hands tuck in */}
            {pocketL && (
              <path
                d={`M ${n2(j.hipL.x - 3)} ${n2(hipMidY - 7)} Q ${n2(j.hipL.x - 6)} ${n2(hipMidY + 2)} ${n2(j.handL.x + 1)} ${n2(
                  j.handL.y - 1
                )}`}
                fill="none"
                stroke={strokeLine}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            )}
            {pocketR && (
              <path
                d={`M ${n2(j.hipR.x + 3)} ${n2(hipMidY - 7)} Q ${n2(j.hipR.x + 6)} ${n2(hipMidY + 2)} ${n2(j.handR.x - 1)} ${n2(
                  j.handR.y - 1
                )}`}
                fill="none"
                stroke={strokeLine}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            )}
          </g>
        )}
      </g>

      {/* ── 6. NECK & HEAD ── */}
      <g id="head">
        <line
          x1={shoulderMidX - (isFemale ? 4.8 : 6)}
          y1={j.neck.y + 4}
          x2={j.head.x - (isFemale ? 4.0 : 5)}
          y2={j.head.y + 10}
          stroke={strokeLine}
          strokeWidth={OUTLINE_W}
          strokeLinecap="round"
        />
        <line
          x1={shoulderMidX + (isFemale ? 4.8 : 6)}
          y1={j.neck.y + 4}
          x2={j.head.x + (isFemale ? 4.0 : 5)}
          y2={j.head.y + 10}
          stroke={strokeLine}
          strokeWidth={OUTLINE_W}
          strokeLinecap="round"
        />
        <AnatomicalHead
          x={j.head.x}
          y={j.head.y}
          r={(j.head.r || 13) * (isFemale ? 0.95 : 1)}
          facing={facing}
          gender={gender}
          stroke={strokeLine}
          seam={strokeSeam}
        />
      </g>

      {/* ── 7. SNEAKERS ── */}
      <Sneaker ankle={j.ankleL} toe={j.toeL} gender={gender} stroke={strokeLine} seam={strokeSeam} />
      <Sneaker ankle={j.ankleR} toe={j.toeR} gender={gender} stroke={strokeLine} seam={strokeSeam} />
      </g>

      {/* ── 8. DETAIL DIAGRAM (preview modal) ── */}
      {showLabels && (
        <g id="diagram">
          <line
            x1={10}
            y1={314}
            x2={190}
            y2={314}
            stroke={WHITE}
            strokeWidth={1.3}
            strokeDasharray="6 5"
            opacity={0.5}
          />
          <MarkLayer marks={pose.marks} showLabels={showLabels} />
        </g>
      )}
    </svg>
  );
}
