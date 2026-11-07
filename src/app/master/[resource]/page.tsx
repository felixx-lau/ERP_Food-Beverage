import MasterRecords from '@/components/MasterRecords';
import {masterFields} from '@/lib/masterFields';
import {notFound} from 'next/navigation';
export default async function MasterPage({params}:{params:Promise<{resource:string}>}) {
  const {resource}=await params;if(!Object.hasOwn(masterFields,resource))notFound();
  return <MasterRecords key={resource} resource={resource}/>;
}
