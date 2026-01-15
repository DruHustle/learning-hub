import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Share2, Printer, CheckCircle, GraduationCap, BookOpen, Sparkles, ChevronRight } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useProgress } from "@/hooks/useProgress";
import Mermaid from "@/components/Mermaid";
import Quiz from "@/components/Quiz";
import CodeBlock from "@/components/CodeBlock";
import { quizzes } from "@/data/quizzes";

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
        const response = await fetch(`TUTORIALS.md`);
        
        if (!response.ok) throw new Error("Failed to load tutorial content");

        const text = await response.text();
        const tutorialRegex = new RegExp(`## Tutorial ${tutorialId}:(.*?)(?=## Tutorial \\d+:|---|$)`, "gs");
        const match = tutorialRegex.exec(text);

        if (match && match[0]) {
          setContent(match[0]);
          const words = match[0].trim().split(/\s+/).length;
          setReadingTime(Math.ceil(words / 200));
        } else {
          setError("Tutorial not found");
        }
      } catch (err) {
        console.error(err);
        setContent(`# Tutorial ${tutorialId}\n\nContent is loading from the repository... \n\nIf you see this, please ensure TUTORIALS.md is in the public folder.`);
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
          <p className="text-slate-400 font-medium">Loading tutorial content...</p>
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

      {/* Header Section - Blue Themed */}
      <div className="bg-[#001A33] text-white border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>
        
        <div className="container py-12 md:py-16 relative z-10">
          <div className="max-w-4xl mx-auto space-y-6">
            <Link href="/tutorials">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/5 -ml-2 gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Tutorials
              </Button>
            </Link>
            
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-blue-600 text-white border-none px-3 py-1">
                  Tutorial {tutorialId}
                </Badge>
                {completed && (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Completed
                  </Badge>
                )}
                <div className="flex items-center gap-1.5 text-slate-400 text-sm ml-auto">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>{readingTime} min read</span>
                </div>
              </div>
              
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-white">
                {content.split('\n')[0].replace('## ', '')}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-1 gap-12">
            <article className="prose prose-invert lg:prose-lg max-w-none prose-headings:text-white prose-p:text-slate-400 prose-p:leading-relaxed prose-p:text-justify prose-strong:text-white prose-code:text-blue-400 prose-pre:bg-[#001A33] prose-pre:border prose-pre:border-white/5 prose-img:rounded-2xl prose-img:shadow-2xl">
              <Streamdown
                components={{
                  code: ({ className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || "");
                    if (match && match[1] === "mermaid") {
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
                {content.split('\n').slice(1).join('\n')}
              </Streamdown>
            </article>

            {/* Quiz Section - Blue Themed */}
            {quizQuestions && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-16"
              >
                {!showQuiz && !completed ? (
                  <div className="p-10 bg-[#00264D] rounded-3xl border border-white/5 text-center space-y-6 shadow-2xl">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                      <GraduationCap className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white">Knowledge Check</h3>
                      <p className="text-slate-400 max-w-md mx-auto">
                        Ready to verify your understanding? Take a quick quiz to complete this tutorial.
                      </p>
                    </div>
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-6 rounded-xl text-lg font-bold shadow-lg shadow-blue-600/20" onClick={() => setShowQuiz(true)}>
                      Start Quiz
                    </Button>
                  </div>
                ) : showQuiz ? (
                  <div className="bg-[#00264D] rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-600 text-white">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-white">Tutorial Quiz</h3>
                    </div>
                    <Quiz 
                      tutorialId={id} 
                      questions={quizQuestions} 
                      onComplete={() => {
                        if (!isAuthenticated) {
                          toast.info("Please sign in to save your quiz results and track progress");
                          navigate("/login");
                          return;
                        }
                        markAsCompleted(id);
                        toast.success("Tutorial completed! Great job!");
                        setShowQuiz(false);
                      }} 
                    />
                  </div>
                ) : (
                  <div className="p-10 bg-green-500/10 rounded-3xl border border-green-500/20 text-center space-y-4 shadow-2xl">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 text-white">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Tutorial Completed!</h3>
                    <p className="text-slate-400">You've mastered the concepts in this guide.</p>
                    <Link href="/tutorials">
                      <Button variant="outline" className="mt-4 border-green-500/20 text-green-400 hover:bg-green-500/10">
                        Explore More Tutorials
                      </Button>
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            {/* Footer Actions - Blue Themed */}
            <div className="mt-20 pt-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={handleShare} className="rounded-xl gap-2 border-white/10 text-white hover:bg-white/5">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button variant="outline" size="lg" onClick={() => window.print()} className="rounded-xl gap-2 border-white/10 text-white hover:bg-white/5">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                {!completed && (
                  <Button 
                    size="lg"
                    onClick={() => {
                      if (!isAuthenticated) {
                        toast.info("Please sign in to track your progress");
                        navigate("/login");
                        return;
                      }
                      markAsCompleted(id);
                      toast.success("Tutorial marked as completed!");
                    }}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Complete
                  </Button>
                )}
                <Link href="/tutorials" className="flex-1 sm:flex-none">
                  <Button size="lg" variant="outline" className="w-full rounded-xl gap-2 border-white/10 text-white hover:bg-white/5">
                    Next Tutorial
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
