import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: string;
  created_at: string;
  is_read: boolean;
  post_id?: string;
  comment_id?: string;
  actor: {
    username: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export const NotificationMenu = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }

    // Fetch actor profiles for each notification
    if (data && data.length > 0) {
      const actorIds = [...new Set(data.map(n => n.actor_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, username, first_name, last_name')
        .in('user_id', actorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const notificationsWithActors = data.map(notification => ({
        ...notification,
        actor: profileMap.get(notification.actor_id) || {
          username: 'Unknown',
          first_name: null,
          last_name: null
        }
      }));

      setNotifications(notificationsWithActors);
      setUnreadCount(notificationsWithActors.filter(n => !n.is_read).length);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    loadNotifications();
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    // Navigate to the post
    if (notification.post_id) {
      navigate('/social-wall');
    }
  };

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor?.first_name || notification.actor?.username || 'Someone';
    
    switch (notification.type) {
      case 'post_like':
        return `${actorName} liked your post`;
      case 'post_comment':
        return `${actorName} commented on your post`;
      case 'comment_like':
        return `${actorName} liked your comment`;
      case 'comment_reply':
        return `${actorName} replied to your comment`;
      default:
        return 'New notification';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <BellIcon className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="cursor-pointer"
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${!notification.is_read ? 'font-medium' : 'font-normal'}`}>
                      {getNotificationText(notification)}
                    </p>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
