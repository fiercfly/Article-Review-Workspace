import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user-id")?.value;

  if (!userId) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orgMemberships: {
        include: {
          organization: true,
        },
      },
      projectMemberships: {
        include: {
          project: {
            include: {
              organization: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ user });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cookieStore = await cookies();
    cookieStore.set("user-id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("user-id");
  return NextResponse.json({ success: true });
}
