// import bcrypt from "bcryptjs";
// import { Role } from "../../generated/prisma/enums";
// import config from "../config";
// import { prisma } from "../lib/prisma";

// const hashPassword = (password: string) =>
//   bcrypt.hash(password, Number(config.bcrypt_salt_rounds));

// export const seedAdmin = async () => {
//   try {
//     const existingAdmin = await prisma.user.findFirst({
//       where: { role: Role.ADMIN },
//       select: { id: true },
//     });

//     if (existingAdmin) {
//       console.log("Admin already exists. Skipping admin seed.");
//       return;
//     }

//     const name = config.admin_name;
//     const email = config.admin_email;
//     const password = config.admin_password;

//     if (!name || !email || !password) {
//       throw new Error(
//         "ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be set in the env file",
//       );
//     }

//     const emailOwner = await prisma.user.findUnique({
//       where: { email },
//       select: { role: true },
//     });

//     if (emailOwner) {
//       throw new Error(
//         `Cannot seed admin: "${email}" already belongs to a ${emailOwner.role} account. Use a different ADMIN_EMAIL.`,
//       );
//     }

//     const hashedPassword = await hashPassword(password);

//     const admin = await prisma.$transaction(async (tx) => {
//       const user = await tx.user.create({
//         data: {
//           name,
//           email,
//           password: hashedPassword,
//           role: Role.ADMIN,
//           needPasswordChange: false,
//           emailVerified: true,
//         },
//       });

//       await tx.admin.create({
//         data: {
//           userId: user.id,
//           name: user.name,
//           email: user.email,
//           department: "Operations",
//         },
//       });

//       return user;
//     });

//     // never log the whole user object (it contains the password hash)
//     console.log(`Admin created: ${admin.email}`);
//   } catch (error) {
//     console.error("Error seeding admin:", error);
//   }
// };

import bcrypt from "bcryptjs";
import {
  Role,
  TechnicianVerificationStatus,
  UserStatus,
} from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";

interface TesterAccount {
  role: Role;
  name?: string;
  email?: string;
  password?: string;
}

/**
 * Creates the tester accounts (admin, technician, customer) used by the
 * one-click "Demo Login" buttons on the frontend.
 *
 * - Values come from TESTER_ADMIN_*, TESTER_TECHNICIAN_*, TESTER_CUSTOMER_*.
 *   They must match the frontend NEXT_PUBLIC_DEMO_* credentials.
 * - Runs on every start and is safe to repeat (keyed by email, never deletes).
 * - If the user already exists, its password/status is reset so the buttons
 *   keep working even if the password was changed from the UI.
 * - Technician is created as APPROVED so the technician dashboard is usable.
 * - Runs in production too, because the deployed site needs working demo login.
 */
export const seedTesterUsers = async () => {
  const accounts: TesterAccount[] = [
    {
      role: Role.ADMIN,
      name: config.admin_name,
      email: config.admin_email,
      password: config.admin_password,
    },
    {
      role: Role.TECHNICIAN,
      name: config.technician_name,
      email: config.technician_email,
      password: config.technician_password,
    },
    {
      role: Role.CUSTOMER,
      name: config.customer_name,
      email: config.customer_email,
      password: config.customer_password,
    },
  ];

  for (const account of accounts) {
    const { role, name, password } = account;
    const label = role.toLowerCase();

    if (!name || !account.email || !password) {
      console.log(
        `Tester ${label} env (TESTER_${role}_NAME/EMAIL/PASSWORD) not set. Skipping.`,
      );
      continue;
    }

    const email = account.email.trim().toLowerCase();

    try {
      const hashedPassword = await bcrypt.hash(
        password,
        Number(config.bcrypt_salt_rounds),
      );

      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });

      if (existing && existing.role !== role) {
        console.error(
          `Tester ${label} skipped: "${email}" already belongs to a ${existing.role} account.`,
        );
        continue;
      }

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            password: hashedPassword,
            status: UserStatus.ACTIVE,
            emailVerified: true,
            needPasswordChange: false,
            isDeleted: false,
            deletedAt: null,
          },
        });

        if (role === Role.TECHNICIAN) {
          await prisma.technician.update({
            where: { userId: existing.id },
            data: {
              verificationStatus: TechnicianVerificationStatus.APPROVED,
              isDeleted: false,
              deletedAt: null,
            },
          });
        }

        console.log(`Tester ${label} ready: ${email}`);
        continue;
      }

      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          status: UserStatus.ACTIVE,
          needPasswordChange: false,
          emailVerified: true,
          ...(role === Role.ADMIN && {
            admin: { create: { name, email, department: "Operations" } },
          }),
          ...(role === Role.CUSTOMER && {
            customer: {
              create: { name, email, contactNumber: "01700000000" },
            },
          }),
          ...(role === Role.TECHNICIAN && {
            technician: {
              create: {
                name,
                email,
                contactNumber: "01800000000",
                verificationStatus: TechnicianVerificationStatus.APPROVED,
                reviewedAt: new Date(),
              },
            },
          }),
        },
      });

      console.log(`Tester ${label} created: ${email}`);
    } catch (error) {
      // never log the whole user object (it contains the password hash)
      console.error(`Error seeding tester ${label}:`, error);
    }
  }
};
