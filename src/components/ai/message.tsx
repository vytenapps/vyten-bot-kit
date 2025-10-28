import * as React from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  from: "user" | "assistant";
}

const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ from, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-3",
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

interface MessageAvatarProps {
  // For AI assistant avatars
  children?: React.ReactNode;
  isAI?: boolean;
  
  // For user avatars
  avatarUrl?: string | null;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  
  className?: string;
}

const MessageAvatar = React.forwardRef<
  HTMLDivElement,
  MessageAvatarProps
>(({ children, isAI, avatarUrl, email, username, firstName, lastName, className }, ref) => {
  if (isAI || children) {
    // AI avatar with custom icon
    return (
      <div ref={ref} className={cn("h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs", className)}>
        {children || "AI"}
      </div>
    );
  }

  // User avatar
  return (
    <div ref={ref}>
      <UserAvatar
        className={cn("h-8 w-8", className)}
        avatarUrl={avatarUrl}
        email={email}
        username={username}
        firstName={firstName}
        lastName={lastName}
      />
    </div>
  );
});
MessageAvatar.displayName = "MessageAvatar";

export { Message, MessageContent, MessageAvatar };
