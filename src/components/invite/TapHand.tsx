"use client";

import { AnimatePresence, motion as m } from "motion/react";

/**
 * Manita que "toca" con ondas, para que en el teléfono se entienda que hay
 * que tocar para avanzar. No intercepta toques (pointer-events: none).
 */
export function TapHand({ show, delay = 0, className = "" }: { show: boolean; delay?: number; className?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <m.div
          className={`tap-hand ${className}`}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, transition: { delay, duration: 0.6 } }}
          exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.25 } }}
          aria-hidden
        >
          <span className="tap-ripple" />
          <span className="tap-ripple tap-ripple-2" />
          <span className="tap-finger">👆</span>
        </m.div>
      )}
    </AnimatePresence>
  );
}
