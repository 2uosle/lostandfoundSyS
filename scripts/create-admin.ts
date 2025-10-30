import bcrypt from 'bcryptjs';
import readline from 'readline';
import { prisma } from '../src/lib/prisma';

async function prompt(question: string) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<string>((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

async function main() {
  const email = process.argv[2] || await prompt('Admin email: ');
  const password = process.argv[3] || await prompt('Admin password: ');

  const hashed = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('User already exists. Updating role to ADMIN.');
    await prisma.user.update({ 
      where: { email }, 
      data: { role: 'ADMIN', password: hashed } 
    });
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
