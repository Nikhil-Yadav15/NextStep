import { NextResponse } from "next/server";
import { authenticateAndGetRole } from "@/lib/authHelper.js";
import { getAllMentors, createMentor } from "@/mongowork/mentors.js";

export async function GET(request) {
  try {
    const { role } = await authenticateAndGetRole(request);
    // requireRole(role, ["admin"]);

    const mentors = await getAllMentors({ status: undefined });
    const safe = mentors.map((m) => ({ ...m, _id: m._id.toString() }));

    return NextResponse.json({ status: "success", data: safe });
  } catch (error) {
    console.error("GET /api/admin/mentors error:", error);
    const code = error.message.includes("Forbidden") ? 403
      : error.message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: code }
    );
  }
}

export async function POST(request) {
  try {
    const { role } = await authenticateAndGetRole(request);
    // requireRole(role, ["admin"]);

    const body = await request.json();
    const { name, email, expertise, title, bio, experience, availableSlots, isFree, pricePerSession } = body;

    if (!name || !email) {
      return NextResponse.json(
        { status: "error", message: "Name and email are required" },
        { status: 400 }
      );
    }

    const mentor = await createMentor({
      name,
      email,
      expertise: expertise || [],
      title: title || "",
      bio: bio || "",
      experience: experience || 0,
      availableSlots: availableSlots || [],
      isFree: isFree !== false,
      pricePerSession: pricePerSession || 0,
    });

    return NextResponse.json({
      status: "success",
      data: { ...mentor, _id: mentor._id.toString() },
    });
  } catch (error) {
    console.error("POST /api/admin/mentors error:", error);
    const code = error.message.includes("Forbidden") ? 403
      : error.message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: code }
    );
  }
}
