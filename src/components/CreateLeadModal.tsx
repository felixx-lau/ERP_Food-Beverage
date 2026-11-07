"use client";
import MasterRecordEditor from './MasterRecordEditor';
export default function CreateLeadModal({isOpen,onClose,onLeadCreated}:{isOpen:boolean;onClose:()=>void;onLeadCreated:(record?:any)=>void}) { return isOpen?<MasterRecordEditor resource="leads" onClose={onClose} onSaved={record=>{onLeadCreated(record);onClose();}}/>:null; }
