"use client";
import { useEffect } from "react";

// Progressive enhancement: content is visible without JavaScript or motion support.
export default function PageMotion() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const targets = [
      ...document.querySelectorAll<HTMLElement>("[data-reveal]"),
    ];
    const configure = () => {
      observer?.disconnect();
      for (const target of targets)
        target.removeAttribute("data-motion-pending");
      if (media.matches || !("IntersectionObserver" in window)) return;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.removeAttribute("data-motion-pending");
            entry.target.setAttribute("data-revealed", "true");
            observer?.unobserve(entry.target);
          }
        },
        { threshold: 0.12 },
      );
      for (const target of targets) {
        if (target.hasAttribute("data-revealed")) continue;
        // Do not hide content that was already visible during server rendering.
        if (target.getBoundingClientRect().top < window.innerHeight) {
          target.setAttribute("data-revealed", "true");
        } else {
          target.setAttribute("data-motion-pending", "true");
          observer.observe(target);
        }
      }
    };
    configure();
    media.addEventListener("change", configure);
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", configure);
      for (const target of targets)
        target.removeAttribute("data-motion-pending");
    };
  }, []);
  return null;
}
