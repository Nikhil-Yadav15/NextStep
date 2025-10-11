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
      max_tokens: 2000,
      reasoning: 'disabled',
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

export async function processATSAnalysis(resumeText = "", jobDescription = "") {

  if (!resumeText || !jobDescription) {
    return {
      error: "Missing resume or job description",
      matchScore: 0,
      missingKeywords: [],
      presentKeywords: [],
      profileSummary: "Incomplete input",
      recommendations: [],
      strengthAreas: [],
      applicationSuccessRate: 0,
    };
  }


  const systemPrompt = `
You are an advanced Applicant Tracking System (ATS) analyzer.
You will clean the input texts, extract keywords, and provide a detailed ATS comparison analysis.
Return output strictly as pure JSON with this structure:

{
  "cleanedResume": "string",
  "cleanedJD": "string",
  "extractedKeywords": {
    "resume": ["skill1", "skill2", ...],
    "jd": ["skill1", "skill2", ...]
  },
  "analysis": {
    "matchScore": 75,
    "missingKeywords": ["keyword1", "keyword2"],
    "presentKeywords": ["keyword1", "keyword2"],
    "profileSummary": "Brief summary of fit",
    "recommendations": ["suggestion1", "suggestion2"],
    "strengthAreas": ["area1", "area2"],
    "applicationSuccessRate": 70
  }
}
`;

  const userPrompt = `
Perform the full ATS pipeline:
1. Clean both resume and job description (remove noise and keep professional data).
2. Extract important skills, technologies, and qualifications.
3. Compare keywords and provide analysis as per the structure above.

Resume:
${resumeText}

Job Description:
${jobDescription}
`;

  let response;
  try {
    response = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);
  } catch (err) {
    response = { content: "" };
  }


  let parsed = {};
  try {
    parsed = parseJsonC(response.content || "{}", undefined, { allowTrailingComma: true });
    if (typeof parsed !== "object" || parsed === null) parsed = {};
  } catch (err) {
    console.warn(" [JSON Parsing] Failed, using fallback:", err);
  }

  const analysis = parsed?.analysis || {};
  const extractedKeywords = parsed?.extractedKeywords || { resume: [], jd: [] };

  if (!analysis || Object.keys(analysis).length === 0) {
    const resumeWords = resumeText.toLowerCase().split(/\W+/);
    const jdWords = jobDescription.toLowerCase().split(/\W+/);
    const matched = jdWords.filter((word) => resumeWords.includes(word));
    const uniqueMatched = [...new Set(matched)].slice(0, 15);

    const matchScore = jdWords.length
      ? Math.round((uniqueMatched.length / jdWords.length) * 100)
      : 0;

    return {
      matchScore,
      missingKeywords: [],
      presentKeywords: uniqueMatched,
      profileSummary: `Rough match score based on keyword overlap: ${matchScore}%`,
      recommendations: ["Ensure your resume covers key job terms."],
      strengthAreas: uniqueMatched.length > 0 ? ["Keyword alignment"] : [],
      applicationSuccessRate: Math.max(30, matchScore - 10),
      cleanedResume: resumeText,
      cleanedJD: jobDescription,
      extractedKeywords,
    };
  }

  const result = {
  matchScore: analysis.matchScore || 0,
  missingKeywords: analysis.missingKeywords || [],
  presentKeywords: analysis.presentKeywords || [],
  profileSummary: analysis.profileSummary || "Analysis completed",
  recommendations: analysis.recommendations || [],
  strengthAreas: analysis.strengthAreas || [],
  applicationSuccessRate: analysis.applicationSuccessRate || 0,
  cleanedResume: parsed.cleanedResume || resumeText,
  cleanedJD: parsed.cleanedJD || jobDescription,
  extractedKeywords,
};

console.log({
  matchScore: result.matchScore,
  missing: result.missingKeywords.length,
  present: result.presentKeywords.length,
});

return result;

}
