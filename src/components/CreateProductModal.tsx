"use client";
import MasterRecordEditor from './MasterRecordEditor';
export default function CreateProductModal({isOpen,onClose,onProductCreated,initialKind}:{isOpen:boolean;onClose:()=>void;onProductCreated:()=>void;initialKind?:"MATERIAL"|"MENU"}) { return isOpen?<MasterRecordEditor resource="products" initialProductKind={initialKind} onClose={onClose} onSaved={()=>{onProductCreated();onClose();}}/>:null; }
