import { motion } from "framer-motion";
import { BarChart3, Users, BookOpen, TrendingUp, Activity, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Analytics() {
  const metrics = [
    {
      title: "User Engagement",
      value: "High",
      description: "Users are actively exploring tutorials and using the playground.",
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-400/10"
    },
    {
      title: "Completion Rate",
      value: "Steady Growth",
      description: "More users are finishing the advanced RAG and Agent tutorials this week.",
      icon: BookOpen,
      color: "text-cyan-400",
      bg: "bg-cyan-400/10"
    },
    {
      title: "Platform Stability",
      value: "Excellent",
      description: "The AI Hub services are responding within expected latency parameters.",
      icon: Activity,
      color: "text-green-400",
      bg: "bg-green-400/10"
    },
    {
      title: "Security Status",
      value: "Secure",
      description: "All authentication attempts are being monitored and validated correctly.",
      icon: ShieldCheck,
      color: "text-indigo-400",
      bg: "bg-indigo-400/10"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="bg-[#001A33] border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>
        
        <div className="container py-16 relative z-10">
          <div className="max-w-4xl mx-auto space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 text-blue-400 font-bold uppercase tracking-wider text-sm"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Platform Insights</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              Verbal <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Analytics</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-400 max-w-2xl"
            >
              A human-readable overview of how the SAP BTP AI Hub is performing and how users are interacting with the content.
            </motion.p>
          </div>
        </div>
      </div>

      <div className="container mt-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {metrics.map((metric, idx) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
              >
                <Card className="bg-[#00264D] border-white/5 hover:border-blue-500/30 transition-all h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium text-slate-300">
                      {metric.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${metric.bg} ${metric.color}`}>
                      <metric.icon className="w-5 h-5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-white mb-2">{metric.value}</div>
                    <p className="text-slate-400 leading-relaxed">
                      {metric.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/20"
          >
            <div className="flex items-start gap-6">
              <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Weekly Summary</h3>
                <p className="text-slate-300 leading-relaxed">
                  The platform has seen a 25% increase in unique visitors this week. The most popular tutorial remains "Building a RAG Solution with SAP BTP", indicating a strong interest in practical AI implementation. User feedback suggests that the interactive playground is a key differentiator for the learning experience.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
