import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Zap, Brain, Users, FileText, Code2, Search, Filter, Sparkles } from "lucide-react";
import TutorialCard from "@/components/TutorialCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Certificate from "@/components/Certificate";
import { useProgress } from "@/hooks/useProgress";

const tutorials = [
  {
    id: 1,
    title: "Getting Started with SAP BTP Trial",
    description: "Learn how to set up your SAP BTP trial account and provision AI services.",
    difficulty: "Beginner" as const,
    duration: "15 min",
    icon: BookOpen,
    color: "from-blue-500 to-blue-600",
    tags: ["SAP BTP"],
  },
  {
    id: 2,
    title: "Exploring the Generative AI Hub Playground",
    description: "Discover LLMs and craft effective prompts using the interactive playground.",
    difficulty: "Beginner" as const,
    duration: "20 min",
    icon: Zap,
    color: "from-cyan-500 to-cyan-600",
    tags: ["SAP BTP"],
  },
  {
    id: 3,
    title: "Building a RAG Solution with SAP BTP",
    description: "Create a Retrieval-Augmented Generation system for context-aware answers.",
    difficulty: "Intermediate" as const,
    duration: "45 min",
    icon: Brain,
    color: "from-indigo-500 to-indigo-600",
    tags: ["SAP BTP"],
  },
  {
    id: 4,
    title: "Creating AI Agents with Joule Studio",
    description: "Build intelligent agents that perform multi-step tasks autonomously.",
    difficulty: "Intermediate" as const,
    duration: "50 min",
    icon: Users,
    color: "from-blue-500 to-blue-600",
    tags: ["SAP BTP"],
  },
  {
    id: 5,
    title: "Automating Document Processing",
    description: "Use SAP Document AI to extract and classify information automatically.",
    difficulty: "Intermediate" as const,
    duration: "40 min",
    icon: FileText,
    color: "from-cyan-500 to-cyan-600",
    tags: ["SAP BTP"],
  },
  {
    id: 6,
    title: "Advanced Topics - Custom AI Models",
    description: "Build and deploy custom machine learning models on SAP BTP.",
    difficulty: "Advanced" as const,
    duration: "60 min",
    icon: Code2,
    color: "from-indigo-500 to-indigo-600",
    tags: ["SAP BTP"],
  },
];

export default function Tutorials() {
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const { progress } = useProgress();

  const filteredTutorials = tutorials.filter((tutorial) => {
    const matchesSearch = tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tutorial.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || tutorial.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Section - Blue Themed */}
      <div className="bg-[#001A33] border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>
        
        <div className="container py-16 md:py-24 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 max-w-6xl mx-auto">
            <div className="space-y-4 max-w-2xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider"
              >
                <Sparkles className="w-3 h-3" />
                <span>Hands-on Learning</span>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-bold tracking-tight text-white"
              >
                Browse <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Tutorials</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-slate-400 leading-relaxed"
              >
                Explore our comprehensive collection of hands-on guides for SAP BTP AI. Master everything from setup to advanced custom models.
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#00264D] rounded-2xl p-6 text-white shadow-2xl border border-white/5 min-w-[240px]"
            >
              <Certificate 
                completedCount={progress.completedTutorials.length} 
                totalCount={tutorials.length} 
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Filters Section - Blue Themed */}
      <div className="container py-8 -mt-10 relative z-10">
        <div className="bg-[#00264D] rounded-2xl shadow-2xl border border-white/10 p-4 md:p-6 max-w-5xl mx-auto backdrop-blur-xl">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by title or description..."
                className="pl-12 py-6 bg-[#001A33] border-white/10 rounded-xl focus:ring-blue-500 text-white placeholder:text-slate-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <div className="relative w-full md:w-[200px]">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 z-10 pointer-events-none" />
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="pl-10 py-6 bg-[#001A33] border-white/10 rounded-xl text-white">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#00264D] border-white/10 text-white">
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section - Light Blue Background */}
      <div className="container py-12 md:py-20 bg-[#E0F2FE] border-y border-blue-100 max-w-full">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTutorials.map((tutorial, index) => (
              <TutorialCard key={tutorial.id} {...tutorial} index={index} />
            ))}
          </div>

          {filteredTutorials.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 bg-[#00264D] rounded-3xl border border-dashed border-white/10"
            >
              <div className="inline-flex p-4 rounded-full bg-[#001A33] text-slate-400 mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">No tutorials found</h3>
              <p className="text-slate-400">Try adjusting your search or filters to find what you're looking for.</p>
              <Button 
                variant="link" 
                className="mt-4 text-blue-400 hover:text-blue-300"
                onClick={() => {
                  setSearchQuery("");
                  setDifficultyFilter("all");
                }}
              >
                Clear all filters
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
