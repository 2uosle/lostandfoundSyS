import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import ItemReportForm from '@/components/ItemReportForm';

export default async function ReportFoundItem() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login?callbackUrl=/found');
  }

  // Only admins can report found items
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }

  return <ItemReportForm type="found" />;
}