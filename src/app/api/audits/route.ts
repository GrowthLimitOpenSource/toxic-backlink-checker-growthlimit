import { NextResponse } from "next/server";
import { runAudit } from "@/lib/audit";
import { listAudits } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() { return NextResponse.json(await listAudits()); }
export async function POST(request: Request) {
  try {
    const report = await runAudit(await request.json());
    return NextResponse.json({ id: report.id, report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Audit failed." }, { status: 400 });
  }
}
