import { Button } from "@/components/ui/button";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

interface ComingSoonProps {
  error?: Error;
  resetError?: () => void;
  isDevelopment?: boolean;
}

export default function ComingSoon({ error, resetError, isDevelopment = false }: ComingSoonProps) {
  const [, navigate] = useLocation();

  const handleGoHome = () => {
    // FIX: Navigate to the Base URL instead of the domain root
    // import.meta.env.BASE_URL will be "/learning-hub/" on GitHub
    navigate(import.meta.env.BASE_URL || "/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* ... Background and Content remain same ... */}
      
      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleGoHome} // Use the fixed handler
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
        {/* ... Rest of the component ... */}
      </div>
    </div>
  );
}