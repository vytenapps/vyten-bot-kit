import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCheck, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NotificationFiltersProps {
  typeFilter: string;
  statusFilter: string;
  sortOrder: string;
  onTypeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  hasUnread: boolean;
  hasNotifications: boolean;
}

export const NotificationFilters = ({
  typeFilter,
  statusFilter,
  sortOrder,
  onTypeFilterChange,
  onStatusFilterChange,
  onSortOrderChange,
  onMarkAllAsRead,
  onClearAll,
  hasUnread,
  hasNotifications,
}: NotificationFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="post_like">Post likes</SelectItem>
            <SelectItem value="post_comment">Comments</SelectItem>
            <SelectItem value="comment_like">Comment likes</SelectItem>
            <SelectItem value="comment_reply">Replies</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={onSortOrderChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="unread">Unread first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAllAsRead}
            className="flex-1 sm:flex-none"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
        
        {hasNotifications && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your notifications. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Clear all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};
