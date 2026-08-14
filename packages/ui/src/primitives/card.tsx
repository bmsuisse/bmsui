import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../lib/utils";

// Deliberately uses bg-background/text-foreground rather than shadcn's usual
// bg-card/text-card-foreground tokens: the reference consumer app's actual
// token set (which this package's demo/theme mirrors) has no --card token,
// and adding one just for this component would be a second, redundant
// "surface" token to keep in sync.
export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("rounded-lg border bg-background text-foreground shadow-sm", className)} {...props} />
);

export const CardHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
);

export const CardDescription = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export const CardContent = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => <div className={cn("p-6 pt-0", className)} {...props} />;

export const CardFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement => (
  <div className={cn("flex items-center gap-2 p-6 pt-0", className)} {...props} />
);
