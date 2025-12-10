import PptxGenJS from "pptxgenjs";

interface SimpleSlide {
  title: string;
  markdown: string;
}

export async function simpleSlidesToPptx(slides: SimpleSlide[]): Promise<ArrayBuffer> {
  const pptx = new PptxGenJS();

  slides.forEach((slide, index) => {
    const s = pptx.addSlide();

    const md = slide.markdown || "";
    const mdLines = md.split(/\r?\n/).map((l) => l.trim());

    // Try to derive title from first markdown heading if the explicit title is missing.
    let derivedTitle: string | null = null;
    for (const line of mdLines) {
      if (!line) continue;
      if (line.startsWith("#")) {
        derivedTitle = line.replace(/^#+\s*/, "").replace(/[*_`]/g, "").trim();
        break;
      }
    }

    // Title at top
    const titleText = (slide.title && slide.title.trim()) || derivedTitle || `Slide ${index + 1}`;
    s.addText(titleText, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 1,
      fontSize: 28,
      bold: true,
    });

    // Convert markdown into simple bullet lines, skipping heading lines and stripping markdown markers.
    const bulletLines: string[] = [];
    for (const line of mdLines) {
      if (!line) continue;

      // Skip headings (already reflected in title)
      if (/^#{1,6}\s+/.test(line)) continue;

      // Strip common bullet markers
      let text = line.replace(/^[-*•+]\s+/, "");

      // Remove basic emphasis markers **bold**, *italic*, __bold__
      text = text.replace(/\*\*(.+?)\*\*/g, "$1");
      text = text.replace(/\*(.+?)\*/g, "$1");
      text = text.replace(/__(.+?)__/g, "$1");

      text = text.trim();
      if (text) bulletLines.push(text);
    }

    if (bulletLines.length) {
      s.addText(
        bulletLines.map((t) => ({ text: t })),
        {
          x: 0.7,
          y: 1.3,
          w: 8.3,
          h: 4.5,
          fontSize: 16,
          bullet: true,
          lineSpacingMultiple: 1.1,
        } as any,
      );
    }
  });

  const output = await pptx.write({ outputType: "arraybuffer" });
  if (output instanceof ArrayBuffer) return output;
  if (output instanceof Uint8Array) {
    const view = output;
    const ab = new ArrayBuffer(view.byteLength);
    new Uint8Array(ab).set(view);
    return ab;
  }
  if (typeof output === "string") {
    const view = new TextEncoder().encode(output);
    const ab = new ArrayBuffer(view.byteLength);
    new Uint8Array(ab).set(view);
    return ab;
  }
  const arrayBuf = await (output as Blob).arrayBuffer();
  return arrayBuf;
}
