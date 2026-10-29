import os
import re
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# -------------------------------------------------------------
# Color Palette Constants (Odoo 17 Plum & Professional Slate)
# -------------------------------------------------------------
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
        bdr_xml = f'<w:tcBorders {nsdecls("w")}>'
        for side in ['top', 'left', 'bottom', 'right']:
            b_info = borders.get(side, {'val': 'none'})
            val = b_info.get('val', 'none')
            sz = b_info.get('sz', '4')
            color = b_info.get('color', 'D1D5DB')
            bdr_xml += f'  <w:{side} w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        bdr_xml += '</w:tcBorders>'
        tcPr.append(parse_xml(bdr_xml))

def render_inline(paragraph, text, default_color=None, default_bold=False, default_italic=False, font_size=None):
    if not text:
        return
    text = text.replace(r'$\sum Dr = \sum Cr$', '∑ Dr = ∑ Cr').replace(r'\$', '$')
    pattern = re.compile(r'(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)')
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
            rPr = run._r.get_or_add_rPr()
            rPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="F1F5F9"/>'))
        elif token.startswith('***') and token.endswith('***'):
            _add_styled_run(paragraph, token[3:-3], default_color, bold=True, italic=True, font_size=font_size)
        elif token.startswith('**') and token.endswith('**'):
            inner = token[2:-2]
            _add_styled_run(paragraph, inner, default_color or COLOR_PRIMARY, bold=True, italic=default_italic, font_size=font_size)
        elif token.startswith('*') and token.endswith('*'):
            _add_styled_run(paragraph, token[1:-1], default_color, bold=default_bold, italic=True, font_size=font_size)
        pos = end
    if pos < len(text):
        _add_styled_run(paragraph, text[pos:], default_color, default_bold, default_italic, font_size)

def _add_styled_run(paragraph, text, color, bold, italic, font_size):
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
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        render_inline(p, text, default_color=COLOR_PRIMARY, default_bold=True, font_size=Pt(16))
    elif level == 2:
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        render_inline(p, text, default_color=COLOR_PRIMARY, default_bold=True, font_size=Pt(13))
    elif level == 3:
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(3)
        render_inline(p, text, default_color=RGBColor(30, 41, 59), default_bold=True, font_size=Pt(11))

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
    render_inline(p, text, default_color=COLOR_DARK, default_italic=True, font_size=Pt(9.5))

def add_code_block(doc, code_lines):
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

def add_table_styled(doc, header_cells, data_rows, alignments=None):
    col_count = len(header_cells)
    if not alignments:
        alignments = ['left'] * col_count
    tbl = doc.add_table(rows=len(data_rows) + 1, cols=col_count)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    total_avail = 6.8
    col_weights = [max(1, len(header_cells[i])) for i in range(col_count)]
    for r in data_rows:
        for i in range(min(col_count, len(r))):
            col_weights[i] = max(col_weights[i], min(len(r[i]), 35))
    sum_weights = sum(col_weights)
    widths = [Inches((w / sum_weights) * total_avail) for w in col_weights]
    
    hdr_row = tbl.rows[0]
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
        set_cell_properties(cell, bg_hex=COLOR_PRIMARY_HEX, borders=borders, padding=(100, 100, 100, 100))
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        align = alignments[c_idx]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if align == 'center' else (WD_ALIGN_PARAGRAPH.RIGHT if align == 'right' else WD_ALIGN_PARAGRAPH.LEFT)
        render_inline(p, text, default_color=RGBColor(255, 255, 255), default_bold=True, font_size=Pt(9))
        
    for r_idx, row_data in enumerate(data_rows):
        row_obj = tbl.rows[r_idx + 1]
        trPr = row_obj._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        is_even = (r_idx % 2 == 1)
        bg_hex = "F8FAFC" if is_even else "FFFFFF"
        for c_idx in range(col_count):
            cell = tbl.cell(r_idx + 1, c_idx)
            cell.width = widths[c_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            borders = {
                'top': {'val': 'single', 'sz': '4', 'color': 'E2E8F0'},
                'bottom': {'val': 'single', 'sz': '4', 'color': 'E2E8F0'},
                'left': {'val': 'none'},
                'right': {'val': 'none'}
            }
            set_cell_properties(cell, bg_hex=bg_hex, borders=borders, padding=(80, 80, 100, 100))
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            align = alignments[c_idx]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if align == 'center' else (WD_ALIGN_PARAGRAPH.RIGHT if align == 'right' else WD_ALIGN_PARAGRAPH.LEFT)
            cell_text = row_data[c_idx] if c_idx < len(row_data) else ""
            render_inline(p, cell_text, default_color=COLOR_DARK, font_size=Pt(8.5))

def add_horizontal_divider(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(8)
    pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>')
    p._p.get_or_add_pPr().append(pBdr)

# -------------------------------------------------------------
# Generate High-Resolution UML Architecture Graphic
# -------------------------------------------------------------
def generate_class_diagram_image(output_path):
    print("Generating high-resolution UML Class Diagram image...")
    fig, ax = plt.subplots(figsize=(20, 15), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Draw Title
    ax.text(50, 97.5, "PT RASA ARUNA BERSAMA - ERP ARCHITECTURE & UML CLASS DIAGRAM", 
            ha='center', va='center', fontsize=18, fontweight='bold', color="#714B67")
    ax.text(50, 95.5, "High-Level Data Models, Business Engines & Relational Associations", 
            ha='center', va='center', fontsize=12, style='italic', color="#64748B")

    # Helper function to draw UML box
    def draw_uml_box(x, y, w, h, title, stereotype, attributes, methods, bg_color="#F8FAFC", border_color="#714B67"):
        # Base box
        box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.2", fc=bg_color, ec=border_color, lw=1.5)
        ax.add_patch(box)
        # Header box
        hdr_h = h * 0.22 if stereotype else h * 0.18
        hdr_box = patches.FancyBboxPatch((x, y + h - hdr_h), w, hdr_h, boxstyle="round,pad=0.2", fc=border_color, ec=border_color, lw=1.5)
        ax.add_patch(hdr_box)
        
        # Header text
        if stereotype:
            ax.text(x + w/2, y + h - hdr_h*0.35, f"<<{stereotype}>>", ha='center', va='center', fontsize=7.5, color="#E2E8F0", style='italic')
            ax.text(x + w/2, y + h - hdr_h*0.75, title, ha='center', va='center', fontsize=9.5, fontweight='bold', color="white")
        else:
            ax.text(x + w/2, y + h - hdr_h*0.55, title, ha='center', va='center', fontsize=10, fontweight='bold', color="white")
            
        # Attributes
        curr_y = y + h - hdr_h - 1.2
        for attr in attributes:
            ax.text(x + 1.0, curr_y, attr, ha='left', va='center', fontsize=7, color="#1E293B", fontfamily='monospace')
            curr_y -= 1.15
            
        # Divider line
        if methods:
            ax.plot([x + 0.5, x + w - 0.5], [curr_y, curr_y], color="#CBD5E1", lw=0.8)
            curr_y -= 1.1
            for m in methods:
                ax.text(x + 1.0, curr_y, m, ha='left', va='center', fontsize=7, color="#0F766E", fontfamily='monospace', fontweight='semibold')
                curr_y -= 1.15

    # 1. Identity & Contact Domain
    draw_uml_box(3, 76, 17, 16, "User", "Prisma Model", 
                 ["+id: String [PK]", "+email: String [UQ]", "+name: String", "+passwordHash: String", "+role: Role [ENUM]"],
                 ["+verifyPassword()", "+createToken()"])
    
    draw_uml_box(23, 76, 18, 16, "Contact", "Prisma Model",
                 ["+id: String [PK] (C01/V01)", "+name: String", "+type: ContactType", "+creditLimit: Float", "+openReceivable: Float", "+openPayable: Float"],
                 ["+getHeadroom(): Float", "+isOverCredit(): Bool"])

    draw_uml_box(44, 76, 21, 16, "ProductVariant", "Prisma Model",
                 ["+sku: String [PK]", "+name: String", "+size: String", "+color: String (Hot/Ice)", "+unit: String", "+salesPrice: Float", "+standardCost: Float"],
                 ["+calculateLineGross()", "+getValuation()"])

    draw_uml_box(68, 76, 28, 16, "CreditControlEngine", "Domain Engine",
                 ["-prisma: PrismaClient"],
                 ["+calculateCreditStatus(cId): Status", "+validateCreditCheck(cId, gross): Res", "+protectHeadroom(cId): Bool"],
                 bg_color="#FAF5FF", border_color="#581C87")

    # 2. Inventory & Logistics Domain
    draw_uml_box(3, 53, 17, 19, "WarehouseLocation", "Prisma Model",
                 ["+code: String [PK]", "+name: String", "+type: String", "+usage: String"],
                 ["+getOnHands(): Int", "+getReserved(): Int"])

    draw_uml_box(23, 53, 18, 19, "StockLevel", "Prisma Model",
                 ["+id: String [PK]", "+productSku: String [FK]", "+locationCode: String [FK]", "+onHand: Int", "+reserved: Int"],
                 ["+getAvailable(): Int", "+reserve(qty): Void", "+release(qty): Void", "+deduct(qty): Void"])

    draw_uml_box(44, 53, 21, 19, "StockMove", "Prisma Model",
                 ["+id: String [PK]", "+moveNumber: String", "+productSku: String [FK]", "+sourceLocation: String", "+destLocation: String", "+quantity: Int", "+totalValue: Float"],
                 ["+recordMovement()"])

    draw_uml_box(68, 53, 28, 19, "Delivery & Transfer Engines", "Domain Engine",
                 ["-deliveryEngine: Service", "-transferEngine: Service"],
                 ["+validateDeliveryOrder(doId, items)", "+createBackorder(parentDO, lines)", "+createInternalTransfer(WH, CAFE)", "+validateTransferStock()"],
                 bg_color="#EFF6FF", border_color="#1D4ED8")

    # 3. Sales & Customer Fulfillment Domain
    draw_uml_box(3, 28, 20, 21, "SalesOrder", "Prisma Model",
                 ["+id: String [PK]", "+orderNumber: String [UQ]", "+contactId: String [FK]", "+status: OrderStatus", "+discountPercent: Float", "+discountApproved: Bool", "+subtotalNet: Float", "+pbjtTax: Float", "+totalGross: Float", "+isPriceLocked: Bool"],
                 ["+calculateTotals()", "+lockPrices()"])

    draw_uml_box(26, 28, 18, 21, "DeliveryOrder", "Prisma Model",
                 ["+id: String [PK]", "+deliveryNumber: String [UQ]", "+salesOrderId: String [FK]", "+status: DeliveryStatus", "+isBackorder: Boolean", "+backorderOfId: String"],
                 ["+fulfill(qty): DO", "+checkNegativeStock()"])

    draw_uml_box(47, 28, 18, 21, "CustomerInvoice", "Prisma Model",
                 ["+id: String [PK]", "+invoiceNumber: String [UQ]", "+salesOrderId: String [FK]", "+deliveryOrderId: String [FK]", "+status: InvoiceStatus", "+pbjtTax: Float", "+totalGross: Float", "+outstandingAmount: Float"],
                 ["+postInvoice(): JE", "+applyPayment(amt)"])

    draw_uml_box(68, 28, 28, 21, "Sales & Invoicing Engines", "Domain Engine",
                 ["-salesEngine: Service", "-accountingEngine: Service"],
                 ["+createSalesQuotation(params): SO", "+approveOrderDiscount(soId, Owner)", "+confirmSalesOrder(soId): DO", "+createCustomerInvoice(soId): Inv", "+registerPayment(invId, amt)"],
                 bg_color="#ECFDF5", border_color="#047857")

    # 4. Procurement & Point of Sale & Ledger
    draw_uml_box(3, 3, 20, 21, "PurchaseOrder", "Prisma Model",
                 ["+id: String [PK]", "+poNumber: String [UQ]", "+vendorId: String [FK]", "+status: OrderStatus", "+subtotal: Float", "+taxAmount: Float (0%)", "+total: Float"],
                 ["+confirmPO(): GRN", "+checkIdempotency()"])

    draw_uml_box(26, 3, 18, 21, "GoodsReceipt", "Prisma Model",
                 ["+id: String [PK]", "+receiptNumber: String [UQ]", "+purchaseOrderId: String [FK]", "+status: DeliveryStatus", "+acceptedQty: Int", "+rejectedQty: Int"],
                 ["+postGRNI(): JE", "+rejectDamagedGoods()"])

    draw_uml_box(47, 3, 18, 21, "VendorBill", "Prisma Model",
                 ["+id: String [PK]", "+billNumber: String [UQ]", "+purchaseOrderId: String [FK]", "+receiptId: String [FK]", "+totalGross: Float", "+status: InvoiceStatus"],
                 ["+validateThreeWayMatch()", "+clearGRNI(): JE"])

    draw_uml_box(68, 3, 28, 21, "Accounting & POS Engines", "Domain Engine",
                 ["-purchaseEngine: Service", "-posEngine: Service", "-dashboardEngine: Service"],
                 ["+validateThreeWayMatch(po, grn, bill)", "+createPosOrder(sessionId, basket)", "+closePosSession(sessionId)", "+getOperationalDashboardMetrics()", "+getFinancialReconciliation()"],
                 bg_color="#FFFBEB", border_color="#B45309")

    # Draw Connecting Association Arrows
    def draw_assoc(x1, y1, x2, y2, label=""):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color="#475569", lw=1.2, ls='--'))
        if label:
            mx, my = (x1 + x2)/2, (y1 + y2)/2
            ax.text(mx, my, label, fontsize=7, color="#334155", backgroundcolor="#FFFFFF")

    draw_assoc(20, 84, 23, 84, "places")
    draw_assoc(41, 84, 44, 84, "supplies")
    draw_assoc(65, 84, 68, 84, "checks")
    
    draw_assoc(13, 76, 13, 49, "orders")
    draw_assoc(23, 38, 26, 38, "fulfills")
    draw_assoc(44, 38, 47, 38, "bills")
    draw_assoc(65, 38, 68, 38, "controls")

    draw_assoc(23, 13, 26, 13, "receives")
    draw_assoc(44, 13, 47, 13, "matches")
    draw_assoc(65, 13, 68, 13, "posts")

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight')
    plt.close()
    print(f"Visual UML Class Diagram saved to {output_path}")

# -------------------------------------------------------------
# Main Document Builder
# -------------------------------------------------------------
def build_class_diagram_docx():
    docx_file = "CLASS_DIAGRAM_ERP_RASA_ARUNA.docx"
    img_file = "class_diagram_visual.png"
    print(f"Building {docx_file}...")
    
    generate_class_diagram_image(img_file)
    
    doc = docx.Document()
    
    # Configure Page Margins to 0.75 in
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)
        
    # Document Header / Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(20)
    p_title.paragraph_format.space_after = Pt(4)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p_title.add_run("PT RASA ARUNA BERSAMA\nSPESIFIKASI ARSITEKTUR & UML CLASS DIAGRAM ERP")
    run.font.name = "Calibri"
    run.font.size = Pt(20)
    run.font.bold = True
    run.font.color.rgb = COLOR_PRIMARY
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(14)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_s = p_sub.add_run("Model Data Relasional Prisma ORM, Domain Logic Engines, & Kepatuhan Aturan Bisnis (SR-01 s.d. SR-20)")
    run_s.font.name = "Calibri"
    run_s.font.size = Pt(11)
    run_s.font.italic = True
    run_s.font.color.rgb = COLOR_MUTED
    
    add_horizontal_divider(doc)
    
    # Metadata Callout
    add_callout(doc, 
        "Dokumen Teknis Rekayasa Perangkat Lunak: Disusun berdasarkan Student Scenario Handout — "
        "Rasa Aruna Kitchen (24SI1 - Group 03) & Session 11: ERP Selection and Requirements Engineering. "
        "Menguraikan secara komprehensif struktur kelas data, keterkaitan relasi antar-entitas, "
        "serta method signature pada engine transaksi bisnis."
    )
    
    # BAB 1: Pendahuluan & Prinsip Arsitektur
    add_heading_styled(doc, "1. Pendahuluan & Prinsip Desain Berorientasi Objek", level=1)
    
    p = doc.add_paragraph()
    render_inline(p, 
        "Sistem ERP PT Rasa Aruna Bersama dibangun menggunakan pola arsitektur **3-Tier Domain-Driven Architecture** "
        "yang memisahkan secara tegas antara lapisan antarmuka pengguna (*Presentation Layer* Next.js 15), "
        "lapisan logika bisnis (*Domain Business Logic Engines* di direktori `src/lib/`), dan "
        "lapisan persistensi data relasional (*Data Persistence Layer* Prisma ORM & SQLite persisten)."
    )
    
    p2 = doc.add_paragraph()
    render_inline(p2,
        "Arsitektur kelas dirancang dengan berpegang pada 4 prinsip rekayasa perangkat lunak utama:\n"
        "1. **Single Responsibility Principle (SRP):** Setiap engine logika bisnis (`SalesEngine`, `DeliveryEngine`, `PurchaseEngine`, `AccountingEngine`, `PosEngine`) bertanggung jawab penuh hanya pada domain prosesnya sendiri.\n"
        "2. **Transactional Atomicity:** Seluruh mutasi yang mempengaruhi kartu stok dan akun buku besar wajib dibungkus dalam blok `prisma.$transaction(async (tx) => { ... })` untuk menjamin konsistensi ACID.\n"
        "3. **Integritas Sumber Audit (SR-20):** Seluruh metrik operasional dan neraca saldo dilarang menggunakan data palsu (*zero mock*) dan wajib dapat ditelusuri ke dokumen transaksi primer sah.\n"
        "4. **Defensive Business Guards:** Validasi batas kredit (`SR-09`), anti-stok negatif (`SR-04`), batas diskon (`SR-08`), Three-Way Matching (`SR-06`), dan proteksi overpayment (`SR-19`) diterapkan di level backend sebelum mutasi basis data dieksekusi."
    )
    
    # BAB 2: Visualisasi UML Class Diagram
    add_heading_styled(doc, "2. Visualisasi UML Class Diagram Sistem", level=1)
    
    p_img = doc.add_paragraph()
    p_img.paragraph_format.space_before = Pt(8)
    p_img.paragraph_format.space_after = Pt(8)
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if os.path.exists(img_file):
        doc.add_picture(img_file, width=Inches(6.8))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        render_inline(p_cap, "*Gambar 2.1: Diagram Kelas Terintegrasi (Data Models, Business Engines & Relasi)*", default_color=COLOR_MUTED, font_size=Pt(9))
    
    add_heading_styled(doc, "2.1 Kode Sumber Mermaid Class Diagram (Portable Format)", level=2)
    p_m = doc.add_paragraph()
    render_inline(p_m, "Diagram kelas ini dapat dirender secara interaktif pada GitHub Markdown viewer, Mermaid Live Editor, maupun IDE pendukung dengan sintaks berikut:")
    
    mermaid_code = [
        "classDiagram",
        "    class User { +String id; +String email; +String name; +Role role; +createToken() }",
        "    class Contact { +String id; +String name; +Float creditLimit; +Float openReceivable; +getHeadroom() }",
        "    class ProductVariant { +String sku; +String name; +Float salesPrice; +Float standardCost; +unit }",
        "    class WarehouseLocation { +String code; +String name; +String type; +String usage }",
        "    class StockLevel { +String id; +Int onHand; +Int reserved; +getAvailable() }",
        "    class StockMove { +String moveNumber; +String sourceLocation; +String destLocation; +Int quantity }",
        "    class SalesOrder { +String orderNumber; +OrderStatus status; +Float totalGross; +isPriceLocked }",
        "    class DeliveryOrder { +String deliveryNumber; +DeliveryStatus status; +Boolean isBackorder }",
        "    class CustomerInvoice { +String invoiceNumber; +InvoiceStatus status; +Float totalGross; +outstanding }",
        "    class PurchaseOrder { +String poNumber; +OrderStatus status; +Float total; +checkIdempotency() }",
        "    class GoodsReceipt { +String receiptNumber; +Int acceptedQty; +Int rejectedQty; +postGRNI() }",
        "    class VendorBill { +String billNumber; +InvoiceStatus status; +Float totalGross; +validateThreeWayMatch() }",
        "    class JournalEntry { +String entryNumber; +String sourceDocument; +isBalanced() }",
        "    class PosSession { +String sessionCode; +String status; +Float openingCash; +Float totalSales }",
        "    class PosOrder { +String orderNumber; +Float totalAmount; +String paymentMethod }",
        "    class ReturnRequest { +String returnNumber; +InspectionStatus inspectionStatus }",
        "    class CreditNote { +String creditNoteNumber; +Float totalGross }",
        "    class AuditLog { +String actorName; +Role actorRole; +String action; +String documentId }",
        "    Contact \"1\" --> \"*\" SalesOrder : places",
        "    SalesOrder \"1\" --> \"*\" DeliveryOrder : fulfills",
        "    SalesOrder \"1\" --> \"*\" CustomerInvoice : bills",
        "    PurchaseOrder \"1\" --> \"*\" GoodsReceipt : receives",
        "    PurchaseOrder \"1\" --> \"*\" VendorBill : matches",
        "    JournalEntry \"1\" *-- \"2..*\" JournalItem : balances",
        "    PosSession \"1\" *-- \"*\" PosOrder : contains",
        "    ReturnRequest \"1\" --> \"0..1\" CreditNote : issues"
    ]
    add_code_block(doc, mermaid_code)
    
    # BAB 3: Spesifikasi Entitas Data
    add_heading_styled(doc, "3. Spesifikasi Rinci Entitas Data (Prisma ORM Models)", level=1)
    
    p_desc = doc.add_paragraph()
    render_inline(p_desc, "Berikut adalah rincian kamus data dan atribut untuk entitas utama yang mendasari tabel basis data relasional SQLite:")
    
    # Table 3.1
    add_heading_styled(doc, "3.1 Entitas Master & Identitas (User, Contact, Product)", level=2)
    headers_3_1 = ["Entitas Model", "Nama Kolom / Atribut", "Tipe Data", "Modifier", "Deskripsi & Peran Bisnis"]
    data_3_1 = [
        ["User", "id", "String", "PK, CUID", "Pengidentifikasi unik pengguna sistem."],
        ["User", "email", "String", "Unique", "Surel login akun resmi perusahaan."],
        ["User", "role", "Role (Enum)", "Required", "Peran wewenang: OWNER, SALES, WAREHOUSE, PROC, FINANCE, CASHIER."],
        ["User", "passwordHash", "String", "Required", "Hash enkripsi kata sandi berbasis bcrypt (cost factor 10)."],
        ["Contact", "id", "String", "PK (C01, V01)", "Kode unik pelanggan korporat/individu atau vendor mitra."],
        ["Contact", "type", "ContactType", "CUSTOMER / VENDOR", "Klasifikasi pihak rekanan bisnis."],
        ["Contact", "creditLimit", "Float", "Default: 0", "Plafon batas kredit pelanggan (misal C01: Rp 3.000.000)."],
        ["Contact", "openReceivable", "Float", "Default: 0", "Saldo awal piutang migrasi pembukuan (A/R baseline)."],
        ["ProductVariant", "sku", "String", "PK (Unique SKU)", "Kode varian produk F&B (misal: RICE-CHICK-S, COF-LATT-HOT)."],
        ["ProductVariant", "salesPrice", "Float", "Required", "Harga jual satuan belum termasuk pajak PBJT 10%."],
        ["ProductVariant", "standardCost", "Float", "Required", "Biaya standar (HPP) untuk valuasi dan pengakuan COGS."]
    ]
    add_table_styled(doc, headers_3_1, data_3_1, ['center', 'center', 'center', 'center', 'left'])
    
    # Table 3.2
    add_heading_styled(doc, "3.2 Entitas Persediaan & Multi-Lokasi (Location, StockLevel, StockMove)", level=2)
    headers_3_2 = ["Entitas Model", "Nama Kolom / Atribut", "Tipe Data", "Modifier", "Deskripsi & Peran Bisnis"]
    data_3_2 = [
        ["WarehouseLocation", "code", "String", "PK (WH-JKT/CAFE)", "Kode lokasi fisik: Gudang Pusat vs Gerai Kasir."],
        ["StockLevel", "productSku", "String", "FK -> Product", "SKU produk yang dicatat kuantitas fisiknya."],
        ["StockLevel", "locationCode", "String", "FK -> Location", "Lokasi penempatan barang fisik."],
        ["StockLevel", "onHand", "Int", "Default: 0", "Stok fisik nyata yang ada di lokasi terkait."],
        ["StockLevel", "reserved", "Int", "Default: 0", "Kuantitas stok yang telah direservasi untuk Sales Order terkonfirmasi."],
        ["StockMove", "moveNumber", "String", "Unique (SM/2026/..)", "Nomor unik kartu mutasi persediaan."],
        ["StockMove", "sourceLocation", "String", "Required", "Lokasi asal barang (misal: WH-JKT atau Vendor/Input)."],
        ["StockMove", "destLocation", "String", "Required", "Lokasi tujuan barang (misal: CAFE-JKT atau Customer/Output)."],
        ["StockMove", "totalValue", "Float", "Required", "Valuasi moneter pergerakan barang (quantity × standardCost)."]
    ]
    add_table_styled(doc, headers_3_2, data_3_2, ['center', 'center', 'center', 'center', 'left'])

    # Table 3.3
    add_heading_styled(doc, "3.3 Entitas Transaksi Penjualan & Pengadaan (SO, DO, PO, GRN, Inv, Bill)", level=2)
    headers_3_3 = ["Entitas Model", "Nama Kolom / Atribut", "Tipe Data", "Modifier", "Deskripsi & Peran Bisnis"]
    data_3_3 = [
        ["SalesOrder", "orderNumber", "String", "Unique (S00007)", "Nomor dokumen pesanan penjualan resmi."],
        ["SalesOrder", "status", "OrderStatus", "DRAFT -> CONFIRMED", "Siklus hidup pesanan penjualan."],
        ["SalesOrder", "discountPercent", "Float", "Max 20%", "Persentase diskon komersial yang diajukan."],
        ["SalesOrder", "discountApproved", "Boolean", "Default: false", "Status otorisasi Owner jika diskon > 10% (SR-08)."],
        ["SalesOrder", "isPriceLocked", "Boolean", "Default: false", "Penguncian permanen harga setelah SO Confirmed."],
        ["DeliveryOrder", "deliveryNumber", "String", "Unique (WH/OUT/..)", "Nomor surat jalan pengiriman gudang."],
        ["DeliveryOrder", "isBackorder", "Boolean", "Default: false", "Penanda dokumen pecahan backorder otomatis (SR-10)."],
        ["CustomerInvoice", "invoiceNumber", "String", "Unique (INV/2026/..)", "Nomor faktur penjualan pelanggan resmi."],
        ["CustomerInvoice", "pbjtTax", "Float", "10% net sale", "Pajak Barang dan Jasa Tertentu sektor restoran DKI."],
        ["PurchaseOrder", "poNumber", "String", "Unique (P00007)", "Nomor pesanan pembelian ke pemasok."],
        ["GoodsReceipt", "receiptNumber", "String", "Unique (WH/IN/..)", "Nomor bukti penerimaan fisik barang."],
        ["GoodsReceiptLine", "acceptedQty", "Int", "Required", "Kuantitas barang lolos inspeksi kualitas (masuk stok)."],
        ["GoodsReceiptLine", "rejectedQty", "Int", "Required", "Kuantitas barang rusak/ditolak (dilarang masuk stok/tagihan)."],
        ["VendorBill", "billNumber", "String", "Unique (BILL/..)", "Nomor tagihan faktur pembelian vendor Three-Way Match."]
    ]
    add_table_styled(doc, headers_3_3, data_3_3, ['center', 'center', 'center', 'center', 'left'])

    # BAB 4: Spesifikasi Mesin Logika Bisnis
    add_heading_styled(doc, "4. Spesifikasi Mesin Logika Bisnis (Domain Engines)", level=1)
    
    p_eng = doc.add_paragraph()
    render_inline(p_eng, "Logika komputasi, validasi aturan bisnis, dan integritas transaksi dienkapsulasi ke dalam kelas layanan (*service engines*) di lapisan `src/lib/`:")
    
    headers_4 = ["Kelas Engine Layanan", "Method Signature Utama", "Parameter Masukan", "Keluaran (Return)", "Aturan Bisnis Ditegakkan"]
    data_4 = [
        ["CreditControlEngine", "calculateCustomerCreditStatus", "customerId: String", "CustomerCreditStatus", "SR-09: Exposure = AR + Uninvoiced Orders."],
        ["CreditControlEngine", "validateCreditCheck", "customerId, orderGross", "CreditCheckResult", "SR-09: Blokir konfirmasi jika defisit kredit."],
        ["SalesEngine", "createSalesQuotation", "contactId, lines, actor", "SalesOrder", "SR-07: Batas diskon maksimum 20%."],
        ["SalesEngine", "approveOrderDiscount", "orderId, actor (Owner)", "SalesOrder", "SR-08: Wajib disetujui Owner jika diskon > 10%."],
        ["SalesEngine", "confirmSalesOrder", "orderId, actor", "ConfirmResult", "SR-04 & SR-08: Reservasi stok & Price Lock."],
        ["DeliveryEngine", "validateDeliveryOrder", "deliveryOrderId, items", "DeliveryResult", "SR-04, SR-10: Anti-stok minus & Backorder."],
        ["PurchaseEngine", "confirmPurchaseOrder", "poId, actor", "ConfirmResult", "SR-13: Idempotensi konfirmasi pesanan beli."],
        ["PurchaseEngine", "validateGoodsReceipt", "receiptId, lines", "ReceiptResult", "SR-06: Catat stok & jurnal GRNI Dr 1030 = Cr 1040."],
        ["PurchaseEngine", "createVendorBill", "poId, lines, actor", "VendorBill", "SR-06: Three-Way Match (tagih <= accepted)."],
        ["AccountingEngine", "createCustomerInvoice", "soId, lines, actor", "CustomerInvoice", "SR-02: Delivery-based invoicing (tagih <= delivered)."],
        ["AccountingEngine", "registerCustomerPayment", "invoiceId, amount, method", "PaymentResult", "SR-19: Overpayment protection guard."],
        ["AccountingEngine", "createBalancedJournalEntry", "params, tx", "JournalEntry", "SR-13: Double-entry balancing (Dr = Cr)."],
        ["PosEngine", "createPosOrder", "sessionId, lines, actor", "PosOrder", "SR-03, SR-04: Potong stok CAFE, tolak stok minus."],
        ["PosEngine", "closePosSession", "sessionId, actor", "PosSession", "SR-14: Rekonsiliasi kas kasir idempoten."],
        ["ReturnEngine", "inspectReturnRequest", "returnId, inspection", "ReturnRequest", "SR-11: Restok & Credit Note hanya jika ACCEPTED."],
        ["TransferEngine", "validateInternalTransfer", "transferId, actor", "TransferResult", "SR-12: Pindah stok WH ke CAFE tanpa distorsi valuasi."],
        ["DashboardEngine", "getFinancialReconciliation", "-", "Reconciliation", "SR-20: Deteksi anomali & larangan auto-post jurnal."]
    ]
    add_table_styled(doc, headers_4, data_4, ['center', 'left', 'left', 'center', 'left'])

    # BAB 5: Matriks Relasi Antar-Entitas
    add_heading_styled(doc, "5. Matriks Relasi & Integritas Referensial Antar-Kelas", level=1)
    
    headers_5 = ["Entitas Asal (Parent)", "Entitas Tujuan (Child)", "Kardinalitas", "Foreign Key / Relasi", "Integritas & On-Delete Behavior"]
    data_5 = [
        ["Contact", "SalesOrder", "1 to N", "SalesOrder.contactId", "Restrict: Kontak berelasi tidak dapat dihapus."],
        ["Contact", "PurchaseOrder", "1 to N", "PurchaseOrder.vendorId", "Restrict: Vendor terikat transaksi tidak dapat dihapus."],
        ["ProductVariant", "StockLevel", "1 to N", "StockLevel.productSku", "Cascade: Hapus SKU menghapus level stok lokasi."],
        ["WarehouseLocation", "StockLevel", "1 to N", "StockLevel.locationCode", "Restrict: Lokasi gudang tidak boleh dihapus jika ada stok."],
        ["SalesOrder", "SalesOrderLine", "1 to N", "SalesOrderLine.salesOrderId", "Cascade: Hapus header SO menghapus seluruh baris item."],
        ["SalesOrder", "DeliveryOrder", "1 to N", "DeliveryOrder.salesOrderId", "Restrict: DO mengunci referensi pesanan penjualan."],
        ["SalesOrder", "CustomerInvoice", "1 to N", "CustomerInvoice.salesOrderId", "Restrict: Invoice mengikat kontrak penjualan."],
        ["PurchaseOrder", "GoodsReceipt", "1 to N", "GoodsReceipt.purchaseOrderId", "Restrict: Dokumen penerimaan mengikat PO."],
        ["GoodsReceipt", "VendorBill", "1 to N", "VendorBill.receiptId", "Three-Way Match: Tagihan mengikat bukti penerimaan."],
        ["JournalEntry", "JournalItem", "1 to N (min 2)", "JournalItem.journalEntryId", "Cascade: Jurnal wajib seimbang debit dan kredit."],
        ["PosSession", "PosOrder", "1 to N", "PosOrder.sessionId", "Restrict: Seluruh transaksi kasir terikat ID sesi."],
        ["CustomerInvoice", "ReturnRequest", "1 to N", "ReturnRequest.invoiceId", "Restrict: Retur wajib mereferensikan faktur sah."]
    ]
    add_table_styled(doc, headers_5, data_5, ['center', 'center', 'center', 'center', 'left'])

    # BAB 6: Pemetaan Kepatuhan Aturan Bisnis (SR-01 s.d. SR-20)
    add_heading_styled(doc, "6. Pemetaan Kepatuhan Aturan Bisnis (SR-xx Matrix)", level=1)
    
    headers_6 = ["Rule ID", "Ringkasan Aturan Bisnis", "Kelas & Komponen Pengendali", "Mekanisme Kontrol", "Status Pengujian"]
    data_6 = [
        ["SR-01 / SR-02", "Delivery-based Invoicing (Hanya menagih barang terkirim)", "AccountingEngine.createCustomerInvoice", "Kuantitas tagihan divalidasi terhadap deliveredQty surat jalan", "LULUS (T-19, T-20)"],
        ["SR-03 / SR-04", "Zero Negative Stock & Reserved Protection", "DeliveryEngine & PosEngine", "Ditolak jika deliverQty > onHand atau memakan reserved", "LULUS (T-12, T-14, T-28)"],
        ["SR-05 / SR-06", "Three-Way Matching Tagihan Vendor", "PurchaseEngine.createVendorBill", "Ditolak jika kuantitas tagihan > accepted receipt", "LULUS (T-17, T-18, T-21)"],
        ["SR-07 / SR-08", "Margin Diskon & Penguncian Harga", "SalesEngine.confirmSalesOrder", "Diskon > 10% butuh Owner approval; isPriceLocked = true", "LULUS (T-09, T-10)"],
        ["SR-09", "Over-Credit Exposure Guard", "CreditControlEngine.validateCreditCheck", "Exposure = AR + Uninvoiced; ditolak jika melebihi plafon", "LULUS (T-03, T-04)"],
        ["SR-10", "Automated Backorder Generation", "DeliveryEngine.validateDeliveryOrder", "Sisa unit belum terkirim otomatis membentuk DO Backorder", "LULUS (T-11)"],
        ["SR-11", "Quality Inspection on Returns", "ReturnEngine.inspectReturnRequest", "Restok & Credit Note diblokir jika status PENDING", "LULUS (T-29, T-30)"],
        ["SR-12", "Internal Multi-Location Transfer", "TransferEngine.validateInternalTransfer", "Pindah stok WH ke CAFE tanpa mengubah valuasi agregat", "LULUS (T-13, T-14)"],
        ["SR-13", "Idempotent Transaction Posting", "Seluruh Domain Engine", "Pengecekan nomor dokumen unik & status mencegah jurnal ganda", "LULUS (T-16, T-22, T-26)"],
        ["SR-14", "POS Session Closing & Reconciliation", "PosEngine.closePosSession", "Penutupan sesi menghitung selisih kas; re-closing idempoten", "LULUS (T-27, T-28)"],
        ["SR-15", "Role-Based Access Control & Audit Log", "auth.ts & AuditHistoryDrawer", "Kasir diblokir dari General Ledger (403); terekam di AuditLog", "LULUS (T-01, T-02)"],
        ["SR-16", "CRM Minimum Data Validation", "crm/leads/[id]/route.ts", "Pindah ke Proposition wajib memiliki estimasi omset & kontak", "LULUS (T-07, T-08)"],
        ["SR-17", "Independent SKU Variant Control", "ProductVariant & StockLevel", "Varian Hot dan Iced memiliki kartu stok mandiri", "LULUS (T-05, T-06)"],
        ["SR-18", "Pajak Restoran PBJT 10% DKI Jakarta", "Sales, Invoicing, POS Engines", "10% dihitung per net line sales setelah diskon (half-up round)", "LULUS (T-09, T-19, T-27)"],
        ["SR-19", "Overpayment Protection Guard", "AccountingEngine.registerPayment", "Pembayaran melebihi sisa outstanding faktur diblokir", "LULUS (T-23, T-24)"],
        ["SR-20", "Integritas Sumber Audit & Anti Auto-Post", "DashboardEngine & Dashboard UI", "Selisih 1 unit memicu MISMATCH; autoPostBlocked = true", "LULUS (T-31, T-32)"]
    ]
    add_table_styled(doc, headers_6, data_6, ['center', 'left', 'left', 'left', 'center'])

    # BAB 7: Kesimpulan
    add_heading_styled(doc, "7. Kesimpulan & Rekomendasi Arsitektur", level=1)
    p_fin = doc.add_paragraph()
    render_inline(p_fin,
        "Struktur Class Diagram yang diimplementasikan pada ERP PT Rasa Aruna Bersama telah membuktikan "
        "kematangan rekayasa perangkat lunak yang sangat tinggi. Seluruh relasi antar-entitas, enkapsulasi logika bisnis, "
        "dan kontrol integritas data telah bekerja secara sinergis untuk memenuhi 100% persyaratan fungsional skenario akademik.\n\n"
        "Rekomendasi teknis bagi tim pengembang:\n"
        "1. Pertahankan penggunaan Prisma Interactive Transactions (`prisma.$transaction`) untuk menjamin konsistensi ACID.\n"
        "2. Terapkan Next.js `middleware.ts` untuk memusatkan pemeriksaan wewenang RBAC sebelum memanggil method engine.\n"
        "3. Untuk skalabilitas multi-gerai di masa depan, arsitektur kelas ini sangat siap dimigrasikan ke engine basis data PostgreSQL."
    )
    
    add_horizontal_divider(doc)
    p_foot = doc.add_paragraph()
    p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    render_inline(p_foot, "PT Rasa Aruna Bersama ERP — Technical Architecture & UML Class Diagram Specification © 2026", default_color=COLOR_MUTED, font_size=Pt(9))
    
    doc.save(docx_file)
    print(f"Successfully generated {docx_file}!")

if __name__ == "__main__":
    build_class_diagram_docx()
