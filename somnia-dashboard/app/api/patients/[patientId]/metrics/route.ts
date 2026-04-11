import { NextRequest, NextResponse } from "next/server";
import { getMockWeeklyProgress } from "@/lib/mock-data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  const progress = getMockWeeklyProgress(patientId);
  return NextResponse.json(progress);
}
