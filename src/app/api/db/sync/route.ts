import { NextResponse } from "next/server";
import { initDatabase } from "@/lib/db";
import { getAllDataFromDB, saveAllDataToDB } from "@/lib/storage-postgres";
import type { AppData } from "@/lib/types";

// GET /api/db/sync - get all data from database
export async function GET() {
  try {
    await initDatabase();
    const data = await getAllDataFromDB();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Sync get error:", error);
    return NextResponse.json(
      { error: "Failed to get data from database", details: String(error) },
      { status: 500 },
    );
  }
}

// POST /api/db/sync - save data to database
export async function POST(request: Request) {
  try {
    const data = (await request.json()) as AppData;
    await saveAllDataToDB(data);
    return NextResponse.json({
      success: true,
      clientsCount: data.clients.length,
      materialsCount: data.materials.length,
    });
  } catch (error) {
    console.error("Sync save error:", error);
    return NextResponse.json(
      { error: "Failed to save data to database", details: String(error) },
      { status: 500 },
    );
  }
}
