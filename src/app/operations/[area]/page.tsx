import { notFound } from 'next/navigation';
import OperationsWorkspace from '@/components/OperationsWorkspace';
import { isSupplyArea } from '@/lib/supplyAccess';

export default async function OperationsPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  if (!isSupplyArea(area)) notFound();
  return <OperationsWorkspace key={area} area={area} />;
}
