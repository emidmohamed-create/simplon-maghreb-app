import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    const role = session.user.role;
    if (role === 'TRAINER') {
      redirect('/trainer/dashboard');
    } else if (role === 'LEARNER') {
      redirect('/me/dashboard');
    } else {
      redirect('/admin/dashboard-pilotage');
    }
  } else {
    redirect('/login');
  }
}
