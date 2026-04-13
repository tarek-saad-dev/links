import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { AppData } from "@/lib/types";

const BACKUP_FILE = path.join(process.cwd(), "public", "backup.json");

// GET /api/backup - read the backup file
export async function GET() {
  try {
    const data = await fs.readFile(BACKUP_FILE, "utf-8");
    const parsed = JSON.parse(data) as AppData;
    return NextResponse.json(parsed);
  } catch {
    // If file doesn't exist or is invalid, return empty data
    return NextResponse.json(
      { clients: [], materials: [] },
      { status: 200 }
    );
  }
}

// POST /api/backup - save data to backup file
export async function POST(request: Request) {
  try {
    const data = (await request.json()) as AppData;
    
    // Validate data structure
    if (!Array.isArray(data.clients) || !Array.isArray(data.materials)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }
    
    // Write to file
    await fs.writeFile(
      BACKUP_FILE,
      JSON.stringify(data, null, 2),
      "utf-8"
    );
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save backup" },
      { status: 500 }
    );
  }
}
