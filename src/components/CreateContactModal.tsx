"use client";
import MasterRecordEditor from './MasterRecordEditor';
export default function CreateContactModal({isOpen,onClose,onContactCreated,defaultType="CUSTOMER"}:{isOpen:boolean;onClose:()=>void;onContactCreated:(record?:any)=>void;defaultType?:"CUSTOMER"|"VENDOR"}) { return isOpen?<MasterRecordEditor resource={defaultType==='VENDOR'?'vendors':'customers'} onClose={onClose} onSaved={record=>{onContactCreated(record);onClose();}}/>:null; }
