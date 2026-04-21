import { useEffect, useRef } from "react";
import { useTheme } from "./theme-provider";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
  pulse: number;
}

const SHAPES = ["triangle", "square", "diamond", "hex"] as const;
type Shape = (typeof SHAPES)[number];

interface FloatingShape {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  shape: Shape;
  hue: number;
  alpha: number;
}

export function DynamicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    const particles: Particle[] = [];
    const shapes: FloatingShape[] = [];
    const mouse = { x: -9999, y: -9999, active: false };

    const HUES = [270, 190, 320, 150, 45];

    function resize() {
      if (!canvas) return;
      dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function init() {
      particles.length = 0;
      shapes.length = 0;
      const particleCount = Math.min(
        90,
        Math.floor((width * height) / 18000),
      );
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          size: Math.random() * 1.6 + 0.4,
          hue: HUES[Math.floor(Math.random() * HUES.length)]!,
          alpha: Math.random() * 0.6 + 0.3,
          pulse: Math.random() * Math.PI * 2,
        });
      }
      const shapeCount = Math.min(14, Math.floor((width * height) / 90000));
      for (let i = 0; i < shapeCount; i++) {
        shapes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.004,
          size: Math.random() * 36 + 18,
          shape: SHAPES[Math.floor(Math.random() * SHAPES.length)]!,
          hue: HUES[Math.floor(Math.random() * HUES.length)]!,
          alpha: Math.random() * 0.12 + 0.04,
        });
      }
    }

    function drawShape(s: FloatingShape) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      ctx.strokeStyle = `hsla(${s.hue}, 80%, 60%, ${s.alpha * 2})`;
      ctx.fillStyle = `hsla(${s.hue}, 80%, 50%, ${s.alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const r = s.size;
      switch (s.shape) {
        case "triangle":
          ctx.moveTo(0, -r);
          ctx.lineTo(r * 0.866, r * 0.5);
          ctx.lineTo(-r * 0.866, r * 0.5);
          ctx.closePath();
          break;
        case "square":
          ctx.rect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
          break;
        case "diamond":
          ctx.moveTo(0, -r);
          ctx.lineTo(r, 0);
          ctx.lineTo(0, r);
          ctx.lineTo(-r, 0);
          ctx.closePath();
          break;
        case "hex": {
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          break;
        }
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function drawGrid(time: number) {
      if (!ctx) return;
      const isDark = themeRef.current === "dark";
      const baseAlpha = isDark ? 0.06 : 0.05;
      ctx.save();
      ctx.strokeStyle = isDark
        ? `hsla(270, 80%, 65%, ${baseAlpha})`
        : `hsla(270, 60%, 35%, ${baseAlpha})`;
      ctx.lineWidth = 1;
      const spacing = 60;
      const offset = (time * 0.012) % spacing;
      ctx.beginPath();
      for (let x = -spacing + offset; x < width + spacing; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = -spacing + offset; y < height + spacing; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawGradientGlow(time: number) {
      if (!ctx) return;
      const isDark = themeRef.current === "dark";
      const t = time * 0.0003;
      const cx1 = width * (0.5 + Math.sin(t) * 0.35);
      const cy1 = height * (0.3 + Math.cos(t * 0.7) * 0.25);
      const cx2 = width * (0.5 + Math.cos(t * 0.9) * 0.35);
      const cy2 = height * (0.7 + Math.sin(t * 1.1) * 0.25);

      const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, Math.max(width, height) * 0.5);
      g1.addColorStop(0, isDark ? "hsla(270, 80%, 50%, 0.18)" : "hsla(270, 80%, 60%, 0.10)");
      g1.addColorStop(1, "hsla(270, 80%, 50%, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, Math.max(width, height) * 0.5);
      g2.addColorStop(0, isDark ? "hsla(320, 80%, 55%, 0.16)" : "hsla(320, 80%, 65%, 0.09)");
      g2.addColorStop(1, "hsla(320, 80%, 55%, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, width, height);

      const g3 = ctx.createRadialGradient(
        width * 0.5,
        height * (0.5 + Math.sin(t * 1.3) * 0.2),
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.4,
      );
      g3.addColorStop(0, isDark ? "hsla(190, 80%, 55%, 0.10)" : "hsla(190, 80%, 60%, 0.07)");
      g3.addColorStop(1, "hsla(190, 80%, 55%, 0)");
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, width, height);
    }

    let raf = 0;
    let lastTime = performance.now();

    function frame(time: number) {
      if (!ctx) return;
      const dt = Math.min(40, time - lastTime);
      lastTime = time;

      const isDark = themeRef.current === "dark";
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = isDark ? "hsla(230, 30%, 6%, 1)" : "hsla(230, 30%, 97%, 1)";
      ctx.fillRect(0, 0, width, height);

      drawGradientGlow(time);
      drawGrid(time);

      for (const s of shapes) {
        s.x += s.vx * dt * 0.06;
        s.y += s.vy * dt * 0.06;
        s.rotation += s.rotationSpeed * dt;
        if (s.x < -60) s.x = width + 60;
        if (s.x > width + 60) s.x = -60;
        if (s.y < -60) s.y = height + 60;
        if (s.y > height + 60) s.y = -60;
        drawShape(s);
      }

      for (const p of particles) {
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.pulse += dt * 0.003;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist2 = dx * dx + dy * dy;
        if (mouse.active && dist2 < 14000) {
          const f = (1 - dist2 / 14000) * 0.04;
          p.vx -= dx * f * 0.01;
          p.vy -= dy * f * 0.01;
        }

        p.vx *= 0.99;
        p.vy *= 0.99;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const pulse = (Math.sin(p.pulse) + 1) * 0.5;
        const a = p.alpha * (isDark ? 0.9 : 0.55) * (0.6 + pulse * 0.4);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 90%, ${isDark ? 65 : 50}%, ${a})`;
        ctx.arc(p.x, p.y, p.size + pulse * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Connecting lines for nearby particles
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]!;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 11000) {
            const alpha = (1 - d2 / 11000) * (isDark ? 0.18 : 0.12);
            ctx.strokeStyle = `hsla(${a.hue}, 80%, ${isDark ? 65 : 45}%, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(frame);
    }

    function onMouseMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    }
    function onMouseLeave() {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    }

    resize();
    init();
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(() => {
      resize();
      init();
    });
    ro.observe(canvas);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none -z-10"
    />
  );
}
