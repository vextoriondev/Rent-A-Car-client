"use client";
import {Info} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {t} from '@/lib/copy';
import type {CopyKey} from '@/lib/copy';

/** A small (i) button that explains one hard word in one sentence. Use it only for words that cannot be avoided. */
export function HelpTip({tip}:{tip:CopyKey}){
 const text=t(tip);
 return <Popover>
  <PopoverTrigger asChild><button type="button" className="help-tip" aria-label={text} title={text}><Info size={13} aria-hidden="true"/></button></PopoverTrigger>
  <PopoverContent className="help-tip-content" side="top">{text}</PopoverContent>
 </Popover>;
}
