export const BRAND_ANIMATIONS = [
  { id: "bounce", label: "Bounce home" },
  { id: "orbit", label: "Orbit and settle" },
  { id: "impact", label: "Shot in, boom" },
  { id: "liquid", label: "Liquid split" },
  { id: "signature", label: "Solid to signature" },
  { id: "burst", label: "Big bang, small dot" },
  { id: "gravity", label: "Gravity press" },
] as const;

export type BrandAnimation = (typeof BRAND_ANIMATIONS)[number]["id"];
export type BrandMode = "full" | "mark" | "one";
type MotionPoint = [number, number, number, number?, number?, string?];

export function playBrandMotion(
  p: HTMLElement,
  name: BrandAnimation,
  onComplete?: () => void,
): () => void {
  const list: Animation[] = [];
  if (
    !p.animate ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    onComplete?.();
    return () => {};
  }
  const red = "#e60028";
  const q = (s: string): HTMLElement => {
      const element = p.querySelector<HTMLElement>(s);
      if (!element) throw new Error(`Missing logo part: ${s}`);
      return element;
    },
    logo = q('[data-logo-part="logo"]'),
    ring = q('[data-logo-part="ring"]'),
    bead = q('[data-logo-part="bead"]'),
    tail = q('[data-logo-part="tail"]'),
    core = q('[data-logo-part="core"]');
  const unit = parseFloat(getComputedStyle(logo).fontSize) || 48;
  const a = (el: Element, k: Keyframe[], d = 2000, delay = 0) => {
    const v = el.animate(k, {
      duration: d,
      delay: delay,
      iterations: 1,
      fill: "both",
      easing: "linear",
    });
    list.push(v);
    return v;
  };
  const t = (x: number, y: number, sx = 1, sy = sx) =>
    `translate(${x}em,${y}em) scale(${sx},${sy})`;
  const points = (items: MotionPoint[]) =>
    items.map(([offset, x, y, sx = 1, sy = sx, color = red]) => ({
      offset,
      transform: t(x, y, sx, sy),
      background: color,
    }));
  const shock = (delay: number, strength = 1) =>
    p.querySelectorAll('[data-logo-part="echo"]').forEach((e, j) => {
      a(
        e,
        [
          { opacity: 0, transform: "scale(1)" },
          { opacity: 0.48 * strength, transform: "scale(1.6)", offset: 0.08 },
          { opacity: 0, transform: `scale(${j ? 8 : 6})`, offset: 1 },
        ],
        650,
        delay + j * 110,
      );
    });
  const sparks = (delay: number, out = 1) =>
    p.querySelectorAll('[data-logo-part="particle"]').forEach((e, j) => {
      const angle = (j * Math.PI) / 4,
        x = Math.cos(angle) * out,
        y = Math.sin(angle) * out;
      a(
        e,
        [
          { opacity: 0, transform: t(0, 0, 0.2) },
          { opacity: 0.85, transform: t(x * 0.3, y * 0.3), offset: 0.12 },
          { opacity: 0, transform: t(x, y, 0.25), offset: 1 },
        ],
        650,
        delay,
      );
    });
  const impact = (start: number, duration: number) => {
    a(
      ring,
      [
        { offset: 0, transform: "scale(1)" },
        { offset: start - 0.015, transform: "scale(1)" },
        { offset: start + 0.045, transform: "scale(.82,1.12)" },
        { offset: start + 0.12, transform: "scale(1.06,.97)" },
        { offset: start + 0.24, transform: "scale(1)" },
        { offset: 1, transform: "scale(1)" },
      ],
      duration,
    );
    a(
      tail,
      [
        { offset: 0, transform: "translateX(0)" },
        { offset: start, transform: "translateX(0)" },
        { offset: start + 0.04, transform: "translateX(-.065em)" },
        { offset: start + 0.14, transform: "translateX(.018em)" },
        { offset: start + 0.24, transform: "translateX(0)" },
        { offset: 1, transform: "translateX(0)" },
      ],
      duration,
    );
  };
  if (name === "bounce") {
    const beadRect = bead.getBoundingClientRect();
    const originX = beadRect.x + beadRect.width / 2;
    const originY = beadRect.y + beadRect.height / 2;
    const letters = Array.from(
      p.querySelectorAll<HTMLElement>("[data-brand-letter]"),
    ).reverse();
    const baseline =
      p
        .querySelector<HTMLElement>("[data-brand-baseline]")
        ?.getBoundingClientRect().top ?? originY;
    const pen =
      typeof CanvasRenderingContext2D !== "undefined"
        ? document.createElement("canvas").getContext("2d")
        : null;
    if (pen) pen.font = getComputedStyle(logo).font;
    const stops = letters.length
      ? letters.map((letter) => {
          const rect = letter.getBoundingClientRect();
          const ascent =
            pen?.measureText(letter.textContent ?? "")
              .actualBoundingBoxAscent ?? unit * 0.7;
          return {
            x: (rect.x + rect.width / 2 - originX) / unit,
            y: (baseline - ascent - originY) / unit - 0.1,
          };
        })
      : [
          { x: -1.1, y: -0.7 },
          { x: -0.3, y: -0.4 },
          { x: 0.3, y: -0.4 },
        ];
    const duration = 1000 + stops.length * 340;
    let from = { x: stops[0]!.x + 0.5, y: stops[0]!.y - 0.65 };
    const frames: Keyframe[] = [{ offset: 0, transform: t(from.x, from.y) }];
    const destinations = [...stops, { x: 0, y: 0 }];
    const jumpEnd = 0.94;
    destinations.forEach((to, index) => {
      const start = (index / destinations.length) * jumpEnd;
      const length = jumpEnd / destinations.length;
      for (let k = 1; k <= 10; k++) {
        const u = k / 10;
        frames.push({
          offset: start + length * u * 0.87,
          transform: t(
            from.x + (to.x - from.x) * u,
            from.y + (to.y - from.y) * u - 1.6 * u * (1 - u),
          ),
        });
      }
      frames.push({
        offset: start + length * 0.94,
        transform: t(to.x, to.y + 0.018, 1.15, 0.82),
      });
      frames.push({ offset: start + length, transform: t(to.x, to.y) });
      from = to;
    });
    frames.push({ offset: 1, transform: t(0, 0) });
    a(bead, frames, duration);
    shock(duration * 0.94, 0.5);
  } else if (name === "orbit") {
    const frames: Keyframe[] = [];
    for (let step = 0; step <= 72; step++) {
      const u = step / 72;
      const angle = -Math.PI / 2 + u * Math.PI * 3.7;
      const radius = 0.683 * (1 - u ** 2.4);
      frames.push({
        offset: u,
        transform: t(Math.cos(angle) * radius, Math.sin(angle) * radius),
      });
    }
    a(bead, frames, 2500);
    a(
      ring,
      [
        { transform: "scale(1)" },
        { offset: 0.8, transform: "scale(1.06)" },
        { offset: 1, transform: "scale(1)" },
      ],
      2500,
    );
    shock(2400, 0.5);
  } else if (name === "impact") {
    const d = 1650;
    a(
      bead,
      points([
        [0, 6.5, 0, 4, 0.38],
        [0.2, 6.5, 0, 4, 0.38],
        [0.3, 1.5, 0, 4, 0.38],
        [0.33, 0, 0, 0.55, 1.55],
        [0.39, -0.09, 0, 1.35, 0.72],
        [0.48, 0.035, 0, 0.93, 1.06],
        [0.65, 0, 0, 1, 1],
        [1, 0, 0, 1, 1],
      ]),
      d,
    );
    a(
      q('[data-logo-part="trail"]'),
      [
        { opacity: 0, transform: t(6.5, 0, 2, 1) },
        { opacity: 0, transform: t(6.5, 0, 2, 1), offset: 0.2 },
        { opacity: 0.6, transform: t(0.5, 0, 1.8, 1), offset: 0.32 },
        { opacity: 0, transform: t(0, 0, 0.1, 1), offset: 0.39 },
        { opacity: 0, offset: 1 },
      ],
      d,
    );
    impact(0.33, d);
    shock(545);
    sparks(545, 0.94);
  } else if (name === "liquid") {
    const d = 2400;
    a(
      bead,
      points([
        [0, 0, 0, 4],
        [0.15, 0, 0, 4],
        [0.3, 0, 0, 5.2, 2.7],
        [0.43, 0, 0, 2.8, 4.4],
        [0.58, 0, 0, 1.6, 2],
        [0.74, 0, 0, 0.85, 1.15],
        [0.88, 0, 0, 1.06, 0.94],
        [1, 0, 0, 1],
      ]),
      d,
    );
    a(
      ring,
      [
        { offset: 0, opacity: 0, transform: "scale(.2) rotate(-35deg)" },
        { offset: 0.36, opacity: 0, transform: "scale(.2) rotate(-35deg)" },
        { offset: 0.63, opacity: 1, transform: "scale(1.1,.9) rotate(8deg)" },
        { offset: 0.8, opacity: 1, transform: "scale(.97,1.03) rotate(-2deg)" },
        { offset: 1, opacity: 1, transform: "scale(1) rotate(0deg)" },
      ],
      d,
    );
    a(
      tail,
      [
        { offset: 0, opacity: 0, transform: "translateX(-.25em)" },
        { offset: 0.35, opacity: 0, transform: "translateX(-.25em)" },
        { offset: 0.72, opacity: 1, transform: "translateX(.025em)" },
        { offset: 1, opacity: 1, transform: "translateX(0)" },
      ],
      d,
    );
  } else if (name === "gravity") {
    const d = 2600;
    a(
      bead,
      points([
        [0, 0, -1.15, 4],
        [0.12, 0, -1.15, 4],
        [0.24, 0, -0.88, 4],
        [0.34, 0, -0.35, 3.7, 4.3],
        [0.4, 0, 0.15, 5.1, 2.5],
        [0.49, 0, -0.32, 3.4, 4.2],
        [0.58, 0, 0.07, 4.4, 3.5],
        [0.67, 0, 0, 3.8, 4],
        [0.81, 0, 0, 0.78, 1.22],
        [0.91, 0, 0, 1.1, 0.9],
        [1, 0, 0, 1],
      ]),
      d,
    );
    a(
      ring,
      [
        { offset: 0, opacity: 0, transform: "scale(.25)" },
        { offset: 0.64, opacity: 0, transform: "scale(.25)" },
        { offset: 0.81, opacity: 1, transform: "scale(1.12,.88)" },
        { offset: 0.92, opacity: 1, transform: "scale(.97,1.03)" },
        { offset: 1, opacity: 1, transform: "scale(1)" },
      ],
      d,
    );
    a(
      tail,
      [
        { offset: 0, opacity: 0, transform: "translateY(.12em)" },
        { offset: 0.43, opacity: 0, transform: "translateY(.12em)" },
        { offset: 0.72, opacity: 1, transform: "translateY(0)" },
        { offset: 1, opacity: 1, transform: "translateY(0)" },
      ],
      d,
    );
    shock(1040, 0.5);
  } else if (name === "signature") {
    const d = 2200;
    a(
      core,
      [
        { opacity: 1, background: red, transform: "scale(1)" },
        { opacity: 1, background: red, transform: "scale(1.08)", offset: 0.22 },
        { opacity: 1, background: red, transform: "scale(.22)", offset: 0.65 },
        { opacity: 1, background: red, transform: "scale(.25)", offset: 0.84 },
        { opacity: 0, background: red, transform: "scale(.25)", offset: 1 },
      ],
      d,
    );
    a(
      bead,
      [{ opacity: 0 }, { opacity: 0, offset: 0.85 }, { opacity: 1, offset: 1 }],
      d,
    );
    a(
      ring,
      [
        { opacity: 0, transform: "scale(.3)" },
        { opacity: 0, transform: "scale(.3)", offset: 0.25 },
        { opacity: 1, transform: "scale(1.04)", offset: 0.65 },
        { opacity: 1, transform: "scale(1)", offset: 0.83 },
        { opacity: 1, transform: "scale(1)", offset: 1 },
      ],
      d,
    );
    a(
      tail,
      [
        { opacity: 0, transform: "translateX(-.18em)" },
        { opacity: 0, transform: "translateX(-.18em)", offset: 0.22 },
        { opacity: 1, transform: "translateX(0)", offset: 0.64 },
        { opacity: 1, transform: "translateX(0)", offset: 1 },
      ],
      d,
    );
  } else {
    const d = 2500;
    a(
      core,
      [
        { opacity: 1, background: red, transform: "scale(.92)" },
        { opacity: 1, background: red, transform: "scale(1.14)", offset: 0.24 },
        { opacity: 0, background: red, transform: "scale(.1)", offset: 0.36 },
        { opacity: 0, offset: 1 },
      ],
      d,
    );
    a(
      bead,
      [
        { opacity: 0, transform: "scale(.2)" },
        { opacity: 0, transform: "scale(.2)", offset: 0.69 },
        { opacity: 1, transform: "scale(1.2)", offset: 0.84 },
        { opacity: 1, transform: "scale(1)", offset: 1 },
      ],
      d,
    );
    a(
      ring,
      [
        { opacity: 0, transform: "scale(.82)" },
        { opacity: 0, transform: "scale(.82)", offset: 0.34 },
        { opacity: 0.7, transform: "scale(1.04)", offset: 0.57 },
        { opacity: 1, transform: "scale(1)", offset: 0.82 },
        { opacity: 1, transform: "scale(1)", offset: 1 },
      ],
      d,
    );
    a(
      tail,
      [
        { opacity: 0.15, transform: "translateX(-.06em)" },
        { opacity: 0.15, transform: "translateX(-.06em)", offset: 0.3 },
        { opacity: 1, transform: "translateX(0)", offset: 0.68 },
        { opacity: 1, transform: "translateX(0)", offset: 1 },
      ],
      d,
    );
    p.querySelectorAll('[data-logo-part="particle"]').forEach((el, j) => {
      const angle = (j * Math.PI) / 4,
        x = Math.cos(angle) * 0.86,
        y = Math.sin(angle) * 0.86;
      a(
        el,
        [
          { opacity: 0, transform: t(0, 0, 0.2) },
          { opacity: 0, transform: t(0, 0, 0.2), offset: 0.27 },
          { opacity: 1, transform: t(x, y, 1.2), offset: 0.43 },
          { opacity: 1, transform: t(x * 0.85, y * 0.85), offset: 0.59 },
          { opacity: 0, transform: t(0, 0, 0.5), offset: 0.82 },
          { opacity: 0, transform: t(0, 0, 0.5), offset: 1 },
        ],
        d,
      );
    });
    shock(1800, 0.6);
  }
  let cancelled = false;
  void Promise.all(list.map((animation) => animation.finished)).then(
    () => {
      if (!cancelled) {
        for (const animation of list) animation.cancel();
        onComplete?.();
      }
    },
    () => {
      /* Cancellation on unmount rejects finished. */
    },
  );
  return () => {
    cancelled = true;
    for (const animation of list) animation.cancel();
  };
}
