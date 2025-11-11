import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VytenIcon } from "@/components/VytenIcon";
import { CheckCircle2 } from "lucide-react";

const AuthSuccess = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const loginSyncId = searchParams.get('login_state');
    
    if (loginSyncId) {
      // Get session and broadcast tokens for cross-device sync
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          console.debug('[AuthSuccess] Broadcasting session tokens for loginSyncId:', loginSyncId);
          
          const channel = supabase.channel(`auth-sync:${loginSyncId}`);
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              channel.send({
                type: 'broadcast',
                event: 'session_tokens',
                payload: {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token
                }
              });
            }
          });

          // Cleanup after broadcast
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 2000);
        }
      });
    }
  }, [searchParams]);

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <VytenIcon className="h-10 w-10" />
            <h1 className="text-xl font-bold">Vyten</h1>
          </div>

          <div className="flex flex-col gap-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-primary/10 p-3">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Successfully Logged In!
                </h2>
                <p className="text-sm text-muted-foreground">
                  You can now return to the app.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSuccess;
