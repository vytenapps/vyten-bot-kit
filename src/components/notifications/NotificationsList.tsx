import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NotificationItem } from "./NotificationItem";
import { NotificationFilters } from "./NotificationFilters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: 'post_like' | 'post_comment' | 'comment_like' | 'comment_reply' | 'post_reported';
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
}

export const NotificationsList = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications-settings')
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

  useEffect(() => {
    applyFilters();
  }, [notifications, typeFilter, statusFilter, sortOrder]);

  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        post_id,
        comment_id,
        is_read,
        created_at,
        actor:actor_id (
          username,
          avatar_url,
          first_name,
          last_name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(ITEMS_PER_PAGE * page);

    if (error) {
      console.error('Error loading notifications:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load notifications",
      });
      setLoading(false);
      return;
    }

    setNotifications(data as any);
    setHasMore(data.length === ITEMS_PER_PAGE * page);
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    // Status filter
    if (statusFilter === "unread") {
      filtered = filtered.filter(n => !n.is_read);
    } else if (statusFilter === "read") {
      filtered = filtered.filter(n => n.is_read);
    }

    // Sort
    if (sortOrder === "newest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOrder === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortOrder === "unread") {
      filtered.sort((a, b) => {
        if (a.is_read === b.is_read) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.is_read ? 1 : -1;
      });
    }

    setFilteredNotifications(filtered);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
    }

    // Navigate to the specific post for all notification types with a post_id
    if (notification.post_id) {
      navigate(`/social-wall/post/${notification.post_id}`);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  const handleDelete = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    toast({
      title: "Notification deleted",
      description: "The notification has been removed",
    });
  };

  const handleMarkAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    loadNotifications();
    
    toast({
      title: "All marked as read",
      description: "All notifications have been marked as read",
    });
  };

  const handleClearAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    setNotifications([]);
    
    toast({
      title: "Notifications cleared",
      description: "All notifications have been deleted",
    });
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
    loadNotifications();
  };

  const hasUnread = notifications.some(n => !n.is_read);
  const hasNotifications = notifications.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notifications</h2>
        <p className="text-muted-foreground mt-1">
          Manage your notifications and preferences
        </p>
      </div>

      <NotificationFilters
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        sortOrder={sortOrder}
        onTypeFilterChange={setTypeFilter}
        onStatusFilterChange={setStatusFilter}
        onSortOrderChange={setSortOrder}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearAll={handleClearAll}
        hasUnread={hasUnread}
        hasNotifications={hasNotifications}
      />

      <ScrollArea className="h-[calc(100vh-24rem)] md:h-[400px] pr-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              {notifications.length === 0 
                ? "No notifications yet"
                : "No notifications match your filters"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
            
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
