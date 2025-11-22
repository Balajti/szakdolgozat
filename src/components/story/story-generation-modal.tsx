"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface StoryGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (level: string, complexity: string) => Promise<void>;
  currentLevel: string;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const COMPLEXITIES = ["Simple", "Moderate", "Complex"];

export function StoryGenerationModal({
  isOpen,
  onClose,
  onGenerate,
  currentLevel,
}: StoryGenerationModalProps) {
  const [selectedLevel, setSelectedLevel] = useState(currentLevel);
  const [selectedComplexity, setSelectedComplexity] = useState("Moderate");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(selectedLevel, selectedComplexity);
      onClose();
    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate New Story</DialogTitle>
          <DialogDescription>
            Customize your story settings. This will create a unique bedtime story for you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="level" className="text-right">
              Level
            </Label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="complexity" className="text-right">
              Complexity
            </Label>
            <Select value={selectedComplexity} onValueChange={setSelectedComplexity}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select complexity" />
              </SelectTrigger>
              <SelectContent>
                {COMPLEXITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Story"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
