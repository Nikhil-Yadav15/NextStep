import { StateGraph, Annotation } from '@langchain/langgraph';
import {TavilySearch} from '@langchain/tavily'
import OpenAI from "openai";
import { parse as parseJsonC } from 'jsonc-parser';

const SERP_API_BASE_URL = 'https://serpapi.com/search.json';
const TRUSTED_DOMAIN_SCORES = {
  'youtube.com': 4,
  'youtu.be': 4,
  'developer.mozilla.org': 5,
  'learn.microsoft.com': 5,
  'docs.aws.amazon.com': 5,
  'cloud.google.com': 5,
  'freecodecamp.org': 4,
  'coursera.org': 4,
  'edx.org': 4,
  'udemy.com': 3,
  'geeksforgeeks.org': 3,
  'medium.com': 2,
  'towardsdatascience.com': 3,
  'stackoverflow.com': 3,
  'github.com': 4,
};

const BLOCKED_HOSTS = ['google.com', 'www.google.com', 'bing.com', 'search.yahoo.com'];

const DEFAULT_RESOURCE_FALLBACKS = [
  {
    title: 'freeCodeCamp - Learn to Code',
    url: 'https://www.freecodecamp.org/learn',
    description: 'Project-based learning paths and full tutorials',
    type: 'course',
  },
  {
    title: 'MDN Web Docs - Learn',
    url: 'https://developer.mozilla.org/en-US/docs/Learn',
    description: 'High-quality official web development documentation',
    type: 'docs',
  },
  {
    title: 'freeCodeCamp YouTube Channel',
    url: 'https://www.youtube.com/@freecodecamp',
    description: 'Long-form, beginner-to-advanced technical tutorials',
    type: 'video',
  },
];

const llmClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});


async function callLLM(messages, model = "nvidia/nemotron-3-super-120b-a12b:free") {
  try {
    const completion = await llmClient.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 3000,
    });


    const firstMessage = completion.choices[0].message;
    let textContent = "";
    if (firstMessage.content) {
      if (Array.isArray(firstMessage.content)) {
        textContent = firstMessage.content
          .filter(c => c.type === "text")
          .map(c => c.text)
          .join("\n");
      } else if (typeof firstMessage.content === 'string') {
        textContent = firstMessage.content;
      } else if (firstMessage.content.text) {
        textContent = firstMessage.content.text;
      }
    }
    if (!textContent || textContent.trim() === "") {
      if (firstMessage.reasoning && firstMessage.reasoning.trim() !== "") {
        textContent = firstMessage.reasoning;
      }
    }


    return { content: textContent || "" };
  } catch (err) {
    console.error("LLM call error:", err);
    return { content: "" };
  }
}


const RoadmapState = Annotation.Root({
  bookmarkedJobs: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  userSkills: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  currentJobIndex: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),
  jobAnalysis: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
  roadmaps: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
  finalOutput: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
});


const webSearchTool = new TavilySearch({
  maxResults: 5,
  apiKey: process.env.TAVILY_API_KEY,
});

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isBlockedUrl(url) {
  const host = getHostname(url);
  if (!host) return true;
  return BLOCKED_HOSTS.some(blocked => host === blocked || host.endsWith(`.${blocked}`));
}

function classifyResource(url, title = '') {
  const host = getHostname(url);
  const t = title.toLowerCase();
  if (host.includes('youtube.com') || host.includes('youtu.be')) return 'video';
  if (host.includes('docs.') || t.includes('documentation') || t.includes('official')) return 'docs';
  if (host.includes('coursera') || host.includes('edx') || host.includes('udemy')) return 'course';
  return 'blog';
}

function domainAuthorityScore(url) {
  const host = getHostname(url);
  if (!host) return 0;

  const exact = TRUSTED_DOMAIN_SCORES[host];
  if (typeof exact === 'number') return exact;

  for (const [domain, score] of Object.entries(TRUSTED_DOMAIN_SCORES)) {
    if (host.endsWith(`.${domain}`)) return score;
  }
  return 1;
}

function relevanceScore(text, skill, requiredSkills = []) {
  const haystack = String(text || '').toLowerCase();
  const skillTokens = String(skill || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  let score = 0;
  for (const token of skillTokens) {
    if (haystack.includes(token)) score += 2;
  }

  for (const req of requiredSkills.slice(0, 5)) {
    const reqToken = String(req || '').toLowerCase();
    if (reqToken && haystack.includes(reqToken)) score += 1;
  }

  return score;
}

async function searchWithSerpApi(query, num = 8) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [];

  try {
    const url = `${SERP_API_BASE_URL}?engine=google&q=${encodeURIComponent(query)}&num=${num}&api_key=${apiKey}`;
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      console.warn(`SerpAPI request failed (${response.status}) for query: ${query}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data?.organic_results) ? data.organic_results : [];
  } catch (err) {
    console.error(`SerpAPI error for query "${query}":`, err);
    return [];
  }
}

function normalizeResourceCandidate(item, fallbackTitle = 'Learning Resource') {
  const url = item?.url || item?.link || '';
  if (!url || isBlockedUrl(url)) return null;

  const title = item?.title || fallbackTitle;
  const description = item?.description || item?.snippet || item?.content || '';
  return {
    title,
    url,
    description: String(description).slice(0, 180),
    type: classifyResource(url, title),
  };
}

function dedupeByUrl(resources) {
  const seen = new Set();
  const output = [];

  for (const resource of resources) {
    if (!resource?.url) continue;
    const key = resource.url.split('#')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(resource);
  }

  return output;
}

function rankResources(resources, skill, requiredSkills = []) {
  return resources
    .map(resource => {
      const authority = domainAuthorityScore(resource.url);
      const relevance = relevanceScore(`${resource.title} ${resource.description}`, skill, requiredSkills);
      const videoBonus = resource.type === 'video' ? 1 : 0;
      const docsBonus = resource.type === 'docs' ? 1 : 0;
      const score = authority * 2 + relevance + videoBonus + docsBonus;
      return { ...resource, score };
    })
    .sort((a, b) => b.score - a.score);
}

function selectDiverseResources(rankedResources, limit = 4) {
  const selected = [];
  const usedUrls = new Set();

  const pickNext = predicate => {
    const candidate = rankedResources.find(resource => {
      if (!resource?.url) return false;
      if (usedUrls.has(resource.url)) return false;
      return predicate(resource);
    });

    if (!candidate) return;
    usedUrls.add(candidate.url);
    selected.push(candidate);
  };

  // Ensure at least one documentation link when available.
  pickNext(resource => resource.type === 'docs');

  // Ensure at least one non-video website/course link when available.
  pickNext(resource => resource.type === 'blog' || resource.type === 'course');

  // Keep one video if available.
  pickNext(resource => resource.type === 'video');

  // Fill remaining slots by score, while capping videos to avoid all-YouTube output.
  for (const resource of rankedResources) {
    if (selected.length >= limit) break;
    if (!resource?.url || usedUrls.has(resource.url)) continue;

    const currentVideoCount = selected.filter(item => item.type === 'video').length;
    if (resource.type === 'video' && currentVideoCount >= 2) continue;

    usedUrls.add(resource.url);
    selected.push(resource);
  }

  return selected.slice(0, limit);
}


async function analyzeJobRequirements(state) {
  const { bookmarkedJobs, userSkills, currentJobIndex } = state;
  const currentJob = bookmarkedJobs[currentJobIndex];
  
  if (!currentJob) {
    return { ...state, jobAnalysis: {} };
  }


  const prompt = `
Analyze this job posting and extract the required skills and qualifications:


Job Title: ${currentJob.title}
Company: ${currentJob.company}


Based on typical requirements for this role, list the key technical skills, tools, and qualifications needed.
Return as JSON with this format:
{
  "requiredSkills": ["skill1", "skill2", ...],
  "niceToHave": ["skill1", "skill2", ...]
}
`;


  try {
    const response = await callLLM([
      { role: "system", content: "You are a job requirements analyst. Return only valid JSON." },
      { role: "user", content: prompt }
    ]);
    
    let parsed;
    try {
      parsed = parseJsonC(response.content, undefined, { allowTrailingComma: true });
    } catch (err) {
      console.warn("Failed to parse job requirements, using defaults", err);
      parsed = { requiredSkills: [], niceToHave: [] };
    }

    const requiredSkills = parsed.requiredSkills || [];
    const userSkillsLower = userSkills.map(s => s.toLowerCase());
    const skillGaps = requiredSkills.filter(
      skill => !userSkillsLower.some(us => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us))
    );


    const analysis = {
      jobId: currentJob.jobId,
      requiredSkills,
      niceToHave: parsed.niceToHave || [],
      skillGaps,
      matchingSkills: requiredSkills.filter(skill => !skillGaps.includes(skill))
    };


    return { ...state, jobAnalysis: analysis };
  } catch (err) {
    console.error("Error in analyzeJobRequirements:", err);
    return { 
      ...state, 
      jobAnalysis: { 
        jobId: currentJob.jobId, 
        requiredSkills: [], 
        skillGaps: [],
        niceToHave: [],
        matchingSkills: []
      } 
    };
  }
}


async function fetchLearningResources(skill, jobContext = {}) {
  const requiredSkills = Array.isArray(jobContext.requiredSkills) ? jobContext.requiredSkills : [];
  const role = jobContext.jobTitle || '';

  try {
    const queries = [
      `${skill} tutorial for ${role} role`,
      `site:youtube.com ${skill} tutorial ${role}`,
      `${skill} official documentation best practices`,
    ];

    const serpResults = await Promise.all(queries.map(query => searchWithSerpApi(query, 8)));
    const flattened = serpResults.flat();

    const serpResources = flattened
      .map(item =>
        normalizeResourceCandidate(
          {
            title: item?.title,
            link: item?.link,
            snippet: item?.snippet,
          },
          `Learn ${skill}`
        )
      )
      .filter(Boolean);

    if (serpResources.length > 0) {
      const ranked = rankResources(dedupeByUrl(serpResources), skill, requiredSkills);
      return selectDiverseResources(ranked, 4).map(({ score, ...resource }) => resource);
    }

    const query = `best courses tutorials learn ${skill} 2025`;
    const tavilyResults = await webSearchTool.invoke(query);
    if (Array.isArray(tavilyResults)) {
      const resources = tavilyResults
        .map(result =>
          normalizeResourceCandidate(
            {
              title: extractTitle(result.content) || `Learn ${skill}`,
              url: result.url,
              description: result.content,
            },
            `Learn ${skill}`
          )
        )
        .filter(Boolean);

      const ranked = rankResources(dedupeByUrl(resources), skill, requiredSkills);
      return selectDiverseResources(ranked, 4).map(({ score, ...resource }) => resource);
    }

    return [];
  } catch (err) {
    console.error(`Error fetching resources for ${skill}:`, err);
    return [];
  }
}


function extractTitle(content) {
  const firstSentence = content.split('.')[0];
  return firstSentence.length > 60 ? firstSentence.substring(0, 60) + '...' : firstSentence;
}


async function generateJobRoadmap(state) {
  const { bookmarkedJobs, userSkills, currentJobIndex, jobAnalysis } = state;
  const currentJob = bookmarkedJobs[currentJobIndex];
  
  if (!currentJob || !jobAnalysis.jobId) {
    return state;
  }


  const systemPrompt = `
You are an expert career development advisor and learning path designer.
Your task is to create a detailed, actionable learning roadmap for someone preparing for a specific job role.


Return ONLY a valid JSON array with this exact structure:
[
  {
    "step": 1,
    "title": "Short descriptive title",
    "description": "Detailed description of what to learn and why",
    "estimatedDuration": "time estimate (e.g., 2-3 months)",
    "skills": ["skill1", "skill2"]
  }
]


Important:
- Create 4-7 steps in logical learning order
- Each step should build on previous steps
- Be realistic with time estimates
- Focus on practical, job-relevant skills
- Do NOT include resources field - it will be added separately
`;


  const userPrompt = `
Job Title: ${currentJob.title}
Company: ${currentJob.company}


User's Current Skills: ${userSkills.join(', ') || 'No specific skills listed'}


Required Skills for Job: ${jobAnalysis.requiredSkills.join(', ')}
Skill Gaps to Address: ${jobAnalysis.skillGaps.join(', ') || 'None - user has most required skills'}
Nice to Have: ${jobAnalysis.niceToHave.join(', ')}


Create a learning roadmap that:
1. Prioritizes the most critical skill gaps first
2. Builds on the user's existing skills
3. Prepares them specifically for the ${currentJob.title} role at ${currentJob.company}
4. Includes practical projects or portfolio work where relevant


Return ONLY the JSON array, no additional text.
`;


  try {
    const response = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], "nvidia/nemotron-3-super-120b-a12b:free");

    let roadmapArray;
    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        roadmapArray = parseJsonC(jsonMatch[0], undefined, { allowTrailingComma: true });
      } else {
        roadmapArray = parseJsonC(response.content, undefined, { allowTrailingComma: true });
      }
      
      if (!Array.isArray(roadmapArray)) {
        throw new Error('Response is not an array');
      }
    } catch (err) {
      console.warn("Failed to parse roadmap, creating fallback", err);
      roadmapArray = createFallbackRoadmap(currentJob, jobAnalysis);
    }

    for (let step of roadmapArray) {
      const stepSkills = step.skills || [];
      const allResources = [];

      for (const skill of stepSkills.slice(0, 2)) { 
        const resources = await fetchLearningResources(skill, {
          jobTitle: currentJob.title,
          requiredSkills: jobAnalysis.requiredSkills || [],
        });
        allResources.push(...resources);
      }
      const mergedRanked = rankResources(
        dedupeByUrl(allResources),
        stepSkills[0] || currentJob.title,
        jobAnalysis.requiredSkills || []
      );
      step.resources = selectDiverseResources(mergedRanked, 4).map(({ score, ...resource }) => resource);
      
      if (step.resources.length === 0) {
        step.resources = DEFAULT_RESOURCE_FALLBACKS;
      }
    }


    const updatedRoadmaps = {
      ...state.roadmaps,
      [currentJob.jobId]: roadmapArray
    };


    return { ...state, roadmaps: updatedRoadmaps };
  } catch (err) {
    console.error("Error in generateJobRoadmap:", err);
    const fallbackRoadmap = createFallbackRoadmap(currentJob, jobAnalysis);
    const updatedRoadmaps = {
      ...state.roadmaps,
      [currentJob.jobId]: fallbackRoadmap
    };
    return { ...state, roadmaps: updatedRoadmaps };
  }
}


function createFallbackRoadmap(job, analysis) {
  const skillGaps = analysis.skillGaps || [];
  
  if (skillGaps.length === 0) {
    return [
      {
        step: 1,
        title: "Advanced Skills Development",
        description: `You already have the fundamental skills for ${job.title}. Focus on advanced topics and real-world projects.`,
        resources: [
          {
            title: "Build Portfolio Projects",
            url: "https://github.com/topics/portfolio",
            description: "Create projects to showcase your skills"
          }
        ],
        estimatedDuration: "2-3 months",
        skills: analysis.requiredSkills.slice(0, 3)
      }
    ];
  }


  return skillGaps.slice(0, 5).map((skill, index) => ({
    step: index + 1,
    title: `Learn ${skill}`,
    description: `Master ${skill} to meet the requirements for ${job.title} at ${job.company}`,
    resources: DEFAULT_RESOURCE_FALLBACKS,
    estimatedDuration: "1-2 months",
    skills: [skill]
  }));
}


function shouldProcessNextJob(state) {
  const { bookmarkedJobs, currentJobIndex } = state;
  return currentJobIndex < bookmarkedJobs.length - 1 ? "analyzeJob" : "finalize";
}


async function incrementJobIndex(state) {
  return { ...state, currentJobIndex: state.currentJobIndex + 1 };
}


async function finalizeOutput(state) {
  return { ...state, finalOutput: state.roadmaps };
}


// workflow graph
const workflow = new StateGraph(RoadmapState)
  .addNode("analyzeJob", analyzeJobRequirements)
  .addNode("generateRoadmap", generateJobRoadmap)
  .addNode("incrementIndex", incrementJobIndex)
  .addNode("finalize", finalizeOutput)
  .addEdge("__start__", "analyzeJob")
  .addEdge("analyzeJob", "generateRoadmap")
  .addEdge("generateRoadmap", "incrementIndex")
  .addConditionalEdges("incrementIndex", shouldProcessNextJob, {
    analyzeJob: "analyzeJob",
    finalize: "finalize"
  })
  .addEdge("finalize", "__end__");


const graph = workflow.compile();


export async function generateRoadmaps(bookmarkedJobs = [], userSkills = []) {
  if (!bookmarkedJobs || bookmarkedJobs.length === 0) {
    return { error: "No bookmarked jobs provided" };
  }


  const initialState = {
    bookmarkedJobs,
    userSkills: userSkills || [],
    currentJobIndex: 0,
    jobAnalysis: {},
    roadmaps: {},
    finalOutput: {}
  };


  try {
    const resultState = await graph.invoke(initialState);
    return resultState.finalOutput || {};
  } catch (error) {
    console.error("Error in generateRoadmaps:", error);
    return { error: error.message };
  }
}


export { graph as roadmapGenerationGraph };
