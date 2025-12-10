"use client";

import React, { useState, useCallback, useEffect } from "react";
import { getCreditCost } from "@/lib/pricing/plans";
import { InsufficientCreditsModal, LowCreditsWarningModal } from "@/components/credits/InsufficientCreditsModal";
import { useCredits } from "@/contexts/CreditsContext";

const LOW_CREDITS_THRESHOLD = 20;

interface UseCreditsCheckReturn {
  checkCredits: (operation: string, operationName: string) => Promise<boolean>;
  InsufficientCreditsDialog: () => React.ReactElement | null;
  LowCreditsDialog: () => React.ReactElement | null;
  currentCredits: number;
  refreshCredits: () => Promise<void>;
}

export function useCreditsCheck(): UseCreditsCheckReturn {
  const { credits, refreshCredits: refreshCreditsContext } = useCredits();
  const currentCredits = credits ?? 0;
  
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showLowCreditsModal, setShowLowCreditsModal] = useState(false);
  const [modalData, setModalData] = useState<{
    operation: string;
    operationName: string;
    requiredCredits: number;
  }>({
    operation: "",
    operationName: "",
    requiredCredits: 0,
  });

  // Track if we've shown the low credits warning in this session
  const [hasShownLowCreditsWarning, setHasShownLowCreditsWarning] = useState(false);

  // Use the context's refresh function
  const refreshCredits = useCallback(async () => {
    await refreshCreditsContext();
  }, [refreshCreditsContext]);

  // Show low credits warning if credits are low (only once per session)
  useEffect(() => {
    if (
      currentCredits > 0 &&
      currentCredits <= LOW_CREDITS_THRESHOLD &&
      !hasShownLowCreditsWarning
    ) {
      setShowLowCreditsModal(true);
      setHasShownLowCreditsWarning(true);
    }
  }, [currentCredits, hasShownLowCreditsWarning]);

  const checkCredits = useCallback(
    async (operation: string, operationName: string): Promise<boolean> => {
      const requiredCredits = getCreditCost(operation);

      // Refresh credits from context to get latest value
      await refreshCredits();

      // Use the current credits from context
      const freshCredits = credits ?? 0;

      // Check if user has enough credits
      if (freshCredits < requiredCredits) {
        setModalData({
          operation,
          operationName,
          requiredCredits,
        });
        setShowInsufficientModal(true);
        return false;
      }

      return true;
    },
    [credits, refreshCredits]
  );

  const InsufficientCreditsDialog = useCallback(() => {
    if (!showInsufficientModal) return null;

    return (
      <InsufficientCreditsModal
        isOpen={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        operation={modalData.operation}
        operationName={modalData.operationName}
        currentCredits={currentCredits}
        requiredCredits={modalData.requiredCredits}
      />
    );
  }, [showInsufficientModal, modalData, currentCredits]);

  const LowCreditsDialog = useCallback(() => {
    if (!showLowCreditsModal) return null;

    return (
      <LowCreditsWarningModal
        isOpen={showLowCreditsModal}
        onClose={() => setShowLowCreditsModal(false)}
        currentCredits={currentCredits}
      />
    );
  }, [showLowCreditsModal, currentCredits]);

  return {
    checkCredits,
    InsufficientCreditsDialog,
    LowCreditsDialog,
    currentCredits,
    refreshCredits,
  };
}
