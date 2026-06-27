import { cookies } from "next/headers";
import { prisma } from "./db";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user-id")?.value;

  if (!userId) {
    return null;
  }

  try {
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
            project: true,
          },
        },
      },
    });

    return user;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

/**
 * Checks if the current user has access to a specific project.
 * Returns the membership details if accessible, or null if denied.
 */
export async function verifyProjectAccess(projectId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const membership = user.projectMemberships.find(
    (pm) => pm.projectId === projectId
  );

  return membership || null;
}
