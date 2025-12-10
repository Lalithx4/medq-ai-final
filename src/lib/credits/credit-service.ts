import { db } from "@/server/db";
import { generateId } from "ai";
import { getCreditCost } from "@/lib/pricing/plans";
import { isCreditSystemEnabled } from "./credit-config";

export class CreditService {
  /**
   * Check if user has enough credits for an operation
   * Returns true if credit system is disabled
   */
  static async hasEnoughCredits(
    userId: string,
    operation: string
  ): Promise<boolean> {
    // If credit system is disabled, always allow
    if (!isCreditSystemEnabled()) {
      console.log("[CreditService] Credit system disabled, allowing operation");
      return true;
    }

    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user) return false;

      const cost = getCreditCost(operation);
      return user.credits >= cost;
    } catch (err) {
      console.warn("[CreditService.hasEnoughCredits] DB unavailable, denying operation by default.", err);
      return false;
    }
  }

  /**
   * Deduct credits from user account
   * Skips deduction if credit system is disabled
   */
  static async deductCredits(
    userId: string,
    operation: string,
    description: string
  ): Promise<{ success: boolean; remainingCredits?: number; error?: string }> {
    // If credit system is disabled, skip deduction
    if (!isCreditSystemEnabled()) {
      console.log("[CreditService] Credit system disabled, skipping deduction");
      return { success: true, remainingCredits: 999999 };
    }

    const cost = getCreditCost(operation);

    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user) {
        return { success: false, error: "User not found" };
      }

      if (user.credits < cost) {
        return {
          success: false,
          error: `Insufficient credits. Need ${cost}, have ${user.credits}`,
        };
      }

      // Deduct credits and create transaction in a single transaction
      const result = await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { credits: { decrement: cost } },
        }),
        db.creditTransaction.create({
          data: {
            id: generateId(),
            userId,
            amount: -cost,
            type: "usage",
            description,
            operation,
          },
        }),
      ]);

      return {
        success: true,
        remainingCredits: result[0].credits,
      };
    } catch (error) {
      console.error("Error deducting credits:", error);
      return { success: false, error: "Failed to deduct credits" };
    }
  }

  /**
   * Add credits to user account
   */
  static async addCredits(
    userId: string,
    amount: number,
    type: "purchase" | "bonus" | "refund",
    description: string
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      const result = await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { credits: { increment: amount } },
        }),
        db.creditTransaction.create({
          data: {
            id: generateId(),
            userId,
            amount,
            type,
            description,
          },
        }),
      ]);

      return {
        success: true,
        newBalance: result[0].credits,
      };
    } catch (error) {
      console.error("Error adding credits:", error);
      return { success: false, error: "Failed to add credits" };
    }
  }

  /**
   * Get user's current credit balance
   * Returns unlimited credits if system is disabled
   */
  static async getBalance(userId: string): Promise<number> {
    // If credit system is disabled, return unlimited credits
    if (!isCreditSystemEnabled()) {
      console.log("[CreditService] Credit system disabled, returning unlimited credits");
      return 999999;
    }

    try {
      console.log(`[CreditService.getBalance] Fetching balance for user: ${userId}`);
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      const balance = user?.credits ?? 0;
      console.log(`[CreditService.getBalance] User ${userId} has ${balance} credits`);
      return balance;
    } catch (err) {
      console.error("[CreditService.getBalance] DB error, returning 0.", err);
      return 0;
    }
  }

  /**
   * Get user's credit transaction history
   */
  static async getTransactionHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      console.log(`[CreditService.getTransactionHistory] Fetching for user: ${userId}, limit: ${limit}`);
      
      const transactions = await db.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      
      console.log(`[CreditService.getTransactionHistory] Found ${transactions.length} transactions`);
      
      return transactions;
    } catch (error) {
      console.error("[CreditService.getTransactionHistory] Error:", error);
      return [];
    }
  }

  static async hasEnoughCreditsForAmount(userId: string, amount: number): Promise<boolean> {
    if (!isCreditSystemEnabled()) return true;
    try {
      const user = await db.user.findUnique({ where: { id: userId }, select: { credits: true } });
      if (!user) return false;
      return user.credits >= amount;
    } catch (err) {
      return false;
    }
  }

  static async deductAmount(
    userId: string,
    amount: number,
    description: string,
    operation: string = "usage_custom"
  ): Promise<{ success: boolean; remainingCredits?: number; error?: string }> {
    if (!isCreditSystemEnabled()) {
      return { success: true, remainingCredits: 999999 };
    }
    try {
      const user = await db.user.findUnique({ where: { id: userId }, select: { credits: true } });
      if (!user) return { success: false, error: "User not found" };
      if (user.credits < amount) return { success: false, error: "Insufficient credits" };
      const result = await db.$transaction([
        db.user.update({ where: { id: userId }, data: { credits: { decrement: amount } } }),
        db.creditTransaction.create({
          data: { id: generateId(), userId, amount: -amount, type: "usage", description, operation },
        }),
      ]);
      return { success: true, remainingCredits: result[0].credits };
    } catch (error) {
      return { success: false, error: "Failed to deduct credits" };
    }
  }
}
