"use server";

import { type PlateSlide } from "@/components/presentation/utils/parser";
import { getServerSupabase } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { type InputJsonValue } from "@prisma/client/runtime/library";
import { generateId } from "ai";

export async function createPresentation({
  content,
  title,
  theme = "orbit",
  outline,
  imageSource,
  presentationStyle,
  language,
  templateId,
}: {
  content: {
    slides: PlateSlide[];
  };
  title: string;
  theme?: string;
  outline?: string[];
  imageSource?: string;
  presentationStyle?: string;
  language?: string;
  templateId?: string;
}) {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const userId = user.id;

  try {
    const presentation = await db.baseDocument.create({
      data: {
        id: generateId(),
        type: "PRESENTATION",
        documentType: "presentation",
        title: title ?? "Untitled Presentation",
        userId,
        updatedAt: new Date(),
        Presentation: {
          create: {
            content: content as unknown as InputJsonValue,
            theme: theme,
            imageSource,
            presentationStyle,
            language,
            outline: outline,
            templateId: templateId || "general",
          },
        },
      },
      include: {
        Presentation: true,
      },
    });

    return {
      success: true,
      message: "Presentation created successfully",
      presentation,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to create presentation",
    };
  }
}

export async function createEmptyPresentation(
  title: string,
  theme = "orbit",
  language = "en-US",
) {
  const emptyContent: { slides: PlateSlide[] } = { slides: [] };

  return createPresentation({
    content: emptyContent,
    title,
    theme,
    language,
  });
}

export async function updatePresentation({
  id,
  content,
  prompt,
  title,
  theme,
  outline,
  searchResults,
  imageSource,
  presentationStyle,
  language,
  thumbnailUrl,
}: {
  id: string;
  content?: {
    slides: PlateSlide[];
    config: Record<string, unknown>;
  };
  title?: string;
  theme?: string;
  prompt?: string;
  outline?: string[];
  searchResults?: Array<{ query: string; results: unknown[] }>;
  imageSource?: string;
  presentationStyle?: string;
  language?: string;
  thumbnailUrl?: string;
}) {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Extract values from content if provided there
    const effectiveTheme = theme;
    const effectiveImageSource = imageSource;
    const effectivePresentationStyle = presentationStyle;
    const effectiveLanguage = language;

    // Update base document with all presentation data
    const presentation = await db.baseDocument.update({
      where: { id },
      data: {
        title: title,
        thumbnailUrl,
        Presentation: {
          update: {
            prompt: prompt,
            content: content as unknown as InputJsonValue,
            theme: effectiveTheme,
            imageSource: effectiveImageSource,
            presentationStyle: effectivePresentationStyle,
            language: effectiveLanguage,
            outline,
            searchResults: searchResults as unknown as InputJsonValue,
          },
        },
      },
      include: {
        Presentation: true,
      },
    });

    return {
      success: true,
      message: "Presentation updated successfully",
      presentation,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update presentation",
    };
  }
}

export async function updatePresentationTitle(id: string, title: string) {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const presentation = await db.baseDocument.update({
      where: { id },
      data: { title },
      include: {
        Presentation: true,
      },
    });

    return {
      success: true,
      message: "Presentation title updated successfully",
      presentation,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update presentation title",
    };
  }
}

export async function deletePresentation(id: string) {
  return deletePresentations([id]);
}

export async function deletePresentations(ids: string[]) {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Delete the base documents using deleteMany (this will cascade delete the presentations)
    const result = await db.baseDocument.deleteMany({
      where: {
        id: {
          in: ids,
        },
        userId: user.id, // Ensure only user's own presentations can be deleted
      },
    });

    const deletedCount = result.count;
    const failedCount = ids.length - deletedCount;

    if (failedCount > 0) {
      return {
        success: deletedCount > 0,
        message:
          deletedCount > 0
            ? `Deleted ${deletedCount} presentations, failed to delete ${failedCount} presentations`
            : "Failed to delete presentations",
        partialSuccess: deletedCount > 0,
      };
    }

    return {
      success: true,
      message:
        ids.length === 1
          ? "Presentation deleted successfully"
          : `${deletedCount} presentations deleted successfully`,
    };
  } catch (error) {
    console.error("Failed to delete presentations:", error);
    return {
      success: false,
      message: "Failed to delete presentations",
    };
  }
}

// Get the presentation with the presentation content
export async function getPresentation(id: string) {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const presentation = await db.baseDocument.findUnique({
      where: { id },
      include: {
        Presentation: true,
      },
    });

    return {
      success: true,
      presentation,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to fetch presentation",
    };
  }
}

export async function getPresentationContent(id: string) {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const presentation = await db.baseDocument.findUnique({
      where: { id },
      include: {
        Presentation: {
          select: {
            id: true,
            content: true,
            theme: true,
            outline: true,
          },
        },
      },
    });

    if (!presentation) {
      return {
        success: false,
        message: "Presentation not found",
      };
    }

    // Check if the user has access to this presentation
    if (presentation.userId !== user.id && !presentation.isPublic) {
      return {
        success: false,
        message: "Unauthorized access",
      };
    }

    return {
      success: true,
      presentation: presentation.Presentation,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to fetch presentation",
    };
  }
}

export async function updatePresentationTheme(id: string, theme: string) {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const presentation = await db.presentation.update({
      where: { id },
      data: { theme },
    });

    return {
      success: true,
      message: "Presentation theme updated successfully",
      presentation,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update presentation theme",
    };
  }
}

export async function duplicatePresentation(id: string, newTitle?: string) {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    // Get the original presentation
    const original = await db.baseDocument.findUnique({
      where: { id },
      include: {
        Presentation: true,
      },
    });

    if (!original?.Presentation) {
      return {
        success: false,
        message: "Original presentation not found",
      };
    }

    // Create a new presentation with the same content
    const duplicated = await db.baseDocument.create({
      data: {
        id: generateId(),
        type: "PRESENTATION",
        documentType: "presentation",
        title: newTitle ?? `${original.title} (Copy)`,
        userId: user.id,
        updatedAt: new Date(),
        isPublic: false,
        Presentation: {
          create: {
            content: original.Presentation.content as unknown as InputJsonValue,
            theme: original.Presentation.theme,
          },
        },
      },
      include: {
        Presentation: true,
      },
    });

    return {
      success: true,
      message: "Presentation duplicated successfully",
      presentation: duplicated,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to duplicate presentation",
    };
  }
}
