// Poll Display Component - Shows poll in chat with voting UI
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Check,
  Clock,
  Lock,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { GroupPoll, PollResults } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface PollDisplayProps {
  poll: GroupPoll;
  currentUserId: string;
  onVote: (optionIds: string[]) => Promise<void>;
  onClose?: () => Promise<void>;
  isAdmin?: boolean;
  isVoting?: boolean;
  className?: string;
}

export function PollDisplay({
  poll,
  currentUserId,
  onVote,
  onClose,
  isAdmin = false,
  isVoting = false,
  className
}: PollDisplayProps) {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
    new Set(poll.user_votes || [])
  );
  const [showVoters, setShowVoters] = useState(false);
  const [expandedOption, setExpandedOption] = useState<string | null>(null);

  const hasVoted = poll.user_votes && poll.user_votes.length > 0;
  const totalVotes = poll.total_votes || 0;
  const isCreator = poll.created_by === currentUserId;
  const canClose = (isAdmin || isCreator) && !poll.is_closed;
  const isExpired = poll.ends_at && new Date(poll.ends_at) < new Date();
  const isClosed = poll.is_closed || isExpired;

  const toggleOption = (optionId: string) => {
    if (isClosed) return;
    
    const newSelected = new Set(selectedOptions);
    if (newSelected.has(optionId)) {
      newSelected.delete(optionId);
    } else {
      if (!poll.is_multiple_choice) {
        newSelected.clear();
      }
      newSelected.add(optionId);
    }
    setSelectedOptions(newSelected);
  };

  const handleVote = async () => {
    if (selectedOptions.size === 0) return;
    await onVote(Array.from(selectedOptions));
  };

  const getResultForOption = (optionId: string): PollResults | undefined => {
    return poll.results?.find(r => r.option_id === optionId);
  };

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden max-w-md",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base leading-snug">
              {poll.question}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {poll.is_anonymous && (
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Anonymous
                </span>
              )}
              {poll.is_multiple_choice && (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Multiple choice
                </span>
              )}
              {totalVotes > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="p-4 space-y-2">
        {poll.options.map((option) => {
          const result = getResultForOption(option.id);
          const percentage = result?.percentage || 0;
          const voteCount = result?.vote_count || 0;
          const isSelected = selectedOptions.has(option.id);
          const userVoted = poll.user_votes?.includes(option.id);

          return (
            <motion.div
              key={option.id}
              whileHover={!isClosed ? { scale: 1.01 } : {}}
              className="relative"
            >
              <button
                onClick={() => toggleOption(option.id)}
                disabled={isClosed || hasVoted}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all relative overflow-hidden",
                  isSelected && !isClosed && "border-primary bg-primary/5",
                  userVoted && "border-primary",
                  !isClosed && !isSelected && "hover:border-muted-foreground/50 hover:bg-muted/50",
                  isClosed && "cursor-default"
                )}
              >
                {/* Progress bar background */}
                {(hasVoted || isClosed) && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn(
                      "absolute inset-0 rounded-lg",
                      userVoted ? "bg-primary/20" : "bg-muted"
                    )}
                  />
                )}

                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Selection indicator */}
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      poll.is_multiple_choice ? "rounded-md" : "",
                      isSelected || userVoted 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-muted-foreground/30"
                    )}>
                      {(isSelected || userVoted) && (
                        <Check className="w-3 h-3" />
                      )}
                    </div>
                    <span className="text-sm truncate">{option.text}</span>
                  </div>

                  {/* Results */}
                  {(hasVoted || isClosed) && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-medium">{percentage}%</span>
                      {!poll.is_anonymous && voteCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedOption(
                              expandedOption === option.id ? null : option.id
                            );
                          }}
                          className="p-1 hover:bg-muted/80 rounded"
                        >
                          {expandedOption === option.id ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Voters list (if expanded and not anonymous) */}
                <AnimatePresence>
                  {expandedOption === option.id && result?.voters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 pt-2 border-t relative"
                    >
                      <div className="flex flex-wrap gap-1">
                        {result.voters.slice(0, 10).map((voter) => (
                          <span
                            key={voter.id}
                            className="text-xs bg-muted px-2 py-0.5 rounded-full"
                          >
                            {voter.name}
                          </span>
                        ))}
                        {result.voters.length > 10 && (
                          <span className="text-xs text-muted-foreground">
                            +{result.voters.length - 10} more
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          {/* Status */}
          <div className="text-xs text-muted-foreground">
            {isClosed ? (
              <span className="flex items-center gap-1 text-amber-600">
                <Lock className="w-3 h-3" />
                Poll closed
              </span>
            ) : poll.ends_at ? (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Ends {formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}
              </span>
            ) : (
              <span>No end date</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {canClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs h-8"
              >
                Close Poll
              </Button>
            )}
            {!isClosed && !hasVoted && selectedOptions.size > 0 && (
              <Button
                size="sm"
                onClick={handleVote}
                disabled={isVoting}
                className="h-8"
              >
                {isVoting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Voting...
                  </>
                ) : (
                  'Vote'
                )}
              </Button>
            )}
            {!isClosed && hasVoted && (
              <span className="text-xs text-muted-foreground">
                ✓ You voted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
