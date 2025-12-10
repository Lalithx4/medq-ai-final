// Group Media Upload API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';
import { uploadToWasabi, isWasabiConfigured, getSignedFileUrl } from '@/lib/wasabi/client';

// Maximum file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
];

function getFileType(mimeType: string): 'image' | 'document' | 'audio' | 'video' {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

// POST /api/groups/[groupId]/media - Upload media
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await getServerSupabase();
    const adminClient = getServiceRoleSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Wasabi configuration
    if (!isWasabiConfigured()) {
      return NextResponse.json({ 
        error: 'File storage is not configured' 
      }, { status: 500 });
    }

    // Check membership and permissions
    const { data: group } = await adminClient
      .from('groups')
      .select('only_admins_can_message')
      .eq('id', groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    if (group.only_admins_can_message && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can send media in this group' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string;
    const replyToId = formData.get('reply_to_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mimeType = file.type;
    const fileType = getFileType(mimeType);

    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isDoc = ALLOWED_DOC_TYPES.includes(mimeType);
    const isAudio = mimeType.startsWith('audio/');
    const isVideo = mimeType.startsWith('video/');

    if (!isImage && !isDoc && !isAudio && !isVideo) {
      return NextResponse.json({ 
        error: 'File type not allowed. Supported types: images, PDFs, documents, audio, video' 
      }, { status: 400 });
    }

    // Validate file size
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json({ 
        error: `File size exceeds ${maxSizeMB}MB limit` 
      }, { status: 400 });
    }

    // Upload to Wasabi
    const buffer = Buffer.from(await file.arrayBuffer());
    let uploadResult;
    try {
      uploadResult = await uploadToWasabi(
        user.id,
        buffer,
        `group_${groupId}_${file.name}`,
        mimeType
      );
    } catch (uploadError) {
      console.error('Wasabi upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file to storage',
        details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Get message type
    const messageType = fileType === 'document' ? 'file' : fileType;

    // Create message
    const { data: message, error: messageError } = await adminClient
      .from('group_messages')
      .insert({
        group_id: groupId,
        sender_id: user.id,
        content: caption?.trim() || null,
        message_type: messageType,
        reply_to_id: replyToId || null,
        metadata: {
          file_name: file.name,
          file_size: file.size,
          file_type: fileType,
          mime_type: mimeType
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Generate signed URL for access (expires in 7 days)
    const signedUrl = await getSignedFileUrl(uploadResult.key, 7 * 24 * 60 * 60);

    // Create media record
    const { data: media, error: mediaError } = await adminClient
      .from('group_media')
      .insert({
        group_id: groupId,
        message_id: message.id,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: signedUrl, // Use signed URL instead of direct URL
        file_key: uploadResult.key,
        file_type: fileType,
        mime_type: mimeType,
        file_size: file.size
      })
      .select()
      .single();

    if (mediaError) {
      console.error('Error creating media record:', mediaError);
      // Don't fail the request, media record is secondary
    }

    // Get sender profile
    const { data: senderProfile } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: {
        ...message,
        sender: senderProfile || { id: user.id, full_name: 'Unknown' },
        media: media ? [media] : []
      },
      media
    });

  } catch (error) {
    console.error('Upload media error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/groups/[groupId]/media - List all media in group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await getServerSupabase();
    const adminClient = getServiceRoleSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check membership
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get('type'); // image, document, audio, video
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = adminClient
      .from('group_media')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fileType) {
      query = query.eq('file_type', fileType);
    }

    const { data: media, error: mediaError } = await query;

    if (mediaError) {
      console.error('Error fetching media:', mediaError);
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
    }

    // Generate fresh signed URLs for all media items
    const mediaWithSignedUrls = await Promise.all(
      (media || []).map(async (item) => {
        if (item.file_key) {
          try {
            const signedUrl = await getSignedFileUrl(item.file_key, 3600); // 1 hour expiry
            return { ...item, file_url: signedUrl };
          } catch (error) {
            console.error('Error generating signed URL for:', item.file_key, error);
            return item;
          }
        }
        return item;
      })
    );

    return NextResponse.json({
      success: true,
      media: mediaWithSignedUrls
    });

  } catch (error) {
    console.error('Get media error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
