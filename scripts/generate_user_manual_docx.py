#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Generator Panduan Pengguna & Alur Sistem ERP Terpadu
PT Rasa Aruna Bersama (Rasa Aruna Kitchen)
Khusus untuk Pengguna Awam / Pemula
"""

import os
import re
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

# --- WARNA TEMA SISTEM (Odoo 17 & Rasa Aruna Theme) ---
COLOR_PRIMARY_HEX = "714B67"        # Rasa Aruna Plum #714B67
COLOR_PRIMARY = RGBColor(113, 75, 103)
COLOR_SECONDARY = RGBColor(90, 59, 82)
COLOR_DARK = RGBColor(45, 55, 72)           # #2D3748 Slate Dark
COLOR_MUTED = RGBColor(100, 116, 139)       # #64748B Cool Gray
COLOR_PASS = RGBColor(16, 124, 65)          # Forest Green
COLOR_FAIL = RGBColor(220, 38, 38)          # Crimson Red
COLOR_BLUE = RGBColor(24, 90, 219)          # Indigo Blue
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
            color = b_info.get('color', 'CBD5E1')
            bdr_xml += f'  <w:{side} w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        bdr_xml += '</w:tcBorders>'
        tcPr.append(parse_xml(bdr_xml))

def render_inline(paragraph, text, default_color=None, default_bold=False, default_italic=False, font_size=None):
    if not text:
        return
    
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
            _add_styled_run(paragraph, inner, default_color, bold=True, italic=default_italic, font_size=font_size)
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
        p.paragraph_format.space_before = Pt(20)
        p.paragraph_format.space_after = Pt(6)
        render_inline(p, text, default_color=COLOR_PRIMARY, default_bold=True, font_size=Pt(15))
    elif level == 2:
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        render_inline(p, text, default_color=COLOR_PRIMARY, default_bold=True, font_size=Pt(12.5))
    elif level == 3:
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(3)
        render_inline(p, text, default_color=RGBColor(30, 41, 59), default_bold=True, font_size=Pt(11))
    elif level == 4:
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        render_inline(p, text, default_color=COLOR_SECONDARY, default_bold=True, font_size=Pt(10))

def add_p(doc, text, space_after=4, line_spacing=1.15):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    render_inline(p, text, default_color=COLOR_DARK, font_size=Pt(10))
    return p

def add_bullet(doc, text, bold_prefix="", space_after=2):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        render_inline(p, f"**{bold_prefix}** ", default_color=COLOR_DARK, font_size=Pt(10))
    render_inline(p, text, default_color=COLOR_DARK, font_size=Pt(10))
    return p

def add_numbered_item(doc, number_str, text, space_after=3):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.first_line_indent = Inches(-0.3)
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    render_inline(p, f"**{number_str}** {text}", default_color=COLOR_DARK, font_size=Pt(10))
    return p

def add_callout(doc, text, callout_type="info", title=""):
    border_color = "714B67"
    bg_hex = "FDF8FB"
    title_color = COLOR_PRIMARY
    default_title = "INFORMASI PENTING"
    
    if callout_type == "tip":
        border_color = "16A34A"
        bg_hex = "F0FDF4"
        title_color = COLOR_PASS
        default_title = "TIPS PRAKTIS PENGGUNA AWAM"
    elif callout_type == "warning":
        border_color = "DC2626"
        bg_hex = "FEF2F2"
        title_color = COLOR_FAIL
        default_title = "PERHATIAN / ATURAN KETAT SISTEM"
    elif callout_type == "concept":
        border_color = "185ADB"
        bg_hex = "EFF6FF"
        title_color = COLOR_BLUE
        default_title = "PENJELASAN KONSEP UNTUK PEMULA"
        
    actual_title = title or default_title

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.8)
    
    borders = {
        'top': {'val': 'none'},
        'bottom': {'val': 'none'},
        'left': {'val': 'single', 'sz': '18', 'color': border_color},
        'right': {'val': 'none'}
    }
    set_cell_properties(cell, bg_hex=bg_hex, borders=borders, padding=(90, 90, 150, 130))
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    render_inline(p, f"**{actual_title}**", default_color=title_color, font_size=Pt(9.5))
    
    p2 = cell.add_paragraph()
    p2.paragraph_format.space_before = Pt(2)
    p2.paragraph_format.space_after = Pt(2)
    p2.paragraph_format.line_spacing = 1.15
    render_inline(p2, text, default_color=COLOR_DARK, default_italic=False, font_size=Pt(9.5))
    
    sp_p = doc.add_paragraph()
    sp_p.paragraph_format.space_before = Pt(0)
    sp_p.paragraph_format.space_after = Pt(3)

def add_styled_table(doc, headers, rows, col_widths=None):
    tbl = doc.add_table(rows=len(rows) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    hdr_cells = tbl.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = ""
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        render_inline(p, f"**{title}**", default_color=RGBColor(255, 255, 255), font_size=Pt(9))
        
        borders = {
            'top': {'val': 'single', 'sz': '6', 'color': COLOR_PRIMARY_HEX},
            'bottom': {'val': 'single', 'sz': '10', 'color': '5A3B52'},
            'left': {'val': 'single', 'sz': '4', 'color': '8A5A7D'},
            'right': {'val': 'single', 'sz': '4', 'color': '8A5A7D'}
        }
        set_cell_properties(hdr_cells[i], bg_hex=COLOR_PRIMARY_HEX, borders=borders, padding=(80, 80, 90, 90))
        if col_widths and i < len(col_widths):
            hdr_cells[i].width = col_widths[i]
            
    for r_idx, row_data in enumerate(rows):
        row_cells = tbl.rows[r_idx + 1].cells
        bg_hex = "F8FAFC" if (r_idx % 2 == 1) else "FFFFFF"
        for c_idx, cell_value in enumerate(row_data):
            row_cells[c_idx].text = ""
            p = row_cells[c_idx].paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.12
            
            if c_idx == 0 and len(cell_value) <= 4:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                
            render_inline(p, cell_value, default_color=COLOR_DARK, font_size=Pt(8.5))
            
            borders = {
                'top': {'val': 'single', 'sz': '4', 'color': 'E2E8F0'},
                'bottom': {'val': 'single', 'sz': '4', 'color': 'E2E8F0'},
                'left': {'val': 'single', 'sz': '4', 'color': 'E2E8F0'},
                'right': {'val': 'single', 'sz': '4', 'color': 'E2E8F0'}
            }
            set_cell_properties(row_cells[c_idx], bg_hex=bg_hex, borders=borders, padding=(60, 60, 80, 80))
            if col_widths and c_idx < len(col_widths):
                row_cells[c_idx].width = col_widths[c_idx]

    sp_p = doc.add_paragraph()
    sp_p.paragraph_format.space_before = Pt(0)
    sp_p.paragraph_format.space_after = Pt(4)

def add_image_with_caption(doc, image_path, caption_text, width=Inches(5.7)):
    if not os.path.exists(image_path):
        add_p(doc, f"*[Tangkapan layar tidak ditemukan: {os.path.basename(image_path)}]*")
        return
        
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(6)
    p_img.paragraph_format.space_after = Pt(2)
    run_img = p_img.add_run()
    run_img.add_picture(image_path, width=width)
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(6)
    render_inline(p_cap, f"**Tangkapan Layar:** *{caption_text}*", default_color=COLOR_MUTED, font_size=Pt(8.5))

def setup_document_styles_and_footer(doc):
    for s in doc.sections:
        s.page_width = Inches(8.27)    # A4
        s.page_height = Inches(11.69)
        s.top_margin = Inches(0.85)
        s.bottom_margin = Inches(0.85)
        s.left_margin = Inches(0.85)
        s.right_margin = Inches(0.85)
        
        # Header
        header = s.header
        p_hdr = header.paragraphs[0]
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_hdr.paragraph_format.space_before = Pt(0)
        p_hdr.paragraph_format.space_after = Pt(0)
        r_hdr = p_hdr.add_run("Buku Panduan Operasional ERP  •  PT Rasa Aruna Bersama")
        r_hdr.font.name = "Calibri"
        r_hdr.font.size = Pt(8.5)
        r_hdr.font.color.rgb = COLOR_MUTED
        
        # Footer
        footer = s.footer
        p = footer.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        
        run_l = p.add_run("Rasa Aruna Kitchen ERP  |  ")
        run_l.font.name = "Calibri"
        run_l.font.size = Pt(8.5)
        run_l.font.color.rgb = COLOR_MUTED
        
        run_p = p.add_run("Halaman ")
        run_p.font.name = "Calibri"
        run_p.font.size = Pt(8.5)
        run_p.font.color.rgb = COLOR_MUTED
        
        fld1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls('w'))
        instr = parse_xml(r'<w:instrText %s xml:space="preserve"> PAGE </w:instrText>' % nsdecls('w'))
        fld2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls('w'))
        fld3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls('w'))
        run_p._r.append(fld1)
        run_p._r.append(instr)
        run_p._r.append(fld2)
        run_p._r.append(fld3)

def generate_document():
    doc = docx.Document()
    setup_document_styles_and_footer(doc)
    
    # Base paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    screens_dir = os.path.join(base_dir, "docs", "screens", "after")
    
    # -------------------------------------------------------------
    # 1. HEADER BANNER / SAMPUL DOKUMEN
    # -------------------------------------------------------------
    tbl_cover = doc.add_table(rows=1, cols=1)
    tbl_cover.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_cover = tbl_cover.cell(0, 0)
    c_cover.width = Inches(6.8)
    
    borders_c = {
        'top': {'val': 'single', 'sz': '12', 'color': COLOR_PRIMARY_HEX},
        'bottom': {'val': 'single', 'sz': '12', 'color': COLOR_PRIMARY_HEX},
        'left': {'val': 'single', 'sz': '24', 'color': COLOR_PRIMARY_HEX},
        'right': {'val': 'single', 'sz': '12', 'color': COLOR_PRIMARY_HEX}
    }
    set_cell_properties(c_cover, bg_hex="FDF8FB", borders=borders_c, padding=(160, 160, 200, 160))
    
    p_meta = c_cover.paragraphs[0]
    p_meta.paragraph_format.space_before = Pt(0)
    p_meta.paragraph_format.space_after = Pt(2)
    render_inline(p_meta, "DOKUMEN PANDUAN PENGGUNA SISTEM INFORMASI RESMI", default_color=COLOR_MUTED, font_size=Pt(9), default_bold=True)
    
    p_t1 = c_cover.add_paragraph()
    p_t1.paragraph_format.space_before = Pt(4)
    p_t1.paragraph_format.space_after = Pt(2)
    render_inline(p_t1, "PANDUAN LENGKAP FITUR & ALUR OPERASIONAL WEBSITE ERP", default_color=COLOR_PRIMARY, font_size=Pt(17), default_bold=True)
    
    p_t2 = c_cover.add_paragraph()
    p_t2.paragraph_format.space_before = Pt(2)
    p_t2.paragraph_format.space_after = Pt(8)
    render_inline(p_t2, "Sistem ERP Terpadu Industri Food & Beverage (F&B) — Rasa Aruna Kitchen", default_color=COLOR_SECONDARY, font_size=Pt(12), default_bold=True)
    
    p_t3 = c_cover.add_paragraph()
    p_t3.paragraph_format.space_before = Pt(2)
    p_t3.paragraph_format.space_after = Pt(0)
    p_t3.paragraph_format.line_spacing = 1.15
    render_inline(p_t3, "Panduan praktis dan komprehensif bagi **pengguna awam atau pemula** yang belum pernah menggunakan aplikasi ERP. Disusun langkah demi langkah dengan ilustrasi tangkapan layar, penjelasan fungsi tombol, aturan bisnis, kamus istilah, dan tips pemecahan masalah.", default_color=COLOR_DARK, font_size=Pt(9.5))
    
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(6)
    p_div.paragraph_format.space_after = Pt(6)
    
    # Metadata Table
    meta_headers = ["Entitas Perusahaan", "Merek Dagang", "Teknologi Sistem", "Target Pembaca", "Status Verifikasi"]
    meta_rows = [
        ["PT Rasa Aruna Bersama", "Rasa Aruna Kitchen", "Next.js 15, Prisma ORM, SQLite", "Karyawan Baru, Kasir, Staf Gudang, Sales, Finance", "100% Lulus Uji Bisnis (Zero Defects)"]
    ]
    add_styled_table(doc, meta_headers, meta_rows, [Inches(1.5), Inches(1.3), Inches(1.6), Inches(1.6), Inches(1.2)])

    # Ringkasan Eksekutif Callout
    add_callout(doc, 
        "Selamat datang di sistem Enterprise Resource Planning (ERP) Rasa Aruna Kitchen! Aplikasi ini dirancang "
        "agar seluruh bagian usaha—mulai dari penerimaan pesanan katering, kasir restoran, pengadaan bahan makanan di gudang, "
        "hingga pencatatan keuangan akuntansi—dapat bekerja bersama secara otomatis tanpa ada transaksi yang terlewat, "
        "salah hitung, atau dobel catat. Jika Anda belum pernah menggunakan sistem ini sebelumnya, jangan khawatir! "
        "Ikuti buku panduan ini dari Bab 1 hingga Bab 6.",
        callout_type="concept", title="PENGANTAR UNTUK PENGGUNA AWAM"
    )

    # -------------------------------------------------------------
    # 2. DAFTAR ISI SISTEMATIS
    # -------------------------------------------------------------
    add_heading_styled(doc, "DAFTAR ISI PANDUAN PENGGUNA", level=1)
    
    toc_items = [
        ("BAB 1: PENGENALAN SISTEM ERP RASA ARUNA KITCHEN", [
            "1.1 Apa Itu Website ERP Rasa Aruna Kitchen? (Analogi Sederhana)",
            "1.2 Model Usaha PT Rasa Aruna Bersama (Restoran Gerai vs Katering Korporat)",
            "1.3 Enam Masalah Operasional Kuliner yang Diselesaikan Sistem",
            "1.4 Cara Mengakses Website (Alamat URL, Browser, & Responsivitas)"
        ]),
        ("BAB 2: MANAJEMEN AKUN, PERAN KERJA (ROLE), & NAVIGASI SISTEM", [
            "2.1 Mengapa Hak Akses Dibagi-Bagi? (Konsep Hak Akses / RBAC)",
            "2.2 Tabel 6 Akun Pengguna Bawaan (Role, Nama, Email, Password, & Wewenang)",
            "2.3 Panduan Masuk (Login) dan Keluar (Logout) Aman",
            "2.4 Mengenal Bagian-Bagian Antarmuka Web (Home App Switcher, Topbar, Sidebar, Breadcrumb, Status Bar)"
        ]),
        ("BAB 3: EKSPLORASI FITUR-FITUR DI DALAM WEBSITE", [
            "3.1 Modul Dashboard & Analitik Eksekutif (Pemantauan Omzet & Rekonsiliasi Otomatis)",
            "3.2 Modul Sales: Penjualan Katering, Batas Kredit, Aturan Diskon, & Kunci Harga",
            "3.3 Modul CRM: Papan Kanban Prospek & Pelacakan Calon Pelanggan",
            "3.4 Modul Purchase: Pengadaan Bahan Baku & Pemesanan ke Vendor (PO)",
            "3.5 Modul Inventory: Manajemen Multi-Gudang, 15 SKU, Surat Jalan, QC Masuk, & Retur",
            "3.6 Modul Invoicing: Penagihan Berbasis Pengiriman & Tagihan Vendor 3-Way Match",
            "3.7 Modul Accounting: Buku Besar, Jurnal Double-Entry, & Pengeluaran Operasional",
            "3.8 Modul Point of Sale (POS): Kasir Gerai, Keranjang Belanja, PBJT 10%, Struk, & Tutup Kas",
            "3.9 Modul Data Master Terpusat (Pelanggan, Vendor, Produk, Akun, Satuan, Kategori)",
            "3.10 Fitur Khusus: Auto-Provisioning Menu Kustom & Pengelolaan Multi-Perusahaan"
        ]),
        ("BAB 4: PANDUAN PENGGUNAAN LANGKAH DEMI LANGKAH UNTUK ORANG AWAM", [
            "Alur 1: Penjualan Katering Kantor Lengkap (Dari Prospek CRM hingga Uang Masuk Bank)",
            "Alur 2: Pengadaan Bahan Baku (Dari Pesan ke Supplier hingga Pembayaran Tagihan)",
            "Alur 3: Operasional Harian Kasir Restoran (Buka Sesi Kasir Pagi s/d Tutup Kas Malam)",
            "Alur 4: Distribusi Stok Gudang & Penanganan Komplain Retur Pelanggan",
            "Alur 5: Pembukuan & Pencatatan Biaya Operasional (Jurnal Manual Pengeluaran)",
            "Alur 6: Pengawasan Bisnis oleh Pemilik Perusahaan (Owner Monitoring)"
        ]),
        ("BAB 5: GLOSARIUM ISTILAH ERP & SOLUSI KENDALA (FAQ)", [
            "5.1 Glosarium 16 Istilah Bisnis ERP Bahasa Awam",
            "5.2 Tanya Jawab Praktis Pemecahan Masalah (Troubleshooting)"
        ]),
        ("BAB 6: KESIMPULAN & TIPS SUKSES IMPLEMENTASI SISTEM", [
            "6.1 Nilai Tambah Penggunaan Sistem Terpadu",
            "6.2 Rekomendasi Disiplin Kerja Harian"
        ])
    ]
    
    for chap_title, sub_items in toc_items:
        add_p(doc, f"**{chap_title}**", space_after=2)
        for s in sub_items:
            add_bullet(doc, s, space_after=1)
        add_p(doc, "", space_after=3)

    # -------------------------------------------------------------
    # 3. BAB 1: PENGENALAN SISTEM ERP
    # -------------------------------------------------------------
    add_heading_styled(doc, "BAB 1: PENGENALAN SISTEM ERP RASA ARUNA KITCHEN", level=1)
    
    add_heading_styled(doc, "1.1 Apa Itu Website ERP Rasa Aruna Kitchen? (Analogi Sederhana)", level=2)
    add_p(doc, 
        "Secara sederhana, **ERP (Enterprise Resource Planning)** adalah sebuah perangkat lunak (software) "
        "yang bertindak sebagai **otak digital terpusat** bagi sebuah bisnis. Bayangkan tubuh manusia: "
        "mata melihat, tangan mengambil makanan, dan kaki melangkah, namun semuanya dikoordinasikan oleh satu otak yang sama. "
        "Begitu pula dengan bisnis kuliner PT Rasa Aruna Bersama:"
    )
    add_bullet(doc, "Saat kasir di gerai restoran menjual secangkir kopi, otak sistem langsung tahu bahwa stok bubuk kopi di dapur berkurang.", bold_prefix="Kasir Terhubung ke Gudang:")
    add_bullet(doc, "Saat tim katering menerima pesanan 500 kotak nasi ayam untuk kantor, sistem langsung mengunci stok ayam di gudang agar tidak sengaja terjual oleh kasir gerai.", bold_prefix="Penjualan Mengunci Stok:")
    add_bullet(doc, "Saat surat jalan pengiriman barang ditandatangani oleh penerima, sistem otomatis menerbitkan faktur tagihan dan mencatatnya ke buku besar keuangan perusahaan.", bold_prefix="Gudang Terhubung ke Keuangan:")
    add_p(doc, 
        "Sebelum adanya sistem ini, setiap departemen bekerja dengan buku catatan atau lembar kerja Excel terpisah. "
        "Akibatnya sering terjadi pesanan katering tertunda karena stok fisik habis, kasir menjual barang yang sudah direservasi, "
        "atau bagian keuangan lupa menagih ke pembeli. Website ERP ini menghapus seluruh kekacauan tersebut dengan menyatukan "
        "semua data secara langsung (*real-time*) dalam satu basis data persisten."
    )

    add_heading_styled(doc, "1.2 Model Usaha PT Rasa Aruna Bersama (Dual-Channel Business)", level=2)
    add_p(doc, 
        "PT Rasa Aruna Bersama adalah perusahaan kuliner terkemuka di Jakarta dengan merek dagang **Rasa Aruna Kitchen**. "
        "Perusahaan ini menjalankan dua model bisnis utama yang saling melengkapi:"
    )
    
    model_headers = ["Saluran Bisnis", "Lokasi Operasional", "Karakteristik Operasional", "Modul Utama"]
    model_rows = [
        ["Gerai Cepat Saji (Dine-in / Takeaway)", "CAFE-JKT (Gerai Kafe & Restoran Jakarta)", "Transaksi instan perorangan, antrean cepat, pembayaran langsung (Tunai/QRIS/Bank), pemotongan stok detik itu juga.", "Point of Sale (POS), Inventory (CAFE-JKT)"],
        ["Katering Korporat & Paket Makan Siang", "WH-JKT (Gudang Pusat & Dapur Produksi Jakarta)", "Pemesanan terjadwal partai besar oleh instansi/kantor, termin pembayaran (tempo 7–30 hari), pengiriman armada kurir.", "CRM, Sales, Inventory (WH-JKT), Invoicing"]
    ]
    add_styled_table(doc, model_headers, model_rows, [Inches(1.5), Inches(1.5), Inches(2.3), Inches(1.5)])

    add_heading_styled(doc, "1.3 Enam Masalah Operasional Kuliner yang Diselesaikan Sistem", level=2)
    add_p(doc, 
        "Aplikasi ERP ini dibangun dengan standar rekayasa perangkat lunak ketat untuk menuntaskan enam masalah kronis yang kerap "
        "melanda industri makanan dan minuman:"
    )
    add_numbered_item(doc, "1.", "**Pemisahan Stok Fisik vs Reservasi (Bentrok Pesanan):** Mencegah kasir gerai menjual porsi makanan yang sebenarnya sudah dipesan dan dibayar oleh pelanggan katering perkantoran.")
    add_numbered_item(doc, "2.", "**Larangan Penagihan Dini (Delivery-based Invoicing):** Mencegah tim penagihan mengirim tagihan faktur kepada pelanggan sebelum barang fisik benar-benar dikirimkan dan diterima.")
    add_numbered_item(doc, "3.", "**Pencegahan Pembayaran Bahan Baku Rusak (Three-Way Match):** Mencegah perusahaan membayar tagihan pemasok/vendor atas bahan makanan yang ditolak (*rejected*) saat pemeriksaan mutu di pintu gudang.")
    add_numbered_item(doc, "4.", "**Pembalikan Akuntansi Otomatis saat Retur:** Mengoreksi piutang, membalik nilai persediaan fisik di gudang, membalik pajak daerah PBJT 10%, dan membalik Harga Pokok Penjualan (HPP/COGS) secara otomatis saat terjadi retur barang.")
    add_numbered_item(doc, "5.", "**Kontrol Diskon Berjenjang & Penguncian Harga (Price Lock):** Mencegah tenaga penjual memberikan diskon sewenang-wenang yang merusak laba kotor, serta mengunci harga pesanan agar tidak bisa dimanipulasi setelah disetujui.")
    add_numbered_item(doc, "6.", "**Pengamanan Duplikasi Input (Idempotensi):** Menjamin bahwa jika kasir atau staf mengklik tombol simpan/posting berulang kali karena jaringan lambat, sistem tidak akan menciptakan dokumen atau jurnal ganda.")

    add_heading_styled(doc, "1.4 Cara Mengakses Website (Alamat URL, Browser, & Responsivitas)", level=2)
    add_p(doc, 
        "Sistem ERP Rasa Aruna Kitchen adalah aplikasi web murni (*web-based enterprise application*), yang berarti pengguna tidak "
        "perlu memasang aplikasi berat di komputer masing-masing. Cukup menggunakan aplikasi peramban internet:"
    )
    add_bullet(doc, "Google Chrome, Microsoft Edge, Mozilla Firefox, atau Apple Safari versi terbaru.", bold_prefix="Browser yang Didukung:")
    add_bullet(doc, "http://localhost:3000 (pada server lokal) atau alamat domain server perusahaan yang ditentukan tim IT.", bold_prefix="Alamat Web (URL):")
    add_bullet(doc, "Aplikasi dapat diakses melalui laptop kantor, PC kasir, tablet gerai kasir, maupun smartphone staf gudang secara responsif.", bold_prefix="Perangkat:")

    # -------------------------------------------------------------
    # 4. BAB 2: MANAJEMEN AKUN & NAVIGASI SISTEM
    # -------------------------------------------------------------
    add_heading_styled(doc, "BAB 2: MANAJEMEN AKUN, PERAN KERJA (ROLE), & NAVIGASI SISTEM", level=1)
    
    add_heading_styled(doc, "2.1 Mengapa Hak Akses Dibagi-Bagi? (Konsep Hak Akses / RBAC)", level=2)
    add_p(doc, 
        "Dalam sebuah perusahaan, tidak semua orang boleh melihat atau mengubah seluruh data. Sebagai contoh: seorang kasir gerai "
        "tidak boleh melihat laporan laba rugi perusahaan atau mengubah batas kredit pelanggan besar. Sebaliknya, staf penjualan "
        "tidak boleh asal memvalidasi barang fisik yang masuk ke pintu gudang."
    )
    add_p(doc, 
        "Sistem menerapkan **Role-Based Access Control (RBAC)** di mana setiap pegawai diberikan akun dengan hak akses khusus sesuai "
        "tugas pokok dan fungsinya. Hal ini menjaga keamanan data, mencegah kecurangan (*fraud*), dan mempermudah audit jika "
        "terjadi kekeliruan pencatatan."
    )

    add_heading_styled(doc, "2.2 Tabel 6 Akun Pengguna Bawaan (Role, Nama, Email, Password, & Wewenang)", level=2)
    add_p(doc, 
        "Sistem menyediakan 6 akun pengguna bawaan yang siap digunakan untuk operasional maupun pengujian. "
        "Seluruh akun menggunakan kata sandi default `Password123!`:"
    )
    
    roles_headers = ["No", "Peran (Role)", "Nama Pengguna", "Email Login", "Hak Akses & Tanggung Jawab Utama"]
    roles_rows = [
        ["1", "OWNER", "Maya Prasetyo", "owner@rasaaruna.com", "Akses penuh (Full Access) ke seluruh 8 aplikasi; persetujuan diskon > 10%; pemantauan dashboard KPI eksekutif; rekonsiliasi buku besar vs stok fisik; otorisasi data."],
        ["2", "SALES", "Dini Anggraini", "sales@rasaaruna.com", "Mengelola prospek calon pembeli (CRM Leads), kontak pelanggan, membuat surat penawaran (Quotation), dan mengonfirmasi Sales Order (diskon maksimal 10%)."],
        ["3", "WAREHOUSE", "Sinta Maharani", "warehouse@rasaaruna.com", "Mengelola master produk & varian SKU, membuat surat jalan pengiriman (Delivery Order), penerimaan barang masuk (Goods Receipt & QC), transfer stok antar-gudang, dan retur."],
        ["4", "PROCUREMENT", "Arief Wicaksono", "procurement@rasaaruna.com", "Mengelola kontak pemasok (Vendor), meminta penawaran harga vendor (RFQ), menerbitkan pesanan pembelian resmi (Purchase Order), dan memantau komitmen belanja."],
        ["5", "FINANCE", "Reza Firdaus", "finance@rasaaruna.com", "Menerbitkan faktur pelanggan (Invoice), memvalidasi tagihan vendor (Vendor Bill via 3-Way Match), mencatat pelunasan (Payments), Buku Besar (General Ledger), dan Jurnal Umum."],
        ["6", "CASHIER", "Bagas Putra", "cashier@rasaaruna.com", "Melayani kasir gerai CAFE-JKT, input menu pesanan cepat, menerima pembayaran tunai/QRIS/Bank, cetak struk, dan buka/tutup sesi kasir. Dilarang membuka Buku Besar (SR-15)."]
    ]
    add_styled_table(doc, roles_headers, roles_rows, [Inches(0.4), Inches(1.1), Inches(1.2), Inches(1.7), Inches(2.4)])

    add_heading_styled(doc, "2.3 Panduan Masuk (Login) dan Keluar (Logout) Aman", level=2)
    add_p(doc, 
        "Untuk memulai pekerjaan di website ERP, ikuti langkah-langkah mudah berikut:"
    )
    add_numbered_item(doc, "Langkah 1:", "Buka peramban internet dan ketik alamat website: `http://localhost:3000/login`.")
    add_numbered_item(doc, "Langkah 2:", "Masukkan **Email Login** dan **Password** sesuai peran Anda (lihat tabel di atas).")
    add_numbered_item(doc, "Langkah 3:", "Klik tombol berwarna ungu **Masuk ke Sistem (Sign In)**. Sistem akan memverifikasi identitas Anda dan langsung mengarahkan Anda ke Halaman Beranda (Home App Switcher).")
    add_numbered_item(doc, "Langkah 4 (Keluar/Logout):", "Jika selesai bekerja, klik nama Anda di sudut kanan atas layar (Topbar), lalu klik **Keluar (Sign Out)** untuk mengakhiri sesi kerja dengan aman.")
    
    # Tambah Screenshot Login
    login_img = os.path.join(screens_dir, "01_login_desktop.png")
    add_image_with_caption(doc, login_img, "Halaman Masuk (Login Screen) Minimalis & Aman dengan Autentikasi JWT")

    add_heading_styled(doc, "2.4 Mengenal Bagian-Bagian Antarmuka Web (UI Anatomy)", level=2)
    add_p(doc, 
        "Antarmuka website ERP Rasa Aruna Kitchen mengadopsi estetika modern terinspirasi dari standar industri **Odoo 17.0 Desktop**, "
        "yang sangat bersih, rapi, dan mudah dikenali:"
    )
    
    # Tambah Screenshot Home
    home_img = os.path.join(screens_dir, "02_home_desktop.png")
    add_image_with_caption(doc, home_img, "Tampilan Beranda Utama (Home App Switcher) — Pintu Gerbang Seluruh Modul Aplikasi")

    add_p(doc, "Berikut adalah elemen antarmuka yang akan selalu Anda temui di setiap halaman:")
    add_bullet(doc, "Ikon kotak 9 titik di sudut kiri atas layar. Mengkliknya akan memunculkan menu pop-up untuk berpindah ke aplikasi lain secara instan tanpa perlu kembali ke halaman awal.", bold_prefix="1. App Switcher (Ikon Kotak Menu):")
    add_bullet(doc, "Bilah navigasi di bagian paling atas. Menampilkan logo perusahaan, pemilih entitas cabang perusahaan (Company Switcher), indikator peran yang sedang aktif, dan profil akun Anda.", bold_prefix="2. Topbar (Bilah Atas):")
    add_bullet(doc, "Menu navigasi vertikal di sebelah kiri layar yang memuat submenu operasional modul yang sedang dibuka (misal pada modul Inventory: ada submenu Produk, Pengiriman, Penerimaan, Transfer, dan Retur).", bold_prefix="3. Sidebar (Menu Samping):")
    add_bullet(doc, "Teks penunjuk jejak di bawah Topbar (contoh: Home > Penjualan > Pesanan Penjualan > S00009). Sangat berguna agar Anda tahu sedang berada di dokumen mana dan dapat kembali ke daftar sebelumnya dengan satu klik.", bold_prefix="4. Breadcrumb:")
    add_bullet(doc, "Pita tahapan proses di pojok kanan atas formulir dokumen (misal: DRAFT -> CONFIRMED -> DONE / POSTED / PAID). Memberitahu Anda dengan jelas status terkini dari dokumen yang sedang dibuka.", bold_prefix="5. Status Bar Dokumen:")

    # -------------------------------------------------------------
    # 5. BAB 3: EKSPLORASI FITUR-FITUR DI DALAM WEBSITE
    # -------------------------------------------------------------
    add_heading_styled(doc, "BAB 3: EKSPLORASI FITUR-FITUR DI DALAM WEBSITE", level=1)
    add_p(doc, 
        "Website ERP Rasa Aruna Kitchen terdiri dari 8 modul operasional terpadu ditambah modul Data Master dan Pengaturan Multi-Perusahaan. "
        "Berikut adalah ulasan mendalam mengenai setiap fitur dan fungsinya:"
    )

    # 3.1 Dashboard
    add_heading_styled(doc, "3.1 Modul Dashboard & Analitik Eksekutif", level=2)
    add_p(doc, 
        "Halaman Dashboard (`/dashboard`) adalah pusat kendali eksekutif yang menyajikan informasi kesehatan bisnis secara waktu-nyata (*real-time*). "
        "Fitur-fitur utamanya meliputi:"
    )
    add_bullet(doc, "Menampilkan 4 angka vital bisnis: Total Omzet Penjualan Bersih, Total Piutang Belum Tertagih (Accounts Receivable/AR), Total Hutang Pemasok yang Harus Dibayar (Accounts Payable/AP), dan Total Valuasi Persediaan Bahan Baku/Makanan di Rak Gudang.", bold_prefix="Kartu KPI Utama:")
    add_bullet(doc, "Diagram batang dan garis yang menggambarkan tren omzet penjualan dari waktu ke waktu, serta diagram donat komposisi penjualan per kategori menu (Kopi, Makanan Utama, Pastry, Minuman Dingin).", bold_prefix="Grafik Analitik Interaktif:")
    add_bullet(doc, "Fitur paling canggih yang secara otomatis membandingkan nilai akun persediaan di buku besar akuntansi (Akun 1030) dengan nilai fisik nyata hasil perkalian stok barang di gudang. Jika nilainya cocok, status berwarna hijau 'MATCHED' akan tampil.", bold_prefix="Matriks Rekonsiliasi Otomatis (SR-20):")
    
    dash_img = os.path.join(screens_dir, "03_dashboard_desktop.png")
    add_image_with_caption(doc, dash_img, "Dashboard Eksekutif Waktu-Nyata — Menampilkan Metrik Finansial & Status Rekonsiliasi Audit")

    # 3.2 Sales
    add_heading_styled(doc, "3.2 Modul Sales (Penjualan Katering & Korporat)", level=2)
    add_p(doc, 
        "Modul Penjualan (`/sales/orders`) menangani seluruh siklus transaksi komersial partai besar untuk katering kantor dan pesanan paket makan siang. "
        "Fitur unggulannya meliputi:"
    )
    add_bullet(doc, "Membuat surat penawaran harga resmi (Quotation) untuk calon pembeli dengan memilih menu makanan, menentukan jumlah porsi, dan menetapkan tanggal pengiriman.", bold_prefix="Pembuatan Surat Penawaran (Quotation):")
    add_bullet(doc, "Tenaga penjual (Sales) hanya berhak memberikan diskon maksimal 10%. Jika pelanggan meminta diskon di atas 10%, sistem akan mengunci tombol konfirmasi dan meminta persetujuan khusus dari akun Owner.", bold_prefix="Kontrol Diskon Bertingkat (SR-07 & SR-08):")
    add_bullet(doc, "Sistem secara otomatis menghitung sisa batas kredit pelanggan. Jika total nilai pesanan baru ditambah saldo piutang yang belum dibayar melebihi limit kredit pelanggan, pesanan akan diblokir otomatis demi keamanan kas perusahaan.", bold_prefix="Pengawasan Batas Kredit (Credit Limit Headroom - SR-09):")
    add_bullet(doc, "Begitu pesanan disetujui menjadi Sales Order resmi (CONFIRMED), harga dan diskon terkunci mutlak (*Price Lock*), serta kuantitas barang otomatis direservasi di Gudang Pusat (WH-JKT) agar aman dari penjualan lain.", bold_prefix="Penguncian Harga & Reservasi Stok:")
    
    sales_img = os.path.join(screens_dir, "04_sales_orders_desktop.png")
    add_image_with_caption(doc, sales_img, "Modul Pesanan Penjualan (Sales Orders) — Dilengkapi Pelindung Batas Kredit & Kunci Harga")

    # 3.3 CRM
    add_heading_styled(doc, "3.3 Modul CRM (Customer Relationship Management)", level=2)
    add_p(doc, 
        "Modul CRM (`/crm/leads`) membantu tim pemasaran dan penjualan melacak setiap calon peluang bisnis dari kontak awal hingga berhasil disepakati:"
    )
    add_bullet(doc, "Kartu-kartu prospek ditampilkan dalam kolom visual: Baru (New), Terkualifikasi (Qualified), Penawaran Diajukan (Proposition), dan Menang (Won).", bold_prefix="Papan Visual Kanban:")
    add_bullet(doc, "Kartu prospek tidak dapat dipindahkan ke tahap 'Proposition' sebelum nilai estimasi pendapatan (Expected Revenue) diisi, mencegah staf membuat proposal tanpa kejelasan nilai transaksi.", bold_prefix="Validasi Nilai Peluang (SR-16):")
    add_bullet(doc, "Tersedia tombol satu klik untuk langsung mengubah prospek yang dimenangkan (Won) menjadi draf Surat Penawaran Penjualan (Sales Quotation) tanpa perlu input ulang nama pelanggan.", bold_prefix="Konversi Instan ke Penawaran:")
    
    crm_img = os.path.join(screens_dir, "10_crm_leads_desktop.png")
    add_image_with_caption(doc, crm_img, "Papan Kanban CRM — Mengelola Pipeline Prospek Calon Pelanggan Katering")

    # 3.4 Purchase
    add_heading_styled(doc, "3.4 Modul Purchase (Pengadaan & Pembelian Bahan Baku)", level=2)
    add_p(doc, 
        "Modul Pengadaan (`/purchase/orders`) memastikan ketersediaan bahan baku makanan dan minuman dari pemasok terpercaya "
        "(seperti beras, daging ayam, biji kopi, susu segar, sirup aren):"
    )
    add_bullet(doc, "Membuat draf permintaan penawaran harga kepada pemasok untuk membandingkan harga beli terbaik.", bold_prefix="Permintaan Penawaran (RFQ):")
    add_bullet(doc, "Mengonfirmasi pesanan beli resmi (Purchase Order) yang menjadi komitmen legal pengadaan perusahaan.", bold_prefix="Penerbitan Purchase Order (PO):")
    add_bullet(doc, "Saat PO dikonfirmasi, sistem mencatat komitmen belanja namun **belum menambah stok fisik gudang**. Stok fisik baru bertambah ketika barang benar-benar tiba di pintu gudang.", bold_prefix="Pemisahan Komitmen vs Fisik:")
    
    purch_img = os.path.join(screens_dir, "05_purchase_orders_desktop.png")
    add_image_with_caption(doc, purch_img, "Modul Pengadaan (Purchase Orders) — Mencatat Komitmen Belanja Bahan Baku ke Vendor")

    # 3.5 Inventory
    add_heading_styled(doc, "3.5 Modul Inventory (Gudang, Distribusi, & Kontrol Mutu)", level=2)
    add_p(doc, 
        "Modul Persediaan (`/inventory/products`) adalah jantung operasional fisik perusahaan yang mengatur arus keluar masuk seluruh barang:"
    )
    add_bullet(doc, "Katalog produk mencakup 15 SKU baku dengan varian suhu (Panas/Hot vs Dingin/Ice) dan ukuran porsi (Reguler vs Large). Sistem menjamin bahwa stok varian dingin dan panas dikelola secara independen (SR-17).", bold_prefix="Master 15 SKU Varian Makanan & Minuman:")
    add_bullet(doc, "Memisahkan catatan fisik di Gudang Pusat (`WH-JKT`) dan Dapur Gerai Kasir (`CAFE-JKT`). Kasir dilarang memotong stok langsung dari WH-JKT (SR-03).", bold_prefix="Manajemen Multi-Gudang:")
    add_bullet(doc, "Sistem melarang keras kuantitas stok bernilai di bawah nol (`onHand < 0`). Jika stok fisik habis, transaksi otomatis ditolak demi mencegah ketidaksesuaian pembukuan.", bold_prefix="Aturan Nol Stok Negatif (Zero Negative Stock - SR-04):")
    add_bullet(doc, "Jika pesanan katering membutuhkan 100 porsi namun stok saat ini baru ada 70 porsi, petugas dapat memvalidasi pengiriman 70 porsi. Sistem otomatis menerbitkan dokumen **Backorder** untuk sisa 30 porsi yang akan dikirim saat stok siap.", bold_prefix="Surat Jalan Parsial & Dokumen Backorder (SR-10):")
    add_bullet(doc, "Saat bahan baku dari vendor tiba, petugas gudang melakukan inspeksi mutu. Petugas dapat memisahkan barang yang lolos (Accepted) dan barang yang ditolak/rusak (Rejected) beserta alasannya. Hanya unit yang diterima yang masuk ke stok fisik.", bold_prefix="Penerimaan Barang & Inspeksi Mutu QC (SR-06):")
    add_bullet(doc, "Fitur pemindahan barang jadi atau bahan baku dari Gudang Pusat ke Dapur Gerai dalam hitungan detik untuk mengisi kembali stok etalase kasir yang menipis.", bold_prefix="Transfer Internal Antar-Gudang (SR-12):")
    add_bullet(doc, "Menangani pengembalian makanan dari pelanggan katering. Barang retur diinspeksi secara ketat. Jika diterima kembali, stok fisik bertambah dan sistem menerbitkan Nota Kredit (Credit Note).", bold_prefix="Penanganan Retur Penjualan (SR-11):")
    
    inv_img = os.path.join(screens_dir, "06_inventory_products_desktop.png")
    add_image_with_caption(doc, inv_img, "Modul Persediaan Gudang (Inventory) — Memantau Stok On-Hand, Reserved, & Available")

    # 3.6 Invoicing
    add_heading_styled(doc, "3.6 Modul Invoicing & Billing (Penagihan & Faktur)", level=2)
    add_p(doc, 
        "Modul Penagihan (`/accounting/invoices` dan `/accounting/vendor-bills`) menjembatani operasional gudang dengan arus kas:"
    )
    add_bullet(doc, "Sistem secara mutlak melarang pembuatan faktur penagihan melebihi jumlah unit barang yang telah dikirimkan secara fisik. Pelanggan hanya membayar apa yang telah mereka terima.", bold_prefix="Faktur Berbasis Pengiriman Fisik (SR-01 & SR-02):")
    add_bullet(doc, "Saat bagian keuangan menerima tagihan dari vendor, sistem mencocokkannya dengan Purchase Order dan Surat Penerimaan Gudang. Barang yang berstatus 'REJECTED' saat inspeksi mutu **dilarang keras ditagihkan** oleh vendor.", bold_prefix="Three-Way Matching Tagihan Vendor (SR-05 & SR-06):")
    add_bullet(doc, "Pajak Barang dan Jasa Tertentu (PBJT) restoran sebesar 10% dihitung secara otomatis per baris pesanan dengan pembulatan rupiah terdekat (*half up*).", bold_prefix="Kalkulasi Pajak Restoran PBJT 10% (SR-18):")
    add_bullet(doc, "Mencegah pencatatan pembayaran yang melebihi sisa piutang atau sisa hutang yang tercatat (*overpayment protection*).", bold_prefix="Pelindung Kelebihan Bayar (SR-19):")
    
    invc_img = os.path.join(screens_dir, "08_accounting_invoices_desktop.png")
    add_image_with_caption(doc, invc_img, "Modul Faktur Tagihan (Customer Invoices) — Menghitung Pajak PBJT 10% & Pelunasan")

    # 3.7 Accounting
    add_heading_styled(doc, "3.7 Modul Accounting (Pembukuan Buku Besar & Jurnal)", level=2)
    add_p(doc, 
        "Modul Akuntansi (`/accounting/journal-entries`) menyusun seluruh riwayat finansial perusahaan secara terstruktur dan terstandarisasi:"
    )
    add_bullet(doc, "Setiap transaksi yang terjadi di sistem (penjualan kasir, pengiriman barang, penerimaan tagihan vendor) otomatis menerbitkan entri jurnal dengan jumlah Debit dan Kredit yang selalu sama persis (*balanced double-entry*).", bold_prefix="Penjurnalan Otomatis Berpasangan:")
    add_bullet(doc, "Bagan akun terstandarisasi mencakup: `1010` Kas & Bank BCA, `1020` Piutang Usaha, `1030` Persediaan Bahan Baku & Makanan, `1040` GRNI (Hutang Belum Difaktur), `2010` Hutang Usaha, `2020` Hutang Pajak PBJT 10%, `3010` Modal Disetor, `4010` Pendapatan F&B, dan `5010` Harga Pokok Penjualan (HPP/COGS).", bold_prefix="Bagan Akun Lengkap (Chart of Accounts / CoA):")
    add_bullet(doc, "Staf keuangan dapat mencatat transaksi non-operasional (seperti pembayaran biaya listrik, air galon, internet, atau sewa tempat) dengan formulir debit-kredit interaktif, lengkap dengan tombol untuk membuat akun beban baru langsung di tempat.", bold_prefix="Form Jurnal Umum Pengeluaran Manual:")
    add_bullet(doc, "Sesuai aturan keamanan perbankan (SR-15), staf dengan peran Kasir (CASHIER) diblokir mutlak dari membuka atau membaca Buku Besar ini.", bold_prefix="Pemisahan Hak Akses Buku Besar (SR-15):")
    
    je_img = os.path.join(screens_dir, "09_journal_entries_desktop.png")
    add_image_with_caption(doc, je_img, "Modul Jurnal Buku Besar (General Ledger) — Pembukuan Double-Entry Otomatis Seimbang")

    # 3.8 POS
    add_heading_styled(doc, "3.8 Modul Point of Sale / POS (Kasir Gerai Restoran CAFE-JKT)", level=2)
    add_p(doc, 
        "Modul Kasir (`/pos`) adalah ujung tombak pelayanan konsumen perorangan di gerai kafe `CAFE-JKT`. "
        "Dirancang khusus untuk operasional layar sentuh yang cepat dan tanpa hambatan:"
    )
    add_bullet(doc, "Kasir wajib membuka sesi kerja dengan menginput uang modal awal kas di laci kasir (misal Rp500.000 untuk uang kembalian).", bold_prefix="Pembukaan Sesi Kasir:")
    add_bullet(doc, "Layar kasir menyajikan katalog menu makanan dan minuman berukuran besar dengan filter kategori (Kopi Panas, Kopi Dingin, Makanan Ringan, Menu Nasi). Dilengkapi kotak pencarian cepat dan tombol Tambah Menu Kustom.", bold_prefix="Katalog Menu Interaktif:")
    add_bullet(doc, "Mendukung transaksi makan di tempat (Dine-in) dengan nomor meja, maupun dibungkus (Takeaway).", bold_prefix="Pilihan Dine-in atau Takeaway:")
    add_bullet(doc, "Mendukung pembayaran Tunai (Cash), QRIS Dinamis/Statis, dan Kartu Debit/Kredit Bank.", bold_prefix="Multi-Metode Pembayaran:")
    add_bullet(doc, "Saat pembayaran diselesaikan, struk resmi kasir langsung tampil di layar lengkap dengan rincian porsi, pajak PBJT 10%, metode pembayaran, dan waktu transaksi.", bold_prefix="Penerbitan Struk Belanja Kasir:")
    add_bullet(doc, "Saat kasir menyelesaikan shift kerja di malam hari, kasir memasukkan jumlah uang fisik nyata di laci. Sistem secara otomatis menghitung selisih uang kas fisik versus rekap transaksi penjualan sistem (SR-14).", bold_prefix="Penutupan Sesi & Rekonsiliasi Kas Laci:")
    
    pos_img = os.path.join(screens_dir, "07_pos_desktop.png")
    add_image_with_caption(doc, pos_img, "Antarmuka Kasir Gerai Restoran (Point of Sale) — Cepat, Intuitif, & Terkoneksi ke Dapur")

    # 3.9 Master Data & 3.10 Fitur Khusus
    add_heading_styled(doc, "3.9 Modul Data Master Terpusat", level=2)
    add_p(doc, 
        "Menu Data Master (`/master/[resource]`) menyediakan satu tempat terpusat untuk mengelola seluruh data referensi perusahaan: "
        "Daftar Pelanggan (tipe korporat/individu & limit kredit), Daftar Vendor Pemasok, Katalog Produk & SKU, Kategori Menu, "
        "Satuan Ukuran (Porsi, Cup, Kg, Pcs), Lokasi Gudang, Bagan Akun Akuntansi (Chart of Accounts), dan Daftar Harga Khusus Vendor."
    )

    add_heading_styled(doc, "3.10 Fitur Unggulan Khusus: Auto-Provisioning & Multi-Perusahaan", level=2)
    add_p(doc, 
        "Sistem ERP Rasa Aruna Kitchen dilengkapi dua fitur cerdas yang sangat mempermudah pekerjaan sehari-hari:"
    )
    add_bullet(doc, "Jika gerai ingin menjual menu musiman baru (misal 'Es Kopi Pandan') yang belum sempat didaftarkan di master data oleh manajer, kasir atau sales dapat langsung mengetik namanya di form pesanan. Sistem otomatis membuatkan kode SKU unik, mengisi master produk, dan menyiapkan stok awal tanpa memunculkan pesan error teknis.", bold_prefix="1. Fitur Auto-Provisioning Menu Kustom:")
    add_bullet(doc, "Sistem mendukung pengelolaan lebih dari satu entitas perusahaan. Pengguna dapat berganti entitas cabang/anak perusahaan melalui pemilih di Topbar, di mana setiap perusahaan memiliki basis data dan buku besar yang terisolasi secara mandiri.", bold_prefix="2. Arsitektur Multi-Perusahaan (Multi-Company):")

    # -------------------------------------------------------------
    # 6. BAB 4: PANDUAN PENGGUNAAN LANGKAH DEMI LANGKAH UNTUK ORANG AWAM
    # -------------------------------------------------------------
    add_heading_styled(doc, "BAB 4: PANDUAN PENGGUNAAN LANGKAH DEMI LANGKAH UNTUK ORANG AWAM", level=1)
    add_p(doc, 
        "Bab ini adalah **buku petunjuk operasional harian** yang memandu Anda bagaimana menjalankan pekerjaan nyata "
        "di dalam sistem. Setiap alur ditulis dengan langkah yang runtut, menyebutkan tombol yang harus diklik, "
        "formulir yang harus diisi, dan hasil akhir yang diharapkan."
    )

    # 4.1 ALUR PENJUALAN
    add_heading_styled(doc, "Alur 1: Penjualan Katering Kantor Lengkap (Sales-to-Cash)", level=2)
    add_p(doc, 
        "Alur ini digunakan saat ada kantor yang ingin memesan paket katering makan siang atau acara rapat (Contoh: PT Kuliner Maju memesan 8 porsi Nasi Ayam Sambal Matah):"
    )
    add_callout(doc, 
        "Pemeran Alur: 1. Tim Sales (Dini Anggraini) -> 2. Tim Gudang (Sinta Maharani) -> 3. Tim Keuangan (Reza Firdaus).",
        callout_type="tip", title="SIAPA YANG TERLIBAT?"
    )
    
    add_numbered_item(doc, "Langkah 1 (Catat Prospek CRM):", "Login sebagai akun `SALES`. Buka menu CRM melalui App Switcher. Klik tombol '+ Tambah Peluang Baru'. Masukkan nama peluang (misal: 'Katering Rapat Kantor PT Kuliner Maju'), pilih pelanggan, dan isi estimasi nilai omzet (Expected Revenue). Geser kartu dari tahap 'Baru' ke 'Terkualifikasi'.")
    add_numbered_item(doc, "Langkah 2 (Buat Surat Penawaran / Quotation):", "Buka menu Sales > Pesanan Penjualan. Klik tombol '+ Tambah Pesanan Baru'. Pilih nama pelanggan 'PT Kuliner Maju'. Pada baris produk, pilih 'RICE-CHICK-S' (Nasi Ayam Matah Sambal), masukkan jumlah 8 unit dengan harga satuan Rp48.000. Cek subtotal (Rp384.000) dan pajak PBJT 10% (Rp38.400). Simpan draf penawaran. Nomor pesanan (misal `S00009`) otomatis diterbitkan.")
    add_numbered_item(doc, "Langkah 3 (Pemberian Diskon & Approval):", "Jika Anda memberikan diskon ≤ 10%, Anda bisa langsung mengonfirmasi pesanan. Namun jika Anda memberikan diskon > 10% (misal 15%), sistem akan memunculkan status 'MENUNGGU APPROVAL OWNER'. Akun Owner harus menyetujui terlebih dahulu sebelum pesanan dapat dilanjutkan.")
    add_numbered_item(doc, "Langkah 4 (Konfirmasi Pesanan Menjadi Sales Order):", "Klik tombol ungu **Konfirmasi Pesanan**. Sistem otomatis memverifikasi bahwa total tagihan tidak melebihi sisa limit kredit pelanggan. Saat status berubah menjadi `CONFIRMED`, harga pesanan otomatis **terkunci permanen (Price Lock)** dan sistem otomatis memesan (reservasi) 8 unit ayam di Gudang Pusat (`WH-JKT`). Dokumen Surat Jalan pengiriman otomatis terbuat di modul Inventory!")
    add_numbered_item(doc, "Langkah 5 (Pengiriman Barang & Backorder oleh Gudang):", "Login sebagai akun `WAREHOUSE`. Buka menu Inventory > Pengiriman. Cari nomor pesanan `S00009` di kolom pencarian. Klik **Detail** pada dokumen pengiriman. Jika stok fisik yang siap kirim baru ada 5 unit, ubah kolom 'Dikirim' menjadi `5`. Periksa kolom sisa backorder (`3`). Klik tombol **Validasi Pengiriman**. Dokumen pengiriman pertama berubah menjadi `DONE` (5 unit terkirim), dan sistem otomatis menerbitkan dokumen **Backorder** baru untuk 3 unit sisanya!")
    add_numbered_item(doc, "Langkah 6 (Penerbitan Faktur Tagihan oleh Keuangan):", "Login sebagai akun `FINANCE`. Buka menu Invoicing > Faktur Tagihan. Klik tombol '+ Buat Invoice Baru'. Pilih nomor pesanan `S00009`. Perhatikan bahwa sistem secara cerdas **hanya menagihkan 5 unit yang telah terkirim** (Rp240.000 + PBJT Rp24.000 = Total Rp264.000), sesuai aturan dilarang menagih barang yang belum dikirim. Klik tombol **Posting Invoice**. Status invoice berubah menjadi `POSTED`.")
    add_numbered_item(doc, "Langkah 7 (Mencatat Pembayaran dari Pelanggan):", "Pada invoice yang berstatus POSTED tersebut, klik tombol **Register Payment (Catat Pembayaran)**. Pilih metode pembayaran 'Bank BCA' atau 'Kas Tunai'. Jika pelanggan membayar uang muka Rp100.000, masukkan nominal Rp100.000 dan simpan. Status invoice berubah menjadi `PARTIALLY PAID` dengan sisa tagihan (*outstanding*) Rp164.000. Saat sisa Rp164.000 dilunasi di kemudian hari, status invoice otomatis berubah menjadi `PAID`!")

    # 4.2 ALUR PENGADAAN
    add_heading_styled(doc, "Alur 2: Pengadaan Bahan Baku Lengkap (Procure-to-Pay)", level=2)
    add_p(doc, 
        "Alur ini digunakan saat persediaan bahan baku (misal biji kopi atau ayam segar) di gudang mulai menipis dan perlu belanja ke supplier:"
    )
    add_callout(doc, 
        "Pemeran Alur: 1. Tim Pengadaan (Arief Wicaksono) -> 2. Tim Gudang (Sinta Maharani) -> 3. Tim Keuangan (Reza Firdaus).",
        callout_type="tip", title="SIAPA YANG TERLIBAT?"
    )
    
    add_numbered_item(doc, "Langkah 1 (Buat Pesanan Pembelian / PO):", "Login sebagai akun `PROCUREMENT`. Buka menu Purchase > Pesanan Beli Baru. Pilih vendor 'PT Kopi Minum Prima'. Tambahkan produk 'COF-LATT-HOT' (Bahan Baku Kopi Latte) sebanyak 10 unit dengan harga beli Rp12.000 per unit. Klik Simpan Draf.")
    add_numbered_item(doc, "Langkah 2 (Konfirmasi Pesanan Pembelian):", "Klik tombol **Konfirmasi Pesanan**. Status dokumen berubah menjadi `PURCHASE ORDER` dengan nomor PO resmi (misal `P00007`). Perhatikan bahwa stok fisik gudang belum bertambah, namun komitmen belanja telah tercatat di sistem. Dokumen Penerimaan Barang otomatis diteruskan ke modul gudang.")
    add_numbered_item(doc, "Langkah 3 (Penerimaan Barang & Inspeksi Mutu QC oleh Gudang):", "Saat mobil boks vendor tiba di gudang, login sebagai akun `WAREHOUSE`. Buka menu Inventory > Penerimaan Barang. Cari nomor PO `P00007`, lalu buka **Detail**. Petugas gudang membongkar muatan dan memeriksa fisik barang. Misalnya dari 10 unit yang dikirim, ada 8 unit yang segar dan 2 unit yang kemasannya sobek/rusak: masukkan 'Diterima' = `8`, 'Ditolak' = `2`, dan ketik catatan 'Kemasan rusak/sobek'. Klik tombol **Validasi Penerimaan**. Stok gudang di sistem resmi bertambah 8 unit!")
    add_numbered_item(doc, "Langkah 4 (Penerbitan Tagihan Vendor via Three-Way Match):", "Login sebagai akun `FINANCE`. Buka menu Invoicing > Tagihan Vendor. Klik tombol '+ Buat Tagihan Vendor'. Pilih nomor PO `P00007`. Berkat sistem **Three-Way Matching**, sistem secara otomatis hanya mengizinkan tagihan atas 8 unit yang lolos inspeksi (8 unit x Rp12.000 = Rp96.000) dan menolak keras menagih 2 unit yang rusak! Klik tombol **Posting Tagihan**.")
    add_numbered_item(doc, "Langkah 5 (Pembayaran ke Vendor):", "Klik tombol **Register Payment** pada tagihan vendor tersebut. Masukkan nominal Rp96.000 via Transfer Bank BCA, lalu simpan. Tagihan vendor kini berstatus lunas (`PAID`) dengan sisa hutang Rp0!")

    # 4.3 ALUR KASIR
    add_heading_styled(doc, "Alur 3: Operasional Harian Kasir Restoran (Pagi s/d Malam Tutup Toko)", level=2)
    add_p(doc, 
        "Alur ini adalah rutinitas harian staf kasir di gerai restoran `CAFE-JKT` dari mulai buka toko hingga tutup toko:"
    )
    add_callout(doc, 
        "Pemeran Alur: Staf Kasir Gerai (Bagas Putra). Lokasi operasional: Gerai CAFE-JKT.",
        callout_type="tip", title="SIAPA YANG TERLIBAT?"
    )
    
    add_numbered_item(doc, "Langkah 1 (Buka Sesi Kasir Pagi Hari):", "Login sebagai akun `CASHIER`. Buka menu Point of Sale (`/pos`). Jika belum ada sesi yang aktif, klik tombol ungu '+ Buka Sesi Kasir Baru'. Masukkan uang modal awal di laci kasir (misal `Rp500.000` uang pecahan kembalian). Klik Konfirmasi Buka Sesi. Sesi kasir kini berstatus `OPEN` (misal sesi `POS01`).")
    add_numbered_item(doc, "Langkah 2 (Melayani Pesanan Pelanggan):", "Saat ada pembeli datang memesan 2 Iced Latte dan 1 Choco Cookie, cukup klik gambar produk 'Latte Iced' dua kali dan klik 'Choco Cookie' satu kali. Pesanan langsung masuk ke keranjang belanja di sisi kanan layar. Total belanja otomatis terhitung (Subtotal Rp86.000 + PBJT 10% Rp8.600 = Total Rp94.600). Pilih tipe pesanan 'Takeaway' atau 'Dine-in'.")
    add_numbered_item(doc, "Langkah 3 (Memproses Pembayaran & Cetak Struk):", "Pilih metode pembayaran: 'QRIS', 'Bank', atau 'Cash'. Jika memilih QRIS, arahkan pembeli untuk scan barcode QRIS. Klik tombol hijau besar **Bayar Sekarang**. Seketika itu juga jendela struk kasir (*receipt*) resmi muncul di layar, mencantumkan nomor struk, rincian menu, jam transaksi, dan rincian pajak PBJT 10%. Klik Tutup Struk. Stok minuman di gerai `CAFE-JKT` langsung terpotong detik itu juga!")
    add_numbered_item(doc, "Langkah 4 (Tutup Sesi Kasir Malam Hari & Hitung Uang Laci):", "Di akhir jam operasional gerai, kasir bersiap pulang. Klik tombol merah **Tutup Sesi Kasir**. Kasir menghitung seluruh uang fisik nyata yang ada di dalam laci uang kasir. Masukkan nominal kas fisik tersebut ke kolom input penutupan. Misalnya: modal awal Rp500.000 dan seluruh penjualan hari itu memakai QRIS (tanpa ada uang tunai masuk), maka kasir menghitung uang di laci tetap Rp500.000. Masukkan nominal `500000`, lalu klik **Konfirmasi Tutup Sesi**. Sistem mencocokkannya dan menampilkan status **Selisih Kas: Rp0 (Sempurna)**. Sesi resmi berstatus `CLOSED`!")

    # 4.4 ALUR TRANSFER & RETUR
    add_heading_styled(doc, "Alur 4: Suplai Antar-Gudang & Penanganan Komplain Retur", level=2)
    add_p(doc, 
        "Alur ini digunakan saat dapur gerai kehabisan stok bahan atau saat pelanggan katering mengembalikan makanan karena ada pesanan yang tidak sesuai:"
    )
    
    add_heading_styled(doc, "A. Transfer Stok Internal (Dari Gudang Pusat WH-JKT ke Dapur CAFE-JKT):", level=3)
    add_p(doc, 
        "Jika kasir gerai melaporkan bahwa stok Iced Latte di etalase kafe habis, staf gudang dapat memindahkan stok dari gudang utama:"
    )
    add_numbered_item(doc, "1.", "Login sebagai akun `WAREHOUSE`. Buka menu Inventory > Transfer Internal.")
    add_numbered_item(doc, "2.", "Klik '+ Buat Transfer Baru'. Pilih Gudang Asal: `WH-JKT` dan Gudang Tujuan: `CAFE-JKT`.")
    add_numbered_item(doc, "3.", "Pilih produk dan masukkan kuantitas yang ingin dipindahkan. Perhatikan bahwa kuantitas yang bisa dipindahkan dibatasi oleh stok bebas (*Available Stock*), sehingga tidak akan mengganggu barang katering yang sedang direservasi.")
    add_numbered_item(doc, "4.", "Klik **Validasi Transfer**. Dalam sekejap, stok di `WH-JKT` berkurang dan stok di `CAFE-JKT` bertambah, siap untuk dijual oleh kasir!")
    
    add_heading_styled(doc, "B. Penanganan Retur Makanan dari Pelanggan:", level=3)
    add_p(doc, 
        "Jika pelanggan katering mengajukan retur atas paket pesanan:"
    )
    add_numbered_item(doc, "1.", "Login sebagai akun `WAREHOUSE`. Buka menu Inventory > Retur Barang.")
    add_numbered_item(doc, "2.", "Pilih dokumen pengiriman asal dan masukkan jumlah porsi yang dikomplain pelanggan.")
    add_numbered_item(doc, "3.", "Lakukan pemeriksaan fisik (*Quality Inspection*). Jika kondisi barang masih utuh dan layak diterima kembali, ubah status menjadi `ACCEPTED`. Jika barang rusak atau basi karena kesalahan simpan di pihak pembeli, ubah status menjadi `REJECTED`.")
    add_numbered_item(doc, "4.", "Jika statusnya `ACCEPTED`, sistem otomatis menambah kembali stok fisik gudang dan modul Invoicing otomatis menerbitkan **Nota Kredit (Credit Note)** yang mengurangi jumlah piutang pelanggan secara seimbang dan benar.")

    # 4.5 ALUR AKUNTANSI MANUAL
    add_heading_styled(doc, "Alur 5: Pembukuan & Pencatatan Biaya Operasional (Finance)", level=2)
    add_p(doc, 
        "Sebagian besar pencatatan pembukuan (jurnal) berjalan otomatis saat transaksi operasional divalidasi. "
        "Namun, untuk biaya pengeluaran umum kantor (seperti bayar listrik PLN, internet kantor, atau beli air galon), "
        "staf keuangan dapat menginput jurnal umum secara manual:"
    )
    add_numbered_item(doc, "Langkah 1 (Membuat Akun Beban Baru jika Belum Ada):", "Buka menu Data Master > Chart of Accounts. Klik tombol '+ Tambah Chart of Accounts'. Isi Kode Unik: `5020`, Nama Akun: `Beban Listrik & Air`, Tipe Akun: `EXPENSE`. Klik Simpan. Akun baru langsung terdaftar dengan saldo awal Rp0.")
    add_numbered_item(doc, "Langkah 2 (Membuka Formulir Jurnal Umum):", "Buka menu Keuangan > Buku Besar & Jurnal > klik '+ Jurnal Umum Baru'.")
    add_numbered_item(doc, "Langkah 3 (Mengisi Baris Debit dan Kredit):", "Pada Baris 1: pilih akun `5020 Beban Listrik & Air`, masukkan di kolom **Debit** sebesar `Rp250.000`. Pada Baris 2: pilih akun `1010 Kas & Bank BCA`, masukkan di kolom **Kredit** sebesar `Rp250.000`.")
    add_numbered_item(doc, "Langkah 4 (Memeriksa Keseimbangan & Posting):", "Ketik keterangan referensi: 'Pembayaran Tagihan Listrik PLN Bulan Ini'. Perhatikan kotak status di bawah tabel yang harus bertuliskan **Status: Seimbang (Selisih: Rp0)**. Klik tombol ungu **Posting Jurnal**. Jurnal resmi tercatat di Buku Besar, saldo beban bertambah Rp250.000, dan saldo rekening Kas/Bank BCA berkurang Rp250.000 secara otomatis!")

    # 4.6 ALUR OWNER
    add_heading_styled(doc, "Alur 6: Pengawasan Bisnis oleh Pemilik Perusahaan (Owner Monitoring)", level=2)
    add_p(doc, 
        "Sebagai pemilik bisnis atau direktur operasional (Owner), Anda memegang kendali tertinggi atas kelangsungan usaha:"
    )
    add_numbered_item(doc, "1. Memantau Kinerja di Dashboard:", "Login sebagai akun `OWNER`. Buka Dashboard untuk melihat ringkasan omzet harian, sisa tagihan piutang pelanggan korporat yang belum tertagih, dan valuasi total nilai barang di gudang.")
    add_numbered_item(doc, "2. Memeriksa Integritas Rekonsiliasi (Audit Check):", "Lihat panel Rekonsiliasi Persediaan. Pastikan kotak berlampu hijau bertuliskan **MATCHED**. Ini adalah garansi matematis bahwa tidak ada kebocoran barang atau manipulasi pembukuan di dapur maupun di gudang.")
    add_numbered_item(doc, "3. Menyetujui Diskon Penjualan Khusus:", "Buka modul Sales. Jika ada pesanan katering partai besar yang diajukan dengan diskon di atas 10% (misal diskon 12% untuk pesanan 1.000 porsi kantor kementerian), telusuri dokumen penawaran tersebut, lalu klik tombol **Approve Diskon** agar tim sales dapat melanjutkan pencetakan surat jalan pengiriman.")

    # -------------------------------------------------------------
    # 7. BAB 5: GLOSARIUM ISTILAH ERP & FAQ
    # -------------------------------------------------------------
    add_heading_styled(doc, "BAB 5: GLOSARIUM ISTILAH ERP & SOLUSI KENDALA (FAQ)", level=1)
    
    add_heading_styled(doc, "5.1 Glosarium 16 Istilah Bisnis ERP Bahasa Awam", level=2)
    add_p(doc, 
        "Bagi pengguna awam, beberapa istilah bahasa Inggris atau singkatan akuntansi mungkin terdengar asing. "
        "Berikut adalah kamus ringkas penjelasannya:"
    )
    
    gloss_headers = ["Istilah / Singkatan", "Arti Bahasa Sederhana", "Contoh Nyata di Restoran / Katering"]
    gloss_rows = [
        ["Quotation", "Surat Penawaran Harga Sementara", "Brosur daftar harga resmi yang dikirim ke kantor calon pembeli sebelum mereka setuju membeli."],
        ["Sales Order (SO)", "Surat Pesanan Penjualan Resmi", "Surat kesepakatan jual beli setelah pembeli menyetujui penawaran harga."],
        ["Purchase Order (PO)", "Surat Pesanan Pembelian ke Supplier", "Surat order belanja dari restoran ke pemasok daging ayam atau pemasok biji kopi."],
        ["Delivery Order (DO) / Surat Jalan", "Surat Pengantar Barang", "Kertas surat jalan yang dibawa sopir mobil boks saat mengantar 100 kotak nasi ke kantor pemesan."],
        ["Backorder", "Dokumen Pengiriman Susulan", "Jika pesan 10 porsi tapi baru dikirim 7 porsi, dokumen backorder dibuat untuk mengirim 3 porsi sisanya nanti."],
        ["Goods Receipt (GR)", "Bukti Penerimaan Barang Masuk", "Catatan saat bahan makanan dari supplier dibongkar di pintu gudang."],
        ["Three-Way Matching", "Sistem Pencocokan 3 Dokumen", "Mencocokkan PO, Surat Penerimaan Gudang, dan Tagihan Vendor agar perusahaan tidak pernah membayar barang rusak."],
        ["Invoice", "Faktur Tagihan ke Pembeli", "Kertas tagihan resmi yang dikirim ke pelanggan agar mereka mentransfer uang pembayaran."],
        ["Vendor Bill", "Tagihan dari Pemasok", "Kuitansi tagihan yang dikirim oleh pemasok daging/sayur kepada kita."],
        ["Credit Note", "Nota Pengurang Piutang / Pengembalian", "Kertas bukti bahwa tagihan pelanggan dipotong karena ada makanan yang dikembalikan."],
        ["On-Hand Stock", "Stok Fisik di Rak Gudang", "Jumlah nyata barang yang ada di rak saat dihitung oleh mata manusia."],
        ["Reserved Stock", "Stok Terkunci / Terpesan", "Barang di rak yang sudah dibeli pelanggan katering dan dilarang dijual oleh kasir."],
        ["Available Stock", "Stok Bebas yang Siap Dijual", "Rumusnya: Stok Fisik dikurangi Stok Terkunci (`On-Hand - Reserved`)."],
        ["PBJT 10%", "Pajak Restoran 10%", "Pajak Barang dan Jasa Tertentu sebesar 10% atas makanan dan minuman yang disetor ke kas daerah."],
        ["COGS / HPP", "Harga Pokok Penjualan", "Biaya modal belanja bahan baku untuk membuat satu porsi makanan."],
        ["Double-Entry", "Pembukuan Berpasangan Seimbang", "Metode akuntansi di mana setiap pengeluaran dan pemasukan memiliki sisi Debit dan Kredit yang harus selalu seimbang."]
    ]
    add_styled_table(doc, gloss_headers, gloss_rows, [Inches(1.5), Inches(2.2), Inches(3.1)])

    add_heading_styled(doc, "5.2 Tanya Jawab Praktis Pemecahan Masalah (Troubleshooting FAQ)", level=2)
    add_p(doc, 
        "Berikut adalah rangkuman masalah umum yang sering dihadapi pengguna pemula dan cara mengatasinya:"
    )
    
    faq_list = [
        ("Tanya: Mengapa tombol 'Konfirmasi Pesanan' di menu Sales Order terkunci atau berwarna merah?",
         "Jawab: Ada dua kemungkinan penyebab. Pertama: Anda memasukkan diskon di atas 10% sehingga sistem mewajibkan persetujuan (*approval*) dari akun Owner terlebih dahulu. Kedua: total nilai belanja pelanggan tersebut melebihi sisa batas limit kredit yang dimilikinya. Hubungi Owner untuk menaikkan limit kredit atau menyetujui diskon."),
        
        ("Tanya: Mengapa kasir di gerai CAFE-JKT tidak bisa menjual menu Ice Latte, padahal di Gudang Pusat (WH-JKT) stoknya masih ada ratusan cup?",
         "Jawab: Sistem menerapkan aturan ketat pemisahan lokasi (SR-03). Kasir hanya berhak memotong stok yang ada di dapur gerai `CAFE-JKT`. Untuk mengatasinya, minta staf gudang melakukan 'Transfer Internal' dari `WH-JKT` ke `CAFE-JKT` melalui modul Inventory."),
        
        ("Tanya: Apa yang harus saya lakukan jika ada menu baru yang belum pernah didaftarkan di sistem?",
         "Jawab: Berkat fitur cerdas Auto-Provisioning, Anda tidak perlu panik. Anda cukup mengetikkan nama menu baru tersebut di formulir pesanan atau di kasir. Sistem secara otomatis membuatkan kode SKU unik, mengisi master produk, dan menyiapkan stok awal tanpa hambatan."),
        
        ("Tanya: Mengapa akun Kasir saya tidak bisa melihat menu Buku Besar dan Jurnal Umum Akuntansi?",
         "Jawab: Hal ini disengaja oleh sistem demi kepatuhan aturan keamanan perbankan dan integritas data (SR-15). Kasir hanya berwenang mencatat penjualan gerai dan dilarang melihat buku besar akuntansi. Jika Anda membutuhkan akses tersebut, gunakan akun role `FINANCE` atau `OWNER`."),
        
        ("Tanya: Bagaimana jika supplier mengirim bahan makanan namun beberapa bungkus rusak atau busuk?",
         "Jawab: Pada saat staf gudang memvalidasi formulir 'Penerimaan Barang' (Goods Receipt), masukkan jumlah barang yang rusak pada kolom 'Ditolak (Rejected)' dan isi alasannya. Fitur Three-Way Match sistem secara otomatis akan memblokir supplier tersebut agar tidak bisa menagihkan barang yang rusak!"),
        
        ("Tanya: Saya tidak sengaja mengklik tombol 'Konfirmasi' atau 'Posting' dua kali karena internet lelet, apakah dokumennya akan terduplikasi?",
         "Jawab: Tidak akan terduplikasi. Sistem ERP Rasa Aruna Kitchen dilengkapi mekanisme keamanan **Idempotensi (SR-13)**. Berapa kali pun Anda mengklik tombol tersebut, sistem hanya akan memprosesnya satu kali saja. Saldo keuangan dan stok gudang dijamin 100% aman dan tidak akan berlipat ganda.")
    ]
    
    for q, a in faq_list:
        add_p(doc, f"**{q}**", space_after=2)
        add_p(doc, a, space_after=4)

    # -------------------------------------------------------------
    # 8. BAB 6: KESIMPULAN & TIPS SUKSES
    # -------------------------------------------------------------
    add_heading_styled(doc, "BAB 6: KESIMPULAN & TIPS SUKSES IMPLEMENTASI SISTEM", level=1)
    
    add_heading_styled(doc, "6.1 Nilai Tambah Penggunaan Sistem Terpadu", level=2)
    add_p(doc, 
        "Penerapan sistem ERP Rasa Aruna Kitchen membawa perubahan fundamental bagi kelancaran operasional PT Rasa Aruna Bersama:"
    )
    add_bullet(doc, "Seluruh jajaran tim—dari kasir di meja depan hingga akuntan di kantor pusat—bekerja dengan satu sumber kebenaran data (*Single Source of Truth*).", bold_prefix="1. Transparansi & Integrasi Total:")
    add_bullet(doc, "Tidak ada lagi perselisihan antara kasir gerai dan manajer katering karena stok reservasi terkunci otomatis oleh sistem.", bold_prefix="2. Hilangnya Bentrok Operasional:")
    add_bullet(doc, "Perusahaan terlindungi dari kerugian akibat membayar bahan baku rusak atau mengirim tagihan ganda ke pembeli.", bold_prefix="3. Pengendalian Finansial Ketat:")
    add_bullet(doc, "Laporan keuangan (Neraca, Laba Rugi, Valuasi Stok) tersusun secara otomatis setiap detik tanpa harus menunggu penutupan buku akhir bulan yang melelahkan.", bold_prefix="4. Kecepatan Keputusan Bisnis:")

    add_heading_styled(doc, "6.2 Rekomendasi Disiplin Kerja Harian", level=2)
    add_p(doc, 
        "Sebagus apa pun sebuah sistem perangkat lunak, keberhasilannya sangat ditentukan oleh kedisiplinan manusia yang mengoperasikannya. "
        "Berikut adalah 4 tips emas bagi seluruh staf pengguna aplikasi:"
    )
    add_numbered_item(doc, "1. Input Transaksi Detik Itu Juga (*Real-Time Input*):", "Jangan menunda input transaksi ke sore atau esok hari. Saat barang keluar, langsung buat surat jalan; saat uang diterima, langsung catat pembayaran.")
    add_numbered_item(doc, "2. Teliti Sebelum Memvalidasi:", "Periksa kembali kuantitas fisik sebelum menekan tombol Validasi Penerimaan atau Validasi Pengiriman.")
    add_numbered_item(doc, "3. Disiplin Buka dan Tutup Kasir:", "Kasir wajib memasukkan uang kas laci secara jujur dan akurat saat penutupan sesi untuk mendeteksi selisih kas sejak dini.")
    add_numbered_item(doc, "4. Jaga Kerahasiaan Akun Login:", "Gunakan akun sesuai peran kerja Anda masing-masing dan selalu lakukan Logout setelah selesai bekerja.")

    # Tanda Tangan Penutup
    sp_end = doc.add_paragraph()
    sp_end.paragraph_format.space_before = Pt(12)
    sp_end.paragraph_format.space_after = Pt(2)
    render_inline(sp_end, "Jakarta, November 2026", default_color=COLOR_MUTED, font_size=Pt(9.5), default_italic=True)
    
    p_sign = doc.add_paragraph()
    p_sign.paragraph_format.space_before = Pt(2)
    p_sign.paragraph_format.space_after = Pt(0)
    render_inline(p_sign, "**Tim Rekayasa Sistem ERP & Manajemen Operasional**\nPT Rasa Aruna Bersama (Rasa Aruna Kitchen)", default_color=COLOR_PRIMARY, font_size=Pt(10))

    # -------------------------------------------------------------
    # SIMPAN KE DUA LOKASI (OUTPUT DAN WORKSPACE ROOT)
    # -------------------------------------------------------------
    output_dir = os.path.join(base_dir, "..", "output")
    os.makedirs(output_dir, exist_ok=True)
    out_path_1 = os.path.join(output_dir, "Panduan_Fitur_dan_Alur_Penggunaan_ERP_Rasa_Aruna.docx")
    out_path_2 = os.path.join(base_dir, "..", "Panduan_Fitur_dan_Alur_Penggunaan_ERP.docx")
    
    doc.save(out_path_1)
    doc.save(out_path_2)
    
    print(f"File berhasil dibuat dan disimpan di:\n1. {os.path.abspath(out_path_1)}\n2. {os.path.abspath(out_path_2)}")

if __name__ == "__main__":
    generate_document()
