import 'dotenv/config'
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {


try {
    console.log('🌱 Starting user seeding...');

    // Hash passwords
    const adminPassword = await bcrypt.hash('Admin@123!', 12);
    const authorPassword = await bcrypt.hash('Author@123!', 12);

    // Check if admin already exists
    const existingAdmin = await prisma.users.findFirst({
      where: { role: 'admin' }
    });

    if (!existingAdmin) {
      // Create admin user
      const admin = await prisma.users.create({
        data: {
          username: 'admin',
          email: 'admin@example.com',
          password: adminPassword,
          role: 'admin',
          isTemporaryPassword: true, // Force password change on first login
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      console.log('✅ Admin user created:', admin.username);
    } else {
      console.log('ℹ️  Admin user already exists, skipping...');
    }

    // Check if author already exists
    const existingAuthor = await prisma.users.findFirst({
      where: { 
        role: 'author',
        username: 'author'
      }
    });

    if (!existingAuthor) {
      // Create author user
      const author = await prisma.users.create({
        data: {
          username: 'author',
          email: 'author@example.com',
          password: authorPassword,
          role: 'author',
          isTemporaryPassword: true, // Force password change on first login
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      console.log('✅ Author user created:', author.username);
    } else {
      console.log('ℹ️  Author user already exists, skipping...');
    }

    // Display login credentials
    console.log('\n📋 Default Login Credentials:');
    console.log('=====================================');
    console.log('👤 Admin:');
    console.log('   Username: admin');
    console.log('   Email: admin@example.com');
    console.log('   Password: Admin@123!');
    console.log('');
    console.log('👤 Author:');
    console.log('   Username: author');
    console.log('   Email: author@example.com');
    console.log('   Password: Author@123!');
    console.log('');
    console.log('⚠️  NOTE: These are temporary passwords. Users will be prompted to change them on first login.');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}



// Alternative function to create additional users
async function createUser(userData) {
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const user = await prisma.users.create({
      data: {
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        role: userData.role || 'author',
        isTemporaryPassword: userData.isTemporaryPassword || false,
        is_active: userData.is_active !== undefined ? userData.is_active : true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    console.log(`✅ User created: ${user.username} (${user.role})`);
    return user;
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
