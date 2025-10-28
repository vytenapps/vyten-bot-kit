import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { useStickToBottom } from "use-stick-to-bottom";

interface ConversationContextValue {
  isAtBottom: boolean;
  scrollToBottom: () => void;
}

const ConversationContext = React.createContext<ConversationContextValue | null>(null);

const useConversationContext = () => {
  const context = React.useContext(ConversationContext);
  if (!context) {
    throw new Error("Conversation components must be used within Conversation");
  }
  return context;
};

interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> {}

const Conversation = React.forwardRef<HTMLDivElement, ConversationProps>(
  ({ className, children, ...props }, ref) => {
    const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom();

    return (
      <ConversationContext.Provider value={{ isAtBottom, scrollToBottom }}>
        <div
          ref={ref}
          className={cn("flex flex-col h-full relative", className)}
          {...props}
        >
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div ref={contentRef}>
              {children}
            </div>
          </div>
        </div>
      </ConversationContext.Provider>
    );
  }
);
Conversation.displayName = "Conversation";

interface ConversationContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const ConversationContent = React.forwardRef<HTMLDivElement, ConversationContentProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 space-y-4", className)} {...props}>
      {children}
    </div>
  )
);
ConversationContent.displayName = "ConversationContent";

const ConversationScrollButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
  const { isAtBottom, scrollToBottom } = useConversationContext();

  if (isAtBottom) return null;

  return (
    <Button
      ref={ref}
      size="icon"
      variant="outline"
      className={cn(
        "absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full shadow-lg",
        "h-10 w-10 bg-background hover:bg-accent z-10",
        className
      )}
      onClick={() => scrollToBottom()}
      {...props}
    >
      <ArrowDown className="h-4 w-4" />
      <span className="sr-only">Scroll to bottom</span>
    </Button>
  );
});
ConversationScrollButton.displayName = "ConversationScrollButton";

export { Conversation, ConversationContent, ConversationScrollButton };
