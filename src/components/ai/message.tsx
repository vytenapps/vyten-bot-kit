import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  from: "user" | "assistant";
}

const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ from, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-3 mb-4",
          from === "user" ? "justify-end" : "justify-start",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Message.displayName = "Message";

const MessageContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg px-4 py-2 max-w-[85%] sm:max-w-[75%] break-words",
      "bg-muted text-foreground",
      className
    )}
    {...props}
  />
));
MessageContent.displayName = "MessageContent";

interface MessageAvatarProps extends React.ComponentProps<typeof Avatar> {
  src?: string;
  name?: string;
}

const MessageAvatar = React.forwardRef<
  React.ElementRef<typeof Avatar>,
  MessageAvatarProps
>(({ src, name, className, ...props }, ref) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AI";

  return (
    <Avatar ref={ref} className={cn("h-8 w-8", className)} {...props}>
      <AvatarImage src={src} alt={name} />
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  );
});
MessageAvatar.displayName = "MessageAvatar";

export { Message, MessageContent, MessageAvatar };
