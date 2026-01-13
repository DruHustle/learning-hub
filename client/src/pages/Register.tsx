import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrainCircuit, Lock, Mail, User, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Register() {
  const { register, login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Attempt to register the user
      const result = await register(email, password, name);
      
      if (result.success) {
        toast.success("Account created successfully!");
        
        // 2. Automatically log them in after registration
        const loginResult = await login(email, password);
        if (loginResult.success) {
          navigate("/"); // 3. Redirect to home page
        }
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch (error) {
      toast.error("An error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/images/login-bg.png')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      
      <Card className="w-full max-w-md glass-panel border-white/10 relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded bg-primary flex items-center justify-center shadow-[0_0_20px_var(--primary)]">
              <BrainCircuit className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display font-bold">Create Account</CardTitle>
          <CardDescription>
            Log in the Learning Hub to track your progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-background/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background/50"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background/50"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary"
            >
              {isLoading ? "Creating account..." : "Register"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <button
              onClick={() => navigate('/login')}
              className="text-muted-foreground hover:text-primary flex items-center justify-center gap-2 w-full"
            >
              <ArrowLeft className="w-4 h-4" /> Already have an account? Sign In
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}