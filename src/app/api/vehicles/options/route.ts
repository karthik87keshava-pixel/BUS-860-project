import { NextResponse } from "next/server";
import { pickerOptions } from "@/lib/vehicles-server";

export function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const year = p.get("year") ? Number(p.get("year")) : undefined;
  return NextResponse.json(pickerOptions(year, p.get("make") ?? undefined, p.get("family") ?? undefined), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
