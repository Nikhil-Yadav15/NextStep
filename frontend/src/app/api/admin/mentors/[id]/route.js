import { NextResponse } from "next/server";
import { authenticateAndGetRole, requireRole } from "@/lib/authHelper.js";
import { getMentorById, updateMentor, deleteMentor } from "@/mongowork/mentors.js";

export async function PUT(request, { params }) {
  try {
    const { role } = await authenticateAndGetRole(request);
    // requireRole(role, ["admin"]); // Open access for now

    const { id } = await params;
    const body = await request.json();

    const existing = await getMentorById(id);
    if (!existing) {
      return NextResponse.json(
        { status: "error", message: "Mentor not found" },
        { status: 404 }
      );
    }

    await updateMentor(id, body);
    return NextResponse.json({ status: "success", message: "Mentor updated" });
  } catch (error) {
    console.error("PUT /api/admin/mentors/[id] error:", error);
    const code = error.message.includes("Forbidden") ? 403
      : error.message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: code }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { role } = await authenticateAndGetRole(request);
    // requireRole(role, ["admin"]); // Open access for now

    const { id } = await params;
    await deleteMentor(id);
    return NextResponse.json({ status: "success", message: "Mentor deactivated" });
  } catch (error) {
    console.error("DELETE /api/admin/mentors/[id] error:", error);
    const code = error.message.includes("Forbidden") ? 403
      : error.message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: code }
    );
  }
}
