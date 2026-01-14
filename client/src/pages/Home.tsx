import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BookOpen, Code2, Zap, Brain, FileText, Users, Sparkles, ShieldCheck, Database } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const tutorials = [
    {
      id: 1,
      title: "Getting Started with SAP BTP Trial",
      description: "Learn how to set up your SAP BTP trial account and provision AI services.",
      difficulty: "Beginner",
      duration: "15 min",
      icon: BookOpen,
      color: "from-blue-500/20 to-blue-600/20 text-blue-400",
    },
    {
      id: 2,
      title: "Exploring the Generative AI Hub Playground",
      description: "Discover LLMs and craft effective prompts using the interactive playground.",
      difficulty: "Beginner",
      duration: "20 min",
      icon: Zap,
      color: "from-cyan-500/20 to-cyan-600/20 text-cyan-400",
    },
    {
      id: 3,
      title: "Building a RAG Solution with SAP BTP",
      description: "Create a Retrieval-Augmented Generation system for context-aware answers.",
      difficulty: "Intermediate",
      duration: "45 min",
      icon: Brain,
      color: "from-indigo-500/20 to-indigo-600/20 text-indigo-400",
    },
    {
      id: 4,
      title: "Creating AI Agents with Joule Studio",
      description: "Build intelligent agents that perform multi-step tasks autonomously.",
      difficulty: "Intermediate",
      duration: "50 min",
      icon: Users,
      color: "from-blue-500/20 to-blue-600/20 text-blue-400",
    },
    {
      id: 5,
      title: "Automating Document Processing",
      description: "Use SAP Document AI to extract and classify information automatically.",
      difficulty: "Intermediate",
      duration: "40 min",
      icon: FileText,
      color: "from-cyan-500/20 to-cyan-600/20 text-cyan-400",
    },
    {
      id: 6,
      title: "Advanced Topics - Custom AI Models",
      description: "Build and deploy custom machine learning models on SAP BTP.",
      difficulty: "Advanced",
      duration: "60 min",
      icon: Code2,
      color: "from-indigo-500/20 to-indigo-600/20 text-indigo-400",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section - Consistent with Portfolio */}
      <section className="relative pt-24 pb-24 overflow-hidden bg-[#001A33] text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute -bottom-[40%] -right-[10%] w-[70%] h-[70%] rounded-full bg-cyan-600/20 blur-[120px]" />
        </div>
        
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Enterprise AI Education Platform</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Master AI Solutions on <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Learning Hub</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Interactive learning hub for designing, prototyping, and deploying real-world AI solutions using a modern multi-tool ecosystem.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                onClick={() => document.getElementById("tutorials")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore Tutorials <ArrowRight className="w-5 h-5" />
              </Button>
              <Link href="/playground">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 text-white hover:bg-slate-800 px-8 py-6 text-lg rounded-xl"
                >
                  Try Playground
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition - Condensed & Blue Themed */}
      <section className="py-16 bg-[#00264D]">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Multi-Tool Ecosystem", desc: "Master a diverse stack including Python, OpenAI, Azure AI, and SAP BTP AI Core.", icon: Sparkles, color: "bg-blue-500/10 text-blue-400" },
              { title: "Enterprise AI/ML", desc: "Learn to build production-grade machine learning solutions with NVIDIA CUDA and modern frameworks.", icon: ShieldCheck, color: "bg-cyan-500/10 text-cyan-400" },
              { title: "Real-World Prototyping", desc: "Go beyond theory with hands-on labs for designing and deploying contextual AI solutions.", icon: Database, color: "bg-indigo-500/10 text-indigo-400" },
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group">
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tutorials Section - Condensed Grid & Blue Themed */}
      <section id="tutorials" className="py-16 bg-[#E0F2FE] border-y border-blue-100">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div className="max-w-2xl">
<h2 className="text-3xl font-bold text-slate-900 mb-2">Hands-On Tutorials</h2>
	              <p className="text-slate-700">Practical guides covering everything from basics to advanced topics.</p>
            </div>
            <Button variant="ghost" className="text-blue-400 hover:text-blue-300 font-bold gap-2" asChild>
              <Link href="/tutorials">View all tutorials <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((tutorial) => {
              const Icon = tutorial.icon;
              return (
<Card key={tutorial.id} className="group bg-white border-blue-100 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col">
	                  <CardContent className="p-6 flex flex-col h-full">
	                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tutorial.color.split(' ').slice(0,2).join(' ')} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
	                      <Icon className={`w-5 h-5 ${tutorial.color.split(' ').pop()}`} />
	                    </div>
	                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{tutorial.title}</h3>
	                    <p className="text-slate-600 text-xs leading-relaxed mb-4 flex-grow">{tutorial.description}</p>
	                    
	                    <div className="flex items-center justify-between pt-4 border-t border-blue-50">
	                      <div className="flex gap-2">
	                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">{tutorial.difficulty}</span>
	                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase">{tutorial.duration}</span>
	                      </div>
	                      <Button asChild variant="ghost" size="sm" className="text-blue-600 hover:text-blue-500 font-bold p-0">
	                        <Link href={`/tutorials/${tutorial.id}`}>Start <ArrowRight className="ml-1 w-4 h-4" /></Link>
	                      </Button>
	                    </div>
	                  </CardContent>
	                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Resources Section - Condensed & Blue Themed */}
      <section id="resources" className="py-16 bg-[#00264D]">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Resources & Links</h2>
            <p className="text-slate-400">Official documentation and community resources.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { title: "SAP BTP Documentation", desc: "Official guides for SAP Business Technology Platform.", link: "https://help.sap.com/docs/btp" },
              { title: "SAP AI Core", desc: "Technical documentation for SAP AI Core services.", link: "https://help.sap.com/docs/sap-ai-core" },
            ].map((res, i) => (
              <a key={i} href={res.link} target="_blank" rel="noreferrer" className="p-6 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all group">
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400">{res.title}</h3>
                <p className="text-sm text-slate-400">{res.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
