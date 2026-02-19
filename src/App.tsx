import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import MentoradosPage from "./pages/MentoradosPage";
import MentoradoDetail from "./pages/MentoradoDetail";
import MentoresPage from "./pages/MentoresPage";
import EncontrosPage from "./pages/EncontrosPage";
import CalendarioPage from "./pages/CalendarioPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl animate-pulse">
          M
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/mentorados" element={<MentoradosPage />} />
        <Route path="/mentorados/:id" element={<MentoradoDetail />} />
        <Route path="/mentores" element={<MentoresPage />} />
        <Route path="/encontros" element={<EncontrosPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
