import os
import re
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

COLOR_PRIMARY = RGBColor(113, 75, 103)      # #714B67 (Rasa Aruna plum)
COLOR_PRIMARY_HEX = "714B67"
COLOR_SECONDARY = RGBColor(90, 59, 82)      # #5A3B52
COLOR_DARK = RGBColor(45, 55, 72)           # #2D3748
COLOR_MUTED = RGBColor(100, 116, 139)       # #64748B
COLOR_PASS = RGBColor(16, 124, 65)          # Forest Green
COLOR_FAIL = RGBColor(220, 38, 38)          # Crimson Red
COLOR_LINK = RGBColor(24, 90, 219)          # Link Blue
COLOR_CODE = RGBColor(131, 24, 67)          # Plum Dark for inline code

def set_cell_properties(cell, bg_hex=None, borders=None, padding=(100, 100, 140, 140)):
    tcPr = cell._tc.get_or_add_tcPr()
    if bg_hex:
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{bg_hex}"/>')
        tcPr.append(shd)
    
    top_p, btm_p, left_p, rgt_p = padding
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'  <w:top w:w="{top_p}" w:type="dxa"/>'
        f'  <w:bottom w:w="{btm_p}" w:type="dxa"/>'
        f'  <w:left w:w="{left_p}" w:type="dxa"/>'
        f'  <w:right w:w="{rgt_p}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)
    
    if borders:
        # borders is dict with 'top', 'bottom', 'left', 'right'
        bdr_xml = f'<w:tcBorders {nsdecls("w")}>'
        for side in ['top', 'left', 'bottom', 'right']:
            b_info = borders.get(side, {'val': 'none'})
            val = b_info.get('val', 'none')
            sz = b_info.get('sz', '4')
            color = b_info.get('color', 'D1D5DB')
            bdr_xml += f'  <w:{side} w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        bdr_xml += '</w:tcBorders>'
        tcPr.append(parse_xml(bdr_xml))

def add_hyperlink(paragraph, url, text, color_hex="185ADB"):
    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hyperlink = parse_xml(
        f'<w:hyperlink {nsdecls("w")} r:id="{r_id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'  <w:r>'
        f'    <w:rPr>'
        f'      <w:color w:val="{color_hex}"/>'
        f'      <w:u w:val="single"/>'
        f'    </w:rPr>'
        f'    <w:t>{text}</w:t>'
        f'  </w:r>'
        f'</w:hyperlink>'
    )
    paragraph._p.append(hyperlink)

def render_inline(paragraph, text, default_color=None, default_bold=False, default_italic=False, font_size=None):
    if not text:
        return
    
    # Pre-process math like $\sum Dr = \sum Cr$
    text = text.replace(r'$\sum Dr = \sum Cr$', '∑ Dr = ∑ Cr')
    text = text.replace(r'\$', '$')

    pattern = re.compile(r'(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))')
    pos = 0
    
    for match in pattern.finditer(text):
        start, end = match.span()
        if start > pos:
            _add_styled_run(paragraph, text[pos:start], default_color, default_bold, default_italic, font_size)
            
        token = match.group(0)
        if token.startswith('`') and token.endswith('`'):
            inner = token[1:-1]
            run = paragraph.add_run(inner)
            run.font.name = "Consolas"
            run.font.size = Pt(font_size.pt * 0.92 if font_size else 9.5)
            run.font.color.rgb = COLOR_CODE
            # subtle shading for code run if possible
            rPr = run._r.get_or_add_rPr()
            rPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F1F5F9"/>'))
        elif token.startswith('***') and token.endswith('***'):
            _add_styled_run(paragraph, token[3:-3], default_color, bold=True, italic=True, font_size=font_size)
        elif token.startswith('**') and token.endswith('**'):
            inner = token[2:-2]
            # Check for PASS / FAIL
            if inner == "PASS" or "PASSED" in inner:
                run = paragraph.add_run(inner)
                run.font.bold = True
                run.font.size = font_size or Pt(10)
                run.font.color.rgb = COLOR_PASS
            elif inner == "FAIL" or "FAILED" in inner:
                run = paragraph.add_run(inner)
                run.font.bold = True
                run.font.size = font_size or Pt(10)
                run.font.color.rgb = COLOR_FAIL
            else:
                _add_styled_run(paragraph, inner, default_color, bold=True, italic=default_italic, font_size=font_size)
        elif token.startswith('*') and token.endswith('*'):
            _add_styled_run(paragraph, token[1:-1], default_color, bold=default_bold, italic=True, font_size=font_size)
        elif token.startswith('[') and '](' in token and token.endswith(')'):
            m = re.match(r'\[(.*?)\]\((.*?)\)', token)
            if m:
                add_hyperlink(paragraph, m.group(2), m.group(1))
            else:
                _add_styled_run(paragraph, token, default_color, default_bold, default_italic, font_size)
        pos = end
        
    if pos < len(text):
        _add_styled_run(paragraph, text[pos:], default_color, default_bold, default_italic, font_size)

def _add_styled_run(paragraph, text, color, bold, italic, font_size):
    # Check for sub-tokens or PASS / FAIL
    run = paragraph.add_run(text)
    run.font.name = "Calibri"
    if color:
        run.font.color.rgb = color
    if bold:
        run.font.bold = True
    if italic:
        run.font.italic = True
    if font_size:
        run.font.size = font_size

def add_heading_styled(doc, text, level):
    p = doc.add_paragraph()
    p.paragraph_format.keep_with_next = True
    
    if level == 1:
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        render_inline(p, text, default_color=COLOR_PRIMARY, default_bold=True, font_size=Pt(17))
    elif level == 2:
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(3)
        render_inline(p, text, default_color=COLOR_PRIMARY, default_bold=True, font_size=Pt(13.5))
    elif level == 3:
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        render_inline(p, text, default_color=RGBColor(30, 41, 59), default_bold=True, font_size=Pt(11.5))
    elif level == 4:
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        # Often test cases like T-01: ...
        render_inline(p, text, default_color=COLOR_PRIMARY, default_bold=True, font_size=Pt(10.5))

def add_callout(doc, text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.8)
    
    borders = {
        'top': {'val': 'none'},
        'bottom': {'val': 'none'},
        'left': {'val': 'single', 'sz': '18', 'color': COLOR_PRIMARY_HEX},
        'right': {'val': 'none'}
    }
    set_cell_properties(cell, bg_hex="FDF8FB", borders=borders, padding=(100, 100, 180, 140))
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    render_inline(p, text, default_color=COLOR_DARK, default_italic=True, font_size=Pt(10))

def add_code_block(doc, code_lines, language=""):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.8)
    
    borders = {
        'top': {'val': 'single', 'sz': '4', 'color': 'E2E8F0'},
        'bottom': {'val': 'single', 'sz': '4', 'color': 'E2E8F0'},
        'left': {'val': 'single', 'sz': '12', 'color': COLOR_PRIMARY_HEX},
        'right': {'val': 'single', 'sz': '4', 'color': 'E2E8F0'}
    }
    set_cell_properties(cell, bg_hex="F8FAFC", borders=borders, padding=(100, 100, 160, 140))
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.1
    
    code_text = "\n".join(code_lines)
    run = p.add_run(code_text)
    run.font.name = "Consolas"
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(30, 41, 59)

def add_table_styled(doc, header_cells, data_rows, alignments):
    col_count = len(header_cells)
    tbl = doc.add_table(rows=len(data_rows) + 1, cols=col_count)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Calculate column widths to fit ~6.8 inches
    total_avail = 6.8
    # Estimate relative weights based on header + content length
    col_weights = [1.0] * col_count
    for i in range(col_count):
        max_len = len(header_cells[i])
        for r in data_rows:
            if i < len(r):
                max_len = max(max_len, len(r[i]))
        col_weights[i] = max(1, min(max_len, 35))
    
    sum_weights = sum(col_weights)
    widths = [Inches((w / sum_weights) * total_avail) for w in col_weights]
    
    # Render header
    hdr_row = tbl.rows[0]
    # cantSplit and tblHeader
    trPr = hdr_row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
    trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
    
    for c_idx, text in enumerate(header_cells):
        cell = tbl.cell(0, c_idx)
        cell.width = widths[c_idx]
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        
        borders = {
            'top': {'val': 'single', 'sz': '6', 'color': COLOR_PRIMARY_HEX},
            'bottom': {'val': 'single', 'sz': '8', 'color': COLOR_PRIMARY_HEX},
            'left': {'val': 'none'},
            'right': {'val': 'none'}
        }
        set_cell_properties(cell, bg_hex=COLOR_PRIMARY_HEX, borders=borders, padding=(120, 120, 120, 120))
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        align = alignments[c_idx] if c_idx < len(alignments) else 'left'
        if align == 'center':
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif align == 'right':
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        else:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            
        render_inline(p, text, default_color=RGBColor(255, 255, 255), default_bold=True, font_size=Pt(9))
    
    # Render data rows
    for r_idx, row_data in enumerate(data_rows):
        row_obj = tbl.rows[r_idx + 1]
        trPr = row_obj._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        
        is_even = (r_idx % 2 == 1)
        bg_hex = "F8FAFC" if is_even else "FFFFFF"
        
        # Check if row is a total row (e.g. TOTAL KESELURUHAN)
        is_total = False
        if row_data and any("TOTAL" in c for c in row_data):
            is_total = True
            bg_hex = "EDE9FE"
            
        for c_idx in range(col_count):
            cell = tbl.cell(r_idx + 1, c_idx)
            cell.width = widths[c_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            
            borders = {
                'top': {'val': 'single', 'sz': '4', 'color': 'E2E8F0'},
                'bottom': {'val': 'single', 'sz': '6' if is_total else '4', 'color': COLOR_PRIMARY_HEX if is_total else 'E2E8F0'},
                'left': {'val': 'none'},
                'right': {'val': 'none'}
            }
            set_cell_properties(cell, bg_hex=bg_hex, borders=borders, padding=(90, 90, 110, 110))
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            align = alignments[c_idx] if c_idx < len(alignments) else 'left'
            if align == 'center':
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif align == 'right':
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                
            cell_text = row_data[c_idx] if c_idx < len(row_data) else ""
            render_inline(p, cell_text, default_color=COLOR_DARK, default_bold=is_total, font_size=Pt(8.5))

def add_horizontal_divider(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(8)
    pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>')
    p._p.get_or_add_pPr().append(pBdr)

def parse_markdown_to_docx(doc, md_content):
    lines = md_content.splitlines()
    i = 0
    n = len(lines)
    
    in_code_block = False
    code_lines = []
    code_lang = ""
    
    while i < n:
        raw_line = lines[i]
        line = raw_line.rstrip()
        stripped = line.strip()
        
        # Check code fence
        if stripped.startswith('```'):
            if in_code_block:
                add_code_block(doc, code_lines, code_lang)
                code_lines = []
                in_code_block = False
            else:
                in_code_block = True
                code_lang = stripped[3:].strip()
                code_lines = []
            i += 1
            continue
            
        if in_code_block:
            code_lines.append(raw_line)
            i += 1
            continue
            
        # Empty line
        if not stripped:
            i += 1
            continue
            
        # Horizontal rule
        if stripped in ['---', '***', '___']:
            add_horizontal_divider(doc)
            i += 1
            continue
            
        # Table detection
        if stripped.startswith('|') and stripped.endswith('|'):
            # Collect table lines
            table_lines = []
            while i < n and lines[i].strip().startswith('|') and lines[i].strip().endswith('|'):
                table_lines.append(lines[i].strip())
                i += 1
            
            if len(table_lines) >= 2:
                # First line: headers
                header_raw = [c.strip() for c in table_lines[0].split('|')[1:-1]]
                # Second line: alignment
                align_raw = [c.strip() for c in table_lines[1].split('|')[1:-1]]
                alignments = []
                for a in align_raw:
                    if a.startswith(':') and a.endswith(':'):
                        alignments.append('center')
                    elif a.endswith(':'):
                        alignments.append('right')
                    else:
                        alignments.append('left')
                
                # Data rows
                data_rows = []
                for row_line in table_lines[2:]:
                    row_cells = [c.strip() for c in row_line.split('|')[1:-1]]
                    data_rows.append(row_cells)
                
                add_table_styled(doc, header_raw, data_rows, alignments)
            continue
            
        # Blockquotes
        if stripped.startswith('> '):
            quote_text = stripped[2:].strip()
            # see if subsequent lines also quote
            while i + 1 < n and lines[i+1].strip().startswith('> '):
                i += 1
                quote_text += " " + lines[i].strip()[2:].strip()
            add_callout(doc, quote_text)
            i += 1
            continue
            
        # Headings
        if stripped.startswith('# '):
            add_heading_styled(doc, stripped[2:].strip(), 1)
            i += 1
            continue
        elif stripped.startswith('## '):
            add_heading_styled(doc, stripped[3:].strip(), 2)
            i += 1
            continue
        elif stripped.startswith('### '):
            add_heading_styled(doc, stripped[4:].strip(), 3)
            i += 1
            continue
        elif stripped.startswith('#### '):
            add_heading_styled(doc, stripped[5:].strip(), 4)
            i += 1
            continue
            
        # Bullet lists (* or -)
        bullet_match = re.match(r'^(\s*)([\*\-])\s+(.*)$', raw_line)
        if bullet_match:
            indent_spaces = len(bullet_match.group(1))
            level = min(2, indent_spaces // 2)
            content = bullet_match.group(3)
            
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.left_indent = Inches(0.2 + (level * 0.25))
            
            bullet_sym = "• " if level == 0 else ("◦ " if level == 1 else "▪ ")
            run_b = p.add_run(bullet_sym)
            run_b.font.name = "Calibri"
            run_b.font.size = Pt(10)
            run_b.font.color.rgb = COLOR_PRIMARY if level == 0 else COLOR_MUTED
            run_b.font.bold = True
            
            render_inline(p, content, default_color=COLOR_DARK, font_size=Pt(10))
            i += 1
            continue
            
        # Numbered list (1. 2. etc)
        num_match = re.match(r'^(\s*)(\d+)\.\s+(.*)$', raw_line)
        if num_match:
            indent_spaces = len(num_match.group(1))
            level = min(2, indent_spaces // 2)
            num_str = num_match.group(2)
            content = num_match.group(3)
            
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.left_indent = Inches(0.25 + (level * 0.25))
            
            run_n = p.add_run(f"{num_str}. ")
            run_n.font.name = "Calibri"
            run_n.font.size = Pt(10)
            run_n.font.bold = True
            run_n.font.color.rgb = COLOR_PRIMARY
            
            render_inline(p, content, default_color=COLOR_DARK, font_size=Pt(10))
            i += 1
            continue
            
        # Regular paragraph
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        render_inline(p, stripped, default_color=COLOR_DARK, font_size=Pt(10.5))
        i += 1

def create_document_base():
    doc = docx.Document()
    # Configure 0.8 inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        section.page_width = Inches(8.27)   # A4
        section.page_height = Inches(11.69) # A4
    return doc

def build_readme_docx():
    print("Converting README.md -> README.docx...")
    with open("README.md", "r", encoding="utf-8") as f:
        content = f.read()
    doc = create_document_base()
    parse_markdown_to_docx(doc, content)
    doc.save("README.docx")
    print("Successfully generated README.docx")

def build_test_results_docx():
    print("Converting TEST_RESULTS.md -> TEST_RESULTS.docx...")
    with open("TEST_RESULTS.md", "r", encoding="utf-8") as f:
        content = f.read()
    doc = create_document_base()
    parse_markdown_to_docx(doc, content)
    doc.save("TEST_RESULTS.docx")
    print("Successfully generated TEST_RESULTS.docx")

def build_combined_docx():
    print("Building combined report: Dokumentasi_dan_Hasil_Pengujian_ERP.docx...")
    with open("README.md", "r", encoding="utf-8") as f:
        readme_content = f.read()
    with open("TEST_RESULTS.md", "r", encoding="utf-8") as f:
        test_content = f.read()
        
    doc = create_document_base()
    
    # Add Cover / Header Block
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(24)
    p_title.paragraph_format.space_after = Pt(4)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p_title.add_run("PT RASA ARUNA BERSAMA\nSISTEM ENTERPRISE RESOURCE PLANNING (ERP)")
    run.font.name = "Calibri"
    run.font.size = Pt(20)
    run.font.bold = True
    run.font.color.rgb = COLOR_PRIMARY
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(18)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_s = p_sub.add_run("Dokumentasi Teknis Sistem, Arsitektur, Panduan Operasional & Buku Bukti Pengujian (T-01 s.d. T-32)")
    run_s.font.name = "Calibri"
    run_s.font.size = Pt(12)
    run_s.font.italic = True
    run_s.font.color.rgb = COLOR_MUTED
    
    add_horizontal_divider(doc)
    
    # Parse README
    parse_markdown_to_docx(doc, readme_content)
    
    # Page Break
    doc.add_page_break()
    
    # Parse TEST_RESULTS
    parse_markdown_to_docx(doc, test_content)
    
    doc.save("Dokumentasi_dan_Hasil_Pengujian_ERP.docx")
    print("Successfully generated Dokumentasi_dan_Hasil_Pengujian_ERP.docx")

if __name__ == "__main__":
    build_readme_docx()
    build_test_results_docx()
    build_combined_docx()
