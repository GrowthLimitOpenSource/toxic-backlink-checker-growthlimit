import { NextResponse } from "next/server";
import { getAudit, deleteAudit, saveAudit } from "@/lib/store";
import { renderDisavow } from "@/lib/disavow";
import type { Classification } from "@/lib/types";

const allowed = new Set<Classification>(["KEEP", "REVIEW", "REMOVE_URL", "DISAVOW_URL", "DISAVOW_DOMAIN"]);
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { return NextResponse.json(await getAudit((await params).id)); }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { await deleteAudit((await params).id); return new NextResponse(null, { status: 204 }); }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const report = await getAudit((await params).id);
    const body = await request.json() as { domain?: string; classification?: Classification; approved?: boolean; note?: string };
    const group = report.groups.find((x) => x.domain === body.domain);
    if (!group) throw new Error("Domain group not found.");
    if (body.classification !== undefined) { if (!allowed.has(body.classification)) throw new Error("Invalid classification."); group.classification = body.classification; }
    if (body.approved !== undefined) group.approved = Boolean(body.approved);
    if (body.note !== undefined) group.note = String(body.note).slice(0, 2000);
    report.proposedDisavow = renderDisavow(report.groups, report.existingDisavow);
    await saveAudit(report);
    return NextResponse.json(report);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed." }, { status: 400 }); }
}
