import clientPromise from "@/lib/mongodb.js";
import { ObjectId } from "mongodb";

const DB_NAME = "AI_Interview";
const COLLECTION = "Mentors";

async function getCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection(COLLECTION);
}

export async function getAllMentors({ expertise, search, status = "active" } = {}) {
  const collection = await getCollection();
  const filter = { status };

  if (expertise) {
    filter.expertise = { $in: Array.isArray(expertise) ? expertise : [expertise] };
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { title: { $regex: search, $options: "i" } },
      { expertise: { $elemMatch: { $regex: search, $options: "i" } } },
    ];
  }

  return collection.find(filter).sort({ rating: -1, totalSessions: -1 }).toArray();
}

export async function getMentorById(id) {
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function getMentorByUserId(identifier) {
  const collection = await getCollection();
  // Try uniquePresence first, then userId, then extract _id from mentor: token
  const mentor = await collection.findOne({
    $or: [
      { uniquePresence: identifier },
      { userId: identifier },
    ],
  });
  if (mentor) return mentor;

  // Handle mentor:<objectId> token format
  if (identifier?.startsWith("mentor:")) {
    const { ObjectId } = await import("mongodb");
    const id = identifier.slice(7);
    return collection.findOne({ _id: new ObjectId(id) });
  }
  return null;
}

export async function createMentor(data) {
  const collection = await getCollection();
  const mentor = {
    userId: data.userId || null,
    uniquePresence: data.uniquePresence || null,
    name: data.name,
    email: data.email,
    avatar: data.avatar || null,
    expertise: data.expertise || [],
    title: data.title || "",
    bio: data.bio || "",
    experience: data.experience || 0,
    rating: 0,
    totalSessions: 0,
    totalRatings: 0,
    availableSlots: data.availableSlots || [],
    pricePerSession: data.pricePerSession || 0,
    isFree: data.isFree !== false,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await collection.insertOne(mentor);
  return { ...mentor, _id: result.insertedId };
}

export async function updateMentor(id, data) {
  const collection = await getCollection();
  const updateData = { ...data, updatedAt: new Date() };
  delete updateData._id;
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );
  return result;
}

export async function deleteMentor(id) {
  const collection = await getCollection();
  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "inactive", updatedAt: new Date() } }
  );
}

export async function updateMentorRating(mentorId, newRating) {
  const collection = await getCollection();
  const mentor = await collection.findOne({ _id: new ObjectId(mentorId) });
  if (!mentor) return null;

  const totalRatings = (mentor.totalRatings || 0) + 1;
  const currentTotal = (mentor.rating || 0) * (mentor.totalRatings || 0);
  const avgRating = Math.round(((currentTotal + newRating) / totalRatings) * 10) / 10;

  return collection.updateOne(
    { _id: new ObjectId(mentorId) },
    {
      $set: { rating: avgRating, updatedAt: new Date() },
      $inc: { totalSessions: 1, totalRatings: 1 },
    }
  );
}
