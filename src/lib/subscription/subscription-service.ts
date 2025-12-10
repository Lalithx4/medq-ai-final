import { db } from "@/server/db";
import { getPlanById } from "@/lib/pricing/plans";
import { generateId } from "ai";

export class SubscriptionService {
  /**
   * Set up a new subscription for a user
   */
  static async createSubscription(
    userId: string,
    planId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const plan = getPlanById(planId);
      if (!plan) {
        return { success: false, error: "Invalid plan" };
      }

      if (planId === "free") {
        await db.user.update({
          where: { id: userId },
          data: {
            subscriptionPlan: planId,
          },
        });
        return { success: true };
      }
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await db.user.update({
        where: { id: userId },
        data: {
          subscriptionPlan: planId,
          subscriptionEnd: nextMonth,
          credits: plan.credits, // Set initial credits
        },
      });

      console.log(`✅ Subscription created for user ${userId}: ${planId} plan`);
      return { success: true };
    } catch (error) {
      console.error("Error creating subscription:", error);
      return { success: false, error: "Failed to create subscription" };
    }
  }

  /**
   * Refresh credits for users whose subscription is active and due for refresh
   */
  static async refreshCreditsForDueUsers(): Promise<{
    refreshed: number;
    errors: number;
  }> {
    let refreshed = 0;
    let errors = 0;

    try {
      const now = new Date();

      // Find users whose subscription period has ended and need a refresh
      const usersNeedingRefresh = await db.user.findMany({
        where: {
          subscriptionPlan: { not: "free" },
          subscriptionEnd: { lte: now },
        },
      });

      console.log(`🔄 Found ${usersNeedingRefresh.length} users needing credit refresh`);

      for (const user of usersNeedingRefresh) {
        try {
          const plan = getPlanById(user.subscriptionPlan);
          if (!plan) {
            console.error(`Invalid plan for user ${user.id}: ${user.subscriptionPlan}`);
            errors++;
            continue;
          }

          // Refresh credits and roll subscriptionEnd by 30 days
          const nextCycle = new Date(now);
          nextCycle.setMonth(nextCycle.getMonth() + 1);
          await db.user.update({
            where: { id: user.id },
            data: {
              credits: plan.credits,
              subscriptionEnd: nextCycle,
            },
          });

          // Create transaction record
          await db.creditTransaction.create({
            data: {
              id: generateId(),
              userId: user.id,
              amount: plan.credits,
              type: "bonus",
              description: `Monthly credit refresh for ${plan.name} plan`,
              operation: "subscription_refresh",
            },
          });

          console.log(`✅ Refreshed ${plan.credits} credits for user ${user.id}`);
          refreshed++;
        } catch (error) {
          console.error(`Error refreshing credits for user ${user.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ Credit refresh complete: ${refreshed} refreshed, ${errors} errors`);
      return { refreshed, errors };
    } catch (error) {
      console.error("Error in refreshCreditsForDueUsers:", error);
      return { refreshed, errors };
    }
  }

  /**
   * Check if a user's subscription is active
   */
  static async isSubscriptionActive(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionEnd: true,
      },
    });

    if (!user) return false;
    if (user.subscriptionPlan === "free") return true;
    if (!user.subscriptionEnd) return false;

    return user.subscriptionEnd > new Date();
  }

  /**
   * Cancel a user's subscription (set to free plan)
   */
  static async cancelSubscription(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db.user.update({
        where: { id: userId },
        data: {
          subscriptionPlan: "free",
          subscriptionEnd: null,
        },
      });

      console.log(`✅ Subscription cancelled for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      return { success: false, error: "Failed to cancel subscription" };
    }
  }

  /**
   * Get subscription details for a user
   */
  static async getSubscriptionDetails(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionEnd: true,
        credits: true,
      },
    });

    if (!user) return null;

    const plan = getPlanById(user.subscriptionPlan);
    const isActive = await this.isSubscriptionActive(userId);

    return {
      ...user,
      planDetails: plan,
      isActive,
    };
  }
}
