import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Danger: deletes all Primitive data (projects, systems, scenarios, etc.)
// Intended for local/dev environments and manual resets.
export async function POST() {
  const tablesInOrder = [
    "field_flags",
    "constraints",
    "field_mappings",
    "endpoints",
    "scenarios",
    "systems",
    "projects",
  ];

  for (const table of tablesInOrder) {
    const { error } = await supabase
      .from(table)
      // delete all rows; every table has an id column
      .delete()
      .not("id", "is", null);
    if (error) {
      return NextResponse.json(
        { error: error.message, table },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}

