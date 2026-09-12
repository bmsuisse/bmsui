import type { ReactNode } from "react";
import { useMemo } from "react";
import { useToastContext } from "./ToastProvider";
import type { ToastOptions } from "./toast-store";

type VariantOptions = Omit<ToastOptions, "variant" | "title"> & { title?: ReactNode };

export interface PromiseToastMessages<T> {
  loading: ReactNode;
  success: ReactNode | ((value: T) => ReactNode);
  error: ReactNode | ((error: unknown) => ReactNode);
}

export interface ToastApi {
  /** Shows a toast and returns its id (for `update`/`dismiss`). */
  toast: ((options: ToastOptions) => string) & {
    success: (title: ReactNode, options?: VariantOptions) => string;
    error: (title: ReactNode, options?: VariantOptions) => string;
    warning: (title: ReactNode, options?: VariantOptions) => string;
    info: (title: ReactNode, options?: VariantOptions) => string;
    loading: (title: ReactNode, options?: VariantOptions) => string;
    /**
     * Tracks an async operation in a single toast: `loading` while pending,
     * then `success` or `error` in place. Returns the original promise, so
     * `await toast.promise(save(), …)` still yields the saved value.
     */
    promise: <T>(promise: Promise<T>, messages: PromiseToastMessages<T>, options?: VariantOptions) => Promise<T>;
  };
  /** Changes an existing toast's content/variant in place (restarts its timer). */
  update: (id: string, patch: Partial<Omit<ToastOptions, "id">>) => void;
  /** Closes one toast by id, or all of them. */
  dismiss: (id?: string) => void;
}

/**
 * Imperative toast API. Must be rendered inside a `ToastProvider`.
 *
 * ```tsx
 * const { toast } = useToast();
 * toast.success("Customer saved");
 * toast.error("Sync failed", { description: err.message, action: { label: "Retry", onClick: retry } });
 * await toast.promise(saveOffer(), { loading: "Saving…", success: "Offer saved", error: "Could not save" });
 * ```
 */
export function useToast(): ToastApi {
  const ctx = useToastContext();

  return useMemo(() => {
    const base = (options: ToastOptions): string => ctx.toast(options);
    const withVariant =
      (variant: ToastOptions["variant"]) =>
      (title: ReactNode, options: VariantOptions = {}): string =>
        ctx.toast({ ...options, title: options.title ?? title, variant });

    const toast = Object.assign(base, {
      success: withVariant("success"),
      error: withVariant("error"),
      warning: withVariant("warning"),
      info: withVariant("info"),
      loading: withVariant("loading"),
      promise: <T,>(promise: Promise<T>, messages: PromiseToastMessages<T>, options: VariantOptions = {}): Promise<T> => {
        const id = ctx.toast({ ...options, title: messages.loading, variant: "loading" });
        promise.then(
          (value) => {
            const title = typeof messages.success === "function" ? messages.success(value) : messages.success;
            ctx.update(id, { title, variant: "success", description: options.description });
          },
          (error: unknown) => {
            const title = typeof messages.error === "function" ? messages.error(error) : messages.error;
            ctx.update(id, { title, variant: "error", description: options.description });
          },
        );
        return promise;
      },
    });

    return { toast, update: ctx.update, dismiss: ctx.dismiss };
  }, [ctx]);
}
