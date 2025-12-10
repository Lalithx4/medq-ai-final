import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message, content } = await req.json();

    // Here you would integrate with your AI service
    // For now, we'll just echo back the content
    const response = await fetch(process.env.AI_ENDPOINT as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        message,
        content,
        context: 'medical_research'
      })
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      updatedContent: data.content,
      message: data.message
    });

  } catch (error) {
    console.error('Medical assistant error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}