/**
 * Chat Service - Manages chat conversations and messages in database
 */

import { db } from '@/server/db';

export interface ChatContext {
  type: 'home' | 'editor' | 'medical-assistant' | 'research-paper' | 'deep-research';
  documentId?: string;
  metadata?: Record<string, any>;
}

export interface SaveMessageParams {
  conversationId?: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  context: ChatContext;
  metadata?: Record<string, any>;
}

export class ChatService {
  /**
   * Get or create a conversation
   */
  async getOrCreateConversation(
    userId: string,
    context: ChatContext
  ): Promise<string> {
    // Try to find existing conversation for this context
    const existing = await db.chatConversation.findFirst({
      where: {
        userId,
        context: context.type,
        ...(context.documentId && {
          metadata: {
            path: ['documentId'],
            equals: context.documentId,
          },
        }),
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (existing) {
      return existing.id;
    }

    // Create new conversation
    const conversation = await db.chatConversation.create({
      data: {
        userId,
        context: context.type,
        metadata: context.metadata || {},
      },
    });

    return conversation.id;
  }

  /**
   * Save a message to the database
   */
  async saveMessage(params: SaveMessageParams): Promise<void> {
    const { conversationId, userId, role, content, context, metadata } = params;

    // Get or create conversation
    const convId = conversationId || await this.getOrCreateConversation(userId, context);

    // Save message
    await db.chatMessage.create({
      data: {
        conversationId: convId,
        userId,
        role,
        content,
        metadata: metadata || {},
      },
    });

    // Update conversation timestamp
    await db.chatConversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    conversationId: string,
    limit: number = 50
  ): Promise<Array<{ role: string; content: string; createdAt: Date }>> {
    const messages = await db.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return messages;
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(
    userId: string,
    context?: string,
    limit: number = 20
  ) {
    const conversations = await db.chatConversation.findMany({
      where: {
        userId,
        ...(context && { context }),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            createdAt: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return conversations.map(conv => ({
      id: conv.id,
      context: conv.context,
      title: conv.title,
      lastMessage: conv.messages[0]?.content || '',
      lastMessageAt: conv.messages[0]?.createdAt || conv.createdAt,
      messageCount: conv._count.messages,
      createdAt: conv.createdAt,
    }));
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await db.chatConversation.deleteMany({
      where: {
        id: conversationId,
        userId, // Ensure user owns the conversation
      },
    });
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(
    conversationId: string,
    userId: string,
    title: string
  ): Promise<void> {
    await db.chatConversation.updateMany({
      where: {
        id: conversationId,
        userId,
      },
      data: { title },
    });
  }

  /**
   * Get recent messages for context (last N messages)
   */
  async getRecentMessages(
    conversationId: string,
    limit: number = 10
  ): Promise<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>> {
    const messages = await db.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        role: true,
        content: true,
      },
    });

    // Reverse to get chronological order
    return messages.reverse().map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
  }

  /**
   * Clear old conversations (cleanup utility)
   */
  async clearOldConversations(userId: string, daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db.chatConversation.deleteMany({
      where: {
        userId,
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}

// Export singleton instance
export const chatService = new ChatService();
