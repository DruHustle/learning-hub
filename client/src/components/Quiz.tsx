import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizProps {
  tutorialId: number;
  questions: Question[];
  onComplete: () => void;
}

export default function Quiz({ tutorialId, questions, onComplete }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = () => {
    if (selectedOption === null) return;

    setIsAnswered(true);
    if (selectedOption === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
      toast.success("Correct answer!");
    } else {
      toast.error("Incorrect answer. Try to understand why.");
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
      if (score >= Math.ceil(questions.length * 0.7)) {
        onComplete();
      }
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setShowResults(false);
  };

  if (showResults) {
    const passed = score >= Math.ceil(questions.length * 0.7);
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8 border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8 space-y-4">
          <div className={`rounded-full p-4 ${passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
            {passed ? <CheckCircle className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
          </div>
          <div className="text-4xl font-bold">
            {score} / {questions.length}
          </div>
          <p className="text-muted-foreground text-center max-w-md">
            {passed 
              ? "Great job! You've mastered the concepts in this tutorial." 
              : "Keep learning! Review the tutorial content and try again to improve your score."}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button variant="outline" onClick={handleRetry}>Retry Quiz</Button>
          {passed && <Button onClick={onComplete}>Continue Learning</Button>}
        </CardFooter>
      </Card>
    );
  }

  const question = questions[currentQuestion];

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-primary">
            Score: {score}
          </span>
        </div>
        <CardTitle className="text-xl">{question.text}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup 
          value={selectedOption === null ? "" : selectedOption.toString()}
          onValueChange={(val) => !isAnswered && setSelectedOption(parseInt(val))}
          className="space-y-3"
        >
          {question.options.map((option, index) => (
            <div 
              key={index}
              className={`flex items-center space-x-2 border rounded-lg p-4 transition-colors ${
                isAnswered 
                  ? index === question.correctAnswer 
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : index === selectedOption 
                      ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                      : "opacity-50"
                  : selectedOption === index 
                    ? "border-primary bg-primary/5" 
                    : "hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value={index.toString()} id={`option-${index}`} disabled={isAnswered} />
              <Label 
                htmlFor={`option-${index}`} 
                className="flex-1 cursor-pointer font-normal text-base"
              >
                {option}
              </Label>
              {isAnswered && index === question.correctAnswer && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              {isAnswered && index === selectedOption && index !== question.correctAnswer && (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
          ))}
        </RadioGroup>

        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-muted/50 rounded-lg p-4 text-sm"
            >
              <div className="flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-1">Explanation:</span>
                  {question.explanation}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
      <CardFooter className="flex justify-end">
        {!isAnswered ? (
          <Button onClick={handleAnswer} disabled={selectedOption === null}>
            Check Answer
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
