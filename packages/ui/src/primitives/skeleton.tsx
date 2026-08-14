import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../lib/utils";

export const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
);
