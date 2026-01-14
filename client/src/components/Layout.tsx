import { Link, useLocation } from "wouter";
import { 
  Brain, 
  Github, 
  Menu, 
  X, 
  ArrowLeft, 
  GraduationCap, 
  LogIn, 
  LogOut, 
  User as UserIcon 
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
// ThemeToggle removed
import { SearchDialog } from "./SearchDialog";
import { useAuth } from "@/contexts/AuthContext"; // Ensure this path is correct

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const [showPortfolioButton, setShowPortfolioButton] = useState(false);
  
  // Use the Auth Context
  const { isAuthenticated, logout, user } = useAuth();

  // Check if user came from portfolio
  useEffect(() => {
    const referrer = document.referrer;
    const fromPortfolio = referrer.includes('druhustle.github.io/portifolio') || 
                          referrer.includes('portfolio') ||
                          sessionStorage.getItem('fromPortfolio') === 'true';
    
    if (fromPortfolio) {
      sessionStorage.setItem('fromPortfolio', 'true');
      setShowPortfolioButton(true);
    }
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/tutorials", label: "Tutorials" },
    { href: "/playground", label: "Playground" },
    { href: "/architecture", label: "Architecture" },
    { href: "/analytics", label: "Analytics" },
    { href: "/about", label: "About" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
      {/* Navigation Bar - Blue Themed */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#001A33]/90 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 transition-opacity hover:opacity-80 cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_20px_var(--primary)]">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white hidden sm:inline">Learning Hub</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {showPortfolioButton && (
              <a 
                href="https://druhustle.github.io/portifolio/" 
                className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors mr-4 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Portfolio
              </a>
            )}
            <div className="flex items-center gap-6 mr-4">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div
                    className={`text-sm font-medium transition-colors hover:text-blue-400 cursor-pointer ${
                      location === link.href || (link.href !== "/" && location.startsWith(link.href))
                        ? "text-blue-400"
                        : "text-slate-400"
                    }`}
                  >
                    {link.label}
                  </div>
                </Link>
              ))}
            </div>
            
            <SearchDialog />
            <div className="h-6 w-px bg-white/10 mx-2" />
{/* ThemeToggle removed */}

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3 ml-2">
                <div className="flex items-center gap-2 text-slate-300 text-sm font-medium bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  <UserIcon className="w-4 h-4 text-blue-400" />
                  <span className="hidden lg:inline">{user?.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => logout()}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xl:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5 gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-500 gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

{/* GitHub icon removed */}
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <SearchDialog />
{/* ThemeToggle removed */}
            <button
              className="p-2 text-slate-400 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-white/5 bg-[#001A33]"
          >
            <div className="container py-4 flex flex-col gap-4">
              {/* Mobile Auth Section */}
              {isAuthenticated ? (
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-blue-400 text-sm font-bold flex items-center gap-2">
                    <UserIcon className="w-4 h-4" /> {user?.name}
                  </span>
                  <button 
                    onClick={() => logout()} 
                    className="text-red-400 text-sm flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              ) : (
                <Link href="/login">
                  <div className="flex items-center gap-2 text-blue-400 font-bold py-2 border-b border-white/5 cursor-pointer">
                    <LogIn className="w-4 h-4" /> Sign In / Create Account
                  </div>
                </Link>
              )}

              {showPortfolioButton && (
                <a 
                  href="https://druhustle.github.io/portifolio/" 
                  className="flex items-center gap-2 text-sm font-bold text-blue-400 py-2 border-b border-white/5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Portfolio
                </a>
              )}
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div
                    className={`text-sm font-medium py-2 transition-colors cursor-pointer ${
                      location === link.href ? "text-blue-400" : "text-slate-400"
                    }`}
                  >
                    {link.label}
                  </div>
                </Link>
              ))}
{/* GitHub Repository link removed */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer - Blue Themed */}
      <footer className="border-t border-white/5 bg-[#001A33]">
        <div className="container py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-white">SAP BTP AI Hub</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Master AI business solutions on SAP Business Technology Platform.
                Built for developers, by developers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Learn</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/tutorials"><span className="hover:text-blue-400 cursor-pointer">All Tutorials</span></Link></li>
                <li><Link href="/playground"><span className="hover:text-blue-400 cursor-pointer">Interactive Playground</span></Link></li>
                <li><Link href="/architecture"><span className="hover:text-blue-400 cursor-pointer">Architecture Builder</span></Link></li>
                <li><Link href="/analytics"><span className="hover:text-blue-400 cursor-pointer">Verbal Analytics</span></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="https://help.sap.com/docs/btp" target="_blank" rel="noreferrer" className="hover:text-blue-400">SAP BTP Documentation</a></li>
                <li><a href="https://help.sap.com/docs/sap-ai-core" target="_blank" rel="noreferrer" className="hover:text-blue-400">SAP AI Core</a></li>
                <li><a href="https://community.sap.com" target="_blank" rel="noreferrer" className="hover:text-blue-400">SAP Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Connect</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="https://github.com/DruHustle" target="_blank" rel="noreferrer" className="hover:text-blue-400">GitHub</a></li>
                <li><a href="https://x.com/DruHustle" target="_blank" rel="noreferrer" className="hover:text-blue-400">Twitter</a></li>
                <li><a href="https://www.linkedin.com/in/andrew-gotora-72966068" target="_blank" rel="noreferrer" className="hover:text-blue-400">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>© 2026 Learning Hub. Open source educational project.</p>
            <p>Not affiliated with SAP SE.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}