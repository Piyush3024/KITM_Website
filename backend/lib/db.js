import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

export const prisma = async () => {
  try {
    const conn = new PrismaClient({
      datasources: process.env.DATABASE_URL,
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });

    console.log("Connected to database");
  } catch (error) {
    console.error("Error connecting to database", error.message);
    process.exit(1);
  }
};
