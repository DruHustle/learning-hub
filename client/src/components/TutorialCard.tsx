import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, LucideIcon, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useProgress } from "@/hooks/useProgress";

interface TutorialCardProps {
  id: number;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  icon: LucideIcon;
  color: string;
  index: number;
  tags?: string[];
}

export default function TutorialCard({
  id,
  title,
  description,
  difficulty,
  duration,
  icon: Icon,
  color,
  index,
  tags = [],
}: TutorialCardProps) {
  const { isCompleted } = useProgress();
  const completed = isCompleted(id);
  const difficultyColor = {
    Beginner: "bg-green-50 text-green-600 border-green-100",
    Intermediate: "bg-blue-50 text-blue-600 border-blue-100",
    Advanced: "bg-indigo-50 text-indigo-600 border-indigo-100",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
    >
      <Card className="h-full flex flex-col overflow-hidden bg-white border-blue-100 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group">
        <div className={`h-1.5 w-full bg-gradient-to-r ${color}`} />
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-blue-50 border border-blue-100 group-hover:border-blue-500/30 transition-colors`}>
              <Icon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex gap-2">
              {completed && (
                <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-100 gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Done
                </Badge>
              )}
              <Badge variant="secondary" className={difficultyColor[difficulty]}>
                {difficulty}
              </Badge>
            </div>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-[11px] font-semibold uppercase tracking-wide">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <h3 className="text-xl font-bold leading-tight text-slate-900 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          <p className="text-slate-600 text-sm leading-relaxed">
            {description}
          </p>
        </CardContent>
        <CardFooter className="pt-0 flex items-center justify-between border-t border-blue-50 p-6 bg-blue-50/30">
          <div className="flex items-center text-xs text-slate-500 font-medium">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            {duration}
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-blue-600 hover:text-blue-500 hover:bg-blue-50 transition-colors font-bold">
            <Link href={`/tutorials/${id}`}>
              Start
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
