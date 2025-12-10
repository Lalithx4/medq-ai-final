"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, X, BookOpen, GraduationCap, Lightbulb, ScrollText, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  content: string;
}

interface WritingTemplatesProps {
  onSelect: (content: string) => void;
  onClose: () => void;
}

const TEMPLATES: Template[] = [
  {
    id: "research-proposal",
    name: "Research Proposal",
    description: "Structured template for academic research proposals",
    icon: <ScrollText className="w-5 h-5" />,
    category: "Academic",
    content: `# Research Proposal

## Title
[Your Research Title Here]

## Abstract
[Brief summary of your research proposal - 150-250 words]

## 1. Introduction
### 1.1 Background
[Provide context and background information]

### 1.2 Problem Statement
[Clearly define the research problem]

### 1.3 Research Questions
- Question 1
- Question 2
- Question 3

## 2. Literature Review
[Review existing research and identify gaps]

## 3. Methodology
### 3.1 Research Design
[Describe your research approach]

### 3.2 Data Collection
[Explain how you will collect data]

### 3.3 Data Analysis
[Describe analysis methods]

## 4. Expected Outcomes
[What you expect to discover or achieve]

## 5. Timeline
[Project timeline and milestones]

## 6. Budget
[Estimated costs and resources needed]

## 7. References
[List of cited works]`
  },
  {
    id: "literature-review",
    name: "Literature Review",
    description: "Comprehensive literature review structure",
    icon: <BookOpen className="w-5 h-5" />,
    category: "Academic",
    content: `# Literature Review

## Title
[Your Literature Review Title]

## Abstract
[Summary of the review - 150-200 words]

## 1. Introduction
### 1.1 Background
[Context and importance of the topic]

### 1.2 Scope and Objectives
[What this review covers and aims to achieve]

### 1.3 Search Strategy
[How you identified relevant literature]

## 2. Thematic Analysis
### 2.1 Theme 1: [Theme Name]
#### Key Findings
- Finding 1
- Finding 2

#### Critical Analysis
[Your analysis of this theme]

### 2.2 Theme 2: [Theme Name]
#### Key Findings
- Finding 1
- Finding 2

#### Critical Analysis
[Your analysis of this theme]

### 2.3 Theme 3: [Theme Name]
#### Key Findings
- Finding 1
- Finding 2

#### Critical Analysis
[Your analysis of this theme]

## 3. Gaps in Current Research
[Identify what's missing in existing literature]

## 4. Synthesis and Discussion
[Integrate findings across themes]

## 5. Conclusion
[Summary of key insights and implications]

## 6. Future Research Directions
[Suggested areas for further study]

## References
[Comprehensive list of cited works]`
  },
  {
    id: "grant-proposal",
    name: "Grant Proposal",
    description: "Template for research grant applications",
    icon: <Briefcase className="w-5 h-5" />,
    category: "Funding",
    content: `# Grant Proposal

## Project Title
[Your Project Title]

## Executive Summary
[Concise overview - 250 words max]

## 1. Project Description
### 1.1 Significance and Innovation
[Why this project matters and what's novel]

### 1.2 Specific Aims
1. Aim 1: [Description]
2. Aim 2: [Description]
3. Aim 3: [Description]

### 1.3 Background and Rationale
[Context and justification for the project]

## 2. Research Strategy
### 2.1 Approach
[Detailed methodology]

### 2.2 Preliminary Data
[Any existing data supporting feasibility]

### 2.3 Expected Outcomes
[What you will achieve]

## 3. Impact and Significance
### 3.1 Scientific Impact
[Contribution to the field]

### 3.2 Broader Impact
[Societal, educational, or clinical benefits]

## 4. Project Team
### 4.1 Principal Investigator
[Qualifications and role]

### 4.2 Co-Investigators
[Team members and expertise]

## 5. Timeline and Milestones
| Year | Milestone | Deliverable |
|------|-----------|-------------|
| 1    | [Milestone] | [Deliverable] |
| 2    | [Milestone] | [Deliverable] |
| 3    | [Milestone] | [Deliverable] |

## 6. Budget and Justification
### 6.1 Personnel
[Staff costs]

### 6.2 Equipment
[Equipment needs]

### 6.3 Other Costs
[Additional expenses]

### 6.4 Budget Justification
[Explain each cost]

## 7. References
[Cited literature]

## 8. Appendices
[Supporting documents]`
  },
  {
    id: "thesis-abstract",
    name: "Thesis Abstract",
    description: "Structured abstract for thesis or dissertation",
    icon: <GraduationCap className="w-5 h-5" />,
    category: "Academic",
    content: `# Thesis Abstract

## Title
[Your Thesis Title]

## Author
[Your Name]

## Degree
[e.g., Doctor of Philosophy in Medical Sciences]

## Institution
[University Name]

## Year
[Year]

---

## Abstract

### Background
[Context and importance of your research - 2-3 sentences]

### Objectives
[What you aimed to achieve - 1-2 sentences]

### Methods
[Brief description of your methodology - 2-3 sentences]

### Results
[Key findings - 3-4 sentences]

### Conclusions
[Main conclusions and implications - 2-3 sentences]

### Keywords
[5-7 keywords relevant to your research]

---

**Word Count:** [Typically 250-350 words]`
  },
  {
    id: "case-study",
    name: "Medical Case Study",
    description: "Clinical case study template",
    icon: <FileText className="w-5 h-5" />,
    category: "Clinical",
    content: `# Medical Case Study

## Title
[Descriptive case title]

## Abstract
[Brief summary - 150 words]

## 1. Introduction
[Background on the condition or issue]

## 2. Case Presentation
### 2.1 Patient Information
- **Age:** [Age]
- **Gender:** [Gender]
- **Chief Complaint:** [Primary concern]

### 2.2 Clinical Findings
#### History
[Relevant medical history]

#### Physical Examination
[Key examination findings]

### 2.3 Diagnostic Assessment
#### Laboratory Tests
[Test results]

#### Imaging
[Imaging findings]

### 2.4 Diagnosis
[Final diagnosis with reasoning]

## 3. Therapeutic Intervention
### 3.1 Treatment Plan
[Detailed treatment approach]

### 3.2 Follow-up
[Patient progress and outcomes]

## 4. Discussion
### 4.1 Clinical Significance
[Why this case is important]

### 4.2 Literature Comparison
[How this case relates to existing knowledge]

### 4.3 Learning Points
- Point 1
- Point 2
- Point 3

## 5. Conclusion
[Summary and key takeaways]

## 6. Patient Perspective
[Patient's experience, if applicable]

## References
[Cited literature]`
  },
  {
    id: "research-article",
    name: "Research Article",
    description: "Full research article structure",
    icon: <Lightbulb className="w-5 h-5" />,
    category: "Academic",
    content: `# Research Article

## Title
[Concise, descriptive title]

## Authors
[Author names and affiliations]

## Corresponding Author
[Contact information]

---

## Abstract
### Background
[Context]

### Objectives
[Study aims]

### Methods
[Brief methodology]

### Results
[Key findings]

### Conclusions
[Main conclusions]

**Keywords:** [5-7 keywords]

---

## 1. Introduction
[Background, rationale, and objectives]

## 2. Materials and Methods
### 2.1 Study Design
[Design description]

### 2.2 Participants
[Sample description]

### 2.3 Procedures
[What was done]

### 2.4 Statistical Analysis
[Analysis methods]

### 2.5 Ethical Considerations
[Ethics approval and consent]

## 3. Results
### 3.1 Participant Characteristics
[Demographics]

### 3.2 Primary Outcomes
[Main findings]

### 3.3 Secondary Outcomes
[Additional findings]

## 4. Discussion
### 4.1 Principal Findings
[Summary of results]

### 4.2 Comparison with Existing Literature
[How findings relate to other work]

### 4.3 Strengths and Limitations
[Study strengths and weaknesses]

### 4.4 Implications
[Clinical, research, or policy implications]

## 5. Conclusion
[Summary and future directions]

## Acknowledgments
[Funding and contributors]

## Conflicts of Interest
[Disclosure statement]

## References
[Cited works]

## Tables and Figures
[Data visualizations]`
  }
];

export function WritingTemplates({ onSelect, onClose }: WritingTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const categories = ["All", ...Array.from(new Set(TEMPLATES.map(t => t.category)))];
  
  const filteredTemplates = selectedCategory === "All" 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === selectedCategory);

  const handleUseTemplate = (template: Template) => {
    onSelect(template.content);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-64 border-r border-border p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-sm text-muted-foreground">Categories</h3>
          </div>
          <div className="space-y-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Writing Templates</h2>
                  <p className="text-sm text-muted-foreground">
                    Start with professional templates for academic writing
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border border-border rounded-lg hover:border-primary/50 transition cursor-pointer group"
                  onClick={() => setPreviewTemplate(template)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition">
                        {template.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {template.description}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUseTemplate(template);
                          }}
                          className="text-xs"
                        >
                          Use Template
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTemplate(template);
                          }}
                          className="text-xs"
                        >
                          Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {previewTemplate && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="w-96 border-l border-border p-6 overflow-y-auto bg-muted/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Preview</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="w-6 h-6 rounded hover:bg-accent flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-xs bg-background p-4 rounded-lg border border-border">
                {previewTemplate.content}
              </pre>
            </div>
            <Button
              onClick={() => handleUseTemplate(previewTemplate)}
              className="w-full mt-4"
            >
              Use This Template
            </Button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
