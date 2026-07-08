import { useEffect } from 'react';

/**
 * Scroll-reveal for a page's top-level sections — they drift up + fade in as
 * they enter the viewport. Call once at the top of a page component; it wires
 * an IntersectionObserver over `main > section` after mount.
 *
 * The first section (the hero) is left visible so nothing above the fold ever
 * animates in late. Fully reduced-motion / no-IntersectionObserver safe — those
 * users just see everything immediately (the `.reveal` class is only added here).
 */
export function useReveal(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section'));
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    );

    sections.forEach((s, i) => {
      if (i === 0) return; // hero shows instantly
      s.classList.add('reveal');
      io.observe(s);
    });

    return () => io.disconnect();
  }, []);
}
