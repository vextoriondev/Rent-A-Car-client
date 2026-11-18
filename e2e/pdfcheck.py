import json,sys
from pypdf import PdfReader
d=json.load(open(sys.argv[1]+'/prints.json',encoding='utf-8'))
bad_words=['undefined','NaN','[object','null']
nav=['Dashboard','Logout','Request Access','Backend Live','Search anything','Sign out']
for p in d['pdfs']:
    r=PdfReader(p['file']); n=len(r.pages)
    texts=[pg.extract_text() or '' for pg in r.pages]
    allt='\n'.join(texts)
    w,h=float(r.pages[0].mediabox.width),float(r.pages[0].mediabox.height)
    hdr='n/a'
    if n>1:
        hdr='NO'
        for key in ('Date','Txn ID','Vehicle','Description','Amount'):
            if all(key in t for t in texts[1:]): hdr='yes('+key+')'; break
    print(f"{p['name']:28} pages={n:2} size={round(w)}x{round(h)} A4={'Y' if (round(w),round(h)) in((595,842),(596,843)) else 'N'} header-repeats={hdr:12} nav={[x for x in nav if x in allt]} bad={[x for x in bad_words if x in allt]} BDT={'Y' if chr(0x9f3) in allt else 'N'}")
