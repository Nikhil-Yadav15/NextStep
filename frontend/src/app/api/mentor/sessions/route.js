import { NextResponse } from "next/server";
import { authenticateAndGetRole, requireRole } from "@/lib/authHelper.js";
import { getMentorByUserId } from "@/mongowork/mentors.js";
import { getBookingsByMentor } from "@/mongowork/bookings.js";

export async function GET(request) {
  try {
    const { role, uniquePresence } = await authenticateAndGetRole(request);
    // requireRole(role, ["mentor"]); // Open access for now

    const mentor = await getMentorByUserId(uniquePresence);
    if (!mentor) {
      return NextResponse.json(
        { status: "error", message: "Mentor profile not found" },
        { status: 404 }
      );
    }

    const sessions = await getBookingsByMentor(mentor._id.toString());
    const safe = sessions.map((s) => ({ ...s, _id: s._id.toString() }));

    return NextResponse.json({
      status: "success",
      data: {
        mentor: { ...mentor, _id: mentor._id.toString() },
        sessions: safe,
      },
    });
  } catch (error) {
    console.error("GET /api/mentor/sessions error:", error);
    const code = error.message.includes("Forbidden") ? 403
      : error.message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: code }
    );
  }
}
