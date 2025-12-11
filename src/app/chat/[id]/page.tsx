import { AppLayout } from "@/components/home/AppLayout";
import { DeepResearchDashboard } from "@/components/deep-research/DeepResearchDashboard";
import ChatInterface from "@/components/pdf-chat/ChatInterface";
import { db } from "@/server/db";
import { notFound } from "next/navigation";

// Define Page Props for Next.js 15 (params is a Promise)
type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ChatIdPage(props: Props) {
    const params = await props.params;
    const { id } = params;

    // 1. Try to find a ChatConversation (Deep Research or General)
    const conversation = await db.chatConversation.findUnique({
        where: { id },
        include: {
            ChatMessage: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (conversation) {
        if (conversation.context === 'deep-research') {
            // Extract initial sources from metadata if available
            const metadata = conversation.metadata as Record<string, any>;
            const initialSources = metadata?.sources || { pubmed: true, arxiv: false, web: false };

            return (
                <AppLayout>
                    <div className="min-h-screen bg-[#0f0f10] text-gray-100 selection:bg-teal-500/30">
                        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/5 rounded-full blur-[120px]" />
                            <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] bg-blue-600/5 rounded-full blur-[100px]" />
                        </div>
                        <DeepResearchDashboard
                            conversationId={conversation.id}
                            initialQuery={conversation.title || ""}
                            initialSources={initialSources}
                            initialMessages={conversation.ChatMessage.map(msg => ({
                                role: msg.role as "user" | "assistant",
                                content: msg.content,
                                type: (msg.metadata as any)?.type || "text",
                                data: (msg.metadata as any)?.data
                            }))}
                        // We might need to handle onBack, but usually navigating away is enough
                        />
                    </div>
                </AppLayout>
            );
        }

        // Fallback for generic chat if we had one (for now maybe redirect or show simple UI)
        // For 'home' context, maybe just show the messages? 
        // But we don't have a Generic Chat Component ready-to-go? 
        // The user's prompt implies "Deep Research" and "PDF Chat" are the main things.
        // If it's a 'home' context (default), we might default to DeepResearch with the query?
        // Or maybe we treat it as a standard chat.

        // For now, let's treat unknown contexts as Deep Research if they have typical metadata, otherwise standard.
        // Given the codebase state, let's use DeepResearchDashboard as the default view for now if context is ambiguous but looks like research.
        return (
            <AppLayout>
                <div className="p-4 text-center">
                    <p>Generic Chat View - Under Construction</p>
                </div>
            </AppLayout>
        );
    }

    // 2. Try to find a PdfChatSession
    // We need to check if the ID exists in PdfChatSession
    try {
        const pdfSession = await db.pdfChatSession.findUnique({
            where: { id },
            include: { PdfDocument: true }
        });

        if (pdfSession) {
            return (
                <AppLayout>
                    <div className="min-h-screen bg-[#0f0f10] flex flex-col relative overflow-hidden h-[calc(100vh-64px)]"> {/* Adjust height for layout */}
                        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
                        {pdfSession.PdfDocument && (
                            <div className="relative z-10 p-4 border-b border-white/5 bg-[#0f0f10]/80 backdrop-blur-xl flex items-center gap-4">
                                <span className="text-gray-200 font-medium tracking-tight">PDF Chat: {pdfSession.PdfDocument.originalName}</span>
                            </div>
                        )}
                        <div className="flex-1 overflow-hidden relative z-10">
                            <ChatInterface sessionId={id} />
                        </div>
                    </div>
                </AppLayout>
            );
        }
    } catch (e) {
        // Ignore Invalid UUID errors if any
    }

    notFound();
}
