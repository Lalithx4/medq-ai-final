# Slide Generation Template System

## Overview

The presentation slide generation system uses a **prompt-based XML templating approach** where an AI model generates structured XML that is then parsed into rich Plate.js editor elements. This document explains the complete flow from user input to rendered slides.

---

## Architecture Flow

```
User Input (Topic)
    ↓
Outline Generation (API)
    ↓
Template Variable Substitution
    ↓
AI Model (Streaming XML Response)
    ↓
XML Parser (Incremental Processing)
    ↓
Plate.js Slide Objects
    ↓
Editor Rendering
```

---

## 1. Prompt Template System

### Location
`src/app/api/presentation/generate/route.ts`

### Template Structure

The core template (`slidesTemplate`) is a large prompt that instructs the AI on:
- **Output format**: XML with specific tags
- **Content guidelines**: Concise, visual-focused content
- **Layout variety**: Use different layouts per slide
- **Image requirements**: Detailed image queries
- **Mandatory elements**: References slide at the end

### Template Variables

The template uses placeholder variables that are replaced at runtime:

| Variable | Description | Example |
|----------|-------------|---------|
| `{TITLE}` | Generated presentation title | "Introduction to AI" |
| `{PROMPT}` | User's original request | "Create a presentation about machine learning" |
| `{OUTLINE_FORMATTED}` | Generated outline topics (joined with `\n\n`) | "## Topic 1\n\n## Topic 2" |
| `{LANGUAGE}` | Target language for content | "en-US", "es-ES" |
| `{TONE}` | Style/tone for image generation | "professional", "creative" |
| `{TOTAL_SLIDES}` | Number of slides to generate | "8" |
| `{SEARCH_RESULTS}` | Research context from web search | Formatted search results |
| `{CURRENT_DATE}` | Current date for context | "Friday, October 24, 2025" |

### Variable Substitution

```typescript
const formattedPrompt = slidesTemplate
  .replace(/{TITLE}/g, title)
  .replace(/{PROMPT}/g, userPrompt || "No specific prompt provided")
  .replace(/{CURRENT_DATE}/g, currentDate)
  .replace(/{LANGUAGE}/g, language)
  .replace(/{TONE}/g, tone)
  .replace(/{OUTLINE_FORMATTED}/g, outline.join("\n\n"))
  .replace(/{TOTAL_SLIDES}/g, outline.length.toString())
  .replace(/{SEARCH_RESULTS}/g, searchResultsText);
```

---

## 2. Available Layout Components

The template defines 15+ layout types that the AI can use to structure content:

### Basic Layouts

#### 1. COLUMNS
**Purpose**: Multi-column comparisons or feature lists  
**XML Structure**:
```xml
<COLUMNS>
  <DIV><H3>Title 1</H3><P>Description 1</P></DIV>
  <DIV><H3>Title 2</H3><P>Description 2</P></DIV>
  <DIV><H3>Title 3</H3><P>Description 3</P></DIV>
</COLUMNS>
```

#### 2. BULLETS
**Purpose**: Key points with titles and descriptions  
**XML Structure**:
```xml
<BULLETS>
  <DIV><H3>Point 1</H3><P>Brief explanation</P></DIV>
  <DIV><H3>Point 2</H3><P>Concise description</P></DIV>
  <DIV><H3>Point 3</H3><P>Short summary</P></DIV>
</BULLETS>
```

#### 3. ICONS
**Purpose**: Concepts represented with icon symbols  
**XML Structure**:
```xml
<ICONS>
  <DIV><ICON query="rocket" /><H3>Innovation</H3><P>Description</P></DIV>
  <DIV><ICON query="shield" /><H3>Security</H3><P>Description</P></DIV>
</ICONS>
```

### Process & Flow Layouts

#### 4. CYCLE
**Purpose**: Circular processes and workflows  
**XML Structure**:
```xml
<CYCLE>
  <DIV><H3>Research</H3><P>Initial exploration phase</P></DIV>
  <DIV><H3>Design</H3><P>Solution creation phase</P></DIV>
  <DIV><H3>Implement</H3><P>Execution phase</P></DIV>
  <DIV><H3>Evaluate</H3><P>Assessment phase</P></DIV>
</CYCLE>
```

#### 5. ARROWS
**Purpose**: Horizontal cause-effect or sequential flows  
**XML Structure**:
```xml
<ARROWS>
  <DIV><H3>Challenge</H3><P>Current problem</P></DIV>
  <DIV><H3>Solution</H3><P>Our approach</P></DIV>
  <DIV><H3>Result</H3><P>Outcomes</P></DIV>
</ARROWS>
```

#### 6. ARROW-VERTICAL
**Purpose**: Vertical step-by-step flows (preferred for linear phases)  
**XML Structure**:
```xml
<ARROW-VERTICAL>
  <DIV><H3>Discover</H3><P>Research & requirements</P></DIV>
  <DIV><H3>Design</H3><P>UX & architecture</P></DIV>
  <DIV><H3>Deliver</H3><P>Build, test, deploy</P></DIV>
</ARROW-VERTICAL>
```

#### 7. TIMELINE
**Purpose**: Chronological progression of events  
**XML Structure**:
```xml
<TIMELINE>
  <DIV><H3>2022</H3><P>Market research completed</P></DIV>
  <DIV><H3>2023</H3><P>Product development phase</P></DIV>
  <DIV><H3>2024</H3><P>Global market expansion</P></DIV>
</TIMELINE>
```

### Hierarchical Layouts

#### 8. PYRAMID
**Purpose**: Hierarchical importance or organizational structure  
**XML Structure**:
```xml
<PYRAMID>
  <DIV><H3>Vision</H3><P>Our aspirational goal</P></DIV>
  <DIV><H3>Strategy</H3><P>Key approaches</P></DIV>
  <DIV><H3>Tactics</H3><P>Implementation steps</P></DIV>
</PYRAMID>
```

#### 9. STAIRCASE
**Purpose**: Progressive advancement or maturity levels  
**XML Structure**:
```xml
<STAIRCASE>
  <DIV><H3>Basic</H3><P>Foundational capabilities</P></DIV>
  <DIV><H3>Advanced</H3><P>Enhanced features</P></DIV>
  <DIV><H3>Expert</H3><P>Premium capabilities</P></DIV>
</STAIRCASE>
```

### Comparison Layouts

#### 10. BOXES
**Purpose**: Simple information tiles or feature highlights  
**XML Structure**:
```xml
<BOXES>
  <DIV><H3>Speed</H3><P>Faster delivery cycles</P></DIV>
  <DIV><H3>Quality</H3><P>Automated testing</P></DIV>
  <DIV><H3>Security</H3><P>Shift-left practices</P></DIV>
</BOXES>
```

#### 11. COMPARE
**Purpose**: Side-by-side comparison of two options  
**XML Structure**:
```xml
<COMPARE>
  <DIV><H3>Solution A</H3><LI>Feature 1</LI><LI>Feature 2</LI></DIV>
  <DIV><H3>Solution B</H3><LI>Feature 3</LI><LI>Feature 4</LI></DIV>
</COMPARE>
```

#### 12. BEFORE-AFTER
**Purpose**: Transformation or improvement visualization  
**XML Structure**:
```xml
<BEFORE-AFTER>
  <DIV><H3>Before</H3><P>Manual processes, scattered data</P></DIV>
  <DIV><H3>After</H3><P>Automated workflows, unified insights</P></DIV>
</BEFORE-AFTER>
```

#### 13. PROS-CONS
**Purpose**: Trade-off analysis  
**XML Structure**:
```xml
<PROS-CONS>
  <PROS><H3>Pros</H3><LI>Advantage 1</LI><LI>Advantage 2</LI></PROS>
  <CONS><H3>Cons</H3><LI>Disadvantage 1</LI><LI>Disadvantage 2</LI></CONS>
</PROS-CONS>
```

### Data Layouts

#### 14. TABLE
**Purpose**: Tabular data and structured comparisons  
**XML Structure**:
```xml
<TABLE>
  <TR><TH>Header 1</TH><TH>Header 2</TH><TH>Header 3</TH></TR>
  <TR><TD>Data 1</TD><TD>Data 2</TD><TD>Data 3</TD></TR>
  <TR><TD>Data 4</TD><TD>Data 5</TD><TD>Data 6</TD></TR>
</TABLE>
```

#### 15. CHART
**Purpose**: Data visualizations  
**Supported Types**: `bar`, `pie`, `line`, `area`, `radar`, `scatter`

**Label/Value Charts**:
```xml
<CHART charttype="bar">
  <DATA><LABEL>Q1</LABEL><VALUE>24</VALUE></DATA>
  <DATA><LABEL>Q2</LABEL><VALUE>36</VALUE></DATA>
  <DATA><LABEL>Q3</LABEL><VALUE>42</VALUE></DATA>
</CHART>
```

**Scatter Charts**:
```xml
<CHART charttype="scatter">
  <DATA><X>1</X><Y>2</Y></DATA>
  <DATA><X>3</X><Y>5</Y></DATA>
  <DATA><X>5</X><Y>8</Y></DATA>
</CHART>
```

---

## 3. XML Output Structure

### Complete Presentation Format

```xml
<PRESENTATION>
  <!-- Slide 1 -->
  <SECTION layout="left">
    <BULLETS>
      <DIV><H3>Point 1</H3><P>Description</P></DIV>
      <DIV><H3>Point 2</H3><P>Description</P></DIV>
    </BULLETS>
    <IMG query="detailed image description for AI generation" />
  </SECTION>
  
  <!-- Slide 2 -->
  <SECTION layout="right">
    <COLUMNS>
      <DIV><H3>Feature 1</H3><P>Details</P></DIV>
      <DIV><H3>Feature 2</H3><P>Details</P></DIV>
    </COLUMNS>
    <IMG query="another detailed image query" />
  </SECTION>
  
  <!-- More slides... -->
</PRESENTATION>
```

### Section Layout Types

Each `<SECTION>` has a `layout` attribute controlling image placement:

| Layout | Description | Image Position |
|--------|-------------|----------------|
| `left` | Image on left side | Left 40%, Content right 60% |
| `right` | Image on right side | Content left 60%, Image right 40% |
| `vertical` | Image at top | Image top 40%, Content bottom 60% |
| `background` | Image as background | Full background with overlay |

**Template Instruction**: The AI is instructed to vary layouts throughout the presentation, using each type at least twice but not more than twice consecutively.

### Image Queries

Images use the `<IMG>` tag with a `query` attribute:

```xml
<!-- Good: Detailed, specific queries -->
<IMG query="futuristic smart city with renewable energy infrastructure and autonomous vehicles in morning light" />
<IMG query="close-up of microchip with circuit board patterns in blue and gold tones" />

<!-- Bad: Generic queries -->
<IMG query="city" />
<IMG query="microchip" />
```

**Root-level images** (direct children of `<SECTION>`) become the slide's main background/side image.  
**Inline images** (within layout components) are embedded in the content.

---

## 4. Parser Implementation

### Location
`src/components/presentation/utils/parser.ts`

### SlideParser Class

The `SlideParser` class handles **incremental streaming parsing** of XML into Plate.js format.

#### Key Methods

##### `parseChunk(chunk: string): PlateSlide[]`
- Processes streaming XML chunks as they arrive
- Handles both incremental updates and full content replacements
- Extracts complete `<SECTION>` blocks
- Returns newly parsed slides

##### `finalize(): PlateSlide[]`
- Called when streaming is complete
- Processes any remaining partial sections
- Force-closes incomplete tags
- Returns final slides

##### `extractCompleteSections(): void`
- Scans buffer for complete `<SECTION>...</SECTION>` blocks
- Handles `<PRESENTATION>` wrapper tag
- Deals with malformed XML (missing closing tags)
- Extracts sections into `completedSections` array

##### `convertSectionToPlate(sectionString: string): PlateSlide`
- Parses XML string into structured `XMLNode` tree
- Extracts section attributes (layout type)
- Processes child elements into Plate.js nodes
- Extracts root-level images
- Returns complete `PlateSlide` object

##### `processTopLevelNode(node: XMLNode): PlateNode | null`
- Routes XML tags to specific layout creators
- Handles all 15+ layout types
- Returns appropriate Plate.js element

#### Layout Creator Methods

Each layout type has a dedicated creator method:

```typescript
createColumns(node: XMLNode): TColumnGroupElement
createBulletGroup(node: XMLNode): TBulletGroupElement
createIconList(node: XMLNode): TIconListElement
createCycle(node: XMLNode): TCycleGroupElement
createArrowList(node: XMLNode): TArrowListElement
createPyramid(node: XMLNode): TPyramidGroupElement
createTimeline(node: XMLNode): TTimelineGroupElement
createStaircase(node: XMLNode): TStairGroupElement
createBoxes(node: XMLNode): TBoxGroupElement
createCompare(node: XMLNode): TCompareGroupElement
createBeforeAfter(node: XMLNode): TBeforeAfterGroupElement
createProsCons(node: XMLNode): TProsConsGroupElement
createArrowVertical(node: XMLNode): TSequenceArrowGroupElement
createPlainTable(node: XMLNode): TTableElement
createChart(node: XMLNode): TChartElement
```

### PlateSlide Type

```typescript
type PlateSlide = {
  id: string;                    // Unique slide identifier (nanoid)
  content: PlateNode[];          // Array of Plate.js elements
  rootImage?: RootImage;         // Optional background/side image
  layoutType?: LayoutType;       // Image placement: left|right|vertical|background
  alignment?: "start" | "center" | "end";  // Content alignment
  bgColor?: string;              // Background color
  width?: "S" | "M" | "L";      // Content width
};

type RootImage = {
  query: string;                 // Image search query
  url?: string;                  // Generated image URL
  cropSettings?: ImageCropSettings;  // Crop/zoom settings
  layoutType?: LayoutType;       // Image placement
  size?: { w?: string; h?: number };  // Dimensions
};
```

### PlateNode Types

The parser creates various Plate.js element types:

```typescript
type PlateNode =
  | ParagraphElement          // <P>
  | HeadingElement           // <H1>, <H2>, <H3>, etc.
  | ImageElement             // <IMG>
  | TColumnGroupElement      // <COLUMNS>
  | TBulletGroupElement      // <BULLETS>
  | TIconListElement         // <ICONS>
  | TCycleGroupElement       // <CYCLE>
  | TArrowListElement        // <ARROWS>
  | TSequenceArrowGroupElement  // <ARROW-VERTICAL>
  | TTimelineGroupElement    // <TIMELINE>
  | TPyramidGroupElement     // <PYRAMID>
  | TStairGroupElement       // <STAIRCASE>
  | TBoxGroupElement         // <BOXES>
  | TCompareGroupElement     // <COMPARE>
  | TBeforeAfterGroupElement // <BEFORE-AFTER>
  | TProsConsGroupElement    // <PROS-CONS>
  | TTableElement            // <TABLE>
  | TChartElement            // <CHART>
  | TButtonElement           // <BUTTON>
  // ... and their child elements
```

---

## 5. Generation Flow

### Step-by-Step Process

#### 1. User Input
User provides a topic or prompt through the UI.

#### 2. Outline Generation
- API call to `/api/presentation/outline`
- Generates structured outline with main topics
- Optionally performs web search for research context
- Returns array of outline topics

#### 3. Slide Generation Request
- API call to `/api/presentation/generate`
- Sends: title, prompt, outline, language, tone, modelProvider, searchResults
- Template variables are substituted
- Formatted prompt sent to AI model

#### 4. AI Streaming Response
- AI model generates XML in streaming fashion
- Chunks arrive progressively (not all at once)
- Each chunk may contain partial or complete sections

#### 5. Incremental Parsing
```typescript
// In PresentationGenerationManager.tsx
parser.parseChunk(currentText);  // Process each chunk
const newSlides = parser.parseChunk(currentText);
usePresentationState.getState().setSlides(allSlides);  // Update state
```

#### 6. Slide Rendering
- Zustand state updates trigger React re-renders
- `SlideContainer` component renders each slide
- `PresentationEditor` (Plate.js) renders rich content
- Images are generated asynchronously via image generation API

#### 7. Finalization
```typescript
parser.finalize();  // Process remaining content
parser.clearAllGeneratingMarks();  // Remove loading indicators
```

---

## 6. Template Guidelines & Rules

### Content Guidelines (from template)

1. **Conciseness**: 1-2 sentences per point (15-25 words max per paragraph)
2. **Quantity**: 4-6 points per slide (not just 2-3)
3. **Variety**: Each slide must use a DIFFERENT layout component
4. **Visuals**: Include detailed image queries (not generic)
5. **Expansion**: Don't copy outline verbatim - expand with examples, data, trends

### Critical Rules

1. Generate **exactly** `{TOTAL_SLIDES}` slides (enforced by template)
2. Last slide **must** be a References/Citations slide
3. **Never** repeat layouts in consecutive slides
4. Use each section layout (left/right/vertical) at least twice
5. Don't use same section layout more than twice in a row
6. Use only defined XML tags (no invented tags)
7. Include at least one detailed image query per slide

### References Slide (Mandatory)

The final slide must cite sources:

```xml
<SECTION layout="vertical">
  <BULLETS>
    <DIV><H3>Reference 1</H3><P>Smith, J. (2024). Title. Journal. https://example.com</P></DIV>
    <DIV><H3>Reference 2</H3><P>Johnson, A. (2023). Title. Publication. DOI: 10.1234/example</P></DIV>
    <DIV><H3>Reference 3</H3><P>Brown, K. (2024). Title. Source. URL</P></DIV>
  </BULLETS>
  <IMG query="books and research icon" />
</SECTION>
```

---

## 7. Model Selection

### Location
`src/lib/model-picker.ts`

The system supports multiple AI providers:

```typescript
function modelPicker(provider: string, modelId?: string) {
  switch (provider) {
    case "openai":
      return openai(modelId || "gpt-4o");
    case "anthropic":
      return anthropic(modelId || "claude-3-5-sonnet-20241022");
    case "cerebras":
      return createOpenAI({ baseURL: "https://api.cerebras.ai/v1" })(modelId || "llama3.1-70b");
    // ... other providers
  }
}
```

### Streaming with AI SDK

```typescript
import { streamText } from "ai";

const result = streamText({
  model: modelPicker(modelProvider, modelId),
  prompt: formattedPrompt,
});

return result.toDataStreamResponse();
```

---

## 8. State Management

### Zustand Store
`src/states/presentation-state.ts`

Key state properties:
```typescript
{
  slides: PlateSlide[];              // Current slides
  currentPresentationId: string;     // Database ID
  isGeneratingPresentation: boolean; // Generation status
  outline: string[];                 // Generated outline
  searchResults: SearchResult[];     // Research data
  // ... other properties
}
```

### State Updates During Generation

```typescript
// Start generation
setIsGeneratingPresentation(true);

// Update slides incrementally
setSlides([...existingSlides, ...newSlides]);

// Complete generation
setIsGeneratingPresentation(false);
setShouldFetchData(false);  // Prevent refetch
```

---

## 9. Image Generation

Images are generated separately after slide parsing:

### Process
1. Parser extracts image queries from XML
2. Slides created with `query` but no `url`
3. Background process calls image generation API
4. Image URLs updated in slide state
5. UI re-renders with generated images

### Image Sources
- **AI Generated**: DALL-E, Stable Diffusion, etc.
- **Stock Photos**: Unsplash, Pexels integration

---

## 10. Error Handling

### Malformed XML
- Parser handles incomplete tags
- Force-closes unclosed sections in `finalize()`
- Falls back to basic text extraction

### Missing Layouts
- Unknown tags logged as warnings
- Skipped gracefully (returns `null`)
- Doesn't break entire presentation

### Streaming Interruptions
- Partial sections buffered
- Completed on finalization
- No data loss

---

## 11. Extending the System

### Adding a New Layout Type

#### Step 1: Update Template
Add layout definition to `slidesTemplate` in `route.ts`:

```typescript
const slidesTemplate = `
...
16. NEWLAYOUT: For [purpose]
\`\`\`xml
<NEWLAYOUT>
  <DIV><H3>Item 1</H3><P>Description</P></DIV>
  <DIV><H3>Item 2</H3><P>Description</P></DIV>
</NEWLAYOUT>
\`\`\`
...
`;
```

#### Step 2: Define Types
Create type definitions in appropriate plugin file:

```typescript
// src/components/presentation/editor/plugins/newlayout-plugin.ts
export type TNewLayoutGroupElement = {
  type: "newlayout";
  children: TNewLayoutItemElement[];
};

export type TNewLayoutItemElement = {
  type: "newlayout-item";
  children: Descendant[];
};
```

#### Step 3: Add Parser Support
Update `parser.ts`:

```typescript
// Add to processTopLevelNode switch
case "NEWLAYOUT":
  return this.createNewLayout(node);

// Add creator method
private createNewLayout(node: XMLNode): TNewLayoutGroupElement {
  const items: TNewLayoutItemElement[] = [];
  for (const child of node.children) {
    if (child.tag.toUpperCase() === "DIV") {
      items.push({
        type: "newlayout-item",
        children: this.processNodes(child.children) as Descendant[],
      });
    }
  }
  return { type: "newlayout", children: items };
}
```

#### Step 4: Create Plugin
Implement Plate.js plugin with rendering logic:

```typescript
// src/components/presentation/editor/plugins/newlayout-plugin.ts
export const NewLayoutPlugin = createPlatePlugin({
  key: "newlayout",
  node: { isElement: true },
});
```

#### Step 5: Create Component
Build React component for rendering:

```typescript
// src/components/presentation/editor/nodes/newlayout-node.tsx
export function NewLayoutNode({ children, element }: PlateElementProps) {
  return (
    <div className="newlayout-container">
      {children}
    </div>
  );
}
```

#### Step 6: Register Plugin
Add to editor configuration:

```typescript
// src/components/presentation/editor/presentation-editor.tsx
const plugins = [
  // ... existing plugins
  NewLayoutPlugin,
];
```

---

## 12. Performance Considerations

### Streaming Benefits
- **Progressive rendering**: Users see slides as they're generated
- **Reduced perceived latency**: First slide appears quickly
- **Memory efficient**: Process chunks incrementally

### Parser Optimization
- **Section ID mapping**: Maintains consistent IDs across updates
- **Minimal re-parsing**: Only processes new content
- **Efficient buffer management**: Removes processed sections

### State Updates
- **Batched updates**: Multiple slides added at once
- **Immutable patterns**: Spread operators for state updates
- **Selective re-renders**: React memo for slide components

---

## 13. Debugging

### Console Logging

The system includes extensive debug logging:

```typescript
// Parser logs
console.log("🔍 [PARSER] parseChunk called, chunk length:", chunk.length);
console.log("✅ Found complete section, total completed:", this.completedSections.length);
console.log("🎨 Created slide:", { id, contentElements, hasRootImage });

// Generation logs
console.log("🚀 Starting AI stream generation...");
console.log("📦 [MAIN] Fetched presentation from DB:", { id, slidesCount });
```

### Common Issues

1. **Slides not appearing**: Check `shouldFetchData` flag
2. **Duplicate slides**: Verify section ID mapping
3. **Missing layouts**: Ensure plugin registered
4. **Malformed content**: Check XML structure in logs

---

## 14. Future Enhancements

### Potential Improvements

1. **Template Versioning**: Store template version with presentations
2. **Custom Templates**: Allow users to define custom layouts
3. **Layout Suggestions**: AI recommends best layout for content type
4. **Real-time Collaboration**: Multiple users editing same presentation
5. **Template Marketplace**: Share and download community templates
6. **A/B Testing**: Compare different template variations
7. **Accessibility**: Enhanced ARIA labels and keyboard navigation
8. **Export Formats**: PDF, PowerPoint, Google Slides

---

## Summary

The template system is a **declarative, streaming-based architecture** that:

1. **Instructs** the AI via a comprehensive prompt template
2. **Generates** structured XML with semantic layout components
3. **Parses** incrementally for progressive rendering
4. **Transforms** XML into rich Plate.js editor elements
5. **Renders** with full editing capabilities

This approach provides **flexibility** (easy to add new layouts), **performance** (streaming updates), and **maintainability** (clear separation of concerns).
