import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    console.debug('[Auth] mount');
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.debug('[Auth] initial getSession', { hasSession: !!session });
      if (session) {
        navigate("/chat");
      }
    });

    // Listen for auth state changes in this tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.debug('[Auth] onAuthStateChange', { event, hasSession: !!session });
      if (event === "SIGNED_IN" && session) {
        navigate("/chat");
      }
    });

    // Listen for storage changes from other tabs (cross-tab session sync)
    const handleStorageChange = (e: StorageEvent) => {
      const key = e.key || '';
      const looksLikeSupabaseAuth = key.startsWith('sb-') && key.endsWith('-auth-token');
      console.debug('[Auth] storage event', { key, looksLikeSupabaseAuth, newValue: !!e.newValue });
      if (looksLikeSupabaseAuth && e.newValue) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          console.debug('[Auth] storage-triggered getSession', { hasSession: !!session });
          if (session) {
            navigate("/chat");
          }
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Aggressive polling to detect session (checks every 2 seconds)
    const interval = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const now = new Date();
        setLastCheckTime(now);
        console.debug('[Auth] poll getSession', { 
          hasSession: !!session, 
          timestamp: now.toISOString() 
        });
        if (session) {
          console.debug('[Auth] Session detected via polling! Navigating to /chat');
          clearInterval(interval);
          setCheckingLogin(false);
          navigate('/chat');
        }
      });
    }, 2000); // Check every 2 seconds

    // Recheck session when window gains focus (in case user logged in via another tab)
    const handleFocus = () => {
      console.debug('[Auth] window focus - rechecking session');
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.debug('[Auth] focus-triggered getSession', { hasSession: !!session });
        if (session) {
          navigate('/chat');
        }
      });
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [navigate]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
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

      setCodeSent(true);
      setCheckingLogin(true);
      setLastCheckTime(new Date());
      
      toast({
        title: "Check your email!",
        description: "Click the magic link to sign in. This window will automatically log you in.",
      });

      // Set 5 minute timeout
      setTimeout(() => {
        setCheckingLogin(false);
      }, 5 * 60 * 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Welcome</h1>
          <p className="mt-2 text-muted-foreground">Sign in to start chatting</p>
        </div>

        {!codeSent ? (
          <form onSubmit={handleSendMagicLink} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send magic link
            </Button>
          </form>
        ) : (
          <div className="space-y-6 text-center">
            <div className="rounded-lg border bg-accent/50 p-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                We sent a magic link to:
              </p>
              <p className="font-medium">{email}</p>
              <p className="text-sm text-muted-foreground">
                Click the link in your email. This window will automatically sign you in!
              </p>
              {checkingLogin && (
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking for login...</span>
                  </div>
                  {lastCheckTime && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last checked: {lastCheckTime.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setCodeSent(false);
                setCheckingLogin(false);
              }}
            >
              Use different email
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
