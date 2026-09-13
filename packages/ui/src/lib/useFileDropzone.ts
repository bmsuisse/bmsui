import { useCallback, useRef, useState, type DragEvent } from "react";

export interface FileDropzoneHandlers {
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

/**
 * Bridges native HTML5 drag events to the `dragging` boolean `ChatComposer`
 * already accepts, plus an `onFiles` callback for the drop itself. A ref-
 * counter (not a plain boolean) tracks nesting, because the browser fires
 * `dragleave` for every child element the cursor crosses while dragging
 * over nested layout — a naive `setDragging(false)` on the first
 * `dragleave` flickers the dashed border off mid-drag.
 */
export function useFileDropzone(onFiles: (files: File[]) => void): {
  dragging: boolean;
  handlers: FileDropzoneHandlers;
} {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    depth.current += 1;
    setDragging(true);
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onFiles(files);
    },
    [onFiles],
  );

  return { dragging, handlers: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
