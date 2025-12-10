"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { db } from "@/server/db";

/**
 * Get a public presentation without requiring authentication
 * This is used for the shared presentation view
 */
export async function getSharedPresentation(id: string) {
  try {
    const presentation = await db.baseDocument.findUnique({
      where: {
        id,
        isPublic: true, // Only fetch public presentations
      },
      include: {
        Presentation: {
          select: {
            id: true,
            content: true,
            outline: true,
            presentationStyle: true,
            language: true,
          },
        },
        User: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    if (!presentation) {
      return {
        success: false,
        message: "Presentation not found or not public",
      };
    }

    return {
      success: true,
      presentation,
    };
  } catch (error) {
    console.error("Error fetching shared presentation:", error);
    return {
      success: false,
      message: "Failed to fetch presentation",
    };
  }
}

/**
 * Toggle the public status of a presentation
 */
export async function togglePresentationPublicStatus(
  id: string,
  isPublic: boolean,
) {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  try {
    // This requires auth and ownership verification
    const presentation = await db.baseDocument.update({
      where: {
        id,
        userId: user.id, // Only the owner can change the public status
      },
      data: { isPublic },
    });

    return {
      success: true,
      message: isPublic
        ? "Presentation is now publicly accessible"
        : "Presentation is now private",
      presentation,
    };
  } catch (error) {
    console.error("Error updating presentation public status:", error);
    return {
      success: false,
      message: "Failed to update presentation public status",
    };
  }
}
