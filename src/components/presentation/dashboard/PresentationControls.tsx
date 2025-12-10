import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePresentationState } from "@/states/presentation-state";
import { Layout } from "lucide-react";
import { TemplateSelector } from "../theme/TemplateSelector";

export function PresentationControls({
  shouldShowLabel = true,
}: {
  shouldShowLabel?: boolean;
}) {
  const {
    numSlides,
    setNumSlides,
    language,
    setLanguage,
    pageStyle,
    setPageStyle,
    template,
    setTemplate,
  } = usePresentationState();

  return (
    <div className="space-y-4">
      {/* Template Selector - Full Width */}
      <TemplateSelector
        template={template}
        onTemplateChange={setTemplate}
        showLabel={shouldShowLabel}
      />

      {/* Other Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Number of Slides */}
      <div>
        {shouldShowLabel && (
          <label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Number of slides
          </label>
        )}
        <Select
          value={String(numSlides)}
          onValueChange={(v) => setNumSlides(Number(v))}
        >
          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
            <SelectValue placeholder="Select number of slides" />
          </SelectTrigger>
          <SelectContent>
            {[15, 20, 25, 30, 35, 40, 45, 50].map((num) => (
              <SelectItem key={num} value={String(num)} className="text-xs sm:text-sm">
                {num} slides
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Language */}
      <div>
        {shouldShowLabel && (
          <label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Language
          </label>
        )}
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en-US" className="text-xs sm:text-sm">🇺🇸 English (US)</SelectItem>
            <SelectItem value="pt" className="text-xs sm:text-sm">🇵🇹 Portuguese</SelectItem>
            <SelectItem value="es" className="text-xs sm:text-sm">🇪🇸 Spanish</SelectItem>
            <SelectItem value="fr" className="text-xs sm:text-sm">🇫🇷 French</SelectItem>
            <SelectItem value="de" className="text-xs sm:text-sm">🇩🇪 German</SelectItem>
            <SelectItem value="it" className="text-xs sm:text-sm">🇮🇹 Italian</SelectItem>
            <SelectItem value="ja" className="text-xs sm:text-sm">🇯🇵 Japanese</SelectItem>
            <SelectItem value="ko" className="text-xs sm:text-sm">🇰🇷 Korean</SelectItem>
            <SelectItem value="zh" className="text-xs sm:text-sm">🇨🇳 Chinese</SelectItem>
            <SelectItem value="ru" className="text-xs sm:text-sm">🇷🇺 Russian</SelectItem>
            <SelectItem value="hi" className="text-xs sm:text-sm">🇮🇳 Hindi</SelectItem>
            <SelectItem value="ar" className="text-xs sm:text-sm">🇸🇦 Arabic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Page Style */}
      <div>
        {shouldShowLabel && (
          <label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Page style
          </label>
        )}
        <Select value={pageStyle} onValueChange={setPageStyle}>
          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Layout className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <SelectValue placeholder="Select page style" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default" className="text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span>📄 Default</span>
              </div>
            </SelectItem>
            <SelectItem value="traditional" className="text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span>📰 Traditional</span>
              </div>
            </SelectItem>
            <SelectItem value="tall" className="text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span>📱 Tall</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      </div>
    </div>
  );
}
