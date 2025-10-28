import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Copy, ThumbsUp, ThumbsDown, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface ActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  onCopy?: () => void;
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
  onEdit?: () => void;
  feedbackState?: "up" | "down" | null;
}

const Actions = React.forwardRef<HTMLDivElement, ActionsProps>(
  ({ className, onCopy, onThumbsUp, onThumbsDown, onEdit, feedbackState, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
      onCopy?.();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-1 mt-2", className)}
        {...props}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-2"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        {onThumbsUp && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onThumbsUp}
            className={cn(
              "h-8 px-2",
              feedbackState === "up" && "text-primary"
            )}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
        )}
        {onThumbsDown && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onThumbsDown}
            className={cn(
              "h-8 px-2",
              feedbackState === "down" && "text-destructive"
            )}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        )}
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 px-2"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
);
Actions.displayName = "Actions";

export { Actions };
