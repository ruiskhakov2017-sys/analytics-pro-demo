import { NextResponse } from "next/server";
import { workspace } from "@/lib/workspace";
import { db } from "@/lib/db";
import { mediaOverview } from "@/lib/analytics-adapter";
export async function GET() {
  try {
    const id = await workspace();
    const accounts = await db.account.findMany({ where: { workspaceId: id } });
    return NextResponse.json(mediaOverview(accounts), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Не удалось загрузить аналитику" },
      {
        status:
          e instanceof Error && e.message === "SESSION_REQUIRED" ? 401 : 503,
      },
    );
  }
}
