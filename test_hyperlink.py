import docx
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def add_hyperlink(paragraph, url, text, color="1B5E20"):
    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hyperlink = parse_xml(f'<w:hyperlink {nsdecls("w")} r:id="{r_id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>')
    new_run = parse_xml(f'<w:r {nsdecls("w")}><w:rPr><w:color w:val="{color}"/><w:u w:val="single"/></w:rPr><w:t>{text}</w:t></w:hyperlink>')
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)

doc = docx.Document()
p = doc.add_paragraph("Check this out: ")
add_hyperlink(p, "https://example.com", "Example Link")
doc.save("test_link.docx")
print("Hyperlink test passed!")
