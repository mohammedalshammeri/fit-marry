import { PrismaClient, $Enums } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS = [
  "USERS_READ",
  "USERS_WRITE",
  "ADMINS_MANAGE",
  "SETTINGS_MANAGE",
  "REPORTS_VIEW",
  "COMPLAINTS_REVIEW",
  "BANNERS_MANAGE",
] as const;

const SETTINGS: Record<string, unknown> = {
  pricingPerMinute: {
    chat: 1,
    call: 2,
  },
  maxInboundLikes: 9,
  inactivityThresholdDays: 30,
  imageWaitDays: 7,
  otp: {
    ttlMinutes: 10,
    resendCooldownSeconds: 60,
    maxAttempts: 5,
  },
  wallet: {
    minuteToCreditRate: 1,
    currency: "USD",
  },
};

async function seedPermissionsAndRoles() {
  // 1. Upsert Permissions
  const permissions = await Promise.all(
    PERMISSIONS.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code },
      })
    )
  );

  // 2. Upsert Roles
  // Define Super Admin Role
  const superAdminRole = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: { type: $Enums.RoleType.SUPER_ADMIN },
    create: { name: "SUPER_ADMIN", type: $Enums.RoleType.SUPER_ADMIN },
  });

  // Define Sub Admin Role
  const subAdminRole = await prisma.role.upsert({
    where: { name: "SUB_ADMIN" },
    update: { type: $Enums.RoleType.SUB_ADMIN },
    create: { name: "SUB_ADMIN", type: $Enums.RoleType.SUB_ADMIN },
  });

  // 3. Assign All Permissions to Super Admin
  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      })
    )
  );

  // 4. Assign Subset to Sub Admin
  const subAdminPermissionCodes = new Set([
    "USERS_READ",
    "USERS_WRITE",
    "COMPLAINTS_REVIEW",
    "BANNERS_MANAGE",
    "REPORTS_VIEW",
  ]);

  await Promise.all(
    permissions
      .filter((permission) => subAdminPermissionCodes.has(permission.code))
      .map((permission) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: subAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: subAdminRole.id,
            permissionId: permission.id,
          },
        })
      )
  );
}

async function seedSettings() {
  await Promise.all(
    Object.entries(SETTINGS).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: value as any },
        create: { key, value: value as any },
      })
    )
  );
}

async function seedAdmin() {
  const email = "admin@fitmarry.com";
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, 12);

  const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  if (!superAdminRole) throw new Error("Super Admin role not found");

  await prisma.admin.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: hashedPassword,
      status: "ACTIVE",
      roles: {
        create: {
          roleId: superAdminRole.id,
        },
      },
    },
  });

  console.log(`Admin user seeded: ${email} / ${password}`);
}

async function seedSubscriptionPackages() {
  const packages = [
    { name: "Standard", price: 29.99, durationDays: 30, features: { description: "Monthly access" } },
    { name: "Gold", price: 79.99, durationDays: 90, features: { description: "Quarterly access" } },
    { name: "Diamond", price: 249.99, durationDays: 365, features: { description: "Yearly access" } },
  ];

  await Promise.all(
    packages.map((pkg) =>
      prisma.subscriptionPackage.upsert({
        where: { name: pkg.name },
        update: {},
        create: pkg,
      })
    )
  );
  console.log("Subscription packages seeded");
}

async function main() {
  await seedPermissionsAndRoles();
  await seedSettings();
  await seedAdmin();
  await seedSubscriptionPackages();
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
