import clientPromise from "@/lib/mongodb.js";
import { ObjectId } from "mongodb";
import crypto from "crypto";

const DB_NAME = "AI_Interview";
const COLLECTION = "Bookings";

async function getCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection(COLLECTION);
}

export async function createBooking(data) {
  const collection = await getCollection();
  const booking = {
    roomId: crypto.randomUUID(),
    userId: data.userId,
    uniquePresence: data.uniquePresence,
    userName: data.userName,
    userEmail: data.userEmail,
    mentorId: data.mentorId,
    mentorName: data.mentorName,
    requestedSlot: {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
    },
    status: "pending",
    adminNote: null,
    approvedAt: null,
    completedAt: null,
    rating: null,
    feedback: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await collection.insertOne(booking);
  return { ...booking, _id: result.insertedId };
}

export async function getBookingById(id) {
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function getBookingsByUser(uniquePresence) {
  const collection = await getCollection();
  return collection
    .find({ uniquePresence })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getBookingsByMentor(mentorId) {
  const collection = await getCollection();
  return collection
    .find({ mentorId })
    .sort({ "requestedSlot.date": -1 })
    .toArray();
}

export async function getAllBookings(statusFilter) {
  const collection = await getCollection();
  const filter = statusFilter ? { status: statusFilter } : {};
  return collection.find(filter).sort({ createdAt: -1 }).toArray();
}

export async function updateBookingStatus(id, status, adminNote = null) {
  const collection = await getCollection();
  const update = {
    status,
    adminNote,
    updatedAt: new Date(),
  };
  if (status === "approved") update.approvedAt = new Date();
  if (status === "completed") update.completedAt = new Date();

  return collection.updateOne({ _id: new ObjectId(id) }, { $set: update });
}

export async function addBookingFeedback(id, rating, feedback) {
  const collection = await getCollection();
  return collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        rating,
        feedback,
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
}
