// Group Layout
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Groups | BioDocs AI',
  description: 'Manage your groups and collaborate with team members',
};

export default function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
