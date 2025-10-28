import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoginForm } from "@/components/login-form";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/chat");
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/chat");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuth = async (email: string) => {
    setIsLoading(true);

    try {
      const loginSyncId = crypto.randomUUID();
      console.debug('[Auth] generated loginSyncId', loginSyncId);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/chat?login_state=${loginSyncId}`,
        },
      });

      if (error) throw error;

      // Navigate to check email page with loginSyncId for cross-origin sync
      navigate("/check-email", { state: { email, loginSyncId } });
    } catch (error: any) {
      toast.error("Authentication failed", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm 
          onSubmit={handleAuth}
          isLoading={isLoading}
          checkingLogin={false}
        />
      </div>
    </div>
  );
};

export default Auth;
