import { NextResponse } from "next/server";
import { compareAudit } from "@/lib/history";
import { getAudit } from "@/lib/store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const report = await getAudit((await params).id);
    if (!report) return NextResponse.json({ error: "Audit not found." }, { status: 404 });
    const previousId = new URL(request.url).searchParams.get("previous") || undefined;
    return NextResponse.json(await compareAudit(report, previousId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Comparison failed." }, { status: 400 });
  }
}
