import 'dotenv/config'
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {



  // Seed a default user for testing (e.g., for OAuth or manual login)
  const hashedPassword1 = await bcrypt.hash('12345678', 10);
  await prisma.users.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      id: 1,
      username: 'testuser',
      password: hashedPassword1,
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date()
    }
  });
//   const hashedPassword2 = await bcrypt.hash('12345678', 10);
//   await prisma.user.upsert({
//     where: { email: 'admin@example.com' },
//     update: {},
//     create: {
//       user_id: 3,
//       username: 'testadmin',
//       email: 'admin@example.com',
//       password: hashedPassword2,
//       full_name: 'Test User',
//       role_id: 1, // Student role
//       location: 'Kathmandu, Nepal',
//       email_verified: true,
//       created_at: new Date(),
//       updated_at: new Date()
//     }
//   });

  console.log('Default user seeded successfully');

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
