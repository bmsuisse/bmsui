import { StrictMode } from "react";
import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedBrand } from "../../../src/patterns/animated-brand/AnimatedBrand";
import { BRAND_ANIMATIONS } from "../../../src/patterns/animated-brand/brandMotion";

let tracks: { cancel: ReturnType<typeof vi.fn>; resolve: () => void }[];
let matches: boolean;
let change: (() => void) | undefined;
let animate: ReturnType<typeof vi.fn>;
const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  tracks = [];
  matches = false;
  change = undefined;
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    media: query,
    get matches() {
      return matches;
    },
    onchange: null,
    addEventListener: (
      _event: string,
      listener: EventListenerOrEventListenerObject,
    ) => {
      change = listener as () => void;
    },
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: () => true,
  }));
  animate = vi.fn(() => {
    let resolve = (): void => {};
    const finished = new Promise<void>((done) => {
      resolve = done;
    });
    const cancel = vi.fn();
    tracks.push({ cancel, resolve });
    return { finished, cancel } as unknown as Animation;
  });
  vi.stubGlobal("Animation", class {});
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    value: animate,
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (Element.prototype as Partial<Element>).animate;
});

describe("AnimatedBrand", () => {
  it.each(["Brain", "Hub", "Docs", "Product", "My Product"])(
    "renders an accessible %s wordmark",
    (product) => {
      render(<AnimatedBrand product={product} autoPlay={false} />);
      expect(screen.getByRole("img", { name: `One${product}` })).toBeVisible();
      expect(animate).not.toHaveBeenCalled();
    },
  );

  it("inherits the base text color unless a part is overridden", () => {
    const { container, rerender } = render(<AnimatedBrand autoPlay={false} textColor="#112233" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveStyle({ color: "#112233" });
    expect(container.querySelector('[data-logo-part="mark"]')).not.toHaveAttribute("style", expect.stringContaining("color:"));
    rerender(<AnimatedBrand autoPlay={false} textColor="#112233" oneColor="#445566" productColor="#778899" ringColor="#aabbcc" dotColor="#0077ee" />);
    expect(wrapper.style.getPropertyValue("--bms-brand-dot")).toBe("#0077ee");
    expect(container.querySelector('[data-logo-part="mark"]')).toHaveStyle({ color: "#aabbcc" });
    const letters = container.querySelectorAll('[data-brand-letter]');
    expect(letters[0]).toHaveStyle({ color: "#445566" });
    expect(letters[1]).toHaveStyle({ color: "#445566" });
    expect(letters[2]).toHaveStyle({ color: "#778899" });
  });

  it.each(BRAND_ANIMATIONS.map(({ id }) => id))("%s uses the selected dot color throughout its effects", async (animation) => {
    const { container } = render(<AnimatedBrand animation={animation} dotColor="#0077ee" />);
    await flush();
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--bms-brand-dot")).toBe("#0077ee");
    for (const [frames] of animate.mock.calls as [Keyframe[]][]) {
      for (const frame of frames) {
        if (frame.background) expect(frame.background).toBe("var(--bms-brand-dot)");
      }
    }
    for (const part of ["bead", "core", "trail", "echo", "particle"]) {
      expect(container.querySelector(`[data-logo-part="${part}"]`)?.getAttribute("style")).toContain("var(--bms-brand-dot)");
    }
  });

  it("updates colors during playback without restarting the animation", async () => {
    const { container, rerender } = render(<AnimatedBrand animation="signature" dotColor="#0077ee" />);
    await flush();
    const count = animate.mock.calls.length;
    rerender(<AnimatedBrand animation="signature" dotColor="#22bb66" textColor="#445566" />);
    await flush();
    expect(animate).toHaveBeenCalledTimes(count);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--bms-brand-dot")).toBe("#22bb66");
  });

  it("preserves spaces in custom product suffixes", () => {
    const { container } = render(
      <AnimatedBrand product="My Product" autoPlay={false} />,
    );
    const tail = container.querySelector('[data-logo-part="tail"]');
    expect(tail).toHaveStyle({ whiteSpace: "pre" });
    expect(tail?.textContent).toBe("neMy Product");
    const space = Array.from(
      container.querySelectorAll("[data-brand-letter]"),
    ).find((letter) => letter.textContent === " ");
    expect(space).toBeDefined();
  });

  it.each(["mark", "one"] as const)(
    "renders compact %s without the product suffix",
    (mode) => {
      const { container } = render(
        <AnimatedBrand mode={mode} autoPlay={false} />,
      );
      expect(
        screen.getByRole("img", { name: mode === "mark" ? "O" : "One" }),
      ).toBeVisible();
      expect(container.textContent).toBe(mode === "mark" ? "" : "ne");
    },
  );

  it("keeps server markup deterministic when random motion is requested", () => {
    const random = vi.spyOn(Math, "random");
    expect(renderToString(<AnimatedBrand />)).toContain(
      'aria-label="OneBrain"',
    );
    expect(random).not.toHaveBeenCalled();
  });

  it.each(
    BRAND_ANIMATIONS.flatMap(({ id }) =>
      ["full", "mark", "one"].map((mode) => [id, mode] as const),
    ),
  )(
    "%s/%s produces finite ordered frames and settles exactly once",
    async (animation, mode) => {
      const complete = vi.fn();
      render(
        <AnimatedBrand
          animation={animation}
          mode={mode as "full" | "mark" | "one"}
          onComplete={complete}
        />,
      );
      await flush();
      expect(animate).toHaveBeenCalled();
      for (const [frames, options] of animate.mock.calls as [
        Keyframe[],
        KeyframeAnimationOptions,
      ][]) {
        expect(Number(options.duration)).toBeGreaterThan(0);
        expect(options.iterations).toBe(1);
        let last = 0;
        for (const frame of frames) {
          if (frame.offset != null) {
            expect(frame.offset).toBeGreaterThanOrEqual(last);
            expect(frame.offset).toBeLessThanOrEqual(1);
            last = frame.offset;
          }
          expect(JSON.stringify(frame)).not.toMatch(/NaN|Infinity|orange/);
        }
      }
      expect(complete).not.toHaveBeenCalled();
      await act(async () => {
        tracks.forEach((track) => track.resolve());
      });
      expect(complete).toHaveBeenCalledTimes(1);
      expect(
        tracks.every((track) => track.cancel.mock.calls.length === 1),
      ).toBe(true);
    },
  );

  it("uses a static logo and completes without animation under reduced motion", async () => {
    matches = true;
    const complete = vi.fn();
    render(<AnimatedBrand onComplete={complete} />);
    await flush();
    expect(animate).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("img")).toBeVisible();
  });

  it("stops immediately if reduced motion is enabled during playback", async () => {
    const complete = vi.fn();
    render(<AnimatedBrand onComplete={complete} />);
    await flush();
    matches = true;
    act(() => {
      change?.();
    });
    expect(tracks.every((track) => track.cancel.mock.calls.length === 1)).toBe(
      true,
    );
    await act(async () => {
      tracks.forEach((track) => track.resolve());
    });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("replays on replayKey, but changing the completion callback never restarts playback", async () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender, unmount } = render(
      <AnimatedBrand animation="orbit" onComplete={first} />,
    );
    await flush();
    const count = animate.mock.calls.length;
    rerender(<AnimatedBrand animation="orbit" onComplete={latest} />);
    await flush();
    expect(animate).toHaveBeenCalledTimes(count);
    await act(async () => {
      tracks.forEach((track) => track.resolve());
    });
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
    rerender(
      <AnimatedBrand animation="orbit" onComplete={latest} replayKey={1} />,
    );
    await flush();
    expect(animate.mock.calls.length).toBe(count * 2);
    unmount();
    await act(async () => {
      tracks.forEach((track) => track.resolve());
    });
    expect(latest).toHaveBeenCalledTimes(1);
  });

  it("does not start a disposed StrictMode effect or finish after unmount", async () => {
    const complete = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <AnimatedBrand animation="orbit" onComplete={complete} />
      </StrictMode>,
    );
    await flush();
    expect(animate).toHaveBeenCalledTimes(4);
    unmount();
    expect(tracks.every((track) => track.cancel.mock.calls.length === 1)).toBe(
      true,
    );
    await act(async () => {
      tracks.forEach((track) => track.resolve());
    });
    expect(complete).not.toHaveBeenCalled();
  });
});
