import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getProjectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function getProjectRefFromJwt(token) {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return decoded?.ref || null;
  } catch {
    return null;
  }
}

const urlRef = getProjectRefFromUrl(supabaseUrl);
const serviceRef = getProjectRefFromJwt(serviceRoleKey);
const selectedKey =
  serviceRoleKey && serviceRef && serviceRef === urlRef
    ? serviceRoleKey
    : anonKey;

const supabase = createClient(supabaseUrl, selectedKey);

function isMissingUniquePresenceColumn(error) {
  const msg = (error?.message || "").toLowerCase();
  return msg.includes("uniquepresence") && msg.includes("does not exist");
}

export async function authenticateRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) throw new Error("Authorization header missing");

  const token = authHeader.split("Bearer ")[1];
  if (!token) throw new Error("Unauthorized - No token provided");

  // Mentor tokens: bypass Supabase, validate via MongoDB
  if (token.startsWith("mentor:")) {
    const { ObjectId } = await import("mongodb");
    const mentorId = token.slice(7).trim();
    if (!mentorId) throw new Error("Unauthorized - Invalid mentor token");

    const clientPromiseModule = (await import("@/lib/mongodb.js")).default;
    const client = await clientPromiseModule;
    const db = client.db("AI_Interview");
    const mentor = await db.collection("Mentors").findOne({
      _id: new ObjectId(mentorId),
      status: "active",
    });

    if (!mentor) throw new Error("Unauthorized - Mentor not found");
    return {
      user: { id: mentorId, name: mentor.name, email: mentor.email },
      uniquePresence: token,
    };
  }

  if (token.startsWith("uid:")) {
    const userId = token.slice(4).trim();
    if (!userId) throw new Error("Unauthorized - Invalid token");

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", userId)
      .single();

    if (error || !user) throw new Error("Unauthorized - User not found");
    return { user, uniquePresence: token };
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, email, uniquePresence")
    .eq("uniquePresence", token)
    .single();

  if (error && isMissingUniquePresenceColumn(error)) {
    const { data: byId, error: byIdError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", token)
      .single();

    if (byIdError || !byId) throw new Error("Unauthorized - User not found");
    return { user: byId, uniquePresence: `uid:${byId.id}` };
  }

  if (error || !user) throw new Error("Unauthorized - User not found");
  return { user, uniquePresence: token };
}

export async function authenticateAndGetRole(request) {
  const { user, uniquePresence } = await authenticateRequest(request);
  
  const clientPromise = (await import("@/lib/mongodb.js")).default;
  const client = await clientPromise;
  const db = client.db("AI_Interview");
  const profile = await db.collection("Profiles").findOne({ uniquePresence });
  
  const role = profile?.role || "user";
  return { user, uniquePresence, role, profile };
}

export function requireRole(role, allowedRoles) {
  if (!allowedRoles.includes(role)) {
    throw new Error(`Forbidden - requires ${allowedRoles.join(" or ")} role`);
  }
}
