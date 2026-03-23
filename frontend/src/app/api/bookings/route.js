import { NextResponse } from "next/server";
import { authenticateAndGetRole } from "@/lib/authHelper.js";
import { createBooking, getBookingsByUser } from "@/mongowork/bookings.js";

export async function GET(request) {
  try {
    const { uniquePresence } = await authenticateAndGetRole(request);
    const bookings = await getBookingsByUser(uniquePresence);

    const safe = bookings.map((b) => ({
      ...b,
      _id: b._id.toString(),
    }));

    return NextResponse.json({ status: "success", data: safe });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    const status = error.message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { status: "error", message: error.message },
      { status }
    );
  }
}

export async function POST(request) {
  try {
    const { user, uniquePresence, role } = await authenticateAndGetRole(request);
    const body = await request.json();

    const { mentorId, mentorName, date, startTime, endTime } = body;
    if (!mentorId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { status: "error", message: "Missing required booking fields" },
        { status: 400 }
      );
    }

    const booking = await createBooking({
      userId: user.id,
      uniquePresence,
      userName: user.name || "User",
      userEmail: user.email || "",
      mentorId,
      mentorName: mentorName || "Mentor",
      date,
      startTime,
      endTime,
    });

    return NextResponse.json({
      status: "success",
      data: { ...booking, _id: booking._id.toString() },
    });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    const status = error.message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { status: "error", message: error.message },
      { status }
    );
  }
}
