import { StateGraph, Annotation } from '@langchain/langgraph';
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parse as parseJsonC } from 'jsonc-parser';
import { generateResumePDF } from './pdfGenerator.js';

// Primary LLM: OpenRouter
const openRouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Fallback LLM: Google Gemini
const geminiClient = process.env.GEMINI_AI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_AI_API_KEY)
  : null;

// Helper: Extract content from OpenAI response
function extractContent(message) {
  if (!message.content) {
    return message.reasoning || "";
  }
  
  if (Array.isArray(message.content)) {
    return message.content
      .filter(c => c.type === "text")
      .map(c => c.text)
      .join("\n");
  }
  
  if (typeof message.content === 'string') {
    return message.content;
  }
  
  return message.content.text || "";
}

// Helper: Convert OpenAI format to Gemini format
function convertToGeminiFormat(messages) {
  const systemMsg = messages.find(m => m.role === "system")?.content || "";
  const userMsg = messages.find(m => m.role === "user")?.content || "";
  
  if (systemMsg && userMsg) {
    return `${systemMsg}\n\n${userMsg}`;
  }
  return userMsg || systemMsg;
}

async function callLLM(messages, model = "tngtech/deepseek-r1t2-chimera:free") {
  // Try Primary LLM (OpenRouter) first
  try {
    console.log("🔵 Calling primary LLM (OpenRouter)...");
    const completion = await openRouterClient.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    });

    const firstMessage = completion.choices[0].message;
    const textContent = extractContent(firstMessage);
    
    console.log("✅ OpenRouter succeeded");
    return { content: textContent || "", provider: "openrouter" };

  } catch (err) {
    const isRateLimit = err.status === 429 || err.code === 429;
    
    if (isRateLimit) {
      console.warn("⚠️ OpenRouter rate limited (429), falling back to Gemini...");
    } else {
      console.warn(`⚠️ OpenRouter failed: ${err.message}, falling back to Gemini...`);
    }

    // Fallback to Google Gemini
    if (!geminiClient) {
      console.error("❌ Gemini client not configured. Set GEMINI_AI_API_KEY in .env");
      return { content: "", provider: "none" };
    }

    try {
      console.log("🟢 Calling fallback LLM (Google Gemini)...");
      const geminiModel = geminiClient.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        }
      });

      const geminiPrompt = convertToGeminiFormat(messages);
      const result = await geminiModel.generateContent(geminiPrompt);
      const response = await result.response;
      
      console.log("✅ Gemini succeeded");
      return { 
        content: response.text() || "", 
        provider: "gemini" 
      };

    } catch (geminiErr) {
      console.error("❌ Both LLMs failed:");
      console.error("  - OpenRouter:", err.message);
      console.error("  - Gemini:", geminiErr.message);
      return { content: "", provider: "none" };
    }
  }
}

// Define the state schema for resume generation
const ResumeState = Annotation.Root({
  personalInfo: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
  goals: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  skills: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  professionalSummary: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  structuredSkills: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
  suggestedProjects: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  atsKeywords: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  pdfBuffer: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});

/**
 * Node 1: Generate professional summary based on goals and skills
 */
async function generateProfessionalSummary(state) {
  const { goals, skills, personalInfo } = state;
  
  const primaryGoal = goals && goals.length > 0 ? goals[0] : "advance my career in technology";
  
  const systemPrompt = `You are an expert resume writer specializing in ATS-optimized content.
Generate a professional summary that is:
- 2-3 sentences long
- Includes key skills naturally
- Highlights career goals
- Uses strong action words
- Optimized for Applicant Tracking Systems (ATS)

Return ONLY the summary text, no additional commentary.`;

  const userPrompt = `Create a professional summary for a resume:

Career Goal: ${primaryGoal}
Key Skills: ${skills.join(', ')}

Generate a compelling professional summary.`;

  try {
    const response = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    let summary = response.content.trim();
    
    // Fallback if LLM fails
    if (!summary || summary.length < 50) {
      summary = `Results-oriented professional with expertise in ${skills.slice(0, 3).join(', ')}. Focused on ${primaryGoal.toLowerCase()} through continuous learning and practical application of technical skills. Strong problem-solving abilities with a commitment to delivering high-quality solutions.`;
    }

    console.log(`Professional summary generated (${response.provider}):`, summary.substring(0, 100) + "...");
    return { ...state, professionalSummary: summary };
  } catch (error) {
    console.error("Error generating professional summary:", error);
    
    // Fallback summary
    const fallbackSummary = `Motivated professional with strong foundation in ${skills.slice(0, 3).join(', ')}. Dedicated to ${primaryGoal.toLowerCase()} and contributing to innovative projects.`;
    return { ...state, professionalSummary: fallbackSummary };
  }
}

/**
 * Node 2: Structure and categorize skills for ATS optimization
 */
async function structureSkills(state) {
  const { skills } = state;
  
  const systemPrompt = `You are a resume optimization expert.
Categorize the given skills into these categories:
- Technical Skills
- Frameworks & Tools
- Soft Skills
- Domain Knowledge

Return ONLY valid JSON with this structure:
{
  "technical": ["skill1", "skill2"],
  "frameworks": ["tool1", "tool2"],
  "soft": ["skill1", "skill2"],
  "domain": ["area1", "area2"]
}`;

  const userPrompt = `Categorize these skills: ${skills.join(', ')}

Return the categorized skills as JSON.`;

  try {
    const response = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    console.log(`Skills structuring response (${response.provider})`);

    let structured;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structured = parseJsonC(jsonMatch[0], undefined, { allowTrailingComma: true });
      } else {
        structured = parseJsonC(response.content, undefined, { allowTrailingComma: true });
      }
    } catch (err) {
      console.warn("Failed to parse structured skills, using fallback", err);
      structured = createFallbackSkillStructure(skills);
    }

    console.log("Skills structured successfully");
    return { ...state, structuredSkills: structured };
  } catch (error) {
    console.error("Error structuring skills:", error);
    return { ...state, structuredSkills: createFallbackSkillStructure(skills) };
  }
}

function createFallbackSkillStructure(skills) {
  // Simple categorization logic
  const softSkillKeywords = ['problem-solving', 'collaboration', 'communication', 'leadership', 'teamwork'];
  const frameworkKeywords = ['react', 'node', 'angular', 'vue', 'express', 'django', 'spring'];
  
  return {
    technical: skills.filter(s => 
      !softSkillKeywords.some(k => s.toLowerCase().includes(k)) &&
      !frameworkKeywords.some(k => s.toLowerCase().includes(k))
    ),
    frameworks: skills.filter(s => 
      frameworkKeywords.some(k => s.toLowerCase().includes(k))
    ),
    soft: skills.filter(s => 
      softSkillKeywords.some(k => s.toLowerCase().includes(k))
    ),
    domain: []
  };
}

/**
 * Node 3: Generate suggested projects based on goals and skills
 */
async function generateSuggestedProjects(state) {
  const { goals, skills } = state;
  
  const primaryGoal = goals && goals.length > 0 ? goals[0] : "build technical projects";
  
  const systemPrompt = `You are a technical project advisor.
Suggest 2-3 relevant projects that would strengthen a resume for someone with the given goal and skills.

Return ONLY valid JSON array:
[
  {
    "title": "Project Name",
    "description": "Brief description (1-2 sentences)",
    "techStack": ["tech1", "tech2", "tech3"],
    "impact": "What this demonstrates"
  }
]`;

  const userPrompt = `Career Goal: ${primaryGoal}
Available Skills: ${skills.join(', ')}

Suggest 2-3 portfolio projects that would be impressive for this goal.`;

  try {
    const response = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    console.log(`Projects response (${response.provider})`);

    let projects;
    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        projects = parseJsonC(jsonMatch[0], undefined, { allowTrailingComma: true });
      } else {
        projects = parseJsonC(response.content, undefined, { allowTrailingComma: true });
      }
      
      if (!Array.isArray(projects)) {
        throw new Error('Response is not an array');
      }
    } catch (err) {
      console.warn("Failed to parse projects, using fallback", err);
      projects = createFallbackProjects(primaryGoal, skills);
    }

    console.log(`Generated ${projects.length} suggested projects`);
    return { ...state, suggestedProjects: projects };
  } catch (error) {
    console.error("Error generating projects:", error);
    return { ...state, suggestedProjects: createFallbackProjects(primaryGoal, skills) };
  }
}

function createFallbackProjects(goal, skills) {
  return [
    {
      title: "Personal Portfolio Website",
      description: `Built a responsive portfolio showcasing projects and skills using modern web technologies.`,
      techStack: skills.slice(0, 3),
      impact: "Demonstrates front-end development and design skills"
    },
    {
      title: "Goal-Oriented Application",
      description: `Developed an application aligned with ${goal} using best practices and industry standards.`,
      techStack: skills.slice(0, 4),
      impact: "Shows practical application of technical skills"
    }
  ];
}

/**
 * Node 4: Extract and inject ATS keywords
 */
async function extractATSKeywords(state) {
  const { goals, skills } = state;
  
  const primaryGoal = goals && goals.length > 0 ? goals[0] : "";
  
  const systemPrompt = `You are an ATS (Applicant Tracking System) optimization expert.
Based on the career goal, suggest 8-12 relevant keywords that should appear in the resume to pass ATS screening.

Return ONLY a JSON array of keywords:
["keyword1", "keyword2", "keyword3", ...]`;

  const userPrompt = `Career Goal: ${primaryGoal}
Current Skills: ${skills.join(', ')}

What additional keywords should be included for ATS optimization?`;

  try {
    const response = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    console.log(`ATS keywords response (${response.provider})`);

    let keywords;
    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        keywords = parseJsonC(jsonMatch[0], undefined, { allowTrailingComma: true });
      } else {
        keywords = parseJsonC(response.content, undefined, { allowTrailingComma: true });
      }
      
      if (!Array.isArray(keywords)) {
        throw new Error('Response is not an array');
      }
    } catch (err) {
      console.warn("Failed to parse ATS keywords, using fallback", err);
      keywords = createFallbackKeywords(primaryGoal);
    }

    console.log(`Extracted ${keywords.length} ATS keywords`);
    return { ...state, atsKeywords: keywords };
  } catch (error) {
    console.error("Error extracting ATS keywords:", error);
    return { ...state, atsKeywords: createFallbackKeywords(primaryGoal) };
  }
}

function createFallbackKeywords(goal) {
  const commonKeywords = [
    "Agile",
    "Problem Solving",
    "Team Collaboration",
    "Project Management",
    "Technical Documentation",
    "Code Review",
    "Version Control",
    "Continuous Learning"
  ];
  
  // Add goal-specific keywords
  if (goal.toLowerCase().includes('software engineer')) {
    return [...commonKeywords, "Software Development", "Algorithm Design", "Data Structures", "System Design"];
  }
  
  return commonKeywords;
}

/**
 * Node 5: Generate PDF buffer
 */
async function generatePDF(state) {
  const {
    personalInfo,
    goals,
    professionalSummary,
    structuredSkills,
    suggestedProjects,
    atsKeywords
  } = state;

  try {
    console.log("Generating PDF document...");
    
    const resumeContent = {
      personalInfo,
      professionalSummary,
      structuredSkills,
      projects: suggestedProjects,
      atsKeywords,
      goals
    };

    const pdfBuffer = await generateResumePDF(resumeContent);
    
    console.log(`PDF generated successfully. Buffer size: ${pdfBuffer.length} bytes`);
    return { ...state, pdfBuffer };
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

// Build the LangGraph workflow
const workflow = new StateGraph(ResumeState)
  .addNode("generateSummary", generateProfessionalSummary)
  .addNode("structureSkills", structureSkills)
  .addNode("generateProjects", generateSuggestedProjects)
  .addNode("extractKeywords", extractATSKeywords)
  .addNode("generatePDF", generatePDF)
  .addEdge("__start__", "generateSummary")
  .addEdge("generateSummary", "structureSkills")
  .addEdge("structureSkills", "generateProjects")
  .addEdge("generateProjects", "extractKeywords")
  .addEdge("extractKeywords", "generatePDF")
  .addEdge("generatePDF", "__end__");

const graph = workflow.compile();

/**
 * Main function to generate resume
 * @param {Object} resumeData - User data from Supabase and MongoDB
 * @returns {Buffer} PDF buffer
 */
export async function generateResume(resumeData) {
  if (!resumeData || !resumeData.personalInfo) {
    throw new Error("Invalid resume data provided");
  }

  const initialState = {
    personalInfo: resumeData.personalInfo,
    goals: resumeData.goals || [],
    skills: resumeData.skills || [],
    professionalSummary: "",
    structuredSkills: {},
    suggestedProjects: [],
    atsKeywords: [],
    pdfBuffer: null,
  };

  try {
    console.log("Starting resume generation workflow...");
    const resultState = await graph.invoke(initialState);
    
    if (!resultState.pdfBuffer) {
      throw new Error("PDF generation failed - no buffer returned");
    }
    
    return resultState.pdfBuffer;
  } catch (error) {
    console.error("Error in generateResume workflow:", error);
    throw error;
  }
}

export { graph as resumeGenerationGraph };