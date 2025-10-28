import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, User, LogOut, Trash2, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface SidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onSignOut: () => void;
}

export const Sidebar = ({ currentConversationId, onSelectConversation, onSignOut }: SidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      toast.error("Failed to load conversations", {
        description: error.message,
      });
    }
  };

  const handleNewChat = () => {
    onSelectConversation(null);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (currentConversationId === id) {
        onSelectConversation(null);
      }

      setConversations(conversations.filter(c => c.id !== id));
      
      toast.success("Conversation deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete conversation", {
        description: error.message,
      });
    }
  };

  return (
    <div className="flex h-full flex-col border-r bg-background">
      <div className="p-4">
        <Button onClick={handleNewChat} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group flex items-center justify-between rounded-lg p-3 cursor-pointer transition-colors ${
                currentConversationId === conversation.id
                  ? "bg-accent"
                  : "hover:bg-accent/50"
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium">{conversation.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(conversation.updated_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                onClick={(e) => handleDeleteConversation(conversation.id, e)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-4 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => navigate("/profile")}
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={onSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
