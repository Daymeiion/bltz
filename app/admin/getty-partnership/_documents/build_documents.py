"""Generate matching single-page PDFs from the actual React SVG meeting maps.

Requires Node with the repository dependencies, Python reportlab, svglib, pypdf,
and Windows Arial fonts. Optionally set PYTHONPATH to output/getty-pdf-dependencies.
"""
import json
import subprocess
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg
from svglib.fonts import register_font
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
DATA = json.loads((HERE.parent / "meeting-content.json").read_text(encoding="utf-8"))
FONT_DIR = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Arial", str(FONT_DIR / "arial.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONT_DIR / "arialbd.ttf")))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold")
register_font("Arial", rlgFontName="Arial")
register_font("Arial", weight="bold", rlgFontName="Arial-Bold")

if __name__ == "__main__":
    temporary = Path(subprocess.check_output(["node", str(HERE / "render_diagrams.mjs")], text=True).strip())
    for view, filename, title in [
        ("pilot", "getty-one-sheet.pdf", DATA["pilotTitle"]),
        ("workflow", "getty-image-workflow.pdf", DATA["workflowTitle"]),
    ]:
        drawing = svg2rlg(str(temporary / f"{view}.svg"))
        drawing.scale(1280 / drawing.width, 790 / drawing.height)
        drawing.width, drawing.height = 1280, 790
        target = HERE / filename
        pdf = canvas.Canvas(str(target), pagesize=(1280, 790))
        pdf.setTitle("BLTZ Ã— Getty Images - " + title)
        pdf.setAuthor("BLTZ")
        pdf.setFillColor(HexColor("#090b10"))
        pdf.rect(0, 0, 1280, 790, stroke=0, fill=1)
        renderPDF.draw(drawing, pdf, 0, 0)
        pdf.showPage()
        pdf.save()
        reader = PdfReader(target)
        assert len(reader.pages) == 1
        text = " ".join(reader.pages[0].extract_text().split())
        for required in [title, "Tinybird + QStash", "Getty provides", "BLTZ runs", "50 players", "Editorial", "Podcast", "Print on demand"]:
            assert required in text, (filename, required)
        print(f"{filename}: 1 page, {len(text.split())} visible words")
