import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const Reasoning = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-2 text-sm text-muted-foreground italic my-2",
      className
    )}
    {...props}
  >
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>{children || "Thinking..."}</span>
  </div>
));
Reasoning.displayName = "Reasoning";

export { Reasoning };
