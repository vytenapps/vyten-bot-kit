import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GalleryVerticalEnd } from "lucide-react";
import { FieldDescription, FieldGroup } from "@/components/ui/field";

const CheckEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "your email";
  const loginSyncId = location.state?.loginSyncId;

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/chat");
      }
    });

    // Subscribe to Realtime channel for cross-origin session sync
    let channel: any = null;
    if (loginSyncId) {
      channel = supabase.channel(`auth-sync:${loginSyncId}`, { config: { broadcast: { self: true } } });
      
      channel.on('broadcast', { event: 'session_tokens' }, async (payload: any) => {
        try {
          console.debug('[CheckEmail] received session_tokens broadcast', payload);
          const { access_token, refresh_token } = payload?.payload || {};
          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
            console.debug('[CheckEmail] setSession result', { hasSession: !!data?.session, error: !!error });
            if (!error && data?.session) {
              navigate('/chat');
            }
          }
        } catch (err) {
          console.error('[CheckEmail] setSession failed', err);
        }
      });
      
      channel.subscribe((status: string) => {
        console.debug('[CheckEmail] Realtime subscribe status', status);
      });
    }

    // Listen for auth state changes - this will trigger when user clicks magic link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.debug('[CheckEmail] Auth state change:', event);
      if (event === "SIGNED_IN" && session) {
        console.debug('[CheckEmail] User signed in, navigating to chat');
        navigate("/chat");
      }
    });

    return () => {
      subscription.unsubscribe();
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [navigate, loginSyncId]);

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <a
                href="#"
                className="flex flex-col items-center gap-2 font-medium"
              >
                <div className="flex size-8 items-center justify-center rounded-md">
                  <GalleryVerticalEnd className="size-6" />
                </div>
                <span className="sr-only">Acme Inc.</span>
              </a>
              <h1 className="text-xl font-bold">Check your email</h1>
              <FieldDescription>
                We sent a sign-in link to <strong>{email}</strong>
              </FieldDescription>
              <FieldDescription className="mt-2">
                Click the link in your email to sign in. This page will automatically log you in once you click the link.
              </FieldDescription>
            </div>
          </FieldGroup>
          <FieldDescription className="px-6 text-center">
            By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
            and <a href="#">Privacy Policy</a>.
          </FieldDescription>
        </div>
      </div>
    </div>
  );
};

export default CheckEmail;
