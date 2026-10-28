import { NextResponse } from "next/server";
import { searchVehicles } from "@/lib/vehicles-server";

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ results: searchVehicles(q.slice(0, 100)) });
}
