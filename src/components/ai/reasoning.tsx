import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Brain } from "lucide-react";

const AUTO_CLOSE_DELAY = 1000;

interface ReasoningProps extends React.ComponentProps<typeof Collapsible> {
  isStreaming?: boolean;
  duration?: number;
}

const Reasoning = React.forwardRef<
  React.ElementRef<typeof Collapsible>,
  ReasoningProps
>(({ isStreaming = false, duration: controlledDuration, className, ...props }, ref) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [internalDuration, setInternalDuration] = React.useState(0);
  const streamingRef = React.useRef(isStreaming);
  const startTimeRef = React.useRef<number | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout>();

  const duration = controlledDuration ?? internalDuration;

  React.useEffect(() => {
    if (isStreaming && !streamingRef.current) {
      setInternalOpen(true);
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setInternalDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    }

    if (!isStreaming && streamingRef.current) {
      if (startTimeRef.current) {
        setInternalDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setTimeout(() => setInternalOpen(false), AUTO_CLOSE_DELAY);
    }

    streamingRef.current = isStreaming;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isStreaming]);

  return (
    <Collapsible
      ref={ref}
      open={props.open ?? internalOpen}
      onOpenChange={props.onOpenChange ?? setInternalOpen}
      className={cn("my-2", className)}
      {...props}
    >
      <ReasoningContext.Provider value={{ duration, isStreaming }}>
        {props.children}
      </ReasoningContext.Provider>
    </Collapsible>
  );
});
Reasoning.displayName = "Reasoning";

const ReasoningContext = React.createContext<{
  duration: number;
  isStreaming: boolean;
}>({ duration: 0, isStreaming: false });

const useReasoningContext = () => {
  const context = React.useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

interface ReasoningTriggerProps extends React.ComponentProps<typeof CollapsibleTrigger> {
  title?: string;
}

const ReasoningTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsibleTrigger>,
  ReasoningTriggerProps
>(({ title = "Reasoning", className, ...props }, ref) => {
  const { duration, isStreaming } = useReasoningContext();

  return (
    <CollapsibleTrigger
      ref={ref}
      className={cn(
        "flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors",
        "group",
        className
      )}
      {...props}
    >
      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
      <Brain className="h-4 w-4" />
      <span>{isStreaming ? title : `Thought for ${duration}s`}</span>
    </CollapsibleTrigger>
  );
});
ReasoningTrigger.displayName = "ReasoningTrigger";

const ReasoningContent = React.forwardRef<
  React.ElementRef<typeof CollapsibleContent>,
  React.ComponentProps<typeof CollapsibleContent>
>(({ className, children, ...props }, ref) => (
  <CollapsibleContent
    ref={ref}
    className={cn(
      "mt-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  >
    {children}
  </CollapsibleContent>
));
ReasoningContent.displayName = "ReasoningContent";

export { Reasoning, ReasoningTrigger, ReasoningContent };
