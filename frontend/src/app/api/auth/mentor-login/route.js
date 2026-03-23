import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb.js";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // 1. Check if this email exists as an active mentor
    const mongoClient = await clientPromise;
    const db = mongoClient.db("AI_Interview");
    const mentor = await db.collection("Mentors").findOne({
      email: { $regex: new RegExp(`^${email.trim()}$`, "i") },
      status: "active",
    });

    if (!mentor) {
      return NextResponse.json(
        { message: "You are not registered as a mentor. Contact admin." },
        { status: 403 }
      );
    }

    // 2. Generate a uniquePresence token for this mentor
    const uniquePresence = `mentor:${mentor._id.toString()}`;

    // 3. Ensure a MongoDB profile exists with mentor role
    await db.collection("Profiles").updateOne(
      { uniquePresence },
      {
        $set: { role: "mentor", name: mentor.name, email: mentor.email, updatedAt: new Date() },
        $setOnInsert: {
          uniquePresence,
          phone: "", location: "",
          title: mentor.title || "", bio: mentor.bio || "",
          linkedin: "", github: "", website: "",
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // 4. Link uniquePresence back to mentor record
    await db.collection("Mentors").updateOne(
      { _id: mentor._id },
      { $set: { uniquePresence, updatedAt: new Date() } }
    );

    return NextResponse.json({
      message: "Mentor login successful",
      uniquePresence,
      mentorId: mentor._id.toString(),
    });
  } catch (error) {
    console.error("Mentor login error:", error);
    return NextResponse.json(
      { message: error?.message || "Login failed" },
      { status: 500 }
    );
  }
}
