"use server";

// AI image generation disabled - only stock images are supported
export type ImageModelList =
  | "black-forest-labs/FLUX1.1-pro"
  | "black-forest-labs/FLUX.1-schnell"
  | "black-forest-labs/FLUX.1-schnell-Free"
  | "black-forest-labs/FLUX.1-pro"
  | "black-forest-labs/FLUX.1-dev";

export async function generateImageAction(
  prompt: string,
  model: ImageModelList = "black-forest-labs/FLUX.1-schnell-Free",
) {
  // AI image generation has been disabled
  console.log("AI image generation is disabled. Please use stock images instead.");
  
  return {
    success: false,
    error: "AI image generation is disabled. Please use stock images (Unsplash or OpenI) instead.",
  };
}
