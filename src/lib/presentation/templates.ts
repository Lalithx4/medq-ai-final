/**
 * Presentation Templates
 * Define structure, layout patterns, and content guidelines for different presentation types
 */

export type TemplateName =
  | "general"
  | "medical-case"
  | "clinical-trial"
  | "medical-research"
  | "pathophysiology"
  | "pharmacology"
  | "surgical-procedure"
  | "diagnostic-approach";

export type TemplateCategory = "general" | "medical" | "clinical" | "academic" | "education";

export type ContentDensity = "concise" | "balanced" | "detailed";

export interface SlideBlueprint {
  title: string;
  layout: string; // BULLETS, COLUMNS, TIMELINE, etc.
  purpose: string;
  contentGuidance?: string;
}

export interface TemplateProperties {
  name: string;
  description: string;
  category: TemplateCategory;
  icon?: string;
  
  // Structure configuration
  structure: {
    recommendedSlideCount: number;
    minSlides: number;
    maxSlides: number;
    preferredLayouts: string[]; // Layouts to prioritize
    contentDensity: ContentDensity;
  };
  
  // AI prompt modifications
  promptAdditions: {
    tone: string;
    focus: string;
    contentStyle: string;
    specificInstructions: string[];
  };
  
  // Suggested slide sequence (optional - AI can adapt)
  slideSequence?: SlideBlueprint[];
  
  // Use cases
  useCases: string[];
}

export type Templates = keyof typeof templates;

export const templates: Record<TemplateName, TemplateProperties> = {
  general: {
    name: "General Purpose",
    description: "Flexible template for any topic",
    category: "general",
    icon: "📊",
    
    structure: {
      recommendedSlideCount: 10,
      minSlides: 5,
      maxSlides: 20,
      preferredLayouts: ["BULLETS", "COLUMNS", "TIMELINE", "ICONS"],
      contentDensity: "balanced",
    },
    
    promptAdditions: {
      tone: "professional and clear",
      focus: "balanced coverage of all topics",
      contentStyle: "informative with good visual variety",
      specificInstructions: [
        "Use a variety of layouts to maintain visual interest",
        "Balance text and visuals appropriately",
        "Ensure logical flow between slides",
      ],
    },
    
    useCases: [
      "General presentations",
      "Mixed topics",
      "Educational content",
      "Overview presentations",
    ],
  },

  "pathophysiology": {
    name: "Pathophysiology Presentation",
    description: "Disease mechanism and progression explanation",
    category: "medical",
    icon: "🧬",
    
    structure: {
      recommendedSlideCount: 12,
      minSlides: 8,
      maxSlides: 16,
      preferredLayouts: ["BULLETS", "ARROWS", "CYCLE", "STAIRCASE", "COMPARE"],
      contentDensity: "detailed",
    },
    
    promptAdditions: {
      tone: "educational, scientific, and systematic",
      focus: "disease mechanisms, cellular/molecular changes, and clinical manifestations",
      contentStyle: "clear explanation of complex biological processes with logical flow",
      specificInstructions: [
        "Start with normal physiology for context",
        "Explain the initiating event or trigger",
        "Detail cellular and molecular changes step-by-step",
        "Show progression from microscopic to macroscopic changes",
        "Connect pathophysiology to clinical signs and symptoms",
        "Include relevant biochemical pathways",
        "Explain compensatory mechanisms",
        "Discuss complications and their mechanisms",
        "Use diagrams to illustrate complex processes",
        "Relate pathophysiology to treatment rationale",
      ],
    },
    
    slideSequence: [
      { title: "Normal Physiology", layout: "BULLETS", purpose: "Baseline function", contentGuidance: "How the system normally works" },
      { title: "Etiology", layout: "BULLETS", purpose: "Causes and risk factors", contentGuidance: "What triggers the disease process" },
      { title: "Initial Insult", layout: "ARROWS", purpose: "Primary pathological event", contentGuidance: "First changes at cellular/molecular level" },
      { title: "Molecular Changes", layout: "CYCLE", purpose: "Biochemical alterations", contentGuidance: "Signaling pathways, gene expression, protein changes" },
      { title: "Cellular Response", layout: "STAIRCASE", purpose: "Cell-level changes", contentGuidance: "Inflammation, apoptosis, proliferation" },
      { title: "Tissue Changes", layout: "ARROWS", purpose: "Organ-level pathology", contentGuidance: "Structural and functional alterations" },
      { title: "Compensatory Mechanisms", layout: "CYCLE", purpose: "Body's adaptive responses", contentGuidance: "How the body tries to maintain homeostasis" },
      { title: "Clinical Manifestations", layout: "BULLETS", purpose: "Signs and symptoms", contentGuidance: "How pathophysiology presents clinically" },
      { title: "Disease Progression", layout: "TIMELINE", purpose: "Natural history", contentGuidance: "Acute, subacute, chronic phases" },
      { title: "Complications", layout: "BULLETS", purpose: "Secondary problems", contentGuidance: "Consequences of untreated disease" },
      { title: "Therapeutic Targets", layout: "COMPARE", purpose: "Treatment rationale", contentGuidance: "How treatments address pathophysiology" },
    ],
    
    useCases: [
      "Medical school lectures",
      "Pathophysiology courses",
      "Board exam preparation",
      "Medical education",
      "Teaching rounds",
    ],
  },

  "medical-case": {
    name: "Medical Case Study",
    description: "Clinical case presentation with diagnosis and treatment flow",
    category: "medical",
    icon: "🏥",
    
    structure: {
      recommendedSlideCount: 14,
      minSlides: 10,
      maxSlides: 18,
      preferredLayouts: ["BULLETS", "TIMELINE", "COMPARE", "STAIRCASE", "COLUMNS"],
      contentDensity: "detailed",
    },
    
    promptAdditions: {
      tone: "clinical, professional, and evidence-based",
      focus: "systematic case presentation, diagnostic reasoning, and treatment rationale",
      contentStyle: "detailed medical information with clear clinical reasoning",
      specificInstructions: [
        "Follow standard case presentation format (HPI, PMH, exam, etc.)",
        "Use appropriate medical terminology",
        "Include relevant clinical findings and diagnostic criteria",
        "Show differential diagnosis with reasoning",
        "Present diagnostic workup in chronological order",
        "Explain treatment decisions with evidence levels",
        "Include patient outcomes and follow-up",
        "Cite relevant guidelines or literature when applicable",
        "Use medical images appropriately (X-rays, labs, etc.)",
        "Highlight learning points and clinical pearls",
      ],
    },
    
    slideSequence: [
      { title: "Case Introduction", layout: "BULLETS", purpose: "Patient demographics and chief complaint", contentGuidance: "Age, sex, presenting complaint, brief context" },
      { title: "History of Present Illness", layout: "BULLETS", purpose: "Detailed symptom history", contentGuidance: "Onset, duration, character, associated symptoms, timeline" },
      { title: "Past Medical History", layout: "COLUMNS", purpose: "Relevant medical background", contentGuidance: "PMH, medications, allergies, social/family history" },
      { title: "Physical Examination", layout: "BULLETS", purpose: "Key clinical findings", contentGuidance: "Vital signs, pertinent positive/negative findings" },
      { title: "Initial Assessment", layout: "BULLETS", purpose: "Clinical impression and concerns", contentGuidance: "Initial thoughts, red flags, urgency" },
      { title: "Differential Diagnosis", layout: "BULLETS", purpose: "Possible diagnoses to consider", contentGuidance: "4-6 differential diagnoses with brief rationale" },
      { title: "Diagnostic Workup", layout: "TIMELINE", purpose: "Tests ordered and timeline", contentGuidance: "Labs, imaging, procedures in chronological order" },
      { title: "Test Results", layout: "COMPARE", purpose: "Normal vs abnormal findings", contentGuidance: "Key lab/imaging results with interpretation" },
      { title: "Final Diagnosis", layout: "BULLETS", purpose: "Confirmed diagnosis with criteria", contentGuidance: "Diagnosis with supporting evidence and criteria met" },
      { title: "Treatment Plan", layout: "STAIRCASE", purpose: "Step-by-step management", contentGuidance: "Initial, ongoing, and long-term treatment phases" },
      { title: "Clinical Course", layout: "TIMELINE", purpose: "Patient progress over time", contentGuidance: "Response to treatment, complications, adjustments" },
      { title: "Outcomes", layout: "BULLETS", purpose: "Final results and prognosis", contentGuidance: "Discharge status, follow-up plan, long-term outlook" },
      { title: "Discussion", layout: "BULLETS", purpose: "Key learning points", contentGuidance: "Clinical pearls, pitfalls to avoid, evidence review" },
      { title: "References", layout: "BULLETS", purpose: "Evidence sources", contentGuidance: "Guidelines, studies, and key references cited" },
    ],
    
    useCases: [
      "Clinical case presentations",
      "Grand rounds",
      "Medical education",
      "Case conferences",
      "Board exam preparation",
    ],
  },

  "medical-research": {
    name: "Medical Research Presentation",
    description: "Medical/clinical research with methodology and findings",
    category: "academic",
    icon: "🔬",
    
    structure: {
      recommendedSlideCount: 15,
      minSlides: 12,
      maxSlides: 20,
      preferredLayouts: ["BULLETS", "COLUMNS", "TIMELINE", "COMPARE", "ICONS"],
      contentDensity: "detailed",
    },
    
    promptAdditions: {
      tone: "academic, objective, and rigorous",
      focus: "research question, methodology, findings, and implications",
      contentStyle: "scholarly with clear methodology and data presentation",
      specificInstructions: [
        "Start with clear research question or hypothesis",
        "Provide comprehensive literature review context",
        "Detail methodology with sufficient reproducibility",
        "Present results with appropriate statistics",
        "Use charts and graphs for data visualization",
        "Discuss findings in context of existing literature",
        "Address limitations transparently",
        "Highlight novel contributions",
        "Include future research directions",
        "Cite sources appropriately",
      ],
    },
    
    slideSequence: [
      { title: "Title & Authors", layout: "BULLETS", purpose: "Research title and team", contentGuidance: "Full title, authors, affiliations, date" },
      { title: "Background", layout: "BULLETS", purpose: "Research context and gap", contentGuidance: "Current state of knowledge, identified gap" },
      { title: "Research Question", layout: "BULLETS", purpose: "Hypothesis or objectives", contentGuidance: "Clear, specific research question(s)" },
      { title: "Literature Review", layout: "TIMELINE", purpose: "Evolution of the field", contentGuidance: "Key studies and theoretical framework" },
      { title: "Methodology", layout: "BULLETS", purpose: "Research design and methods", contentGuidance: "Study design, participants, procedures, measures" },
      { title: "Data Collection", layout: "STAIRCASE", purpose: "Data gathering process", contentGuidance: "Step-by-step data collection protocol" },
      { title: "Analysis Approach", layout: "BULLETS", purpose: "Statistical/analytical methods", contentGuidance: "Analysis techniques and software used" },
      { title: "Results Overview", layout: "BULLETS", purpose: "Key findings summary", contentGuidance: "Main results at a glance" },
      { title: "Detailed Findings", layout: "COLUMNS", purpose: "Specific results by category", contentGuidance: "Organized presentation of all findings" },
      { title: "Statistical Analysis", layout: "BULLETS", purpose: "Statistical outcomes", contentGuidance: "P-values, confidence intervals, effect sizes" },
      { title: "Discussion", layout: "BULLETS", purpose: "Interpretation of findings", contentGuidance: "What results mean in context" },
      { title: "Comparison to Literature", layout: "COMPARE", purpose: "How findings relate to prior work", contentGuidance: "Agreements, disagreements, novel insights" },
      { title: "Limitations", layout: "BULLETS", purpose: "Study constraints", contentGuidance: "Methodological limitations and caveats" },
      { title: "Implications", layout: "BULLETS", purpose: "Practical and theoretical significance", contentGuidance: "Real-world applications and theory advancement" },
      { title: "Future Directions", layout: "ARROWS", purpose: "Next steps in research", contentGuidance: "Unanswered questions and future studies" },
    ],
    
    useCases: [
      "Academic conferences",
      "Thesis defense",
      "Research seminars",
      "Grant presentations",
      "Journal clubs",
    ],
  },

  "pharmacology": {
    name: "Pharmacology Presentation",
    description: "Drug mechanism, pharmacokinetics, and clinical use",
    category: "medical",
    icon: "💊",
    
    structure: {
      recommendedSlideCount: 12,
      minSlides: 8,
      maxSlides: 15,
      preferredLayouts: ["BULLETS", "TIMELINE", "STAIRCASE", "COLUMNS", "PYRAMID"],
      contentDensity: "balanced",
    },
    
    promptAdditions: {
      tone: "scientific, systematic, and clinical",
      focus: "drug mechanism, pharmacokinetics/pharmacodynamics, and clinical application",
      contentStyle: "detailed pharmacological information with clinical relevance",
      specificInstructions: [
        "Start with drug classification and chemical structure",
        "Explain mechanism of action at molecular level",
        "Detail pharmacokinetics (ADME)",
        "Describe pharmacodynamics and dose-response",
        "List clinical indications with evidence levels",
        "Include dosing regimens and administration routes",
        "Discuss adverse effects and contraindications",
        "Explain drug interactions",
        "Compare with other drugs in same class",
        "Provide clinical pearls and monitoring parameters",
      ],
    },
    
    slideSequence: [
      { title: "Drug Overview", layout: "BULLETS", purpose: "Basic information", contentGuidance: "Generic/brand names, class, FDA approval" },
      { title: "Chemical Structure", layout: "BULLETS", purpose: "Molecular characteristics", contentGuidance: "Structure, formulation, stability" },
      { title: "Mechanism of Action", layout: "ARROWS", purpose: "How the drug works", contentGuidance: "Molecular targets, signaling pathways" },
      { title: "Pharmacokinetics", layout: "TIMELINE", purpose: "ADME profile", contentGuidance: "Absorption, distribution, metabolism, excretion" },
      { title: "Pharmacodynamics", layout: "BULLETS", purpose: "Drug effects", contentGuidance: "Dose-response, therapeutic window, duration" },
      { title: "Clinical Indications", layout: "BULLETS", purpose: "When to use", contentGuidance: "FDA-approved and off-label uses" },
      { title: "Dosing & Administration", layout: "STAIRCASE", purpose: "How to prescribe", contentGuidance: "Dose, frequency, route, adjustments" },
      { title: "Adverse Effects", layout: "COLUMNS", purpose: "Side effects profile", contentGuidance: "Common, serious, and rare adverse events" },
      { title: "Contraindications", layout: "BULLETS", purpose: "When not to use", contentGuidance: "Absolute and relative contraindications" },
      { title: "Drug Interactions", layout: "COMPARE", purpose: "Interaction profile", contentGuidance: "Major interactions and mechanisms" },
      { title: "Monitoring", layout: "BULLETS", purpose: "Clinical monitoring", contentGuidance: "Labs, vitals, efficacy/toxicity parameters" },
      { title: "Clinical Pearls", layout: "BULLETS", purpose: "Practical tips", contentGuidance: "Expert recommendations and common pitfalls" },
    ],
    
    useCases: [
      "Pharmacology lectures",
      "Drug education",
      "Clinical rounds",
      "Formulary reviews",
      "Board exam preparation",
    ],
  },

  "surgical-procedure": {
    name: "Surgical Procedure",
    description: "Surgical technique and perioperative management",
    category: "clinical",
    icon: "🔪",
    
    structure: {
      recommendedSlideCount: 16,
      minSlides: 10,
      maxSlides: 25,
      preferredLayouts: ["BULLETS", "STAIRCASE", "ICONS", "COMPARE", "CYCLE"],
      contentDensity: "balanced",
    },
    
    promptAdditions: {
      tone: "technical, precise, and instructional",
      focus: "surgical technique, anatomy, and perioperative care",
      contentStyle: "detailed surgical description with step-by-step technique",
      specificInstructions: [
        "Start with indications and contraindications",
        "Detail preoperative preparation and positioning",
        "Describe relevant surgical anatomy",
        "Provide step-by-step surgical technique",
        "Include key anatomical landmarks",
        "Discuss potential complications and how to avoid them",
        "Explain postoperative management",
        "Include tips and pearls from experienced surgeons",
        "Show variations in technique when applicable",
        "Reference evidence and outcomes data",
      ],
    },
    
    slideSequence: [
      { title: "Procedure Overview", layout: "BULLETS", purpose: "Introduction", contentGuidance: "Procedure name, type, common indications" },
      { title: "Indications", layout: "BULLETS", purpose: "When to perform", contentGuidance: "Absolute and relative indications" },
      { title: "Contraindications", layout: "BULLETS", purpose: "When not to perform", contentGuidance: "Absolute and relative contraindications" },
      { title: "Preoperative Planning", layout: "BULLETS", purpose: "Preparation", contentGuidance: "Imaging, labs, consent, patient prep" },
      { title: "Surgical Anatomy", layout: "BULLETS", purpose: "Relevant anatomy", contentGuidance: "Key structures, landmarks, variations" },
      { title: "Patient Positioning", layout: "BULLETS", purpose: "Setup", contentGuidance: "Position, draping, equipment" },
      { title: "Surgical Steps", layout: "STAIRCASE", purpose: "Technique", contentGuidance: "Step-by-step procedure with key points" },
      { title: "Critical Steps", layout: "BULLETS", purpose: "Key maneuvers", contentGuidance: "Most important technical aspects" },
      { title: "Complications", layout: "COMPARE", purpose: "Risks and management", contentGuidance: "Potential complications and prevention/treatment" },
      { title: "Postoperative Care", layout: "TIMELINE", purpose: "Recovery", contentGuidance: "Immediate, short-term, long-term management" },
      { title: "Outcomes", layout: "BULLETS", purpose: "Expected results", contentGuidance: "Success rates, recovery timeline, prognosis" },
      { title: "Pearls & Pitfalls", layout: "COMPARE", purpose: "Expert tips", contentGuidance: "What to do and what to avoid" },
    ],
    
    useCases: [
      "Surgical education",
      "Operative conferences",
      "Resident training",
      "M&M conferences",
      "Surgical grand rounds",
    ],
  },

  "diagnostic-approach": {
    name: "Diagnostic Approach",
    description: "Systematic approach to diagnosis and workup",
    category: "clinical",
    icon: "🔍",
    
    structure: {
      recommendedSlideCount: 13,
      minSlides: 10,
      maxSlides: 16,
      preferredLayouts: ["BULLETS", "COLUMNS", "COMPARE", "TIMELINE", "ICONS"],
      contentDensity: "balanced",
    },
    
    promptAdditions: {
      tone: "systematic, analytical, and evidence-based",
      focus: "diagnostic reasoning, differential diagnosis, and workup strategy",
      contentStyle: "logical diagnostic framework with clinical decision-making",
      specificInstructions: [
        "Start with clinical presentation and key features",
        "Use systematic approach (e.g., organ system, pathophysiology)",
        "Build comprehensive differential diagnosis",
        "Prioritize diagnoses by likelihood and severity",
        "Explain diagnostic criteria for key conditions",
        "Present evidence-based workup strategy",
        "Discuss test characteristics (sensitivity, specificity)",
        "Show decision trees or algorithms when applicable",
        "Include red flags and must-not-miss diagnoses",
        "Provide clinical pearls for diagnosis",
      ],
    },
    
    slideSequence: [
      { title: "Clinical Scenario", layout: "BULLETS", purpose: "Presenting problem", contentGuidance: "Chief complaint, key history, exam findings" },
      { title: "Key Clinical Features", layout: "ICONS", purpose: "Important clues", contentGuidance: "Symptoms, signs, risk factors" },
      { title: "Diagnostic Framework", layout: "BULLETS", purpose: "Approach to diagnosis", contentGuidance: "Systematic method (anatomic, pathophysiologic, etc.)" },
      { title: "Differential Diagnosis", layout: "BULLETS", purpose: "Possible diagnoses", contentGuidance: "Comprehensive list with brief rationale" },
      { title: "Prioritization", layout: "PYRAMID", purpose: "Most to least likely", contentGuidance: "Ranked by probability and severity" },
      { title: "Diagnostic Criteria", layout: "BULLETS", purpose: "How to confirm diagnosis", contentGuidance: "Criteria for top diagnoses" },
      { title: "Initial Workup", layout: "STAIRCASE", purpose: "First-line tests", contentGuidance: "Labs, imaging, procedures to order first" },
      { title: "Test Interpretation", layout: "COMPARE", purpose: "Understanding results", contentGuidance: "Normal vs abnormal, sensitivity/specificity" },
      { title: "Advanced Testing", layout: "TIMELINE", purpose: "Further workup if needed", contentGuidance: "Second-line and specialized tests" },
      { title: "Diagnostic Algorithm", layout: "ARROWS", purpose: "Decision pathway", contentGuidance: "Flowchart from presentation to diagnosis" },
      { title: "Red Flags", layout: "BULLETS", purpose: "Warning signs", contentGuidance: "Must-not-miss diagnoses and urgent features" },
      { title: "Clinical Pearls", layout: "BULLETS", purpose: "Expert tips", contentGuidance: "Diagnostic shortcuts and common pitfalls" },
    ],
    
    useCases: [
      "Clinical reasoning lectures",
      "Diagnostic conferences",
      "Medical education",
      "Board exam preparation",
      "Teaching rounds",
    ],
  },

  "literature-review": {
    name: "Literature Review",
    description: "Systematic review of medical literature on a topic",
    category: "academic",
    icon: "📚",
    
    structure: {
      recommendedSlideCount: 14,
      minSlides: 10,
      maxSlides: 18,
      preferredLayouts: ["BULLETS", "TIMELINE", "COMPARE", "COLUMNS", "PYRAMID"],
      contentDensity: "detailed",
    },
    
    promptAdditions: {
      tone: "scholarly, critical, and comprehensive",
      focus: "evidence synthesis, quality assessment, and clinical implications",
      contentStyle: "systematic literature analysis with critical appraisal",
      specificInstructions: [
        "Define clear research question or topic",
        "Describe search strategy and databases",
        "Present inclusion/exclusion criteria",
        "Show study selection process (PRISMA flow)",
        "Critically appraise study quality",
        "Synthesize findings across studies",
        "Discuss heterogeneity and limitations",
        "Present evidence hierarchy",
        "Identify knowledge gaps",
        "Provide clinical recommendations based on evidence",
      ],
    },
    
    slideSequence: [
      { title: "Topic & Objectives", layout: "BULLETS", purpose: "Review focus", contentGuidance: "Research question, scope, objectives" },
      { title: "Search Strategy", layout: "BULLETS", purpose: "Methodology", contentGuidance: "Databases, keywords, date range" },
      { title: "Selection Criteria", layout: "COLUMNS", purpose: "Inclusion/exclusion", contentGuidance: "What studies were included/excluded and why" },
      { title: "Study Selection", layout: "TIMELINE", purpose: "PRISMA flow", contentGuidance: "Number of studies at each stage" },
      { title: "Study Characteristics", layout: "BULLETS", purpose: "Overview of included studies", contentGuidance: "Study designs, populations, interventions" },
      { title: "Quality Assessment", layout: "COMPARE", purpose: "Study quality", contentGuidance: "Risk of bias, methodological quality" },
      { title: "Key Findings", layout: "BULLETS", purpose: "Main results", contentGuidance: "Summary of evidence across studies" },
      { title: "Evidence Synthesis", layout: "PYRAMID", purpose: "Strength of evidence", contentGuidance: "Quality and consistency of findings" },
      { title: "Heterogeneity", layout: "COMPARE", purpose: "Differences across studies", contentGuidance: "Variations in results and why" },
      { title: "Clinical Implications", layout: "BULLETS", purpose: "Practice recommendations", contentGuidance: "How findings apply to clinical practice" },
      { title: "Limitations", layout: "BULLETS", purpose: "Review constraints", contentGuidance: "Limitations of included studies and review" },
      { title: "Knowledge Gaps", layout: "BULLETS", purpose: "Future research needs", contentGuidance: "Unanswered questions" },
      { title: "Conclusions", layout: "BULLETS", purpose: "Summary", contentGuidance: "Main takeaways and recommendations" },
    ],
    
    useCases: [
      "Journal clubs",
      "Evidence-based medicine",
      "Academic conferences",
      "Guideline development",
      "Research seminars",
    ],
  },

  "clinical-trial": {
    name: "Clinical Trial",
    description: "Research study design and results presentation",
    category: "medical",
    icon: "💊",
    
    structure: {
      recommendedSlideCount: 16,
      minSlides: 12,
      maxSlides: 20,
      preferredLayouts: ["BULLETS", "TIMELINE", "COMPARE", "COLUMNS", "PYRAMID"],
      contentDensity: "detailed",
    },
    
    promptAdditions: {
      tone: "scientific, rigorous, and evidence-based",
      focus: "study design, methodology, results, and clinical implications",
      contentStyle: "detailed scientific presentation with statistical rigor",
      specificInstructions: [
        "Follow CONSORT guidelines for trial reporting",
        "Clearly state study objectives and endpoints",
        "Detail inclusion/exclusion criteria",
        "Describe randomization and blinding procedures",
        "Present baseline characteristics of study population",
        "Show primary and secondary outcomes with statistics",
        "Include safety and adverse events data",
        "Discuss clinical significance vs statistical significance",
        "Address study limitations",
        "Relate findings to clinical practice",
      ],
    },
    
    slideSequence: [
      { title: "Study Overview", layout: "BULLETS", purpose: "Trial summary", contentGuidance: "Title, phase, sponsor, registration number" },
      { title: "Background", layout: "BULLETS", purpose: "Clinical context and rationale", contentGuidance: "Disease burden, current treatments, unmet need" },
      { title: "Study Objectives", layout: "BULLETS", purpose: "Primary and secondary endpoints", contentGuidance: "Clearly defined, measurable objectives" },
      { title: "Study Design", layout: "BULLETS", purpose: "Trial methodology", contentGuidance: "Phase, design (RCT, etc.), duration, arms" },
      { title: "Patient Population", layout: "BULLETS", purpose: "Eligibility criteria", contentGuidance: "Inclusion and exclusion criteria" },
      { title: "Study Procedures", layout: "TIMELINE", purpose: "Visit schedule and assessments", contentGuidance: "Screening, treatment, follow-up timeline" },
      { title: "Randomization", layout: "BULLETS", purpose: "Allocation and blinding", contentGuidance: "Randomization method, stratification, blinding" },
      { title: "Patient Flow", layout: "TIMELINE", purpose: "CONSORT diagram", contentGuidance: "Enrollment, allocation, follow-up, analysis" },
      { title: "Baseline Characteristics", layout: "COLUMNS", purpose: "Study population demographics", contentGuidance: "Age, sex, disease characteristics by arm" },
      { title: "Primary Outcome", layout: "COMPARE", purpose: "Main efficacy results", contentGuidance: "Treatment vs control with statistics" },
      { title: "Secondary Outcomes", layout: "BULLETS", purpose: "Additional efficacy measures", contentGuidance: "All secondary endpoints with results" },
      { title: "Subgroup Analysis", layout: "COLUMNS", purpose: "Results by patient subgroups", contentGuidance: "Age, sex, disease severity subgroups" },
      { title: "Safety Profile", layout: "BULLETS", purpose: "Adverse events", contentGuidance: "AEs, SAEs, discontinuations by arm" },
      { title: "Discussion", layout: "BULLETS", purpose: "Interpretation of findings", contentGuidance: "Clinical significance, comparison to other trials" },
      { title: "Limitations", layout: "BULLETS", purpose: "Study constraints", contentGuidance: "Design limitations, generalizability" },
      { title: "Conclusions", layout: "BULLETS", purpose: "Clinical implications", contentGuidance: "Impact on practice, future research" },
    ],
    
    useCases: [
      "Clinical trial presentations",
      "Medical conferences",
      "Regulatory submissions",
      "Investigator meetings",
      "Publication presentations",
    ],
  },
};

/**
 * Get template by name
 */
export function getTemplate(name: TemplateName): TemplateProperties {
  return templates[name];
}

/**
 * Get all templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): TemplateProperties[] {
  return Object.values(templates).filter((t) => t.category === category);
}

/**
 * Get all template names
 */
export function getAllTemplateNames(): TemplateName[] {
  return Object.keys(templates) as TemplateName[];
}

/**
 * Format template instructions for AI prompt
 */
export function formatTemplateForPrompt(template: TemplateProperties): string {
  const instructions = template.promptAdditions.specificInstructions
    .map((inst, i) => `${i + 1}. ${inst}`)
    .join('\n');
  
  const slideSequence = template.slideSequence
    ? template.slideSequence
        .map((slide, i) => `${i + 1}. ${slide.title} (${slide.layout}): ${slide.purpose}`)
        .join('\n')
    : '';
  
  return `
## TEMPLATE: ${template.name}
${template.description}

**Tone:** ${template.promptAdditions.tone}
**Focus:** ${template.promptAdditions.focus}
**Content Style:** ${template.promptAdditions.contentStyle}
**Content Density:** ${template.structure.contentDensity}
**Recommended Slides:** ${template.structure.recommendedSlideCount}

**Specific Instructions:**
${instructions}

${slideSequence ? `**Suggested Slide Sequence:**\n${slideSequence}` : ''}

**Preferred Layouts:** ${template.structure.preferredLayouts.join(', ')}
`;
}
