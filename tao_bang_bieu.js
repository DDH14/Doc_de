# tao_bang_bieu.py
# Tạo file Word các bảng mẫu Chương III (cỡ chữ 14, giãn dòng 1.5)
# Yêu cầu: pip install python-docx

from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.enum.table import WD_TABLE_ALIGNMENT

OUTPUT_FILE = "Bang_Chuong_III.docx"

def set_base_style(doc: Document, font_name="Times New Roman", font_size_pt=14, line_spacing=1.5):
    # Cỡ chữ & phông mặc định
    style = doc.styles["Normal"]
    style.font.name = font_name
    style.font.size = Pt(font_size_pt)
    # Thiết lập East Asia font để hiển thị tiếng Việt chuẩn
    style._element.rPr.rFonts.set(qn('w:eastAsia'), font_name)
    # Giãn dòng
    pf = style.paragraph_format
    pf.line_spacing = line_spacing
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)

def set_page_margins(doc: Document, inches=1.0):
    for section in doc.sections:
        section.top_margin = Inches(inches)
        section.bottom_margin = Inches(inches)
        section.left_margin = Inches(inches)
        section.right_margin = Inches(inches)

def bold_cell(cell):
    for p in cell.paragraphs:
        for r in p.runs:
            r.bold = True

def center_cell(cell):
    for p in cell.paragraphs:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER

def apply_table_style(table):
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Áp giãn dòng 1.5 cho các đoạn trong bảng
    for row in table.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                pf = p.paragraph_format
                pf.line_spacing = 1.5
                pf.space_before = Pt(0)
                pf.space_after = Pt(0)

def add_title(doc):
    p = doc.add_paragraph("BỘ BẢNG CHƯƠNG III – THỰC NGHIỆM")
    for run in p.runs:
        run.bold = True
        run.font.size = Pt(16)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER

def add_note(doc):
    doc.add_paragraph("Ghi chú: Điền số liệu thực tế vào các ô [ … ].")

def add_heading(doc, text):
    p = doc.add_paragraph(text)
    for r in p.runs:
        r.bold = True

def add_bang_3_1(doc):
    add_heading(doc, "Bảng 3.1. Mô tả mẫu và bối cảnh")
    table = doc.add_table(rows=1, cols=3)
    apply_table_style(table)
    hdr = table.rows[0].cells
    hdr[0].text = "Nhóm/Chỉ số"
    hdr[1].text = "Giá trị"
    hdr[2].text = "Ghi chú"
    for c in hdr:
        bold_cell(c)
        center_cell(c)

    rows = [
        ("Chuyên gia – Tổng số (N)", "[ … ]", ""),
        ("Chuyên gia – Kinh nghiệm (năm) TB", "[ … ]  |  Min–Max: [ … – … ]", ""),
        ("Chuyên gia – Chuyên môn", "GV Tiểu học [ … ]% • SLP [ … ]% • Âm vị học [ … ]%", ""),
        ("Phụ huynh – Tổng số (N)", "[ … ]", ""),
        ("Phụ huynh – Số phiên con tham gia (TB)", "[ … ]  |  Min–Max: [ … – … ]", ""),
        ("Học sinh – Tổng số (N)", "[ … ]", ""),
        ("Học sinh – Tuổi (TB)", "[ … ]  |  Min–Max: [ … – … ]", ""),
        ("Học sinh – Lớp/Khối", "Lớp 1 [ … ]% • Lớp 2 [ … ]% • Lớp 3 [ … ]% • Lớp 4 [ … ]% • Lớp 5 [ … ]%", "Điều chỉnh theo thực tế"),
        ("Học sinh – Giới", "Nam [ … ]% • Nữ [ … ]% • Khác [ … ]%", ""),
        ("Sàng lọc/chẩn đoán khó đọc", "Có [ … ]% • Nghi ngờ [ … ]% • Chưa [ … ]%", ""),
        ("Thiết bị sử dụng", "Android [ … ]% • iOS [ … ]% • Khác [ … ]%", ""),
        ("Chế độ hiển thị", "Bình thường [ … ]% • Dễ đọc [ … ]% • Tương phản cao [ … ]%", ""),
        ("Bối cảnh triển khai", "Trường/lớp [ … ]% • Tại nhà [ … ]% • Trung tâm [ … ]%", ""),
    ]
    for r in rows:
        row_cells = table.add_row().cells
        row_cells[0].text = r[0]
        row_cells[1].text = r[1]
        row_cells[2].text = r[2]

def add_bang_3_2(doc):
    add_heading(doc, "Bảng 3.2. Thời lượng phiên và theo mô-đun")
    table = doc.add_table(rows=1, cols=5)
    apply_table_style(table)
    hdr = table.rows[0].cells
    hdr_labels = ["Chỉ số", "TB", "SD", "Min", "Max"]
    for i, label in enumerate(hdr_labels):
        hdr[i].text = label
        bold_cell(hdr[i])
        center_cell(hdr[i])

    rows = [
        ("Thời lượng phiên (phút)", "[ … ]", "[ … ]", "[ … ]", "[ … ]"),
        ("PA (phút)", "[ … ]", "[ … ]", "[ … ]", "[ … ]"),
        ("Cards (phút)", "[ … ]", "[ … ]", "[ … ]", "[ … ]"),
        ("Reading (phút)", "[ … ]", "[ … ]", "[ … ]", "[ … ]"),
        ("Game (phút, nếu có)", "[ … ]", "[ … ]", "[ … ]", "[ … ]"),
    ]
    for r in rows:
        row_cells = table.add_row().cells
        for i in range(5):
            row_cells[i].text = r[i]

def add_bang_3_3(doc):
    add_heading(doc, "Bảng 3.3. Tóm tắt đánh giá của Chuyên gia theo nhóm tiêu chí (Likert 1–5)")
    table = doc.add_table(rows=1, cols=6)
    apply_table_style(table)
    hdr_labels = ["Nhóm", "Nội dung gộp", "Mục (số)", "TB", "SD", "%≥4"]
    for i, label in enumerate(hdr_labels):
        table.rows[0].cells[i].text = label
        bold_cell(table.rows[0].cells[i])
        center_cell(table.rows[0].cells[i])

    rows = [
        ("A", "Sư phạm & nội dung", "1–6", "[ … ]", "[ … ]", "[ … ]%"),
        ("B", "Âm thanh & thanh điệu", "7–12", "[ … ]", "[ … ]", "[ … ]%"),
        ("C", "Giao diện & khả dụng", "13–21", "[ … ]", "[ … ]", "[ … ]%"),
        ("D", "Công cụ hỗ trợ đọc", "22–27", "[ … ]", "[ … ]", "[ … ]%"),
        ("E", "An toàn & hiển thị TV", "28–32", "[ … ]", "[ … ]", "[ … ]%"),
    ]
    for r in rows:
        rc = table.add_row().cells
        for i in range(6):
            rc[i].text = r[i]

def add_bang_3_3b(doc):
    add_heading(doc, "Bảng 3.3b. Chuyên gia – Hạng mục điểm cao/thấp nhất")
    table = doc.add_table(rows=1, cols=5)
    apply_table_style(table)
    hdr_labels = ["Nhóm", "Mục số", "Tên rút gọn hạng mục", "TB", "%≥4"]
    for i, label in enumerate(hdr_labels):
        table.rows[0].cells[i].text = label
        bold_cell(table.rows[0].cells[i])
        center_cell(table.rows[0].cells[i])

    labels = ["Cao 1", "Cao 2", "Cao 3", "Thấp 1", "Thấp 2", "Thấp 3"]
    for lb in labels:
        rc = table.add_row().cells
        rc[0].text = lb
        rc[1].text = "[ … ]"
        rc[2].text = "[ … ]"
        rc[3].text = "[ … ]"
        rc[4].text = "[ … ]%"

def add_bang_3_4(doc):
    add_heading(doc, "Bảng 3.4. Tóm tắt đánh giá của Phụ huynh theo nhóm tiêu chí (Likert 1–5)")
    table = doc.add_table(rows=1, cols=6)
    apply_table_style(table)
    hdr_labels = ["Nhóm", "Nội dung gộp", "Mục (số)", "TB", "SD", "%≥4"]
    for i, label in enumerate(hdr_labels):
        table.rows[0].cells[i].text = label
        bold_cell(table.rows[0].cells[i])
        center_cell(table.rows[0].cells[i])

    rows = [
        ("P1", "Âm thanh/Hiển thị", "1–3, 10–13", "[ … ]", "[ … ]", "[ … ]%"),
        ("P2", "Trải nghiệm & tự tin", "4–6, 16–18", "[ … ]", "[ … ]", "[ … ]%"),
        ("P3", "Dễ dùng & hướng dẫn", "7–9, 14–15", "[ … ]", "[ … ]", "[ … ]%"),
        ("P4", "Quyền riêng tư & đồng bộ", "19–27", "[ … ]", "[ … ]", "[ … ]%"),
        ("P5", "Hấp dẫn & ý định dùng", "28–33", "[ … ]", "[ … ]", "[ … ]%"),
    ]
    for r in rows:
        rc = table.add_row().cells
        for i in range(6):
            rc[i].text = r[i]

def add_bang_3_4b(doc):
    add_heading(doc, "Bảng 3.4b. Phụ huynh – Hạng mục điểm cao/thấp nhất")
    table = doc.add_table(rows=1, cols=5)
    apply_table_style(table)
    hdr_labels = ["Nhóm", "Mục số", "Tên rút gọn hạng mục", "TB", "%≥4"]
    for i, label in enumerate(hdr_labels):
        table.rows[0].cells[i].text = label
        bold_cell(table.rows[0].cells[i])
        center_cell(table.rows[0].cells[i])

    labels = ["Cao 1", "Cao 2", "Cao 3", "Thấp 1", "Thấp 2", "Thấp 3"]
    for lb in labels:
        rc = table.add_row().cells
        rc[0].text = lb
        rc[1].text = "[ … ]"
        rc[2].text = "[ … ]"
        rc[3].text = "[ … ]"
        rc[4].text = "[ … ]%"

def add_bang_3_5(doc):
    add_heading(doc, "Bảng 3.5. Tóm tắt đánh giá của Học sinh (mặt cười 1–5)")
    table = doc.add_table(rows=1, cols=6)
    apply_table_style(table)
    hdr_labels = ["Nhóm", "Nội dung gộp", "Mục (số)", "TB", "SD", "%🙂/😄"]
    for i, label in enumerate(hdr_labels):
        table.rows[0].cells[i].text = label
        bold_cell(table.rows[0].cells[i])
        center_cell(table.rows[0].cells[i])

    rows = [
        ("HS1", "Dễ dùng & UI", "1–3", "[ … ]", "[ … ]", "[ … ]%"),
        ("HS2", "Màu dấu & emoji", "4–5", "[ … ]", "[ … ]", "[ … ]%"),
        ("HS3", "Hứng thú theo mô-đun", "6–9", "[ … ]", "[ … ]", "[ … ]%"),
        ("HS4", "Ý định quay lại", "10", "[ … ]", "[ … ]", "[ … ]%"),
    ]
    for r in rows:
        rc = table.add_row().cells
        for i in range(6):
            rc[i].text = r[i]

def add_bang_3_5b(doc):
    add_heading(doc, "Bảng 3.5b. Học sinh – Tỉ lệ 🙂/😄 cao theo từng mục")
    table = doc.add_table(rows=1, cols=3)
    apply_table_style(table)
    hdr_labels = ["Mục số", "Câu hỏi (rút gọn)", "%🙂/😄"]
    for i, label in enumerate(hdr_labels):
        table.rows[0].cells[i].text = label
        bold_cell(table.rows[0].cells[i])
        center_cell(table.rows[0].cells[i])
    # 3 hàng trống mặc định
    for _ in range(3):
        rc = table.add_row().cells
        rc[0].text = "[ … ]"
        rc[1].text = "[ … ]"
        rc[2].text = "[ … ]%"

def add_bang_3_6(doc):
    add_heading(doc, "Bảng 3.6. Quan sát thao tác và hành vi (mỗi phiên)")
    table = doc.add_table(rows=1, cols=5)
    apply_table_style(table)
    hdr_labels = ["Chỉ số", "TB", "SD", "Min", "Max"]
    for i, label in enumerate(hdr_labels):
        table.rows[0].cells[i].text = label
        bold_cell(table.rows[0].cells[i])
        center_cell(table.rows[0].cells[i])

    rows = [
        ("Bấm nhầm/phút", "[ … ]", "[ … ]", "[ … ]", "[ … ]"),
        ("Trợ giúp kỹ thuật/phiên", "[ … ]", "[ … ]", "[ … ]", "[ … ]"),
        ("Yêu cầu “nghe chậm”/phiên", "[ … ]", "[ … ]", "[ … ]", "[ … ]"),
        ("Tạm dừng vì mệt/phiên", "[ … ]", "[ … ]", "[ … ]", "[ … ]"),
    ]
    for r in rows:
        rc = table.add_row().cells
        for i in range(5):
            rc[i].text = r[i]

def add_bang_3_6b(doc):
    add_heading(doc, "Bảng 3.6b. Quan sát – Mức hứng thú và mệt mỏi")
    table = doc.add_table(rows=1, cols=4)
    apply_table_style(table)
    hdr_labels = ["Chỉ dấu", "Mức", "Số phiên", "Tỉ lệ (%)"]
    for i, label in enumerate(hdr_labels):
        table.rows[0].cells[i].text = label
        bold_cell(table.rows[0].cells[i])
        center_cell(table.rows[0].cells[i])

    # Hứng thú (Thấp/Vừa/Cao)
    for level in ["Thấp", "Vừa", "Cao"]:
        rc = table.add_row().cells
        rc[0].text = "Hứng thú"
        rc[1].text = level
        rc[2].text = "[ … ]"
        rc[3].text = "[ … ]%"

    # Mệt mỏi (Không/Có – nhẹ/Có – rõ)
    for level in ["Không", "Có – nhẹ", "Có – rõ"]:
        rc = table.add_row().cells
        rc[0].text = "Mệt mỏi"
        rc[1].text = level
        rc[2].text = "[ … ]"
        rc[3].text = "[ … ]%"

def add_bang_3_7(doc):
    add_heading(doc, "Bảng 3.7. Chỉ số đọc to (ORF) và lỗi theo nhãn")

    # ORF trước/sau
    table1 = doc.add_table(rows=1, cols=4)
    apply_table_style(table1)
    hdr1 = ["Chỉ số", "Trước", "Sau", "Chênh lệch (∆)"]
    for i, lb in enumerate(hdr1):
        table1.rows[0].cells[i].text = lb
        bold_cell(table1.rows[0].cells[i])
        center_cell(table1.rows[0].cells[i])

    rows1 = [
        ("WCPM (từ đúng/phút)", "[ … ]", "[ … ]", "[ … ]"),
        ("% chính xác", "[ … ]%", "[ … ]%", "[ … ]"),
    ]
    for r in rows1:
        rc = table1.add_row().cells
        rc[0].text = r[0]; rc[1].text = r[1]; rc[2].text = r[2]; rc[3].text = r[3]

    # Lỗi theo tag
    table2 = doc.add_table(rows=1, cols=4)
    apply_table_style(table2)
    hdr2 = ["Lỗi theo tag", "Tỉ trọng trước (%)", "Tỉ trọng sau (%)", "Chênh lệch (điểm %)"]
    for i, lb in enumerate(hdr2):
        table2.rows[0].cells[i].text = lb
        bold_cell(table2.rows[0].cells[i])
        center_cell(table2.rows[0].cells[i])

    tags = ["tone (thanh điệu)", "s/x", "ch/tr", "n/l", "ng/ngh", "g/gh", "c/k/qu", "omission", "insertion"]
    for t in tags:
        rc = table2.add_row().cells
        rc[0].text = t
        rc[1].text = "[ … ]"
        rc[2].text = "[ … ]"
        rc[3].text = "[ … ]"

def add_bang_3_8(doc):
    add_heading(doc, "Bảng 3.8. Chỉ số PA và Cards (SRS)")

    # PA
    table1 = doc.add_table(rows=1, cols=2)
    apply_table_style(table1)
    hdr1 = ["PA – Chỉ số", "Giá trị"]
    for i, lb in enumerate(hdr1):
        table1.rows[0].cells[i].text = lb
        bold_cell(table1.rows[0].cells[i])
        center_cell(table1.rows[0].cells[i])

    rows1 = [
        ("% đúng – Segment", "[ … ]%"),
        ("% đúng – Tone", "[ … ]%"),
        ("% đúng – Pair", "[ … ]%"),
        ("RT trung vị – Segment (ms)", "[ … ]"),
        ("RT trung vị – Tone (ms)", "[ … ]"),
        ("RT trung vị – Pair (ms)", "[ … ]"),
    ]
    for r in rows1:
        rc = table1.add_row().cells
        rc[0].text = r[0]; rc[1].text = r[1]

    # Cards (SRS)
    table2 = doc.add_table(rows=1, cols=2)
    apply_table_style(table2)
    hdr2 = ["Cards (SRS) – Chỉ số", "Giá trị"]
    for i, lb in enumerate(hdr2):
        table2.rows[0].cells[i].text = lb
        bold_cell(table2.rows[0].cells[i])
        center_cell(table2.rows[0].cells[i])

    rows2 = [
        ('Số thẻ "đã vững" (I ≥ 14 ngày)', "[ … ]"),
        ("Due completion rate (%)", "[ … ]%"),
        ("Phân bố chất lượng Q (Dễ/Vừa/Khó)", "Dễ [ … ]% • Vừa [ … ]% • Khó [ … ]%"),
    ]
    for r in rows2:
        rc = table2.add_row().cells
        rc[0].text = r[0]; rc[1].text = r[1]

def add_bang_3_9(doc):
    add_heading(doc, "Bảng 3.9. Chỉ số Game (nếu có chơi)")
    table = doc.add_table(rows=1, cols=2)
    apply_table_style(table)
    hdr = ["Chỉ số", "Giá trị"]
    for i, lb in enumerate(hdr):
        table.rows[0].cells[i].text = lb
        bold_cell(table.rows[0].cells[i])
        center_cell(table.rows[0].cells[i])

    rows = [
        ("Accuracy (% đúng)", "[ … ]%"),
        ("Listens per hit (lần nghe/trúng)", "[ … ]"),
        ("Best combo (chuỗi tốt nhất)", "[ … ]"),
    ]
    for r in rows:
        rc = table.add_row().cells
        rc[0].text = r[0]; rc[1].text = r[1]

def add_bang_3_10(doc):
    add_heading(doc, "Bảng 3.10. Tỉ lệ hoàn thành phiếu")
    table = doc.add_table(rows=1, cols=4)
    apply_table_style(table)
    hdr = ["Loại phiếu", "Phát ra (n)", "Thu về (n)", "Tỉ lệ (%)"]
    for i, lb in enumerate(hdr):
        table.rows[0].cells[i].text = lb
        bold_cell(table.rows[0].cells[i])
        center_cell(table.rows[0].cells[i])

    types = ["Chuyên gia", "Phụ huynh", "Học sinh", "Quan sát phiên"]
    for t in types:
        rc = table.add_row().cells
        rc[0].text = t
        rc[1].text = "[ … ]"
        rc[2].text = "[ … ]"
        rc[3].text = "[ … ]%"

def main():
    doc = Document()
    set_base_style(doc, font_name="Times New Roman", font_size_pt=14, line_spacing=1.5)
    set_page_margins(doc, inches=1.0)

    add_title(doc)
    add_note(doc)

    # Thêm các bảng
    add_bang_3_1(doc)
    doc.add_paragraph()  # khoảng trống
    add_bang_3_2(doc)
    doc.add_paragraph()
    add_bang_3_3(doc)
    doc.add_paragraph()
    add_bang_3_3b(doc)
    doc.add_paragraph()
    add_bang_3_4(doc)
    doc.add_paragraph()
    add_bang_3_4b(doc)
    doc.add_paragraph()
    add_bang_3_5(doc)
    doc.add_paragraph()
    add_bang_3_5b(doc)
    doc.add_paragraph()
    add_bang_3_6(doc)
    doc.add_paragraph()
    add_bang_3_6b(doc)
    doc.add_paragraph()
    add_bang_3_7(doc)
    doc.add_paragraph()
    add_bang_3_8(doc)
    doc.add_paragraph()
    add_bang_3_9(doc)
    doc.add_paragraph()
    add_bang_3_10(doc)

    # Ghi file
    doc.save(OUTPUT_FILE)
    print(f"Đã tạo file: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()