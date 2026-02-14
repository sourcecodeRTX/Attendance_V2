"use client";

import { useState } from "react";
import { ExternalLink, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface AIFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AI_PROMPT = `You are a data processing assistant. Your task is to process the uploaded student file and reformat the data according to the strict example provided below.

**Instructions:**

1.  **Scan the file** to find the student list, ignoring any text at the top like university or course names.
2.  **For each student, find their Roll Number, Name, Section, and Department.** The Section and Department are likely in the text you ignored at the top of the file.
3.  **Clean the data** by merging names that are split across multiple lines.
4.  **Format each student record** as a comma-separated line: \`Roll,Name,Section,Department\`.
5.  **Do not include a header row** in the final output.

**CRITICAL - Output Formatting:**

The example below is the definitive guide for your output. The structure, format, and number of records in your response should closely follow the provided example.

**Example of the required output:**

24100110019,B Muniharish,PHOENIX,BTECH CSE CORE
24100110022,Bareddy.Rajareddy,PHOENIX,BTECH CSE CORE

Now, process the uploaded file.`;

export function AIFormatDialog({ open, onOpenChange }: AIFormatDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setCopied(true);
      toast({ title: "Copied!", description: "Prompt copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleOpenGemini = () => {
    window.open("https://gemini.google.com/app", "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI File Format Assistant
          </DialogTitle>
          <DialogDescription>
            Use Google Gemini AI to reformat your student file into a compatible format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-sm">How it works:</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
              <li>Click &quot;Copy Prompt&quot; to copy the AI prompt</li>
              <li>Click &quot;Open Gemini&quot; to open Google Gemini</li>
              <li>Paste the prompt and <strong>upload your student file</strong></li>
              <li>Copy the formatted output from Gemini</li>
              <li>Use the <strong>Student Data Creator</strong> to paste &amp; import</li>
            </ol>
          </div>

          <div className="bg-card border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">AI Prompt</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPrompt}
                className="h-8"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-x-auto max-h-32 whitespace-pre-wrap">
              {AI_PROMPT.slice(0, 200)}...
            </pre>
          </div>

          <div className="bg-muted/30 border border-dashed rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Output format:</strong> Each line will be{" "}
              <code className="bg-muted px-1 rounded">Roll,Name,Section,Department</code>{" "}
              — no headers. You can paste this directly into the Student Data Creator.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleCopyPrompt}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Prompt
          </Button>
          <Button onClick={handleOpenGemini}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Gemini
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
