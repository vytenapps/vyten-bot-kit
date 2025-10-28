import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoginForm } from "@/components/login-form";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(false);
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

      // Subscribe to Realtime channel for cross-origin session sync
      const channel = supabase.channel(`auth-sync:${loginSyncId}`, { config: { broadcast: { self: true } } });
      
      channel.on('broadcast', { event: 'session_tokens' }, async (payload) => {
        try {
          console.debug('[Auth] received session_tokens broadcast', payload);
          const { access_token, refresh_token } = (payload as any)?.payload || {};
          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
            console.debug('[Auth] setSession result', { hasSession: !!data?.session, error: !!error });
            if (!error && data?.session) {
              setCheckingLogin(false);
              navigate('/chat');
            }
          }
        } catch (err) {
          console.error('[Auth] setSession failed', err);
        }
      });
      
      channel.subscribe((status) => {
        console.debug('[Auth] Realtime subscribe status', status);
      });

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/chat?login_state=${loginSyncId}`,
        },
      });

      if (error) throw error;

      toast.success("Check your email!", {
        description: "We sent you a login link. Click it to sign in.",
      });
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
          checkingLogin={checkingLogin}
        />
      </div>
    </div>
  );
};

export default Auth;
