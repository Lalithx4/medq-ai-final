/**
 * Token Service
 * 
 * Core service for tracking and analyzing token usage
 */

import { db } from "@/server/db";
import { calculateTokenCost } from "./pricing";
import type { TokenCount } from "./extractors";

export interface TokenUsageData {
  userId: string;
  operation: string;
  operationId?: string;
  inputTokens: number;
  outputTokens: number;
  modelProvider: string;
  modelId: string;
  metadata?: Record<string, any>;
}

export interface UserTokenStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  byOperation: OperationStats[];
  byModel: ModelStats[];
}

export interface OperationStats {
  operation: string;
  count: number;
  totalTokens: number;
  totalCost: number;
}

export interface ModelStats {
  provider: string;
  model: string;
  totalTokens: number;
  totalCost: number;
}

export interface PeriodStats {
  date: string;
  tokens: number;
  cost: number;
}

export class TokenService {
  /**
   * Track token usage for an API call
   */
  static async trackUsage(data: TokenUsageData): Promise<any> {
    try {
      const totalTokens = data.inputTokens + data.outputTokens;

      // Calculate cost
      const cost = calculateTokenCost(
        data.inputTokens,
        data.outputTokens,
        data.modelProvider,
        data.modelId
      );

      console.log(`📊 [TOKEN_SERVICE] Tracking usage:`, {
        operation: data.operation,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        totalCost: cost.totalCost,
      });

      // Create token usage record and update user stats in a transaction
      const result = await db.$transaction([
        // Create token usage record
        db.tokenUsage.create({
          data: {
            userId: data.userId,
            operation: data.operation,
            operationId: data.operationId,
            inputTokens: data.inputTokens,
            outputTokens: data.outputTokens,
            totalTokens,
            modelProvider: data.modelProvider,
            modelId: data.modelId,
            inputCost: cost.inputCost,
            outputCost: cost.outputCost,
            totalCost: cost.totalCost,
            metadata: data.metadata || {},
          },
        }),
        // Update user aggregate stats
        db.user.update({
          where: { id: data.userId },
          data: {
            totalInputTokens: { increment: data.inputTokens },
            totalOutputTokens: { increment: data.outputTokens },
            totalTokens: { increment: totalTokens },
            totalTokenCost: { increment: cost.totalCost },
          },
        }),
      ]);

      console.log(`✅ [TOKEN_SERVICE] Usage tracked successfully`);
      return result[0];
    } catch (error) {
      console.error('❌ [TOKEN_SERVICE] Error tracking usage:', error);
      throw error;
    }
  }

  /**
   * Get user's token statistics
   */
  static async getUserStats(userId: string): Promise<UserTokenStats> {
    try {
      // Get user aggregate stats
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          totalInputTokens: true,
          totalOutputTokens: true,
          totalTokens: true,
          totalTokenCost: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get stats by operation
      const byOperationRaw = await db.tokenUsage.groupBy({
        by: ['operation'],
        where: { userId },
        _count: { id: true },
        _sum: {
          totalTokens: true,
          totalCost: true,
        },
      });

      const byOperation: OperationStats[] = byOperationRaw.map((item) => ({
        operation: item.operation,
        count: item._count.id,
        totalTokens: item._sum.totalTokens || 0,
        totalCost: item._sum.totalCost || 0,
      }));

      // Get stats by model
      const byModelRaw = await db.tokenUsage.groupBy({
        by: ['modelProvider', 'modelId'],
        where: { userId },
        _sum: {
          totalTokens: true,
          totalCost: true,
        },
      });

      const byModel: ModelStats[] = byModelRaw.map((item) => ({
        provider: item.modelProvider,
        model: item.modelId,
        totalTokens: item._sum.totalTokens || 0,
        totalCost: item._sum.totalCost || 0,
      }));

      return {
        totalInputTokens: user.totalInputTokens,
        totalOutputTokens: user.totalOutputTokens,
        totalTokens: user.totalTokens,
        totalCost: user.totalTokenCost,
        byOperation,
        byModel,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Get token usage history
   */
  static async getUsageHistory(
    userId: string,
    options?: {
      limit?: number;
      operation?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any[]> {
    const { limit = 50, operation, startDate, endDate } = options || {};

    const where: any = { userId };

    if (operation) {
      where.operation = operation;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return db.tokenUsage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get usage by time period
   */
  static async getUsageByPeriod(
    userId: string,
    period: 'day' | 'week' | 'month'
  ): Promise<PeriodStats[]> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const usage = await db.tokenUsage.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped = new Map<string, { tokens: number; cost: number }>();

    for (const record of usage) {
      const date = record.createdAt.toISOString().split('T')[0];
      const existing = grouped.get(date) || { tokens: 0, cost: 0 };
      
      grouped.set(date, {
        tokens: existing.tokens + record.totalTokens,
        cost: existing.cost + record.totalCost,
      });
    }

    return Array.from(grouped.entries()).map(([date, stats]) => ({
      date,
      tokens: stats.tokens,
      cost: stats.cost,
    }));
  }

  /**
   * Get current balance (for display)
   */
  static async getBalance(userId: string): Promise<{
    totalTokens: number;
    totalCost: number;
  }> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        totalTokens: true,
        totalTokenCost: true,
      },
    });

    return {
      totalTokens: user?.totalTokens || 0,
      totalCost: user?.totalTokenCost || 0,
    };
  }

  /**
   * Get stats for a specific operation
   */
  static async getOperationStats(
    userId: string,
    operation: string
  ): Promise<{
    count: number;
    totalTokens: number;
    totalCost: number;
    avgTokens: number;
    avgCost: number;
  }> {
    const stats = await db.tokenUsage.aggregate({
      where: { userId, operation },
      _count: { id: true },
      _sum: {
        totalTokens: true,
        totalCost: true,
      },
      _avg: {
        totalTokens: true,
        totalCost: true,
      },
    });

    return {
      count: stats._count.id,
      totalTokens: stats._sum.totalTokens || 0,
      totalCost: stats._sum.totalCost || 0,
      avgTokens: stats._avg.totalTokens || 0,
      avgCost: stats._avg.totalCost || 0,
    };
  }
}
