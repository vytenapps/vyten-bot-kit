import * as React from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  messageId: string;
  content: string;
  onFeedback?: (messageId: string, type: 'positive' | 'negative') => Promise<void>;
}

export const Actions = React.forwardRef<HTMLDivElement, ActionsProps>(
  ({ messageId, content, onFeedback, className, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);
    const [feedback, setFeedback] = React.useState<'positive' | 'negative' | null>(null);

    const handleCopy = async () => {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    };

    const handleFeedback = async (type: 'positive' | 'negative') => {
      if (feedback === type) return; // Already selected
      
      setFeedback(type);
      if (onFeedback) {
        try {
          await onFeedback(messageId, type);
          toast.success(type === 'positive' ? "Thanks for the feedback!" : "Feedback received");
        } catch (error) {
          console.error("Failed to save feedback:", error);
          toast.error("Failed to save feedback");
          setFeedback(null);
        }
      }
    };

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity", className)}
        {...props}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => handleFeedback('positive')}
          disabled={feedback !== null}
        >
          <ThumbsUp className={cn("h-3 w-3", feedback === 'positive' && "fill-current")} />
          <span className="sr-only">Thumbs up</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => handleFeedback('negative')}
          disabled={feedback !== null}
        >
          <ThumbsDown className={cn("h-3 w-3", feedback === 'negative' && "fill-current")} />
          <span className="sr-only">Thumbs down</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          <span className="sr-only">Copy</span>
        </Button>
      </div>
    );
  }
);

Actions.displayName = "Actions";
