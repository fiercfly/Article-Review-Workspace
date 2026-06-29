import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.article.deleteMany();
  await prisma.projectMembership.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Create Organizations
  const orgA = await prisma.organization.create({
    data: {
      name: "Global Health Research Org",
    },
  });

  const orgB = await prisma.organization.create({
    data: {
      name: "Metabolic Studies Institute",
    },
  });

  // Create Users
  const alice = await prisma.user.create({
    data: {
      email: "alice@easyslr.org",
      name: "Dr. Alice Smith (Owner)",
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@easyslr.org",
      name: "Bob Jones (Reviewer)",
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: "charlie@easyslr.org",
      name: "Dr. Charlie Brown (External)",
    },
  });

  // Create Org Memberships
  await prisma.organizationMembership.create({
    data: {
      userId: alice.id,
      organizationId: orgA.id,
      role: "OWNER",
    },
  });

  await prisma.organizationMembership.create({
    data: {
      userId: bob.id,
      organizationId: orgA.id,
      role: "MEMBER",
    },
  });

  await prisma.organizationMembership.create({
    data: {
      userId: charlie.id,
      organizationId: orgB.id,
      role: "OWNER",
    },
  });

  // Create Projects
  const projectAlpha = await prisma.project.create({
    data: {
      name: "Diabetes Adherence Study",
      description: "Evaluating digital adherence tools for diabetes self-care.",
      organizationId: orgA.id,
    },
  });

  const projectBeta = await prisma.project.create({
    data: {
      name: "Cardiac Remote Care",
      description: "Remote monitoring and mobile health following cardiac surgery.",
      organizationId: orgA.id,
    },
  });

  const projectGamma = await prisma.project.create({
    data: {
      name: "Obesity Treatment Trial",
      description: "Metabolic and dietary intervention clinical study.",
      organizationId: orgB.id,
    },
  });

  // Create Project Memberships
  // Alice is OWNER of project Alpha and project Beta
  await prisma.projectMembership.create({
    data: {
      userId: alice.id,
      projectId: projectAlpha.id,
      role: "OWNER",
    },
  });

  await prisma.projectMembership.create({
    data: {
      userId: alice.id,
      projectId: projectBeta.id,
      role: "OWNER",
    },
  });

  // Bob is REVIEWER for all projects in Org A (Alpha & Beta)
  await prisma.projectMembership.create({
    data: {
      userId: bob.id,
      projectId: projectAlpha.id,
      role: "REVIEWER",
    },
  });

  await prisma.projectMembership.create({
    data: {
      userId: bob.id,
      projectId: projectBeta.id,
      role: "REVIEWER",
    },
  });

  // Charlie is OWNER of project Gamma
  await prisma.projectMembership.create({
    data: {
      userId: charlie.id,
      projectId: projectGamma.id,
      role: "OWNER",
    },
  });

  console.log("Database seeded successfully!");
  console.log("Users created:");
  console.log(`- Alice: ${alice.email} (Id: ${alice.id})`);
  console.log(`- Bob: ${bob.email} (Id: ${bob.id})`);
  console.log(`- Charlie: ${charlie.email} (Id: ${charlie.id})`);
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
