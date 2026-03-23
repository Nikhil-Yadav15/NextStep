import { NextResponse } from "next/server";
import { getMentorById } from "@/mongowork/mentors.js";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const mentor = await getMentorById(id);

    if (!mentor) {
      return NextResponse.json(
        { status: "error", message: "Mentor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      data: {
        _id: mentor._id.toString(),
        name: mentor.name,
        email: mentor.email,
        avatar: mentor.avatar,
        expertise: mentor.expertise,
        title: mentor.title,
        bio: mentor.bio,
        experience: mentor.experience,
        rating: mentor.rating,
        totalSessions: mentor.totalSessions,
        availableSlots: mentor.availableSlots,
        isFree: mentor.isFree,
        pricePerSession: mentor.pricePerSession,
      },
    });
  } catch (error) {
    console.error("GET /api/mentors/[id] error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
