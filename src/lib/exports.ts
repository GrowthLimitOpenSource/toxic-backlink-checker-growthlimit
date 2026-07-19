import { strToU8, zipSync } from "fflate";
import type { AuditReport } from "@/lib/types";

export const AUDIT_COLUMNS = [
  "domain",
  "classification",
  "approved",
  "confidence",
  "links",
  "follow_links",
  "top_anchor",
  "evidence",
  "note",
] as const;

export function auditRows(report: AuditReport): Array<Array<string | number | boolean>> {
  return report.groups.map((group) => [
    group.domain,
    group.classification,
    group.approved,
    group.confidence,
    group.links.length,
    group.followCount,
    group.anchors[0]?.value || "",
    group.evidence.map((evidence) => `${evidence.code}: ${evidence.detail}`).join(" | "),
    group.note,
  ]);
}

export function buildAuditXlsx(report: AuditReport): Uint8Array {
  const rows: Array<Array<string | number | boolean>> = [
    [...AUDIT_COLUMNS],
    ...auditRows(report),
  ];
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => cell(columnIndex, rowIndex, value)).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": xml(`
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
        <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
      </Types>`),
    "_rels/.rels": xml(`
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
      </Relationships>`),
    "xl/workbook.xml": xml(`
      <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <sheets><sheet name="Audit" sheetId="1" r:id="rId1"/></sheets>
      </workbook>`),
    "xl/_rels/workbook.xml.rels": xml(`
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
      </Relationships>`),
    "xl/worksheets/sheet1.xml": xml(`
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <cols>
          <col min="1" max="1" width="32" customWidth="1"/>
          <col min="2" max="2" width="20" customWidth="1"/>
          <col min="3" max="6" width="14" customWidth="1"/>
          <col min="7" max="7" width="28" customWidth="1"/>
          <col min="8" max="9" width="60" customWidth="1"/>
        </cols>
        <sheetData>${sheetRows}</sheetData>
      </worksheet>`),
  };

  return zipSync(files, { level: 6 });
}

function cell(columnIndex: number, rowIndex: number, value: string | number | boolean): string {
  const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${reference}"><v>${value}</v></c>`;
  if (typeof value === "boolean") return `<c r="${reference}" t="b"><v>${value ? 1 : 0}</v></c>`;
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

function columnName(index: number): string {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xml(value: string): Uint8Array {
  return strToU8(`<?xml version="1.0" encoding="UTF-8"?>${value.replace(/>\s+</g, "><").trim()}`);
}
