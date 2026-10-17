import {dateLocale} from '@/lib/copy';
export const fmtDate=(x:string)=>new Date(x+'T12:00:00').toLocaleDateString(dateLocale(),{day:'numeric',month:'short',year:'numeric'});
/** An ISO date (or date-time) as `15 Oct 2026`; a dash when there is none. One date style everywhere. */
export const fmtDay=(x?:string|null)=>x?fmtDate(x.slice(0,10)):'-';
