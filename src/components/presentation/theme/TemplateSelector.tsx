"use client";

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
import { templates, type Templates, type TemplateCategory } from "@/lib/presentation/templates";
import { FileText } from "lucide-react";

interface TemplateSelectorProps {
  template: Templates | string | null;
  onTemplateChange: (template: Templates | string | null) => void;
  className?: string;
  showLabel?: boolean;
}

// Group templates by category
const templatesByCategory: Record<TemplateCategory, Array<{ key: Templates; template: typeof templates[Templates] }>> = {
  general: [],
  medical: [],
  clinical: [],
  academic: [],
  education: [],
};

// Populate categories
Object.entries(templates).forEach(([key, template]) => {
  templatesByCategory[template.category].push({ key: key as Templates, template });
});

export function TemplateSelector({
  template,
  onTemplateChange,
  className,
  showLabel = true,
}: TemplateSelectorProps) {
  const handleTemplateChange = (value: string) => {
    console.log("🎯 [TEMPLATE SELECTOR] Template changed to:", value);
    onTemplateChange(value as Templates);
  };
  
  // Get the currently selected template for display
  const selectedTemplate = template ? templates[template as Templates] : null;
  
  return (
    <div className={className}>
      {showLabel && (
        <Label className="text-sm font-medium mb-2 block">Presentation Template</Label>
      )}
      <Select
        value={template || "general"}
        onValueChange={handleTemplateChange}
      >
        <SelectTrigger className="h-auto min-h-[80px] py-4">
          <div className="flex items-center gap-2 w-full">
            <FileText className="h-5 w-5 flex-shrink-0" />
            {selectedTemplate ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg flex-shrink-0">{selectedTemplate.icon}</span>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium truncate">{selectedTemplate.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{selectedTemplate.description}</div>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Select a template</span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {/* General */}
          {templatesByCategory.general.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-primary/80 flex items-center gap-1">
                📊 General
              </SelectLabel>
              {templatesByCategory.general.map(({ key, template: t }) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* Medical */}
          {templatesByCategory.medical.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-primary/80 flex items-center gap-1">
                🏥 Medical Education
              </SelectLabel>
              {templatesByCategory.medical.map(({ key, template: t }) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* Clinical */}
          {templatesByCategory.clinical.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-primary/80 flex items-center gap-1">
                🩺 Clinical Practice
              </SelectLabel>
              {templatesByCategory.clinical.map(({ key, template: t }) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* Academic */}
          {templatesByCategory.academic.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-primary/80 flex items-center gap-1">
                🔬 Research & Academic
              </SelectLabel>
              {templatesByCategory.academic.map(({ key, template: t }) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* Education */}
          {templatesByCategory.education.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-primary/80 flex items-center gap-1">
                📚 Medical Education
              </SelectLabel>
              {templatesByCategory.education.map(({ key, template: t }) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
