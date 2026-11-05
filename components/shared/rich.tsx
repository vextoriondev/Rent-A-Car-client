import {Fragment} from 'react';

/** Shows a sentence from `tRaw()` with the **marked** words in bold. Only the markers are read; nothing else in the text is treated as markup. */
export function Rich({text}:{text:string}){
 return <>{text.split('**').map((part,i)=>i%2===1?<b key={i}>{part}</b>:<Fragment key={i}>{part}</Fragment>)}</>;
}
