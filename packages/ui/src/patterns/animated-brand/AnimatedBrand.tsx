import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
} from "react";
import {
  BRAND_ANIMATIONS,
  playBrandMotion,
  type BrandAnimation,
  type BrandMode,
} from "./brandMotion";

export interface AnimatedBrandProps {
  /** Product suffix, for example Brain, Hub, Docs, or Product. */
  product?: string;
  /** Accent color shared by the dot, trails, and particles. Accepts any CSS color. */
  dotColor?: string;
  /** Base color for the wordmark and ring. */
  textColor?: string;
  /** Optional overrides for the One prefix, product suffix, and O ring. */
  oneColor?: string;
  productColor?: string;
  ringColor?: string;
  mode?: BrandMode;
  animation?: BrandAnimation | "random";
  /** Font size in CSS pixels. The O scales proportionally with the wordmark. */
  size?: number;
  autoPlay?: boolean;
  /** Change this value to replay a finite animation. */
  replayKey?: string | number;
  onComplete?: () => void;
  className?: string;
  style?: CSSProperties;
}

const absolute: CSSProperties = {
  position: "absolute",
  borderRadius: "50%",
  pointerEvents: "none",
};
const centered: CSSProperties = {
  ...absolute,
  width: ".2em",
  height: ".2em",
  left: "50%",
  top: "50%",
  margin: "-.1em",
};
const accent = "var(--bms-brand-dot)";

/** A static accessible brand with an optional finite, reduced-motion-aware introduction. */
export function AnimatedBrand({
  product = "Brain",
  dotColor = "#e60028",
  textColor = "#929292",
  oneColor,
  productColor,
  ringColor,
  mode = "full",
  animation = "random",
  size = 48,
  autoPlay = true,
  replayKey,
  onComplete,
  className,
  style,
}: AnimatedBrandProps): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  const completion = useRef(onComplete);
  useEffect(() => {
    completion.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !autoPlay) return;
    let disposed = false;
    let stop: (() => void) | undefined;
    let completed = false;
    const finish = (): void => {
      if (!disposed && !completed) {
        completed = true;
        completion.current?.();
      }
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = (): void => {
      if (reduced.matches) {
        stop?.();
        finish();
      }
    };
    reduced.addEventListener("change", changed);
    const start = (): void => {
      if (disposed || completed) return;
      if (reduced.matches) {
        finish();
        return;
      }
      const choice =
        animation === "random"
          ? BRAND_ANIMATIONS[
              Math.floor(Math.random() * BRAND_ANIMATIONS.length)
            ]!.id
          : animation;
      stop = playBrandMotion(element, choice, finish);
    };
    void (document.fonts?.ready ?? Promise.resolve()).then(start, start);
    return () => {
      disposed = true;
      stop?.();
      reduced.removeEventListener("change", changed);
    };
  }, [product, mode, animation, size, autoPlay, replayKey]);

  const tail = mode === "full" ? `ne${product}` : mode === "one" ? "ne" : "";
  const label =
    mode === "full" ? `One${product}` : mode === "one" ? "One" : "O";
  const wrapperStyle: CSSProperties & { "--bms-brand-dot": string } = {
    "--bms-brand-dot": dotColor,
    display: "inline-flex",
    fontSize: size,
    color: textColor,
    ...style,
  };
  return (
    <span
      ref={ref}
      className={className}
      style={wrapperStyle}
    >
      <span
        data-logo-part="logo"
        role="img"
        aria-label={label}
        style={{
          display: "inline-flex",
          position: "relative",
          alignItems: "center",
          fontSize: "inherit",
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-.055em",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        <span
          data-logo-part="mark"
          aria-hidden="true"
          style={{
            position: "relative",
            flex: "none",
            color: ringColor ?? oneColor,
            width: ".8em",
            height: ".8em",
            marginRight: tail ? ".04em" : 0,
          }}
        >
          <span
            data-logo-part="ring"
            style={{
              ...absolute,
              inset: 0,
              border: ".157em solid currentColor",
              boxSizing: "border-box",
            }}
          />
          <span
            data-logo-part="core"
            style={{
              ...absolute,
              inset: 0,
              background: accent,
              opacity: 0,
              zIndex: 2,
            }}
          />
          <span
            data-logo-part="trail"
            style={{
              position: "absolute",
              width: "1.8em",
              height: ".045em",
              left: "50%",
              top: "50%",
              marginTop: "-.0225em",
              background: `linear-gradient(90deg, ${accent}, transparent)`,
              transformOrigin: "left center",
              opacity: 0,
              pointerEvents: "none",
            }}
          />
          {[0, 1].map((id) => (
            <span
              key={id}
              data-logo-part="echo"
              style={{
                ...centered,
                border: `.025em solid ${accent}`,
                boxSizing: "border-box",
                opacity: 0,
              }}
            />
          ))}
          {Array.from({ length: 8 }, (_, id) => (
            <span
              key={id}
              data-logo-part="particle"
              style={{
                ...centered,
                width: ".055em",
                height: ".055em",
                margin: "-.0275em",
                background: accent,
                opacity: 0,
              }}
            />
          ))}
          <span
            data-logo-part="bead"
            style={{ ...centered, background: accent, zIndex: 3 }}
          />
        </span>
        <span
          data-logo-part="tail"
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            whiteSpace: "pre",
          }}
        >
          {Array.from(tail).map((letter, index) => (
            <span
              key={`${index}-${letter}`}
              data-brand-letter=""
              style={{ display: "inline-block", color: index < 2 ? oneColor : productColor }}
            >
              {letter}
            </span>
          ))}
          <span
            data-brand-baseline=""
            style={{
              display: "inline-block",
              width: 0,
              height: 0,
              alignSelf: "baseline",
            }}
          />
        </span>
      </span>
    </span>
  );
}
