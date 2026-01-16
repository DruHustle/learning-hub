import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Award, Download, Loader2, Share2, Linkedin, Twitter } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface CertificateProps {
  completedCount: number;
  totalCount: number;
}

export default function Certificate({ completedCount, totalCount }: CertificateProps) {
  const [name, setName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState(false);

  const isEligible = completedCount === totalCount && totalCount > 0;
  const progress = Math.round((completedCount / totalCount) * 100);

  const generatePDF = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setGenerating(true);
    
    try {
      // Create PDF
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      // Background
      doc.setFillColor(248, 250, 252); // Slate 50
      doc.rect(0, 0, 297, 210, "F");
      
      // Border
      doc.setDrawColor(0, 112, 242); // SAP Blue
      doc.setLineWidth(2);
      doc.rect(10, 10, 277, 190);
      
      // Inner Border
      doc.setDrawColor(245, 166, 35); // Gold
      doc.setLineWidth(1);
      doc.rect(15, 15, 267, 180);

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(40);
      doc.setTextColor(0, 112, 242);
      doc.text("CERTIFICATE", 148.5, 50, { align: "center" });
      
      doc.setFontSize(16);
      doc.setTextColor(100, 116, 139);
      doc.text("OF COMPLETION", 148.5, 60, { align: "center" });

      // Body
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text("This certifies that", 148.5, 85, { align: "center" });
      
      doc.setFont("times", "bolditalic");
      doc.setFontSize(40);
      doc.setTextColor(0, 0, 0);
      doc.text(name, 148.5, 105, { align: "center" });
      
      doc.setLineWidth(0.5);
      doc.line(70, 110, 227, 110);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text("has successfully completed the", 148.5, 125, { align: "center" });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(0, 112, 242);
      doc.text("AI in SAP BTP Course", 148.5, 138, { align: "center" });

      // Date
      const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139);
      doc.text(`Issued on ${date}`, 148.5, 155, { align: "center" });

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text("Verify at: https://DruHustle.github.io/learning-hub", 148.5, 190, { align: "center" });

      // Save
      doc.save("SAP_BTP_AI_Certificate.pdf");
      toast.success("Certificate downloaded successfully!");
      // Don't close dialog immediately so user can share
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate certificate");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isEligible ? "default" : "outline"} 
          className="gap-2 w-full sm:w-auto"
          disabled={!isEligible}
        >
          <Award className="w-4 h-4" />
          {isEligible ? "Claim Certificate" : `Complete all tutorials (${progress}%)`}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl flex flex-col items-center gap-2">
            <Award className="w-12 h-12 text-yellow-500" />
            Congratulations!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-center text-muted-foreground">
            You've successfully completed all tutorials in the Learning Hub.
            Enter your name below to generate your personalized certificate.
          </p>
          <div className="space-y-2">
            <Input
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-center text-lg"
            />
          </div>
          <Button 
            className="w-full gap-2" 
            onClick={generatePDF} 
            disabled={generating || !name.trim()}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF Certificate
              </>
            )}
          </Button>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-center text-muted-foreground mb-3">Share your achievement</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="icon" onClick={() => {
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://DruHustle.github.io/learning-hub")}`, "_blank");
              }}>
                <Linkedin className="w-4 h-4 text-blue-600" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("I just completed the AI in SAP BTP course! 🚀 #SAPBTP #AI")}&url=${encodeURIComponent("https://DruHustle.github.io/learning-hub")}`, "_blank");
              }}>
                <Twitter className="w-4 h-4 text-sky-500" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
