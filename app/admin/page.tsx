import type { Metadata } from 'next';
import AdminView from '../../components/AdminView';

export const metadata: Metadata = { title: '管理菜單' };

export default function Page() {
  return <AdminView />;
}
