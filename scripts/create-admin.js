const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@localhost';
  const password = args[1] || 'admin123';

  const hashed = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('User already exists. Updating role to ADMIN and password.');
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN', password: hashed } });
    console.log('User updated.');
    process.exit(0);
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name: 'Admin',
      role: 'ADMIN'
    }
  });

  console.log('Admin user created:', { id: user.id, email: user.email });
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
