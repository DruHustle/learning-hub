import { motion } from "framer-motion";
import { Linkedin, Mail, ExternalLink, Award, BookOpen, Code, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function About() {
  const linkedinUrl = "https://www.linkedin.com/in/andrew-gotora-72966068";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Section - Blue Themed */}
      <div className="bg-[#001A33] border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>
        
        <div className="container py-16 md:py-24 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3 h-3" />
              <span>Our Story</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
              About the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Learning Hub</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Interactive learning hub for designing, prototyping, and deploying real-world AI solutions using a modern multi-tool ecosystem.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container py-16 md:py-24 space-y-20">
        {/* Mission Section - Blue Themed */}
        <div className="max-w-4xl mx-auto">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="prose prose-invert lg:prose-lg max-w-none"
          >
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Mission</h2>
            <div className="text-slate-400 leading-relaxed text-justify space-y-6">
              <p>
                The Learning Hub is a comprehensive resource designed to help developers, architects, and business professionals master the art of building AI-powered business solutions. In an era where artificial intelligence is transforming the enterprise landscape, our goal is to provide a structured, accessible, and deeply technical path to proficiency across a diverse technological landscape.
              </p>
              <p>
                Whether you're just starting your AI journey or looking to deepen your expertise, this hub provides hands-on tutorials, best practices, and real-world examples to accelerate your learning. We believe that the best way to learn is by doing, which is why every tutorial is grounded in practical implementation and real-world business scenarios using a modern multi-tool ecosystem.
              </p>
              <p>
                Our curriculum spans a wide range of industry-leading technologies, including <strong>Python</strong>, <strong>OpenAI</strong>, <strong>NVIDIA CUDA</strong>, <strong>Azure AI</strong>, and <strong>SAP BTP AI Core</strong>. We stay at the forefront of AI/ML innovation to ensure you have the most relevant and up-to-date information at your fingertips, enabling you to design, prototype, and deploy production-grade AI solutions.
              </p>
            </div>
          </motion.section>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid sm:grid-cols-3 gap-6 mt-16"
          >
            {[
              { icon: BookOpen, title: "Hands-on", desc: "Step-by-step practical guides" },
              { icon: Code, title: "Ready-to-use", desc: "Production-grade code snippets" },
              { icon: Award, title: "Expertise", desc: "Best practices from the field" },
            ].map((item, i) => (
              <Card key={i} className="bg-[#00264D] border-white/5 shadow-2xl hover:border-blue-500/30 transition-all group">
                <CardContent className="pt-6 text-center space-y-2">
                  <div className="inline-flex p-3 rounded-xl bg-blue-500/10 text-blue-400 mb-2 group-hover:scale-110 transition-transform">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>

        {/* Author Section - Blue Themed */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-[#00264D] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
              {/* LinkedIn Style Profile Picture */}
              <div className="relative flex-shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#001A33] shadow-2xl overflow-hidden">
                  <img 
                    src="/learning-hub/images/author.jpg" 
                    alt="Andrew Gotora" 
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              <div className="flex-1 space-y-6 text-center md:text-left">
                <div className="space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <h3 className="text-3xl font-bold text-white">Andrew Gotora</h3>
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1 w-fit mx-auto md:mx-0">
                      AI & Enterprise Solutions Specialist
                    </Badge>
                  </div>
                  <p className="text-slate-400 font-medium">Helping organizations bridge the gap between AI and Business Value</p>
                </div>
                
                <p className="text-slate-400 leading-relaxed text-justify max-w-2xl">
                  Passionate about bridging the gap between complex enterprise technology and practical business value. With extensive experience across a diverse AI/ML stack, I focus on helping organizations leverage a multi-tool ecosystem to drive innovation and efficiency. I believe in the power of community and continuous learning to shape the future of enterprise software.
                </p>

                <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                  <Button asChild className="bg-[#0077B5] hover:bg-[#006097] text-white gap-2 rounded-xl px-6 py-6 h-auto shadow-lg shadow-[#0077B5]/20">
                    <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-5 h-5" />
                      Connect on LinkedIn
                    </a>
                  </Button>
                  <Button variant="outline" asChild className="gap-2 rounded-xl px-6 py-6 h-auto border-white/10 text-white hover:bg-white/5">
                    <a href="mailto:andrewgotora@yahoo.com">
                      <Mail className="w-5 h-5" />
                      Send a Message
                    </a>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Bottom Collaboration Bar */}
            <div className="bg-[#001A33] p-6 text-center border-t border-white/5">
              <p className="text-slate-400 text-sm">
                Interested in collaborating on SAP BTP AI projects? 
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-bold ml-2 hover:underline inline-flex items-center gap-1">
                  Let's connect <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  );
}
