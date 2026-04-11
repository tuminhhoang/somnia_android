import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "somnia-dev-secret-change-in-production"
);

// Demo credentials — replace with database lookup in production
const DEMO_CLINICIANS = [
  { email: "doctor@somniasanitas.com", password: "somnia2026", name: "Dr. Smith", clinic: "Somnia Sleep Clinic" },
];

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const clinician = DEMO_CLINICIANS.find(
    (c) => c.email === email && c.password === password
  );

  if (!clinician) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await new SignJWT({
    email: clinician.email,
    name: clinician.name,
    clinic: clinician.clinic,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(JWT_SECRET);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return res;
}
