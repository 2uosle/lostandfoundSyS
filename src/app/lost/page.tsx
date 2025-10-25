import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ItemReportForm from '@/components/ItemReportForm';

export default async function ReportLostItem() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login?callbackUrl=/lost');
  }

  return <ItemReportForm type="lost" />;
}