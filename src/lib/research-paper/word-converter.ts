import { Buffer } from 'buffer';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType,
  IStylesOptions,
  PageOrientation
} from 'docx';

export class WordConverter {
  static async convertToWord(markdown: string, title: string): Promise<Buffer> {
    const sections = this.parseMarkdown(markdown);
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                size: 56, // 28pt
                font: 'Times New Roman'
              })
            ],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
              before: 400,
            }
          }),
          ...this.convertSectionsToDocx(sections),
        ],
      }],
      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: 24 // 12pt
            },
            paragraph: {
              spacing: {
                line: 480, // Double spacing
                after: 240 // 12pt after paragraphs
              }
            }
          }
        }
      }
    });

    return await Packer.toBuffer(doc);
  }

  private static parseMarkdown(markdown: string): { 
    heading: string; 
    content: string; 
  }[] {
    interface Section {
      heading: string;
      content: string;
    }
    
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    
    const lines = markdown.split('\n');
    
    lines.forEach(line => {
      // Check if line is a heading
      if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) {
        if (currentSection) {
          // Clean up citations to keep the bracketed numbers
          currentSection.content = currentSection.content.replace(/\[(\d+)\]/g, (match, num) => `[${num}]`);
          sections.push(currentSection);
        }
        currentSection = {
          heading: line.replace(/^#+\s+/, ''),
          content: ''
        };
      } else if (currentSection) {
        // Keep citation numbers in superscript format
        const processedLine = line.replace(/\[(\d+)\]/g, (match, num) => `[${num}]`);
        currentSection.content += processedLine + '\n';
      }
    });

    if (currentSection) {
      currentSection.content = currentSection.content.replace(/\[(\d+)\]/g, (match, num) => `[${num}]`);
      sections.push(currentSection);
    }

    return sections;
  }

  private static convertSectionsToDocx(sections: { heading: string; content: string; }[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    sections.forEach(section => {
      // Add section heading
      paragraphs.push(
        new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_2,
          spacing: {
            after: 200,
            before: 400,
          },
        })
      );

      // Convert content paragraphs
      const contentParagraphs = section.content.split('\n\n').filter(p => p.trim());
      contentParagraphs.forEach(content => {
        // Handle bold and italic formatting
        const text = this.convertFormattedText(content);
        paragraphs.push(
          new Paragraph({
            children: text,
            spacing: {
              after: 200,
            },
          })
        );
      });
    });

    return paragraphs;
  }

  private static convertFormattedText(text: string): TextRun[] {
    const parts: TextRun[] = [];
    let currentText = '';
    let isBold = false;
    let isItalic = false;

    for (let i = 0; i < text.length; i++) {
      // Handle citation numbers in brackets
      if (text[i] === '[' && i + 1 < text.length && /\d/.test(text[i + 1])) {
        let citationNum = '';
        let j = i + 1;
        while (j < text.length && text[j] !== ']') {
          citationNum += text[j];
          j++;
        }
        
        if (currentText) {
          parts.push(new TextRun({
            text: currentText,
            bold: isBold,
            italics: isItalic,
          }));
          currentText = '';
        }
        
        // Add citation number in superscript
        parts.push(new TextRun({
          text: `[${citationNum}]`,
          superScript: true,
          size: 16,
        }));
        
        i = j; // Skip to end of citation
        continue;
      }
      
      // Handle bold/italic formatting
      if (text[i] === '*' || text[i] === '_') {
        // Check for bold
        if (text[i + 1] === '*' || text[i + 1] === '_') {
          if (currentText) {
            parts.push(new TextRun({
              text: currentText,
              bold: isBold,
              italics: isItalic,
            }));
            currentText = '';
          }
          isBold = !isBold;
          i++; // Skip next asterisk
          continue;
        }
        
        // Single asterisk for italic
        if (currentText) {
          parts.push(new TextRun({
            text: currentText,
            bold: isBold,
            italics: isItalic,
          }));
          currentText = '';
        }
        isItalic = !isItalic;
        continue;
      }

      currentText += text[i];
    }

    if (currentText) {
      parts.push(new TextRun({
        text: currentText,
        bold: isBold,
        italics: isItalic,
      }));
    }

    return parts;
  }
}