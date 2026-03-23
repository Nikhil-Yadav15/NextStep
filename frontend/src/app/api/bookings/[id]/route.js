import { NextResponse } from "next/server";
import { authenticateAndGetRole } from "@/lib/authHelper.js";
import { getBookingById, updateBookingStatus, addBookingFeedback } from "@/mongowork/bookings.js";

export async function GET(request, { params }) {
  try {
    await authenticateAndGetRole(request);
    const { id } = await params;
    const booking = await getBookingById(id);

    if (!booking) {
      return NextResponse.json(
        { status: "error", message: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      data: { ...booking, _id: booking._id.toString() },
    });
  } catch (error) {
    console.error("GET /api/bookings/[id] error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { role } = await authenticateAndGetRole(request);
    const { id } = await params;
    const body = await request.json();

    if (body.rating !== undefined) {
      await addBookingFeedback(id, body.rating, body.feedback || "");
      return NextResponse.json({ status: "success", message: "Feedback submitted" });
    }

    // Role check disabled for development
    // if (role !== "admin") {
    //   return NextResponse.json(
    //     { status: "error", message: "Forbidden - admin only" },
    //     { status: 403 }
    //   );
    // }

    const { status: newStatus, adminNote } = body;
    if (!["approved", "rejected", "cancelled"].includes(newStatus)) {
      return NextResponse.json(
        { status: "error", message: "Invalid status" },
        { status: 400 }
      );
    }

    await updateBookingStatus(id, newStatus, adminNote);
    return NextResponse.json({ status: "success", message: `Booking ${newStatus}` });
  } catch (error) {
    console.error("PATCH /api/bookings/[id] error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
