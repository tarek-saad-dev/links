import { NextResponse } from "next/server";
import { initDatabase, testConnection } from "@/lib/db";
import { saveAllDataToDB, clearAllDataFromDB } from "@/lib/storage-postgres";
import type { AppData } from "@/lib/types";

// POST /api/db/migrate - migrate data to PostgreSQL
export async function POST(request: Request) {
  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Initialize tables
    await initDatabase();

    // Get data from request body
    const data = (await request.json()) as AppData;

    // Validate
    if (!Array.isArray(data.clients) || !Array.isArray(data.materials)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    // Save to database
    await saveAllDataToDB(data);

    return NextResponse.json({
      success: true,
      clientsCount: data.clients.length,
      materialsCount: data.materials.length,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/db/migrate - clear all database data
export async function DELETE() {
  try {
    await clearAllDataFromDB();
    return NextResponse.json({ success: true, message: "Database cleared" });
  } catch (error) {
    console.error("Clear error:", error);
    return NextResponse.json(
      { error: "Failed to clear database", details: String(error) },
      { status: 500 }
    );
  }
}
