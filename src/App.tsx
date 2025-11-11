import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { applyBaseColor, getStoredBaseColor } from "@/lib/colors";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CheckEmail from "./pages/CheckEmail";
import Chat from "./pages/Chat";
import Conversation from "./pages/Conversation";
import Profile from "./pages/Profile";
import SocialWall from "./pages/SocialWall";
import SinglePost from "./pages/SinglePost";
import NotFound from "./pages/NotFound";
import { AuthProvider, Protected } from "@/components/auth-provider";

const queryClient = new QueryClient();

function AppContent() {
  const { theme } = useTheme();

  // Re-apply colors whenever theme changes
  useEffect(() => {
    const storedColor = getStoredBaseColor();
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    applyBaseColor(storedColor, isDark);
  }, [theme]);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/chat" element={<Protected><Chat /></Protected>} />
          <Route path="/c/:chatId" element={<Protected><Conversation /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/social-wall" element={<Protected><SocialWall /></Protected>} />
          <Route path="/social-wall/post/:postId" element={<Protected><SinglePost /></Protected>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
