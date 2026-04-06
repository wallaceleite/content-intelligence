"use client";

import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";

// === ANIMATED COUNTER ===
export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  duration = 1200,
  className = "",
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ref.current || hasAnimated.current || value === 0) return;
    hasAnimated.current = true;

    const obj = { val: 0 };
    animate(obj, {
      val: value,
      duration,
      ease: "outExpo",
      onUpdate: () => {
        if (ref.current) {
          const formatted = decimals > 0
            ? obj.val.toFixed(decimals)
            : Math.round(obj.val).toLocaleString("pt-BR");
          ref.current.textContent = `${prefix}${formatted}${suffix}`;
        }
      },
    });
  }, [value, suffix, prefix, decimals, duration]);

  return <span ref={ref} className={className}>{prefix}0{suffix}</span>;
}

// === STAGGER CONTAINER ===
export function StaggerIn({
  children,
  className = "",
  delay = 60,
  duration = 600,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const items = ref.current.children;
    if (!items.length) return;

    Array.from(items).forEach((el) => {
      (el as HTMLElement).style.opacity = "0";
      (el as HTMLElement).style.transform = "translateY(16px)";
    });

    animate(items, {
      opacity: [0, 1],
      y: [16, 0],
      duration,
      delay: stagger(delay),
      ease: "outExpo",
    } as any);
  }, [delay, duration]);

  return <div ref={ref} className={className}>{children}</div>;
}

// === ANIMATED BAR ===
export function AnimatedBar({
  percentage,
  colorClass = "bg-[var(--accent)]",
  height = "h-2.5",
  delay = 0,
  duration = 1000,
}: {
  percentage: number;
  colorClass?: string;
  height?: string;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.width = "0%";

    animate(ref.current, {
      width: `${Math.min(percentage, 100)}%`,
      duration,
      delay,
      ease: "outExpo",
    } as any);
  }, [percentage, delay, duration]);

  return (
    <div className={`${height} bg-[var(--muted)] rounded-full overflow-hidden`}>
      <div
        ref={ref}
        className={`h-full ${colorClass} rounded-full`}
        style={{ width: "0%" }}
      />
    </div>
  );
}

// === SCROLL REVEAL ===
export function ScrollReveal({
  children,
  className = "",
  duration = 700,
  distance = 24,
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const observed = useRef(false);

  useEffect(() => {
    if (!ref.current || observed.current) return;
    const el = ref.current;
    el.style.opacity = "0";
    el.style.transform = `translateY(${distance}px)`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !observed.current) {
          observed.current = true;
          animate(el, {
            opacity: [0, 1],
            y: [distance, 0],
            duration,
            ease: "outExpo",
          } as any);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [duration, distance]);

  return <div ref={ref} className={className}>{children}</div>;
}
