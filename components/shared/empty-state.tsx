import type {ComponentType,ReactNode} from 'react';
import {ClipboardList} from 'lucide-react';

export function EmptyState({icon:Icon=ClipboardList,title,description,action}:{icon?:ComponentType<{size?:number}>;title:string;description?:string;action?:ReactNode}){
 return <div className="empty">
  <Icon size={25}/>
  <p>{title}</p>
  {description&&<small>{description}</small>}
  {action}
 </div>;
}
