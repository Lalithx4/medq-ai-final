"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, RefreshCw, Zap, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target: string;
  action?: string;
}

export function EditorOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to AI-Powered Writing! ✨",
      description: "We've added powerful AI features to help you write better, faster. Let's take a quick tour!",
      icon: <Zap className="w-8 h-8 text-primary" />,
      target: "none",
    },
    {
      id: "autocomplete",
      title: "AI Autocomplete",
      description: "Get smart suggestions as you type. Just pause for 1.5 seconds and press Tab to accept suggestions.",
      icon: <Zap className="w-8 h-8 text-primary" />,
      target: "toolbar-autocomplete",
      action: "Toggle with the lightning bolt icon",
    },
    {
      id: "citations",
      title: "Citation Manager",
      description: "Search 280M+ academic sources and insert citations in APA, MLA, Chicago, or Harvard format.",
      icon: <BookOpen className="w-8 h-8 text-primary" />,
      target: "toolbar-citations",
      action: "Click the book icon to search citations",
    },
    {
      id: "paraphrase",
      title: "Paraphraser Tool",
      description: "Select any text and rewrite it in different tones: Academic, Formal, Fluent, or Creative.",
      icon: <RefreshCw className="w-8 h-8 text-primary" />,
      target: "toolbar-paraphrase",
      action: "Select text, then click the refresh icon",
    },
    {
      id: "complete",
      title: "You're All Set! 🎉",
      description: "Start writing and explore these features. You can always access this tour from the help menu.",
      icon: <Check className="w-8 h-8 text-green-500" />,
      target: "none",
    },
  ];

  useEffect(() => {
    // Check if user has seen onboarding
    const seen = localStorage.getItem("editor-onboarding-seen");
    if (!seen) {
      // Show onboarding after 1 second
      setTimeout(() => setShowOnboarding(true), 1000);
    }
    setHasSeenOnboarding(!!seen);
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem("editor-onboarding-seen", "true");
    setShowOnboarding(false);
    setCurrentStep(0);
  };

  const currentStepData = steps[currentStep];

  if (!showOnboarding || !currentStepData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  {currentStepData.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{currentStepData.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-base leading-relaxed mb-4">
              {currentStepData.description}
            </p>

            {currentStepData.action && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-primary">
                  💡 {currentStepData.action}
                </p>
              </div>
            )}

            {/* Progress Dots */}
            <div className="flex gap-2 mt-6 justify-center">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? "w-8 bg-primary"
                      : index < currentStep
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip Tour
            </Button>
            <Button onClick={handleNext} className="gap-2">
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Restart onboarding function (can be called from help menu)
export function restartOnboarding() {
  localStorage.removeItem("editor-onboarding-seen");
  window.location.reload();
}
