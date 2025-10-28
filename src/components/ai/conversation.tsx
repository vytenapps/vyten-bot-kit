import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

type ScrollBehavior = "smooth" | "instant" | "auto";

interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> {
  initial?: ScrollBehavior;
  resize?: ScrollBehavior;
}

const Conversation: React.FC<ConversationProps> = ({ 
  className, 
  initial = "smooth", 
  resize = "smooth",
  children,
  ...props 
}) => (
  <StickToBottom
    className={cn("flex flex-col h-full relative", className)}
    initial={initial}
    resize={resize}
    {...props}
  >
    {children}
  </StickToBottom>
);
Conversation.displayName = "Conversation";

interface ConversationContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const ConversationContent: React.FC<ConversationContentProps> = ({ 
  className, 
  children,
  ...props 
}) => (
  <StickToBottom.Content className={cn("flex-1 overflow-y-auto", className)} {...props}>
    <div className="p-4 space-y-4">
      {children}
    </div>
  </StickToBottom.Content>
);
ConversationContent.displayName = "ConversationContent";

const ConversationScrollButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;

  return (
    <Button
      ref={ref}
      size="icon"
      variant="outline"
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-lg",
        "h-10 w-10 bg-background hover:bg-accent",
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
