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

    // Poll as a safety net in case storage event doesn't fire
    const interval = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.debug('[Auth] poll getSession', { hasSession: !!session });
        if (session) {
          clearInterval(interval);
          navigate('/chat');
        }
      });
    }, 1000);

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
      sessionStorage.setItem('loginSyncId', loginSyncId);
      console.debug('[Auth] generated loginSyncId', loginSyncId);

      // Subscribe to a Realtime channel waiting for the new tab to signal success
      const channel = supabase.channel(`auth-sync:${loginSyncId}`, { config: { broadcast: { self: true } } });
      channel.on('broadcast', { event: 'signed_in' }, (payload) => {
        console.debug('[Auth] received Realtime broadcast signed_in', payload);
        navigate('/chat');
      });
      channel.subscribe((status) => console.debug('[Auth] Realtime subscribe status', status));

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/chat?login_state=${loginSyncId}`,
        },
      });

      if (error) throw error;

      setCodeSent(true);
      toast({
        title: "Check your email!",
        description: "Click the magic link to sign in. This window will automatically log you in.",
      });
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
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setCodeSent(false)}
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
