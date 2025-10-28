import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  className?: string;
  fallbackClassName?: string;
}

/**
 * Universal avatar component that handles three states:
 * 1. Unknown user (no email): Shows grey circle with User icon
 * 2. Known user without photo: Shows initials from name or email
 * 3. User with uploaded photo: Shows the photo
 */
export function UserAvatar({
  avatarUrl,
  email,
  username,
  firstName,
  lastName,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  // Generate initials for known users
  const getInitials = () => {
    // Priority 1: Use first and last name initials
    if (firstName || lastName) {
      const firstInitial = firstName?.[0]?.toUpperCase() || "";
      const lastInitial = lastName?.[0]?.toUpperCase() || "";
      if (firstInitial || lastInitial) {
        return `${firstInitial}${lastInitial}`;
      }
    }

    // Priority 2: Use username initials
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }

    // Priority 3: Use email initials
    if (email) {
      const name = email.split("@")[0];
      return name.slice(0, 2).toUpperCase();
    }

    // Unknown user
    return null;
  };

  const initials = getInitials();
  const isKnownUser = !!(email || username || firstName || lastName);
  const displayName = firstName || lastName || username || email || "User";

  return (
    <Avatar className={cn("", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
      <AvatarFallback className={cn(fallbackClassName)}>
        {initials ? (
          <span className="font-medium">{initials}</span>
        ) : (
          <User className="h-5 w-5" />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
