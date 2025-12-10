"use client";

import { type ImageModelList } from "@/app/_actions/image/generate";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image, Wand2 } from "lucide-react";

// AI image generation removed - only stock images available
export const IMAGE_MODELS: { value: ImageModelList; label: string }[] = [];

interface ImageSourceSelectorProps {
  imageSource: "ai" | "stock";
  imageModel: ImageModelList;
  stockImageProvider: "unsplash" | "openi" | "wikimedia";
  onImageSourceChange: (source: "ai" | "stock") => void;
  onImageModelChange: (model: ImageModelList) => void;
  onStockImageProviderChange: (provider: "unsplash" | "openi" | "wikimedia") => void;
  className?: string;
  showLabel?: boolean;
}

export function ImageSourceSelector({
  imageSource,
  imageModel,
  stockImageProvider,
  onImageSourceChange,
  onImageModelChange,
  onStockImageProviderChange,
  className,
  showLabel = true,
}: ImageSourceSelectorProps) {
  return (
    <div className={className}>
      {showLabel && (
        <Label className="text-sm font-medium mb-2 block">Image Source</Label>
      )}
      <Select
        value={`stock-${stockImageProvider}`}
        onValueChange={(value) => {
          if (value.startsWith("stock-")) {
            // Handle stock image selection
            const provider = value.replace("stock-", "") as "unsplash" | "openi" | "wikimedia";
            onImageSourceChange("stock");
            onStockImageProviderChange(provider);
          } else {
            // Handle AI model selection
            onImageSourceChange("ai");
            onImageModelChange(value as ImageModelList);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select image generation method" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-primary/80 flex items-center gap-1">
              <Image size={10} />
              Stock Images
            </SelectLabel>
            <SelectItem value="stock-unsplash">Unsplash (General)</SelectItem>
            <SelectItem value="stock-wikimedia">Wikimedia Commons (Medical)</SelectItem>
            <SelectItem value="stock-openi">OpenI (Medical - Beta)</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
