import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sheetMotion, usePresenceMotion } from "../../src/lib/sheetMotion";

interface FakeAnimation {
  options: KeyframeAnimationOptions;
  playState: string;
  cancel: ReturnType<typeof vi.fn>;
  finish: ReturnType<typeof vi.fn>;
}

let animations: FakeAnimation[];

function Probe({ open }: { open: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  usePresenceMotion(ref, open, sheetMotion("bottom"));
  return <div ref={ref} />;
}

beforeEach(() => {
  vi.useFakeTimers();
  animations = [];
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: (_frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation: FakeAnimation = {
        options,
        playState: "running",
        cancel: vi.fn(() => {
          animation.playState = "idle";
        }),
        finish: vi.fn(() => {
          animation.playState = "finished";
        }),
      };
      animations.push(animation);
      return animation;
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(HTMLElement.prototype, "animate");
});

describe("usePresenceMotion", () => {
  it("plays the enter from off-screen with a backwards fill, so the resting state is visible", () => {
    render(<Probe open />);
    expect(animations).toHaveLength(1);
    expect(animations[0]?.options.fill).toBe("backwards");
  });

  it("holds the exit end state, and the watchdog finishes it when the timeline stalls", () => {
    const { rerender } = render(<Probe open />);
    rerender(<Probe open={false} />);
    const exit = animations[1];
    expect(exit?.options.fill).toBe("forwards");
    expect(exit?.finish).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(exit?.finish).toHaveBeenCalledTimes(1);
  });

  it("does not force an exit that already finished", () => {
    const { rerender } = render(<Probe open />);
    rerender(<Probe open={false} />);
    const exit = animations[1];
    if (exit) exit.playState = "finished";
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(exit?.finish).not.toHaveBeenCalled();
  });

  it("cancels a running exit when reopened, so the popup is not held off-screen", () => {
    const { rerender } = render(<Probe open />);
    rerender(<Probe open={false} />);
    const exit = animations[1];
    rerender(<Probe open />);
    expect(exit?.cancel).toHaveBeenCalledTimes(1);
    expect(animations[2]?.options.fill).toBe("backwards");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(exit?.finish).not.toHaveBeenCalled();
  });

  it("does not animate under prefers-reduced-motion", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    render(<Probe open />);
    expect(animations).toHaveLength(0);
    vi.restoreAllMocks();
  });
});
