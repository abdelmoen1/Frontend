/**
 * Motion constants and small pure helpers for the landing page.
 * No React and no DOM work at import time, so `node --test` can cover them.
 */

// Long, soft deceleration for reveals; symmetric curve for ambient loops.
export const EASE_OUT = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];

// Seconds
export const DURATION = { fast: 0.35, base: 0.75, slow: 1.1, draw: 1.8 };

// Reveal once, a little before the element is fully on screen.
export const VIEWPORT = { once: true, margin: "0px 0px -12% 0px" };

/**
 * Words for a staggered reveal. Arabic letters join inside a word, so text is
 * only ever split on whitespace, never per character.
 */
export function splitWords(text) {
  return String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** filter: "all" | "students" | "organizations". Items for "both" match every filter. */
export function matchesAudience(audience, filter) {
  return filter === "all" || audience === "both" || audience === filter;
}

/**
 * Bento rhythm on a three-column grid: wide tiles at 0, 3 and 4 of every six,
 * so rows alternate 2+1, 1+2, 2+1 and each row is full.
 */
const WIDE_SLOTS = [0, 3, 4];
export function isWideTile(index) {
  return WIDE_SLOTS.includes(index % 6);
}

/** Pointer-follow light: writes --mx / --my (px) on the hovered element without a React render. */
export function trackPointer(event) {
  const element = event.currentTarget;
  const rect = element.getBoundingClientRect();
  element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  element.style.setProperty("--my", `${event.clientY - rect.top}px`);
}
