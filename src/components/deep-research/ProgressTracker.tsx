"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface Task {
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
}

interface ProgressTrackerProps {
  topic: string;
  overallProgress: number;
  currentPhase: string;
  tasks: Task[];
  timeRemaining?: string;
}

export function ProgressTracker({
  topic,
  overallProgress,
  currentPhase,
  tasks,
  timeRemaining = "3 minutes"
}: ProgressTrackerProps) {
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': return '⏳';
      case 'in-progress': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed': return '✓';
      case 'failed': return '✗';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'border-border bg-muted/30 text-muted-foreground';
      case 'in-progress': return 'bg-primary text-primary-foreground shadow-lg shadow-primary/20';
      case 'completed': return 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      default: return 'border-border bg-muted/30';
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-8 mb-8 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold tracking-tight">Researching: {topic}</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              Active
            </span>
          </div>
          <p className="text-muted-foreground">
            Estimated time remaining: <span className="font-medium text-foreground">{timeRemaining}</span>
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-muted-foreground">Overall Progress</span>
          <span className="font-bold text-primary">{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </motion.div>
        </div>
      </div>

      {/* Current Phase */}
      <div className="bg-muted/30 border border-border p-4 rounded-xl mb-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Current Phase</p>
          <p className="text-base font-semibold text-foreground">{currentPhase}</p>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
              task.status === 'in-progress' 
                ? 'bg-card border-primary/30 shadow-md ring-1 ring-primary/10' 
                : 'bg-card/50 border-border/50'
            }`}
          >
            {/* Status Icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${getStatusColor(task.status)}`}>
              {getStatusIcon(task.status)}
            </div>

            {/* Task Info */}
            <div className="flex-1">
              <p className="font-medium text-sm">{task.name}</p>
              <p className="text-xs text-muted-foreground">{task.description}</p>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs text-muted-foreground min-w-[35px] text-right">
                {task.progress}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
