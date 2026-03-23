import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authHelper.js";
import { getAllMentors } from "@/mongowork/mentors.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const expertise = searchParams.get("expertise");
    const search = searchParams.get("search");

    const mentors = await getAllMentors({ expertise, search });

    const safeMentors = mentors.map((m) => ({
      _id: m._id.toString(),
      name: m.name,
      email: m.email,
      avatar: m.avatar,
      expertise: m.expertise,
      title: m.title,
      bio: m.bio,
      experience: m.experience,
      rating: m.rating,
      totalSessions: m.totalSessions,
      availableSlots: m.availableSlots,
      isFree: m.isFree,
      pricePerSession: m.pricePerSession,
    }));

    return NextResponse.json({ status: "success", data: safeMentors });
  } catch (error) {
    console.error("GET /api/mentors error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
