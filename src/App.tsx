import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import MentoradosPage from "./pages/MentoradosPage";
import MentoradoDetail from "./pages/MentoradoDetail";
import MentoresPage from "./pages/MentoresPage";
import EncontrosPage from "./pages/EncontrosPage";
import CalendarioPage from "./pages/CalendarioPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
