import OpenAI from "openai";
import { parse as parseJsonC } from "jsonc-parser";

const llmClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function callLLM(messages, model = "tngtech/deepseek-r1t2-chimera:free") {
  try {
    const completion = await llmClient.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 3000,
    });

    const firstMessage = completion.choices?.[0]?.message || {};
    let textContent = "";

    if (firstMessage.content) {
      if (Array.isArray(firstMessage.content)) {
        textContent = firstMessage.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n");
      } else if (typeof firstMessage.content === "string") {
        textContent = firstMessage.content;
      } else if (firstMessage.content.text) {
        textContent = firstMessage.content.text;
      }
    }

    return { content: textContent.trim() };
  } catch (err) {
    console.error("Error during API call:", err);
    return { content: "" };
  }
}

function generateFallbackATSAnalysis(resumeText = "", jobDescription = "") {
  const resumeLower = resumeText.toLowerCase();
  const jdLower = jobDescription.toLowerCase();
  
  const commonKeywords = [
    'python', 'javascript', 'java', 'react', 'node', 'sql', 'aws', 'docker', 
    'kubernetes', 'git', 'agile', 'scrum', 'leadership', 'management', 
    'communication', 'problem solving', 'teamwork', 'project management'
  ];
  
  const matchedKeywords = commonKeywords.filter(keyword => 
    resumeLower.includes(keyword) && jdLower.includes(keyword)
  );
  
  const missingKeywords = commonKeywords
    .filter(keyword => jdLower.includes(keyword) && !resumeLower.includes(keyword))
    .slice(0, 5);
  
  const baseScore = 60;
  const matchBonus = Math.min(matchedKeywords.length * 2, 15);
  const finalScore = baseScore + matchBonus;

  return {
    matchScore: finalScore,
    missingKeywords: missingKeywords.length > 0 ? missingKeywords : [
      "specific job requirements",
      "industry terminology",
      "relevant certifications"
    ],
    presentKeywords: matchedKeywords.length > 0 ? matchedKeywords : [
      "professional experience",
      "educational background",
      "core competencies"
    ],
    profileSummary: "Your resume shows a moderate alignment with the job requirements. While you have relevant experience, consider incorporating more specific keywords and skills mentioned in the job description to improve your ATS compatibility and match score.",
    recommendations: [
      "Incorporate specific keywords from the job description throughout your resume",
      "Quantify your achievements with metrics and numbers (e.g., 'increased efficiency by 25%')",
      "Tailor your work experience descriptions to mirror the job requirements",
      "Add relevant technical skills and tools mentioned in the job posting",
      "Include industry-specific certifications or training if applicable"
    ],
    strengthAreas: matchedKeywords.length > 0 ? [
      "Relevant technical skills present",
      "Professional experience documented",
      "Clear resume structure"
    ] : [
      "Professional formatting",
      "Complete work history",
      "Educational credentials"
    ],
    applicationSuccessRate: Math.max(40, finalScore - 10),
    cleanedResume: resumeText,
    cleanedJD: jobDescription,
    extractedKeywords: {
      resume: matchedKeywords,
      jd: [...matchedKeywords, ...missingKeywords]
    },
    fallback: true
  };
}

export async function processATSAnalysis(resumeText = "", jobDescription = "") {
  if (!resumeText || !jobDescription) {
    console.warn("Missing resume or job description");
    return generateFallbackATSAnalysis(resumeText, jobDescription);
  }

  const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyzer with deep knowledge of recruitment processes.

Your task is to analyze how well a resume matches a job description and provide actionable insights.

**Critical Instructions:**
1. Extract and compare keywords, skills, qualifications, and experience
2. Calculate a realistic match score (0-100) based on keyword overlap and relevance
3. Identify missing critical keywords that could improve the match
4. Provide specific, actionable recommendations
5. Return ONLY valid JSON - no markdown, no code blocks, no explanations

**Output Format (strict JSON):**
{
  "matchScore": 75,
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "presentKeywords": ["skill1", "skill2", "skill3"],
  "profileSummary": "A 2-3 sentence summary of how well the candidate fits the role",
  "recommendations": [
    "Specific action item 1",
    "Specific action item 2",
    "Specific action item 3"
  ],
  "strengthAreas": [
    "Area where resume is strong",
    "Another strength area"
  ],
  "applicationSuccessRate": 65
}`;

  const userPrompt = `Analyze this resume against the job description and provide ATS compatibility scoring.

**RESUME:**
${resumeText.slice(0, 8000)}

**JOB DESCRIPTION:**
${jobDescription.slice(0, 4000)}

Provide detailed ATS analysis in the exact JSON format specified. Focus on keyword matching, experience alignment, and skill relevance.`;

  let response;
  try {
    console.log("[ATS] Calling LLM");
    response = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);
    
    if (!response || !response.content) {
      throw new Error("Empty response from LLM");
    }

  } catch (err) {
    console.error("[ATS] LLM call failed:", err);
    return generateFallbackATSAnalysis(resumeText, jobDescription);
  }

  let parsed = {};
  try {
    let content = response.content.trim();
    content = content.replace(/^``````\s*$/i, '');
    
    parsed = parseJsonC(content, undefined, { allowTrailingComma: true });
    
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Parsed result is not an object");
    }
    
  } catch (err) {
    console.error("JSON parsing failed:", err);
    return generateFallbackATSAnalysis(resumeText, jobDescription);
  }

  try {
    const matchScore = typeof parsed.matchScore === 'number' && !isNaN(parsed.matchScore)
      ? Math.max(0, Math.min(100, parsed.matchScore))
      : 60;

    const result = {
      matchScore: matchScore,
      missingKeywords: Array.isArray(parsed.missingKeywords) 
        ? parsed.missingKeywords.slice(0, 10) 
        : ["specific job requirements"],
      presentKeywords: Array.isArray(parsed.presentKeywords) 
        ? parsed.presentKeywords.slice(0, 15) 
        : ["general skills"],
      profileSummary: typeof parsed.profileSummary === 'string' && parsed.profileSummary.trim()
        ? parsed.profileSummary.trim()
        : "Your resume shows potential for this role. Consider aligning it more closely with the job requirements.",
      recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
        ? parsed.recommendations.slice(0, 6)
        : [
            "Add more keywords from the job description",
            "Quantify your achievements with metrics",
            "Tailor your experience to match role requirements"
          ],
      strengthAreas: Array.isArray(parsed.strengthAreas) && parsed.strengthAreas.length > 0
        ? parsed.strengthAreas.slice(0, 5)
        : ["Professional experience", "Educational background"],
      applicationSuccessRate: typeof parsed.applicationSuccessRate === 'number' && !isNaN(parsed.applicationSuccessRate)
        ? Math.max(0, Math.min(100, parsed.applicationSuccessRate))
        : Math.max(30, matchScore - 10),
      cleanedResume: resumeText,
      cleanedJD: jobDescription,
      extractedKeywords: {
        resume: Array.isArray(parsed.presentKeywords) ? parsed.presentKeywords : [],
        jd: [
          ...(Array.isArray(parsed.presentKeywords) ? parsed.presentKeywords : []),
          ...(Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [])
        ]
      },
      fallback: false
    };

    return result;
    
  } catch (validationError) {
    console.error("Validation failed:", validationError);
    return generateFallbackATSAnalysis(resumeText, jobDescription);
  }
}
