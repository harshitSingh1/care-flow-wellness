import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import CheckIn from "./pages/CheckIn";
import Plans from "./pages/Plans";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import Strategies from "./pages/Strategies";
import Consultations from "./pages/Consultations";
import Vault from "./pages/Vault";
import DoctorLogin from "./pages/DoctorLogin";
import DoctorWorkbench from "./pages/DoctorWorkbench";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/strategies" element={<Strategies />} />
          <Route path="/consultations" element={<Consultations />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/doctor-login" element={<DoctorLogin />} />
          <Route path="/doctor-workbench" element={<DoctorWorkbench />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;