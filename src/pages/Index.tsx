import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/chat");
      }
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <MessageSquare className="mx-auto h-16 w-16 text-primary" />
        <h1 className="text-4xl font-bold">AI Chat Starter</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Start chatting with AI powered by Lovable Cloud
        </p>
        <Button size="lg" onClick={() => navigate("/auth")}>
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
