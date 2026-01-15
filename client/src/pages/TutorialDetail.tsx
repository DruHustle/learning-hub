import { useEffect, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Share2, Printer, CheckCircle, GraduationCap, Sparkles, ChevronRight, AlertCircle } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useProgress } from "@/hooks/useProgress";
import Mermaid from "@/components/Mermaid";
import Quiz from "@/components/Quiz";
import CodeBlock from "@/components/CodeBlock";
import { quizzes } from "@/data/quizzes";

// Use an actual auth hook if available, or this fallback
const useAuth = () => ({ isAuthenticated: true }); 

export default function TutorialDetail() {
  const [match, params] = useRoute("/tutorials/:id");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const { markAsCompleted, isCompleted } = useProgress();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const tutorialId = params?.id;
  const id = tutorialId ? parseInt(tutorialId) : 0;
  const completed = isCompleted(id);
  const quizQuestions = quizzes[id as keyof typeof quizzes];

  useEffect(() => {
    async function fetchTutorial() {
      if (!tutorialId) return;

      try {
        setLoading(true);
        setError(null);

        // FIX: Handle the GitHub Pages subfolder pathing
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        const response = await fetch(`${base}/TUTORIALS.md`);
        
        if (!response.ok) {
          throw new Error(`TUTORIALS.md not found (Status: ${response.status}). Check if file is in public folder.`);
        }

        const text = await response.text();

        // FIX: Resilient Regex to find the tutorial section
        // Matches "## Tutorial X:" followed by any characters until the next tutorial or divider
        const tutorialRegex = new RegExp(
          `## Tutorial ${tutorialId}[:\\s\\-]*([\\s\\S]*?)(?=\\n## Tutorial \\d+|\\n---|$)`, 
          "i"
        );
        
        const matchResult = text.match(tutorialRegex);

        if (matchResult && matchResult[0]) {
          setContent(matchResult[0].trim());
          const words = matchResult[0].trim().split(/\s+/).length;
          setReadingTime(Math.ceil(words / 200));
        } else {
          setError(`Could not find a section starting with "## Tutorial ${tutorialId}"`);
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load tutorial.");
      } finally {
        setLoading(false);
      }
    }

    fetchTutorial();
    window.scrollTo(0, 0);
  }, [tutorialId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#001A33]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          <p className="text-slate-400 font-medium">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#001A33] text-white p-6">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold">Error Loading Tutorial</h2>
          <p className="text-slate-400">{error}</p>
          <Link href="/tutorials">
            <Button variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/10">
              Go Back
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-white/5">
        <motion.div 
          className="h-full bg-blue-400"
          initial={{ width: 0 }}
          animate={{ width: completed ? "100%" : "30%" }}
        />
      </div>

      {/* Header Section */}
      <div className="bg-[#001A33] text-white border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>
        
        <div className="container py-12 md:py-16 relative z-10">
          <div className="max-w-4xl mx-auto space-y-6">
            <Link href="/tutorials">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/5 -ml-2 gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Tutorials
              </Button>
            </Link>
            
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-blue-600 text-white border-none px-3 py-1">
                  Tutorial {tutorialId}
                </Badge>
                {completed && (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Completed
                  </Badge>
                )}
                <div className="flex items-center gap-1.5 text-slate-400 text-sm ml-auto">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>{readingTime} min read</span>
                </div>
              </div>
              
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                {content.split('\n')[0].replace(/^##\s+Tutorial\s+\d+:\s*/i, '').trim() || `Tutorial ${tutorialId}`}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <article className="prose prose-invert lg:prose-lg max-w-none prose-headings:text-white prose-p:text-slate-400 prose-code:text-blue-400">
            <Streamdown
              components={{
                code: ({ className, children, ...props }: any) => {
                  const isMermaid = /language-mermaid/.test(className || "");
                  if (isMermaid) {
                    return <Mermaid chart={String(children).replace(/\n$/, "")} />;
                  }
                  return (
                    <CodeBlock className={className} {...props}>
                      {children}
                    </CodeBlock>
                  );
                },
              }}
            >
              {/* Skip the first line (the title) to avoid double headings */}
              {content.split('\n').slice(1).join('\n')}
            </Streamdown>
          </article>

          {/* Quiz Section */}
          {quizQuestions && (
            <div className="mt-16">
              {!showQuiz && !completed ? (
                <div className="p-10 bg-[#00264D] rounded-3xl border border-white/5 text-center space-y-6">
                  <GraduationCap className="w-12 h-12 text-blue-400 mx-auto" />
                  <h3 className="text-2xl font-bold text-white">Knowledge Check</h3>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowQuiz(true)}>
                    Start Quiz
                  </Button>
                </div>
              ) : showQuiz ? (
                <div className="bg-[#00264D] rounded-3xl border border-white/10 overflow-hidden p-6">
                  <Quiz 
                    tutorialId={id} 
                    questions={quizQuestions} 
                    onComplete={() => {
                      markAsCompleted(id);
                      toast.success("Great job! Tutorial completed.");
                      setShowQuiz(false);
                    }} 
                  />
                </div>
              ) : (
                <div className="p-10 bg-green-500/10 rounded-3xl border border-green-500/20 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white">Mastered!</h3>
                </div>
              )}
            </div>
          )}

          {/* Bottom Navigation */}
          <div className="mt-20 pt-10 border-t border-white/5 flex justify-between items-center">
            <Button variant="outline" onClick={handleShare} className="gap-2 border-white/10 text-white">
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Link href="/tutorials">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                Next Tutorial <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}