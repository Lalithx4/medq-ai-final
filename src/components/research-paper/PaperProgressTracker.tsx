"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Circle } from "lucide-react";

interface ProgressStep {
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
}

interface PaperProgressTrackerProps {
  topic: string;
  overallProgress: number;
  currentPhase: string;
  steps: ProgressStep[];
}

export function PaperProgressTracker({
  topic,
  overallProgress,
  currentPhase,
  steps
}: PaperProgressTrackerProps) {
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': 
        return <Circle className="w-5 h-5 text-muted-foreground" />;
      case 'in-progress': 
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'completed': 
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed': 
        return <Circle className="w-5 h-5 text-red-500" />;
      default: 
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-muted';
      case 'in-progress': return 'bg-primary';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-6 mb-6"
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Generating Research Paper</h2>
        <p className="text-sm text-muted-foreground mb-1">{topic}</p>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Progress:</span>
          <span className="font-semibold text-primary">{overallProgress}%</span>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </motion.div>
        </div>
      </div>

      {/* Current Phase */}
      <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-lg mb-6">
        <p className="text-sm text-muted-foreground mb-1">Currently working on</p>
        <p className="text-base font-medium flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {currentPhase}
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border"
          >
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {getStatusIcon(step.status)}
            </div>

            {/* Step Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm mb-1">{step.name}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3 min-w-[140px]">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${getStatusColor(step.status)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${step.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-medium min-w-[40px] text-right">
                {step.progress}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Estimated Time */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estimated time remaining:</span>
          <span className="font-medium">
            {overallProgress < 30 ? '3-4 minutes' : 
             overallProgress < 60 ? '2-3 minutes' : 
             overallProgress < 90 ? '1-2 minutes' : 
             'Almost done...'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
