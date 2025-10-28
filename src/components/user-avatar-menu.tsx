import { User, LogOut, Monitor } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SettingsDialog } from "@/components/settings-dialog";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserAvatarMenuProps {
  isLoggedIn: boolean;
  userEmail?: string;
}

export function UserAvatarMenu({ isLoggedIn, userEmail }: UserAvatarMenuProps) {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string>("profile");
  const [profile, setProfile] = useState<{
    avatar_url: string | null;
    username: string;
    first_name: string | null;
    last_name: string | null;
  } | null>(null);

  // Load user profile data for avatar
  useEffect(() => {
    if (isLoggedIn && userEmail) {
      const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("user_profiles")
            .select("avatar_url, username, first_name, last_name")
            .eq("user_id", user.id)
            .single();

          if (data) {
            setProfile(data);
          }
        }
      };
      loadProfile();
    }
  }, [isLoggedIn, userEmail]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error: any) {
      toast.error("Failed to sign out", {
        description: error.message,
      });
    }
  };

  const handleProfileClick = () => {
    setSettingsSection("profile");
    setSettingsOpen(true);
  };

  const handleThemeClick = () => {
    setSettingsSection("appearance");
    setSettingsOpen(true);
  };

  const handleSignInClick = () => {
    navigate("/auth");
  };

  if (!isLoggedIn) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full">
              <UserAvatar className="h-10 w-10 cursor-pointer" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleSignInClick}>
              Sign In
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full">
            <UserAvatar
              className="h-10 w-10 cursor-pointer"
              avatarUrl={profile?.avatar_url}
              email={userEmail}
              username={profile?.username}
              firstName={profile?.first_name}
              lastName={profile?.last_name}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">My Account</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-sm py-1 px-1 -ml-1 flex-1" onClick={handleThemeClick}>
              <Monitor className="h-4 w-4" />
              <span className="text-sm">Theme</span>
            </div>
            <ThemeSwitcher className="scale-75" iconSize={14} />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleProfileClick}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <SettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen}
        initialSection={settingsSection}
      />
    </>
  );
}
