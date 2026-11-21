import os
import zipfile
from io import BytesIO
from PIL import Image, ImageDraw

out_dir = os.path.join(os.path.dirname(__file__), 'assets')
os.makedirs(out_dir, exist_ok=True)

def make_jpeg(name, size, color, text):
    im = Image.new('RGB', size, color=color)
    draw = ImageDraw.Draw(im)
    draw.text((50, 50), text, fill=(255, 255, 255))
    im.save(os.path.join(out_dir, name), 'JPEG', quality=85)

# 1. phone-photo.jpg (4000x3000)
make_jpeg('phone-photo.jpg', (4000, 3000), (30, 80, 160), "TASIN DRIVER PHOTO")
# 2. phone-photo-2.jpg (4000x3000)
make_jpeg('phone-photo-2.jpg', (4000, 3000), (40, 140, 60), "TASIN OWNER PHOTO")
# 3. car-front.jpg (3000x2000)
make_jpeg('car-front.jpg', (3000, 2000), (180, 50, 50), "TASIN VEHICLE FRONT")
# 4. car-rear.jpg (3000x2000)
make_jpeg('car-rear.jpg', (3000, 2000), (140, 50, 150), "TASIN VEHICLE REAR")
# 5. registration-scan.jpg (2480x3508)
make_jpeg('registration-scan.jpg', (2480, 3508), (240, 240, 240), "BRTA REGISTRATION DOCUMENT SCAN")

# 6. agreement.pdf
pdf_content = (
    b"%PDF-1.4\n"
    b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
    b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
    b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >> endobj\n"
    b"4 0 obj << /Length 53 >> stream\n"
    b"BT /F1 12 Tf 72 712 Td (TASIN ENTERPRISE AGREEMENT) Tj ET\n"
    b"endstream\nendobj\n"
    b"xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000223 00000 n \n"
    b"trailer << /Size 5 /Root 1 0 R >>\nstartxref\n326\n%%EOF\n"
)
with open(os.path.join(out_dir, 'agreement.pdf'), 'wb') as f:
    f.write(pdf_content)

# 7. terms.docx (valid docx structure)
docx_path = os.path.join(out_dir, 'terms.docx')
with zipfile.ZipFile(docx_path, 'w') as zf:
    zf.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    zf.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
    zf.writestr('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>TASIN ENTERPRISE TERMS &amp; CONDITIONS</w:t></w:r></w:p></w:body></w:document>')

# 8. notes.txt (unsupported file format)
with open(os.path.join(out_dir, 'notes.txt'), 'w', encoding='utf-8') as f:
    f.write("Operational driver notes and instructions.")

# 9. fake.jpg (disguised text file)
with open(os.path.join(out_dir, 'fake.jpg'), 'wb') as f:
    f.write(b"Plain text payload pretending to be an image.")

print(f"Generated {len(os.listdir(out_dir))} asset files in {out_dir}")
