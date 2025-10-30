import * as fs from 'fs';
import * as path from 'path';

const files = [
  'src/app/found/page.tsx',
  'src/app/lost/page.tsx',
  'src/app/api/notifications/route.ts',
  'src/app/api/items/[id]/route.ts',
  'src/app/api/handoff/[id]/route.ts',
  'src/app/api/handoff/[id]/submit/route.ts',
  'src/app/api/items/lost/[id]/resolve/route.ts',
  'src/app/api/items/lost/[id]/donate/route.ts',
  'src/app/api/handoff/by-item/[lostItemId]/route.ts',
  'src/app/api/items/lost/route.ts',
  'src/app/api/items/found/route.ts',
  'src/app/api/admin/actions/route.ts',
  'src/app/api/admin/history/route.ts',
  'src/app/api/admin/disposition/route.ts',
  'src/app/api/admin/handoff/[id]/route.ts',
  'src/app/api/admin/handoff/[id]/verify/route.ts',
  'src/app/api/admin/handoff/[id]/reset/route.ts',
  'src/app/admin/dashboard/page.tsx',
];

const oldImport = "from '@/app/api/auth/[...nextauth]/route'";
const newImport = "from '@/lib/auth'";

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(oldImport, newImport);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated: ${file}`);
  } catch (err) {
    console.error(`✗ Error updating ${file}:`, err.message);
  }
});

console.log('\nAll files updated!');
