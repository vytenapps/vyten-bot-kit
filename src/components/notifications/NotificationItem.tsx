import { formatDistanceToNow } from "date-fns";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: {
    id: string;
    type: 'post_like' | 'post_comment' | 'comment_like' | 'comment_reply';
    post_id: string | null;
    comment_id: string | null;
    is_read: boolean;
    created_at: string;
    actor: {
      username: string;
      avatar_url: string | null;
      first_name: string | null;
      last_name: string | null;
    };
  };
  onClick: (notification: any) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  compact?: boolean;
}

export const NotificationItem = ({ 
  notification, 
  onClick, 
  onMarkAsRead,
  onDelete,
  compact = false 
}: NotificationItemProps) => {
  const getNotificationText = () => {
    switch (notification.type) {
      case 'post_like':
        return 'liked your post';
      case 'post_comment':
        return 'commented on your post';
      case 'comment_like':
        return 'liked your comment';
      case 'comment_reply':
        return 'replied to your comment';
      default:
        return 'interacted with your content';
    }
  };

  const actorName = notification.actor?.username || 'Someone';
  const action = getNotificationText();

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg transition-colors cursor-pointer group",
        !notification.is_read ? "bg-accent/30" : "hover:bg-accent/20"
      )}
      onClick={() => onClick(notification)}
    >
      <UserAvatar
        avatarUrl={notification.actor?.avatar_url}
        username={notification.actor?.username}
        firstName={notification.actor?.first_name}
        lastName={notification.actor?.last_name}
        className="h-10 w-10 flex-shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm leading-tight">
          <span className="font-semibold">{actorName}</span>
          {' '}
          <span className="text-muted-foreground">{action}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!notification.is_read && (
          <div className="h-2 w-2 rounded-full bg-primary" />
        )}
        {!compact && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {!notification.is_read && onMarkAsRead && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
