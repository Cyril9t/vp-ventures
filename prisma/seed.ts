import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const name = process.env.OWNER_NAME?.trim() || "VP Ventures Owner";
  const password = process.env.OWNER_INITIAL_PASSWORD;
  if (!email || !password || password.length < 10) {
    throw new Error("Set OWNER_EMAIL and an OWNER_INITIAL_PASSWORD of at least 10 characters in .env.");
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12), forcePasswordChange: true } });
    console.log(`Created the initial owner account for ${email}. Change the password after first login.`);
  } else {
    console.log(`Owner account ${email} already exists. Password was not reset.`);
  }
  await prisma.businessSettings.upsert({ where: { id: "default" }, create: { id: "default", businessName: "VP Ventures", gasPricePerKg: "0.00" }, update: {} });

  const services = ["CASH_WITHDRAWAL", "CARD_WITHDRAWAL", "CASH_DEPOSIT", "TRANSFER", "AIRTIME", "DATA"] as const;
  const ranges = [
    { minimumAmount: "100.00", maximumAmount: "500.00", serviceCharge: "50.00" },
    { minimumAmount: "500.01", maximumAmount: "1000.00", serviceCharge: "100.00" },
    { minimumAmount: "1000.01", maximumAmount: "5000.00", serviceCharge: "200.00" },
    { minimumAmount: "5000.01", maximumAmount: null, serviceCharge: "300.00" },
  ] as const;
  for (const service of services) {
    for (const range of ranges) {
      const exists = await prisma.posChargeRule.findFirst({ where: { service, minimumAmount: range.minimumAmount } });
      if (!exists) await prisma.posChargeRule.create({ data: { service, ...range, active: true } });
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
