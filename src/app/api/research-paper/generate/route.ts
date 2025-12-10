import { NextRequest, NextResponse } from "next/server";
import { ResearchPaperAgent } from "@/lib/research-paper/research-paper-agent";
import { ResearchPaperConfig } from "@/lib/research-paper/paper-config";
import { FileService } from "@/lib/deep-research/file-service";
import { db } from "@/server/db";
import { env } from "@/env";
import { getServerSupabase } from "@/lib/supabase/server";
import { CreditService } from "@/lib/credits/credit-service";
import { generateId } from "ai";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config: ResearchPaperConfig = await req.json();

    if (!config.topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    // Check credits before processing
    const hasCredits = await CreditService.hasEnoughCredits(user.id, "research_paper");
    if (!hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits. Research paper generation requires 15 credits." },
        { status: 402 }
      );
    }

    console.log(`📝 Generating research paper: ${config.topic}`);
    console.log(`   Type: ${config.essayType}`);
    console.log(`   Level: ${config.academicLevel}`);
    console.log(`   Style: ${config.citationStyle}`);

    // Initialize services
    const agent = new ResearchPaperAgent(env.CEREBRAS_API_KEY || "");
    const fileService = new FileService();

    // Generate paper
    const result = await agent.generatePaperBySection(config);

    // Validate quality
    const validation = agent.validatePaper(result);

    console.log(`✅ Paper generated: ${result.wordCount} words, ${result.referenceCount} refs`);
    console.log(`   Quality score: ${validation.score}%`);

    // Save to file
    console.log(`💾 Saving to file for user: ${user.id}`);
    let filePath = '';
    try {
      filePath = await fileService.saveMarkdownFile(
        user.id,
        config.topic,
        result.markdown
      );
      console.log(`✅ File saved successfully: ${filePath}`);
    } catch (fileError) {
      console.error(`❌ Error saving file:`, fileError);
      // Continue even if file save fails
    }

    // Save to database
    console.log(`💾 Saving to database...`);
    const now = new Date();
    const report = await db.deepResearchReport.create({
      data: {
        id: generateId(),
        userId: user.id,
        topic: config.topic,
        status: "completed",
        filePath: filePath ?? "",
        markdown: result.markdown,
        pmidsUsed: result.sources.map(s => s.id || s.pmid || ''),
        wordCount: result.wordCount,
        referenceCount: result.referenceCount,
        createdAt: now,
        updatedAt: now,
      },
    });

    console.log(`✅ Saved to database: ${report.id}`);

    // Deduct credits after successful generation
    await CreditService.deductCredits(
      user.id,
      "research_paper",
      `Generated research paper: ${config.topic}`
    );

    return NextResponse.json({
      success: true,
      paper: result.markdown,
      wordCount: result.wordCount,
      referenceCount: result.referenceCount,
      sections: result.sections,
      sources: result.sources,
      validation,
      config: result.config,
      reportId: report.id,
      filePath
    });
  } catch (error) {
    console.error("❌ Error generating research paper:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    return NextResponse.json(
      { 
        error: "Failed to generate research paper",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

async function generateResearchPaper(topic: string): Promise<string> {
  // Replace this with your actual AI API call
  // Example with OpenAI:
  /*
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a medical research assistant. Generate comprehensive academic research papers with proper structure, citations, and medical terminology."
      },
      {
        role: "user",
        content: `Generate a comprehensive research paper on: ${topic}`
      }
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });
  return response.choices[0].message.content || "";
  */

  // Extract the actual topic from the request
  const extractedTopic = topic
    .replace(/create|write|generate|research|paper|article|on|about|a|an|the/gi, '')
    .trim();

  const displayTopic = extractedTopic || topic;

  // Enhanced placeholder response with better medical content
  return `
    <h1>Comprehensive Research Paper: ${displayTopic}</h1>
    
    <h2>Abstract</h2>
    <p><strong>Background:</strong> ${displayTopic} represents a significant area of medical research with important clinical implications. This comprehensive review examines current evidence, methodologies, and emerging trends in the field.</p>
    <p><strong>Objective:</strong> To provide a systematic analysis of recent developments in ${displayTopic} and identify future research directions.</p>
    <p><strong>Methods:</strong> A systematic literature review was conducted using PubMed, MEDLINE, Cochrane Library, and Embase databases covering publications from 2020-2024.</p>
    <p><strong>Results:</strong> Analysis of 156 peer-reviewed studies revealed significant advances in understanding ${displayTopic}, with important implications for clinical practice and patient outcomes.</p>
    <p><strong>Conclusion:</strong> Current evidence supports the continued investigation of ${displayTopic} with emphasis on evidence-based approaches and patient-centered care.</p>
    
    <h2>1. Introduction</h2>
    <h3>1.1 Background and Significance</h3>
    <p>The study of ${displayTopic} has evolved significantly over the past decade, driven by advances in medical technology, improved diagnostic capabilities, and enhanced understanding of underlying pathophysiology. Recent epidemiological data suggests that ${displayTopic} affects a substantial portion of the population, making it a critical area for continued research and clinical focus.</p>
    
    <h3>1.2 Current State of Knowledge</h3>
    <p>Contemporary research in ${displayTopic} has revealed complex interactions between genetic, environmental, and lifestyle factors. Evidence-based guidelines have been developed to standardize approaches to diagnosis and treatment, though significant variations in clinical practice persist across different healthcare settings.</p>
    
    <h3>1.3 Research Objectives</h3>
    <p>This paper aims to: (1) synthesize current evidence regarding ${displayTopic}, (2) evaluate the effectiveness of various interventions, (3) identify gaps in existing knowledge, and (4) propose directions for future research.</p>
    
    <h2>2. Methodology</h2>
    <h3>2.1 Search Strategy</h3>
    <p>A comprehensive literature search was conducted across multiple databases including PubMed, MEDLINE, Cochrane Library, and Embase. Search terms included "${displayTopic}" combined with "treatment," "diagnosis," "outcomes," "clinical trials," and "systematic review." The search was limited to peer-reviewed articles published in English between January 2020 and December 2024.</p>
    
    <h3>2.2 Inclusion and Exclusion Criteria</h3>
    <p><strong>Inclusion criteria:</strong> Randomized controlled trials, systematic reviews, meta-analyses, and observational studies examining ${displayTopic} in adult populations.</p>
    <p><strong>Exclusion criteria:</strong> Case reports, editorials, conference abstracts, and studies with sample sizes less than 50 participants.</p>
    
    <h3>2.3 Data Extraction and Analysis</h3>
    <p>Data were extracted using standardized forms including study design, sample size, interventions, outcomes, and quality assessment. Risk of bias was evaluated using the Cochrane Risk of Bias tool for randomized trials and the Newcastle-Ottawa Scale for observational studies.</p>
    
    <h2>3. Results</h2>
    <h3>3.1 Study Selection</h3>
    <p>Initial database searches identified 1,247 potentially relevant articles. After removing duplicates and screening titles and abstracts, 312 full-text articles were reviewed. Of these, 156 studies met inclusion criteria and were included in the final analysis.</p>
    
    <h3>3.2 Key Findings</h3>
    <p><strong>Diagnostic Approaches:</strong> Recent advances in diagnostic technology have improved early detection rates for ${displayTopic}. Sensitivity and specificity of modern diagnostic tools exceed 90% in most clinical settings.</p>
    
    <p><strong>Treatment Outcomes:</strong> Evidence from randomized controlled trials demonstrates that evidence-based interventions for ${displayTopic} result in significant improvements in patient outcomes, with effect sizes ranging from moderate to large (Cohen's d = 0.5-1.2).</p>
    
    <p><strong>Patient-Reported Outcomes:</strong> Quality of life assessments indicate substantial improvements following appropriate management of ${displayTopic}, with sustained benefits observed at 12-month follow-up.</p>
    
    <h3>3.3 Comparative Effectiveness</h3>
    <p>Meta-analysis of 45 comparative studies revealed that multimodal approaches to ${displayTopic} demonstrate superior outcomes compared to single-intervention strategies (OR = 2.34, 95% CI: 1.87-2.93, p < 0.001).</p>
    
    <h2>4. Discussion</h2>
    <h3>4.1 Interpretation of Findings</h3>
    <p>The current body of evidence supports a comprehensive, patient-centered approach to ${displayTopic}. Integration of evidence-based guidelines with individualized treatment planning appears to optimize outcomes while minimizing adverse effects.</p>
    
    <h3>4.2 Clinical Implications</h3>
    <p>Healthcare providers should consider implementing standardized protocols for ${displayTopic} that incorporate: (1) early screening and diagnosis, (2) evidence-based treatment selection, (3) regular monitoring and follow-up, and (4) patient education and engagement strategies.</p>
    
    <h3>4.3 Limitations</h3>
    <p>This review has several limitations including heterogeneity in study designs, variations in outcome measures, and potential publication bias. Additionally, most studies were conducted in high-income countries, limiting generalizability to resource-limited settings.</p>
    
    <h3>4.4 Future Research Directions</h3>
    <p>Future studies should focus on: (1) long-term outcomes beyond 12 months, (2) cost-effectiveness analyses, (3) implementation science to improve guideline adherence, and (4) personalized medicine approaches based on genetic and biomarker profiles.</p>
    
    <h2>5. Conclusion</h2>
    <p>This comprehensive review demonstrates that significant progress has been made in understanding and managing ${displayTopic}. Evidence-based approaches have been shown to improve patient outcomes, though important knowledge gaps remain. Continued research is essential to optimize care delivery and improve outcomes for all patients affected by ${displayTopic}.</p>
    
    <h2>References</h2>
    <p>1. Anderson, M.J., et al. (2024). "Advances in ${displayTopic}: A Systematic Review and Meta-Analysis." <em>New England Journal of Medicine</em>, 390(12), 1123-1145. DOI: 10.1056/NEJMra2024001</p>
    
    <p>2. Chen, L., & Rodriguez, P. (2024). "Evidence-Based Guidelines for ${displayTopic} Management." <em>The Lancet</em>, 403(10425), 567-589. DOI: 10.1016/S0140-6736(24)00234-5</p>
    
    <p>3. Williams, K.R., et al. (2023). "Long-term Outcomes in ${displayTopic}: A Prospective Cohort Study." <em>JAMA</em>, 329(18), 1567-1578. DOI: 10.1001/jama.2023.12345</p>
    
    <p>4. Thompson, S.D., & Lee, H.J. (2023). "Diagnostic Accuracy in ${displayTopic}: A Multicenter Trial." <em>British Medical Journal</em>, 381, e074123. DOI: 10.1136/bmj-2023-074123</p>
    
    <p>5. Martinez, A., et al. (2023). "Patient-Centered Approaches to ${displayTopic}." <em>Annals of Internal Medicine</em>, 176(7), 945-956. DOI: 10.7326/M23-0456</p>
    
    <p>6. Kumar, V., & Patel, N. (2022). "Emerging Therapies for ${displayTopic}: A Comprehensive Review." <em>Nature Medicine</em>, 28(11), 2234-2247. DOI: 10.1038/s41591-022-02045-8</p>
    
    <p>7. Johnson, R.T., et al. (2022). "Cost-Effectiveness Analysis of ${displayTopic} Interventions." <em>Health Economics</em>, 31(9), 1876-1892. DOI: 10.1002/hec.4567</p>
    
    <p>8. Brown, E.M., & Davis, C.L. (2021). "Quality of Life Outcomes in ${displayTopic}: A Systematic Review." <em>Quality of Life Research</em>, 30(12), 3345-3361. DOI: 10.1007/s11136-021-02934-2</p>
  `;
}
