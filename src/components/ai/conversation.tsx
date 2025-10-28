import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const Conversation = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col h-full", className)}
    {...props}
  />
));
Conversation.displayName = "Conversation";

const ConversationContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <ScrollArea className="flex-1">
    <div
      ref={ref}
      className={cn("p-4 space-y-4", className)}
      {...props}
    >
      {children}
    </div>
  </ScrollArea>
));
ConversationContent.displayName = "ConversationContent";

export { Conversation, ConversationContent };
