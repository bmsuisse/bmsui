import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLongPress, type UseLongPressOptions } from "../../src/hooks/useLongPress";

function Target({ onLongPress, onClick, options }: { onLongPress: () => void; onClick?: () => void; options?: UseLongPressOptions }) {
  const handlers = useLongPress(onLongPress, options);
  return (
    <button type="button" {...handlers} onClick={onClick}>
      hold
    </button>
  );
}

const down = (el: Element, init: PointerEventInit = {}) =>
  fireEvent.pointerDown(el, { pointerId: 1, pointerType: "touch", clientX: 10, clientY: 10, button: 0, ...init });

describe("useLongPress", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires after the threshold and swallows the following click", () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    render(<Target onLongPress={onLongPress} onClick={onClick} options={{ threshold: 400 }} />);
    const el = screen.getByText("hold");
    down(el);
    vi.advanceTimersByTime(399);
    expect(onLongPress).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(el, { pointerId: 1 });
    fireEvent.click(el);
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.click(el);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("cancels on early release and lets the click through", () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    const onClick = vi.fn();
    render(<Target onLongPress={onLongPress} onClick={onClick} options={{ onCancel }} />);
    const el = screen.getByText("hold");
    down(el);
    vi.advanceTimersByTime(200);
    fireEvent.pointerUp(el, { pointerId: 1 });
    vi.advanceTimersByTime(1000);
    expect(onLongPress).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(el);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("cancels when the pointer moves beyond the tolerance, not within it", () => {
    const onLongPress = vi.fn();
    render(<Target onLongPress={onLongPress} options={{ moveTolerance: 10 }} />);
    const el = screen.getByText("hold");
    down(el);
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 18, clientY: 12 });
    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalledTimes(1);

    down(el);
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 30, clientY: 10 });
    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("ignores secondary mouse buttons and disabled", () => {
    const onLongPress = vi.fn();
    const { rerender } = render(<Target onLongPress={onLongPress} />);
    down(screen.getByText("hold"), { pointerType: "mouse", button: 2 });
    vi.advanceTimersByTime(600);
    rerender(<Target onLongPress={onLongPress} options={{ disabled: true }} />);
    down(screen.getByText("hold"));
    vi.advanceTimersByTime(600);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("clears the timer on unmount", () => {
    const onLongPress = vi.fn();
    const { unmount } = render(<Target onLongPress={onLongPress} />);
    down(screen.getByText("hold"));
    unmount();
    vi.advanceTimersByTime(1000);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("drops a pending press when disabled flips on during the hold", () => {
    const onLongPress = vi.fn();
    const { rerender } = render(<Target onLongPress={onLongPress} options={{ threshold: 400 }} />);
    down(screen.getByText("hold"));
    vi.advanceTimersByTime(200);
    rerender(<Target onLongPress={onLongPress} options={{ threshold: 400, disabled: true }} />);
    vi.advanceTimersByTime(1000);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
