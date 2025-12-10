import { NextRequest, NextResponse } from 'next/server';
import { WordConverter } from '@/lib/research-paper/word-converter';

export async function POST(req: NextRequest) {
  try {
    const { markdown, title } = await req.json();

    if (!markdown || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: markdown and title' },
        { status: 400 }
      );
    }

    const buffer = await WordConverter.convertToWord(markdown, title);

    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.docx"`);

    // Convert Node Buffer to ArrayBuffer slice for Fetch API compatibility
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return new NextResponse(arrayBuffer, { 
      status: 200,
      headers 
    });
  } catch (error) {
    console.error('Error converting to Word:', error);
    return NextResponse.json(
      { error: 'Failed to convert document to Word format' },
      { status: 500 }
    );
  }
}