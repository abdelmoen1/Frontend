import * as m from "motion/react-m";
import { DURATION, EASE_OUT, VIEWPORT } from "../motion";

/**
 * Hand-drawn GoTrainee illustrations: flat geometric SVG in the brand palette (classes in landing.css,
 * no gradients). Each scene plays its entrance once when it scrolls into view, then keeps a few quiet
 * idle loops (CSS) that stop under prefers-reduced-motion. All scenes are decorative (aria-hidden):
 * the text next to them carries the meaning.
 */

const POP = { hidden: { opacity: 0, scale: 0.6 }, shown: { opacity: 1, scale: 1 } };
const RISE = { hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0 } };
const DRAW = { hidden: { pathLength: 0, opacity: 0 }, shown: { pathLength: 1, opacity: 1 } };
const GROW = { hidden: { scaleX: 0 }, shown: { scaleX: 1 } };
const SLIDE_IN_START = { hidden: { opacity: 0, x: 48 }, shown: { opacity: 1, x: 0 } };
const SLIDE_IN_END = { hidden: { opacity: 0, x: -48 }, shown: { opacity: 1, x: 0 } };

const ease = { duration: DURATION.base, ease: EASE_OUT };
const slow = { duration: DURATION.slow, ease: EASE_OUT };

function Scene({ viewBox, className = "", stagger = 0.12, delay = 0.1, children }) {
  return (
    <m.svg
      viewBox={viewBox}
      className={`ill ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
      initial="hidden"
      whileInView="shown"
      viewport={VIEWPORT}
      variants={{ shown: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {children}
    </m.svg>
  );
}

// Bars that grow from the start (right) edge, as Arabic text reads
function Bar({ x, y, width, height = 6, className = "f-ink", delay }) {
  return (
    <m.rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={height / 2}
      className={className}
      variants={GROW}
      transition={{ ...ease, delay }}
      style={{ originX: 1 }}
    />
  );
}

function Check({ d, className = "s-on-dark", delay = 0 }) {
  return <m.path d={d} className={`ill-stroke ${className}`} variants={DRAW} transition={{ ...ease, delay }} />;
}

/* ---------- Problem: two sides of a gap ---------- */

// Organization on the start side (a building and an unanswered question), the student on the end side
// (a desk, a laptop with code, a cap). Planks reach out from both edges and stop short of each other.
export function GapScene() {
  const windows = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      windows.push({ x: 706 + col * 32, y: 88 + row * 28, delay: `${(row * 4 + col) * -0.9}s` });
    }
  }
  return (
    <Scene viewBox="0 0 960 300" className="ill-gap" stagger={0.09}>
      <m.rect variants={RISE} transition={ease} className="f-sunken" x="560" y="214" width="400" height="86" rx="22" />
      <m.rect variants={RISE} transition={ease} className="f-sunken" x="0" y="214" width="400" height="86" rx="22" />

      {/* organization */}
      <m.g variants={RISE} transition={slow}>
        <rect className="f-navy" x="690" y="70" width="150" height="144" rx="12" />
        {windows.map((w) => (
          <rect key={`${w.x}-${w.y}`} className="f-window ill-flicker" x={w.x} y={w.y} width="20" height="14" rx="3" style={{ animationDelay: w.delay }} />
        ))}
        <rect className="f-gold" x="748" y="176" width="34" height="38" rx="5" />
        <rect className="f-primary" x="852" y="128" width="72" height="86" rx="10" />
        <rect className="f-window" x="866" y="144" width="18" height="12" rx="3" />
        <rect className="f-window" x="892" y="144" width="18" height="12" rx="3" />
        <rect className="f-window" x="866" y="166" width="18" height="12" rx="3" />
      </m.g>
      <m.g variants={POP} transition={ease}>
        <g className="ill-float">
          <rect className="f-surface s-line" x="596" y="34" width="72" height="54" rx="16" />
          <path className="f-surface s-line" d="M620 87 l-10 18 l26 -18" />
          <text className="ill-glyph" x="632" y="72">؟</text>
        </g>
      </m.g>

      {/* student */}
      <m.g variants={RISE} transition={slow}>
        <rect className="f-navy" x="84" y="186" width="232" height="12" rx="6" />
        <rect className="f-navy" x="104" y="198" width="10" height="16" rx="3" />
        <rect className="f-navy" x="286" y="198" width="10" height="16" rx="3" />
        <rect className="f-ink-soft" x="132" y="176" width="136" height="10" rx="5" />
        <rect className="f-navy" x="146" y="100" width="108" height="76" rx="8" />
        <rect className="f-primary ill-type" x="160" y="114" width="54" height="6" rx="3" />
        <rect className="f-gold ill-type" x="174" y="128" width="64" height="6" rx="3" style={{ animationDelay: "-1.2s" }} />
        <rect className="f-sky ill-type" x="174" y="142" width="40" height="6" rx="3" style={{ animationDelay: "-2.4s" }} />
        <rect className="f-primary ill-type" x="160" y="156" width="70" height="6" rx="3" style={{ animationDelay: "-3.6s" }} />
        <rect className="f-surface s-line" x="270" y="150" width="40" height="30" rx="5" />
        <rect className="f-surface s-line" x="276" y="142" width="40" height="30" rx="5" />
        <circle className="f-gold" cx="304" cy="166" r="7" />
      </m.g>
      <m.g variants={POP} transition={ease}>
        <g className="ill-float-slow">
          <path className="f-navy" d="M200 40 L248 56 L200 72 L152 56 Z" />
          <rect className="f-navy" x="182" y="60" width="36" height="16" rx="6" />
          <path className="ill-stroke s-gold" d="M248 56 V78" />
          <circle className="f-gold" cx="248" cy="82" r="4" />
        </g>
      </m.g>

      {/* planks that do not meet */}
      {[0, 1, 2].map((i) => (
        <m.rect
          key={`end-${i}`}
          className="f-gold-soft s-gold-line"
          x={404 + i * 22}
          y={206}
          width="18"
          height="10"
          rx="3"
          variants={POP}
          transition={{ ...ease, delay: 0.6 + i * 0.12 }}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <m.rect
          key={`start-${i}`}
          className="f-gold-soft s-gold-line"
          x={538 - i * 22}
          y={206}
          width="18"
          height="10"
          rx="3"
          variants={POP}
          transition={{ ...ease, delay: 0.6 + i * 0.12 }}
        />
      ))}
      <m.path className="ill-stroke s-gold ill-dash" d="M410 196 Q480 132 550 196" variants={DRAW} transition={{ ...slow, delay: 1 }} />
      <g className="ill-float">
        <circle className="f-gold" cx="470" cy="150" r="4" />
        <circle className="f-primary" cx="494" cy="166" r="3" />
      </g>
    </Scene>
  );
}

/* ---------- Workflow step 1: describe the problem in a chat ---------- */

export function ChatArt() {
  return (
    <Scene viewBox="0 0 320 220" className="ill-card">
      <m.g variants={RISE} transition={ease}>
        <rect className="f-surface s-line" x="10" y="10" width="300" height="200" rx="18" />
        <circle className="f-line" cx="290" cy="30" r="5" />
        <circle className="f-line" cx="274" cy="30" r="5" />
        <circle className="f-line" cx="258" cy="30" r="5" />
        <path className="ill-hair" d="M10 48 H310" />
      </m.g>
      <m.g variants={POP} transition={ease}>
        <rect className="f-primary-soft" x="140" y="62" width="150" height="44" rx="16" />
        <rect className="f-primary" x="160" y="74" width="114" height="7" rx="3.5" />
        <rect className="f-primary f-dim" x="190" y="88" width="84" height="7" rx="3.5" />
      </m.g>
      <m.g variants={POP} transition={ease}>
        <rect className="f-sunken" x="30" y="118" width="150" height="44" rx="16" />
        <rect className="f-ink-soft" x="46" y="130" width="118" height="7" rx="3.5" />
        <rect className="f-ink-soft f-dim" x="46" y="144" width="80" height="7" rx="3.5" />
      </m.g>
      <m.g variants={POP} transition={ease}>
        <rect className="f-primary-soft" x="206" y="172" width="84" height="28" rx="14" />
        <circle className="f-primary ill-blink" cx="232" cy="186" r="4" />
        <circle className="f-primary ill-blink" cx="248" cy="186" r="4" style={{ animationDelay: "0.2s" }} />
        <circle className="f-primary ill-blink" cx="264" cy="186" r="4" style={{ animationDelay: "0.4s" }} />
      </m.g>
    </Scene>
  );
}

/* ---------- Workflow step 2: guided questions ---------- */

export function QuestionArt() {
  const options = [84, 118, 152];
  return (
    <Scene viewBox="0 0 320 220" className="ill-card">
      <m.g variants={RISE} transition={ease}>
        <rect className="f-surface s-line" x="20" y="12" width="280" height="196" rx="18" />
        <rect className="f-ink" x="156" y="36" width="120" height="9" rx="4.5" />
        <rect className="f-ink-soft" x="196" y="54" width="80" height="7" rx="3.5" />
      </m.g>
      {options.map((y, index) => (
        <m.g key={y} variants={RISE} transition={ease}>
          <rect className={`f-surface s-line ${index === 1 ? "ill-pick" : ""}`} x="44" y={y} width="232" height="26" rx="13" />
          <circle className={`f-surface s-line-strong ${index === 1 ? "ill-pick-dot" : ""}`} cx="260" cy={y + 13} r="6" />
          <rect className="f-ink-soft f-dim" x={140 + index * 14} y={y + 10} width={100 - index * 14} height="6" rx="3" />
        </m.g>
      ))}
      <m.g variants={RISE} transition={ease}>
        <rect className="f-sunken" x="44" y="190" width="232" height="6" rx="3" />
        <rect className="f-primary ill-progress" x="44" y="190" width="232" height="6" rx="3" />
      </m.g>
      <m.g variants={POP} transition={ease}>
        <path className="f-gold ill-spin" d="M52 30 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" />
      </m.g>
    </Scene>
  );
}

/* ---------- Workflow step 3: the proposal writes itself ---------- */

export function ProposalArt() {
  return (
    <Scene viewBox="0 0 320 220" className="ill-card" stagger={0.08}>
      <m.g variants={RISE} transition={ease}>
        <rect className="f-sunken" x="70" y="22" width="200" height="192" rx="14" />
        <rect className="f-surface s-line" x="58" y="12" width="200" height="192" rx="14" />
      </m.g>
      <Bar x={146} y={32} width={92} height={12} className="f-navy" />
      <Bar x={78} y={60} width={160} />
      <Bar x={108} y={76} width={130} className="f-ink-soft" />
      <Bar x={94} y={92} width={144} className="f-ink-soft" />
      <m.rect variants={POP} transition={ease} className="f-primary-soft" x="186" y="112" width="52" height="20" rx="10" />
      <m.rect variants={POP} transition={ease} className="f-gold-soft" x="126" y="112" width="52" height="20" rx="10" />
      <Bar x={98} y={148} width={140} className="f-ink-soft" />
      <Bar x={128} y={164} width={110} className="f-ink-soft" />
      <m.g variants={POP} transition={{ ...ease, delay: 0.2 }}>
        <circle className="f-gold" cx="96" cy="172" r="24" />
        <circle className="f-gold ill-ring" cx="96" cy="172" r="24" />
      </m.g>
      <Check d="M85 172 l8 8 l15 -16" className="s-navy" delay={0.3} />
    </Scene>
  );
}

/* ---------- Capabilities (wide tiles) ---------- */

// Discovery: question bubbles flow into a checklist
export function DiscoveryArt() {
  const rows = [34, 66, 98];
  return (
    <Scene viewBox="0 0 320 140" className="ill-tile">
      {[0, 1, 2].map((i) => (
        <m.g key={i} variants={POP} transition={ease}>
          <g className={i === 1 ? "ill-float" : "ill-float-slow"}>
            <rect className={i === 1 ? "f-gold-soft" : "f-primary-soft"} x={236 + (i % 2) * 18} y={18 + i * 38} width="58" height="26" rx="13" />
            <text className="ill-glyph ill-glyph-sm" x={265 + (i % 2) * 18} y={37 + i * 38}>
              ؟
            </text>
          </g>
        </m.g>
      ))}
      <m.path className="ill-stroke s-primary ill-dash" d="M228 70 C 200 70, 196 70, 172 70" variants={DRAW} transition={slow} />
      <m.rect variants={RISE} transition={ease} className="f-surface s-line" x="20" y="14" width="148" height="112" rx="14" />
      {rows.map((y, i) => (
        <m.g key={y} variants={RISE} transition={ease}>
          <circle className="f-success" cx="146" cy={y + 4} r="8" />
          <Check d={`M142 ${y + 4} l3 3 l6 -6`} delay={0.4 + i * 0.15} />
          <rect className="f-ink-soft" x={50 + i * 10} y={y} width={80 - i * 10} height="8" rx="4" />
        </m.g>
      ))}
      <m.g variants={POP} transition={ease}>
        <path className="f-gold ill-spin" d="M44 108 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" />
      </m.g>
    </Scene>
  );
}

// Matching: proven levels against the role's minimum (dashed marker)
export function MatchArt() {
  const rows = [
    { y: 26, level: 150, met: true },
    { y: 62, level: 118, met: true },
    { y: 98, level: 70, met: false },
  ];
  return (
    <Scene viewBox="0 0 320 140" className="ill-tile">
      {rows.map((row) => (
        <m.g key={row.y} variants={RISE} transition={ease}>
          <rect className="f-ink-soft" x="252" y={row.y + 2} width="48" height="8" rx="4" />
          <rect className="f-sunken" x="48" y={row.y} width="192" height="12" rx="6" />
          <Bar x={240 - row.level} y={row.y} width={row.level} height={12} className={row.met ? "f-primary" : "f-sky"} delay={0.3} />
          <circle className={row.met ? "f-success" : "f-danger-soft s-danger"} cx="26" cy={row.y + 6} r="9" />
          {row.met ? (
            <Check d={`M21 ${row.y + 6} l4 4 l7 -7`} delay={0.8} />
          ) : (
            <m.path d={`M22 ${row.y + 2} l8 8 M30 ${row.y + 2} l-8 8`} className="ill-stroke s-danger" variants={DRAW} transition={{ ...ease, delay: 0.8 }} />
          )}
        </m.g>
      ))}
      <m.path className="ill-stroke s-gold ill-dash" d="M138 14 V124" variants={DRAW} transition={{ ...slow, delay: 0.2 }} />
    </Scene>
  );
}

// Profile: one card with skills and a verified level
export function ProfileArt() {
  return (
    <Scene viewBox="0 0 320 140" className="ill-tile">
      <m.rect variants={RISE} transition={ease} className="f-surface s-line" x="16" y="10" width="288" height="120" rx="16" />
      <m.g variants={POP} transition={ease}>
        <circle className="f-primary-soft" cx="264" cy="50" r="24" />
        <circle className="f-primary" cx="264" cy="44" r="8" />
        <path className="f-primary" d="M250 66 a14 12 0 0 1 28 0 Z" />
      </m.g>
      <Bar x={140} y={36} width={92} height={10} className="f-ink" />
      <Bar x={168} y={54} width={64} className="f-ink-soft" />
      {[
        { x: 186, w: 46, c: "f-primary-soft" },
        { x: 132, w: 48, c: "f-gold-soft" },
        { x: 86, w: 40, c: "f-primary-soft" },
      ].map((chip) => (
        <m.rect key={chip.x} variants={POP} transition={ease} className={chip.c} x={chip.x} y="88" width={chip.w} height="20" rx="10" />
      ))}
      <m.g variants={POP} transition={ease}>
        <circle className="f-success ill-ring" cx="48" cy="44" r="14" />
        <circle className="f-success" cx="48" cy="44" r="14" />
      </m.g>
      <Check d="M42 44 l4 4 l8 -8" delay={0.6} />
    </Scene>
  );
}

/* ---------- Closing: two pieces that fit ---------- */

// The organization piece (navy) brings the problem, the student piece (gold) brings the skill.
export function PuzzleArt() {
  return (
    <Scene viewBox="0 0 260 160" className="ill-puzzle" stagger={0.15}>
      <m.g variants={SLIDE_IN_START} transition={slow}>
        <path className="f-navy" d="M130 30 H230 V130 H130 V96 A16 16 0 0 1 130 64 Z" />
        <rect className="f-window" x="168" y="56" width="16" height="12" rx="3" />
        <rect className="f-window" x="192" y="56" width="16" height="12" rx="3" />
        <rect className="f-window" x="168" y="80" width="16" height="12" rx="3" />
        <rect className="f-window" x="192" y="80" width="16" height="12" rx="3" />
      </m.g>
      <m.g variants={SLIDE_IN_END} transition={slow}>
        <path className="f-gold" d="M30 30 H130 V64 A16 16 0 0 0 130 96 V130 H30 Z" />
        <path className="ill-stroke s-navy" d="M62 70 l-12 10 l12 10 M90 70 l12 10 l-12 10" />
      </m.g>
      <m.g variants={POP} transition={{ ...ease, delay: 0.5 }}>
        <circle className="ill-join" cx="130" cy="80" r="40" />
      </m.g>
    </Scene>
  );
}
