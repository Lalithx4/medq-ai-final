# Slide Layout & Theme Customization Guide

## Overview
This guide explains how to customize the presentation slide layouts, themes, and visual formatting.

---

## 📐 Slide Layouts

### Where Layouts Are Defined

Layouts control how content (titles, text, images) is positioned within each slide. There are **multiple layout types**:

#### 1. **Basic Layouts** (`src/components/presentation/editor/custom-elements/`)

| Layout Component | File | Description |
|-----------------|------|-------------|
| **Bullets** | `bullet.tsx`, `bullet-item.tsx` | Bullet point lists |
| **Columns** | N/A (uses grid) | Multi-column layouts |
| **Icons** | `icon-list.tsx`, `icon-list-item.tsx` | Icon-based lists |
| **Cycle** | `cycle-element.tsx`, `cycle-item.tsx` | Circular process diagrams |
| **Arrows** | `arrow-list.tsx`, `arrow-item.tsx` | Arrow-based flows |
| **Timeline** | `timeline.tsx`, `timeline-item.tsx` | Chronological timelines |
| **Pyramid** | `pyramid.tsx`, `pyramid-item.tsx` | Hierarchical pyramids |
| **Staircase** | `staircase.tsx`, `staircase-item.tsx` | Step-by-step progressions |
| **Compare** | `compare.tsx`, `compare-side.tsx` | Side-by-side comparisons |
| **Before/After** | `before-after.tsx`, `before-after-side.tsx` | Before/after views |
| **Pros/Cons** | `pros-cons.tsx`, `pros-item.tsx`, `cons-item.tsx` | Pros and cons lists |
| **Box** | `box.tsx`, `box-item.tsx` | Boxed content sections |
| **Sequence** | `sequence-arrow.tsx`, `sequence-arrow-item.tsx` | Sequential flows |

#### 2. **Chart Layouts** (`src/components/presentation/editor/custom-elements/`)

| Chart Type | File | Description |
|-----------|------|-------------|
| **Bar Chart** | `bar-graph.tsx` | Vertical/horizontal bars |
| **Line Chart** | `line-graph.tsx` | Line graphs |
| **Pie Chart** | `pie-chart.tsx` | Circular pie charts |
| **Area Chart** | `area-chart.tsx` | Filled area charts |
| **Scatter Plot** | `scatter-plot.tsx` | Scatter plots |
| **Radar Chart** | `radar-chart.tsx` | Radar/spider charts |

### How to Customize a Layout

**Example: Customizing the Timeline Layout**

```tsx
// File: src/components/presentation/editor/custom-elements/timeline.tsx

export function Timeline({ element, children }: StyledPlateElementProps) {
  const { orientation, sidedness, numbered } = element;

  return (
    <PlateElement asChild element={element}>
      <div
        className={cn(
          "timeline-container",
          orientation === "vertical" ? "flex flex-col gap-6" : "flex flex-row gap-8",
          sidedness === "double" && "timeline-double-sided"
        )}
        style={{
          // CUSTOMIZE SPACING HERE
          padding: "2rem",
          gap: "3rem", // Change gap between items
        }}
      >
        {children}
      </div>
    </PlateElement>
  );
}
```

**Example: Customizing Timeline Items**

```tsx
// File: src/components/presentation/editor/custom-elements/timeline-item.tsx

export function TimelineItem({ element, children }: StyledPlateElementProps) {
  return (
    <PlateElement asChild element={element}>
      <div
        className="timeline-item"
        style={{
          // CUSTOMIZE ITEM APPEARANCE
          backgroundColor: "#f8f9fa", // Add background
          borderRadius: "12px", // Rounded corners
          padding: "1.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)", // Add shadow
        }}
      >
        {/* Customize the dot/marker */}
        <div className="timeline-marker" style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "#3B82F6", // Change color
        }} />
        
        {children}
      </div>
    </PlateElement>
  );
}
```

### Layout Configuration

Layouts are registered in:
```typescript
// File: src/components/presentation/editor/lib.ts

export const LAYOUT_TYPES = [
  { type: BULLET_LIST, name: "Bullets" },
  { type: CYCLE_GROUP, name: "Cycle" },
  { type: ICON_LIST, name: "Icons" },
  { type: ARROW_LIST, name: "Arrows" },
  { type: PYRAMID_GROUP, name: "Pyramid" },
  { type: TIMELINE_GROUP, name: "Timeline" },
  // ADD NEW LAYOUTS HERE
];
```

---

## 🎨 Themes

### Where Themes Are Defined

```typescript
// File: src/lib/presentation/themes.ts
```

### Theme Structure

Each theme has:
- **Colors** (light & dark mode)
- **Fonts** (heading & body)
- **Border radius**
- **Shadows**
- **Transitions**

### Example Theme

```typescript
export const themes = {
  myCustomTheme: {
    name: "My Custom Theme",
    description: "A beautiful custom theme",
    colors: {
      light: {
        primary: "#FF6B6B",      // Main accent color
        secondary: "#4ECDC4",    // Secondary color
        accent: "#FFE66D",       // Highlight color
        background: "#FFFFFF",   // Slide background
        text: "#2C3E50",         // Body text
        heading: "#1A1A1A",      // Heading text
        muted: "#95A5A6",        // Muted text
      },
      dark: {
        primary: "#FF8787",
        secondary: "#6EE7DE",
        accent: "#FFF099",
        background: "#1A1A1A",
        text: "#E0E0E0",
        heading: "#FFFFFF",
        muted: "#B0B0B0",
      },
    },
    fonts: {
      heading: "Montserrat",     // Google Font name
      body: "Open Sans",         // Google Font name
    },
    borderRadius: "16px",        // Rounded corners
    transitions: {
      default: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    shadows: {
      light: {
        card: "0 4px 12px rgba(0,0,0,0.1)",
        button: "0 2px 8px rgba(255,107,107,0.3)",
      },
      dark: {
        card: "0 4px 12px rgba(0,0,0,0.5)",
        button: "0 2px 8px rgba(255,135,135,0.4)",
      },
    },
  },
};
```

### How Themes Are Applied

Themes are applied via CSS variables in:
```typescript
// File: src/components/presentation/theme/ThemeBackground.tsx
```

The theme sets CSS custom properties like:
```css
--primary: #FF6B6B;
--secondary: #4ECDC4;
--background: #FFFFFF;
--text: #2C3E50;
--heading: #1A1A1A;
--font-heading: 'Montserrat';
--font-body: 'Open Sans';
--border-radius: 16px;
```

---

## 📏 Slide Container & Dimensions

### Slide Container

```typescript
// File: src/components/presentation/presentation-page/SlideContainer.tsx
```

**Customize slide dimensions:**

```tsx
// Lines 100-114
<div
  className={cn(
    "relative w-full",
    // SMALL SLIDES
    !isPresenting && slideWidth === "S" && "max-w-4xl",  // 896px
    // MEDIUM SLIDES (default)
    !isPresenting && slideWidth === "M" && "max-w-5xl",  // 1024px
    // LARGE SLIDES
    !isPresenting && slideWidth === "L" && "max-w-6xl",  // 1152px
    isPresenting && "h-full w-full",
  )}
>
```

**To add custom slide sizes:**

1. Update the type in `src/components/presentation/utils/parser.ts`:
```typescript
export type SlideWidth = "S" | "M" | "L" | "XL" | "XXL";
```

2. Add the size class in `SlideContainer.tsx`:
```tsx
!isPresenting && slideWidth === "XL" && "max-w-7xl",  // 1280px
!isPresenting && slideWidth === "XXL" && "max-w-8xl", // 1536px
```

---

## 🎭 Slide Background & Styling

### Background Component

```typescript
// File: src/components/presentation/theme/ThemeBackground.tsx
```

This applies:
- Theme colors
- Background gradients
- Font families
- CSS variables

**Customize backgrounds:**

```tsx
// Add gradient backgrounds
<div
  style={{
    background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
  }}
>
```

---

## 🔧 Common Customizations

### 1. Change Default Spacing

```tsx
// File: src/components/presentation/editor/custom-elements/bullet.tsx

<div className="space-y-4">  {/* Change from 4 to 6 for more space */}
  {children}
</div>
```

### 2. Change Font Sizes

```tsx
// File: src/components/presentation/editor/custom-elements/presentation-heading-element.tsx

<h1 className="text-5xl">  {/* Change to text-6xl for larger */}
  {children}
</h1>
```

### 3. Change Image Positioning

```tsx
// File: src/components/presentation/editor/custom-elements/root-image.tsx

<div
  className={cn(
    "root-image-container",
    alignment === "left" && "float-left mr-6",   // Image on left
    alignment === "right" && "float-right ml-6", // Image on right
    alignment === "center" && "mx-auto",         // Image centered
  )}
>
```

### 4. Add Custom Layout

1. **Create component:**
```tsx
// File: src/components/presentation/editor/custom-elements/my-custom-layout.tsx

export function MyCustomLayout({ element, children }: StyledPlateElementProps) {
  return (
    <PlateElement asChild element={element}>
      <div className="grid grid-cols-3 gap-4">
        {children}
      </div>
    </PlateElement>
  );
}
```

2. **Register plugin:**
```tsx
// File: src/components/presentation/editor/plugins/my-custom-layout-plugin.tsx

export const MyCustomLayoutPlugin = createTPlatePlugin({
  key: "my-custom-layout",
  node: {
    isElement: true,
    component: MyCustomLayout,
  },
});
```

3. **Add to editor:**
```tsx
// File: src/components/presentation/editor/presentation-editor.tsx

const plugins = [
  // ... existing plugins
  MyCustomLayoutPlugin,
];
```

---

## 📝 Text Formatting

### Heading Styles

```typescript
// File: src/components/presentation/editor/custom-elements/presentation-heading-element.tsx
```

Customize:
- Font size: `text-5xl`, `text-4xl`, `text-3xl`
- Font weight: `font-bold`, `font-semibold`
- Color: Uses theme `--heading` color
- Spacing: `mb-4`, `mt-2`

### Paragraph Styles

```typescript
// File: src/components/presentation/editor/custom-elements/presentation-paragraph-element.tsx
```

Customize:
- Font size: `text-base`, `text-lg`
- Line height: `leading-relaxed`, `leading-loose`
- Color: Uses theme `--text` color

---

## 🖼️ Image Layouts

### Root Image (Slide Background)

```typescript
// File: src/components/presentation/editor/custom-elements/root-image.tsx
```

Controls:
- Image positioning (left/right/center/vertical)
- Image size
- Overlay effects
- Aspect ratio

### Inline Images

```typescript
// File: src/components/presentation/editor/custom-elements/presentation-image-element.tsx
```

Controls:
- Image alignment
- Image sizing
- Captions
- Borders/shadows

---

## 🎯 Quick Customization Checklist

### To Change Colors:
✅ Edit `src/lib/presentation/themes.ts`

### To Change Layouts:
✅ Edit files in `src/components/presentation/editor/custom-elements/`

### To Change Slide Size:
✅ Edit `src/components/presentation/presentation-page/SlideContainer.tsx`

### To Change Fonts:
✅ Edit theme fonts in `src/lib/presentation/themes.ts`
✅ Import fonts in `src/app/layout.tsx`

### To Add New Layout Type:
✅ Create component in `custom-elements/`
✅ Create plugin in `plugins/`
✅ Register in `editor/lib.ts`
✅ Add to editor plugins

### To Change Spacing/Padding:
✅ Edit individual layout components
✅ Use Tailwind classes: `p-4`, `gap-6`, `space-y-4`

---

## 🔍 File Reference

| What to Customize | File Path |
|------------------|-----------|
| **Themes (colors, fonts)** | `src/lib/presentation/themes.ts` |
| **Slide dimensions** | `src/components/presentation/presentation-page/SlideContainer.tsx` |
| **Layout components** | `src/components/presentation/editor/custom-elements/*.tsx` |
| **Layout registration** | `src/components/presentation/editor/lib.ts` |
| **Theme application** | `src/components/presentation/theme/ThemeBackground.tsx` |
| **Editor configuration** | `src/components/presentation/editor/presentation-editor.tsx` |
| **Text formatting** | `src/components/presentation/editor/custom-elements/presentation-*-element.tsx` |

---

## 💡 Pro Tips

1. **Use Tailwind CSS** - Most styling uses Tailwind utility classes
2. **Test in both modes** - Check light and dark theme
3. **Check responsiveness** - Test different slide widths (S/M/L)
4. **Use CSS variables** - Theme colors are available as `var(--primary)`
5. **Preview changes** - Use the theme preview in the UI
6. **Keep consistency** - Match spacing and sizing across layouts

---

## 🚀 Next Steps

1. Choose what you want to customize (theme, layout, spacing)
2. Find the relevant file from the reference above
3. Make your changes
4. Test in the presentation editor
5. Save and commit your changes

Need help with a specific customization? Let me know!
