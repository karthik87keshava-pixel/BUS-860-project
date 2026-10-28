import { NextResponse } from "next/server";
import { findPhoto } from "@/lib/photos-server";
import { getVehicle } from "@/lib/vehicles-server";

/** Full vehicle facts (and photo) for up to 4 vehicle IDs: /api/vehicles/batch?ids=a,b,c */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 4);
  const vehicles = await Promise.all(
    ids.map(async (id) => {
      const v = getVehicle(id);
      if (!v) return null;
      return { ...v, photo: await findPhoto(v.make, v.family) };
    }),
  );
  return NextResponse.json({ vehicles });
}
