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
 * Returns explicit project membership if present, or organization reviewer access if part of the parent org.
 */
export async function verifyProjectAccess(projectId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  // 1. Check explicit project membership
  const explicitMembership = user.projectMemberships.find(
    (pm) => pm.projectId === projectId
  );

  if (explicitMembership) {
    return explicitMembership;
  }

  // 2. Check if the project belongs to one of the user's organizations
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });

  if (!project) {
    return null;
  }

  const isOrgMember = user.orgMemberships.some(
    (om) => om.organizationId === project.organizationId
  );

  if (isOrgMember) {
    return {
      id: `org-access-${user.id}-${projectId}`,
      userId: user.id,
      projectId: projectId,
      role: "REVIEWER",
      createdAt: new Date(),
    };
  }

  return null;
}
