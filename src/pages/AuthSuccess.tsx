import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2 } from "lucide-react";
import { FieldDescription, FieldGroup } from "@/components/ui/field";

const AuthSuccess = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const loginSyncId = searchParams.get('login_state');
    
    // Get the session and broadcast it for cross-device sync
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && loginSyncId) {
        console.debug('[AuthSuccess] Broadcasting session tokens', { loginSyncId });
        
        // Broadcast tokens to CheckEmail page waiting on other device
        const channel = supabase.channel(`auth-sync:${loginSyncId}`, { 
          config: { broadcast: { self: true } } 
        });
        
        channel.subscribe((status: string) => {
          console.debug('[AuthSuccess] Realtime subscribe status', status);
          
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
      }
    });
  }, [searchParams]);

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
                  <CheckCircle2 className="size-6 text-green-600" />
                </div>
                <span className="sr-only">Success</span>
              </a>
              <h1 className="text-xl font-bold">Successfully Logged In!</h1>
              <FieldDescription>
                You can now return to the app.
              </FieldDescription>
            </div>
          </FieldGroup>
        </div>
      </div>
    </div>
  );
};

export default AuthSuccess;
