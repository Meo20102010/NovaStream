import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@novastream.com' },
    update: {},
    create: {
      email: 'admin@novastream.com',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const modPassword = await bcrypt.hash('mod123', 12);
  const moderator = await prisma.user.upsert({
    where: { email: 'mod@novastream.com' },
    update: {},
    create: {
      email: 'mod@novastream.com',
      username: 'moderator',
      password: modPassword,
      role: 'MODERATOR',
    },
  });

  const defaultSettings = [
    { key: 'site_name', value: 'NovaStream', group: 'general' },
    { key: 'site_description', value: 'Professional Media Server', group: 'general' },
    { key: 'theme', value: 'dark', group: 'appearance' },
    { key: 'primary_color', value: '#6366f1', group: 'appearance' },
    { key: 'language', value: 'en', group: 'general' },
    { key: 'max_upload_size', value: '10737418240', group: 'upload' },
    { key: 'allowed_formats', value: 'mp4,webm,mkv,avi', group: 'upload' },
    { key: 'smtp_host', value: '', group: 'email' },
    { key: 'smtp_port', value: '587', group: 'email' },
    { key: 'rate_limit_max', value: '100', group: 'api' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('✅ Seed completed');
  console.log(`   Admin: admin@novastream.com / admin123`);
  console.log(`   Moderator: mod@novastream.com / mod123`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
