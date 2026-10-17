import * as m from "motion/react-m";
import { DURATION, EASE_OUT, VIEWPORT, splitWords } from "../motion";

const RISE = {
  hidden: { opacity: 0, y: 22 },
  shown: { opacity: 1, y: 0 },
};

const WORD = {
  hidden: { opacity: 0, y: "0.45em", filter: "blur(8px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)" },
};

// Fades and lifts its children once they scroll into view.
export function Reveal({ delay = 0, className, children, ...rest }) {
  return (
    <m.div
      className={className}
      variants={RISE}
      initial="hidden"
      whileInView="shown"
      viewport={VIEWPORT}
      transition={{ duration: DURATION.base, ease: EASE_OUT, delay }}
      {...rest}
    >
      {children}
    </m.div>
  );
}

// A list whose items rise one after another. Children should be RevealItem.
export function RevealList({ as = "ul", stagger = 0.08, delay = 0, className, children, ...rest }) {
  const List = as === "ol" ? m.ol : m.ul;
  return (
    <List
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={VIEWPORT}
      variants={{ shown: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </List>
  );
}

export function RevealItem({ className, children, ...rest }) {
  return (
    <m.li className={className} variants={RISE} transition={{ duration: DURATION.base, ease: EASE_OUT }} {...rest}>
      {children}
    </m.li>
  );
}

/**
 * Staggered word reveal. Screen readers get the sentence once from the hidden copy;
 * the animated words are aria-hidden. `accent` lists word indexes drawn in the accent colour.
 */
export function RevealWords({ text, accent = [], delay = 0, stagger = 0.07 }) {
  const words = splitWords(text);
  return (
    <>
      <span className="lp-visually-hidden">{text}</span>
      <m.span
        className="lp-words"
        aria-hidden="true"
        initial="hidden"
        whileInView="shown"
        viewport={VIEWPORT}
        variants={{ shown: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      >
        {words.map((word, index) => (
          <span key={`${word}-${index}`}>
            {index > 0 && " "}
            <m.span
              className={accent.includes(index) ? "lp-word lp-word-accent" : "lp-word"}
              variants={WORD}
              transition={{ duration: DURATION.slow, ease: EASE_OUT }}
            >
              {word}
            </m.span>
          </span>
        ))}
      </m.span>
    </>
  );
}
