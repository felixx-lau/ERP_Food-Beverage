"use client";
import MasterRecordEditor from './MasterRecordEditor';
export default function CreateProductModal({isOpen,onClose,onProductCreated}:{isOpen:boolean;onClose:()=>void;onProductCreated:()=>void}) { return isOpen?<MasterRecordEditor resource="products" onClose={onClose} onSaved={()=>{onProductCreated();onClose();}}/>:null; }
