"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Circle, AlertCircle } from "lucide-react";

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
}: ProgressTrackerProps) {

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Circle className="w-4 h-4 text-zinc-500" />;
      case 'in-progress':
        return <Loader2 className="w-4 h-4 animate-spin text-teal-400" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Circle className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="w-full">
      {/* Minimal Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-sm font-medium text-zinc-300 truncate max-w-md">
            Researching: {topic}
          </span>
        </div>
        <span className="text-sm font-bold text-teal-400">{Math.round(overallProgress)}%</span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-6">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${overallProgress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          style={{ width: "50%" }}
        />
      </div>

      {/* Current Phase - Compact */}
      <div className="flex items-center gap-3 mb-5 px-3 py-2.5 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
        <Loader2 className="w-4 h-4 text-teal-400 animate-spin shrink-0" />
        <p className="text-sm text-zinc-300 truncate">{currentPhase}</p>
      </div>

      {/* Task List - Compact */}
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${task.status === 'in-progress'
                ? 'bg-teal-500/10 border border-teal-500/20'
                : task.status === 'completed'
                  ? 'bg-zinc-800/30'
                  : 'bg-transparent'
              }`}
          >
            {getStatusIcon(task.status)}
            <span className={`text-sm flex-1 ${task.status === 'completed' ? 'text-zinc-500' : 'text-zinc-300'
              }`}>
              {task.name}
            </span>
            <span className="text-xs text-zinc-500 tabular-nums">{task.progress}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
