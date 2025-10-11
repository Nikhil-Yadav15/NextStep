import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getBookmarkedJobs, getUserSkills } from '@/mongowork/getData_for_roadmap.js';
import { generateRoadmaps } from '@/agents/generate_roadmap.js';

import { createClient } from '@supabase/supabase-js';
import clientPromise from '@/lib/mongodb';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let redis, ratelimit;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
    });
  }
} catch (error) {
  console.warn('Redis/Rate limiting setup failed:', error);
}

async function authenticateRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Authorization header missing');

  const uniquePresence = authHeader.split('Bearer ')[1];
  console.log("Authenticating with uniquePresence:", uniquePresence);
  if (!uniquePresence) throw new Error('Unauthorized - No token provided');

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email, uniquePresence')
    .eq('uniquePresence', uniquePresence)
    .single();

  if (userError || !user) throw new Error('Unauthorized - User not found');
  return { user, uniquePresence };
}

async function checkRateLimit(request) {
  if (!ratelimit) {
    console.warn('Rate limiting not configured - skipping');
    return { success: true };
  }
  
  const ip = request.headers.get('x-forwarded-for') 
    ?? request.headers.get('x-real-ip') 
    ?? 'anonymous';
    
  try {
    const result = await ratelimit.limit(ip);
    return result;
  } catch (error) {
    console.error('Rate limiting error:', error);
    return { success: true };
  }
}

export async function POST(request) {
  try {
    let uniquePresence;
    try {
      const authResult = await authenticateRequest(request);
      uniquePresence = authResult.uniquePresence;
    } catch (authError) {
      console.warn('Authentication failed:', authError.message);
      return NextResponse.json(
        { 
          message: 'Authentication required', 
          status: 'error',
          error: authError.message 
        },
        { status: 401 }
      );
    }

    const { force } = await request.json().catch(() => ({}));

    const rateLimitResult = await checkRateLimit(request);
    if (!rateLimitResult.success) {
      console.warn('Rate limit exceeded for IP:', 
        request.headers.get('x-forwarded-for') ?? 'unknown'
      );
      
      return NextResponse.json(
        { 
          message: 'Rate limit exceeded. Please try again later.', 
          status: 'error',
          retryAfter: rateLimitResult.reset 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.round((rateLimitResult.reset - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
          }
        }
      );
    }

    console.log('Fetching data for uniquePresence:', uniquePresence);
    console.log("Trying to find Roadmap if already in mongodb");
    const client = await clientPromise;
    const db = client.db("AI_Interview");
    const profiles = db.collection('Profiles');

    const profile = await profiles.findOne({ uniquePresence });

    if (!profile) {
      return NextResponse.json(
        { message: 'Profile not found in MongoDB', status: 'error' },
        { status: 404 }
      );
    }

    if (!force && profile.roadmap && Object.keys(profile.roadmap).length > 0) {
      console.log("Found Existing Generated Roadmap in DB (using cache)");
      return NextResponse.json({
        message: 'Loaded roadmap from cache',
        status: 'success',
        data: { roadmaps: profile.roadmap },
        source: 'cache',
      });
    } else if (force) {
      console.log("Force regeneration requested – ignoring cache");
    }
    
    const [bookmarkedJobs, userSkills] = await Promise.all([
      getBookmarkedJobs(uniquePresence),
      getUserSkills(uniquePresence)
    ]);

    console.log('Bookmarked jobs found:', bookmarkedJobs.length);
    console.log('User skills found:', userSkills.length);

    if (!bookmarkedJobs || bookmarkedJobs.length === 0) {
      return NextResponse.json(
        { 
          message: 'No bookmarked jobs found. Please bookmark some jobs first.', 
          status: 'error'
        },
        { status: 404 }
      );
    }

    const roadmapResults = await generateRoadmaps(bookmarkedJobs, userSkills);

    await profiles.updateOne(
      { _id: profile._id },
      { 
        $set: { 
          roadmap: roadmapResults,
          updatedAt: new Date(),
        } 
      }
    );

    const responseData = {
      timestamp: new Date().toISOString(),
      jobsProcessed: bookmarkedJobs.length,
      roadmaps: roadmapResults
    };

    if (rateLimitResult.remaining !== undefined) {
      responseData.rateLimit = {
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset
      };
    }

    return NextResponse.json({
      message: `generated roadmaps for ${bookmarkedJobs.length} job(s)`,
      status: 'success',
      data: responseData,
    });
    
  } catch (error) {
    console.error('Error in roadmap API:', error);
    
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message;
    
    return NextResponse.json(
      {
        message: 'Error generating roadmap',
        status: 'error',
        error: message,
      },
      { status: 500 }
    );
  }
}
