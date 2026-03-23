import { NextResponse } from "next/server";
import { authenticateAndGetRole, requireRole } from "@/lib/authHelper.js";
import { getAllBookings } from "@/mongowork/bookings.js";

export async function GET(request) {
  try {
    const { role } = await authenticateAndGetRole(request);
    // requireRole(role, ["admin"]); // Open access for now

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || null;

    const bookings = await getAllBookings(statusFilter);
    const safe = bookings.map((b) => ({
      ...b,
      _id: b._id.toString(),
    }));

    return NextResponse.json({ status: "success", data: safe });
  } catch (error) {
    console.error("GET /api/admin/bookings error:", error);
    const code = error.message.includes("Forbidden") ? 403
      : error.message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: code }
    );
  }
}
