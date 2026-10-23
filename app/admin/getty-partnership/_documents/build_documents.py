"""Build the two private meeting PDFs from the same copy as the admin views.

Requires reportlab and pypdf. Run this file with Python; output stays beside it.
"""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
DATA = json.loads((HERE.parent / 'meeting-content.json').read_text(encoding='utf-8'))
FONT_DIR = Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('Arial', str(FONT_DIR / 'arial.ttf')))
pdfmetrics.registerFont(TTFont('Arial-Bold', str(FONT_DIR / 'arialbd.ttf')))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold')
W, H, M = 792, 612, 26
INK, MUTED, GOLD = '#152234', '#495565', '#ffbb00'
WIDTH = W - 2 * M


def paragraph(c, text, x, top, width, size=8.5, bold=False, color=INK, leading=None):
    p = Paragraph(text, ParagraphStyle('copy', fontName='Arial-Bold' if bold else 'Arial',
        fontSize=size, leading=leading or size * 1.25, textColor=HexColor(color)))
    _, height = p.wrap(width, H)
    p.drawOn(c, x, H - top - height)
    return height


def box(c, x, top, width, height, color):
    c.setFillColor(HexColor(color))
    c.rect(x, H - top - height, width, height, stroke=0, fill=1)


def line(c, top, color='#ced3d8', x=M, width=WIDTH):
    c.setStrokeColor(HexColor(color))
    c.setLineWidth(.6)
    c.line(x, H - top, x + width, H - top)


def header(c, workflow=False):
    c.setTitle('BLTZ × Getty Images — ' + ('Image workflow' if workflow else 'Visual one-sheet'))
    c.setAuthor('BLTZ')
    box(c, 0, 0, W, H, '#fafaf7')
    top = M
    paragraph(c, 'BLTZ × GETTY IMAGES / DISCUSSION PROPOSAL', M, top, WIDTH, 8, True, MUTED)
    top += 19
    title = DATA['workflowTitle'] if workflow else DATA['title']
    top += paragraph(c, escape(title), M, top, WIDTH, 23, True) + 8
    top += paragraph(c, escape(DATA['thesis']), M, top, WIDTH, 9, color=MUTED) + 8
    return top


def footer(c, top):
    top += 10
    line(c, top)
    end = top + 7 + paragraph(c, escape(DATA['note']), M, top + 7, WIDTH, 7.2, color=MUTED)
    if end > H - 16:
        raise ValueError(f'PDF overflow: content ends at {end:.1f}, page height {H}')
    c.showPage()
    c.save()


def one_sheet():
    path = HERE / 'getty-one-sheet.pdf'
    c = canvas.Canvas(str(path), pagesize=(W, H))
    top = header(c)
    box(c, M, top, WIDTH, 32, INK)
    box(c, M, top, 4, 32, GOLD)
    col = (WIDTH - 32) / 4
    for i, text in enumerate(DATA['flow']):
        paragraph(c, escape(text) + ('  →' if i < 3 else ''), M + 14 + i * col, top + 9, col - 10, 9, True, '#ffffff')
    top += 45
    paragraph(c, 'THREE PROPOSED USES / WHO BUYS / HOW GETTY EARNS', M, top, WIDTH, 8, True, MUTED)
    top += 16
    line(c, top, INK)
    for use in DATA['uses']:
        t = top + 10
        a = paragraph(c, use['id'] + ' / ' + escape(use['title']), M, t, 112, 11.5, True)
        x = M + 130
        b = paragraph(c, ' → '.join(escape(s) for s in use['steps']), x, t, 290, 9, True)
        b += 7 + paragraph(c, '<b>Potential buyer</b> ' + escape(use['buyer']), x, t + b + 7, 290, 8, color=MUTED)
        d = paragraph(c, escape(use['revenue']), M + 444, t, WIDTH - 444, 8.5)
        top = t + max(a, b, d) + 7
        line(c, top)
    top += 14
    pilot_top = top
    pilot = DATA['pilot']
    # Content below is measured before the background is drawn.
    # Header/scope occupy the left half; the right states the proposed boundaries.
    intro_height = max(36, Paragraph(escape(pilot['boundary']), ParagraphStyle('measure', fontName='Arial', fontSize=8, leading=10)).wrap(322, H)[1])
    pilot_height = 16 + intro_height + 12 + 20 + 12 + 33 + 5
    box(c, M, top, WIDTH, pilot_height, '#eef0eb')
    box(c, M, top, WIDTH, 3, GOLD)
    top += 13
    paragraph(c, escape(pilot['title']), M + 12, top, 360, 15, True)
    paragraph(c, escape(pilot['scope']), M + 12, top + 23, 365, 8.3, True)
    paragraph(c, escape(pilot['boundary']), M + 400, top + 1, WIDTH - 412, 8, color=MUTED)
    top += intro_height + 12
    line(c, top, '#cbd1cb', M + 12, WIDTH - 24)
    top += 7
    paragraph(c, escape(pilot['stages']), M + 12, top, WIDTH - 24, 8, True)
    top += 23
    metric_width = (WIDTH - 48) / 3
    for i, metric in enumerate(pilot['metrics']):
        x = M + 12 + i * (metric_width + 12)
        paragraph(c, metric['label'].upper(), x, top, metric_width, 8, True)
        paragraph(c, escape(metric['value']), x, top + 13, metric_width, 8, color=MUTED)
    top = pilot_top + pilot_height + 12
    paragraph(c, 'PLAYER VOICES / TO GATHER BEFORE THE FOLLOW-UP', M, top, WIDTH, 8, True, MUTED)
    top += 15
    quote_width = (WIDTH - 18) / 2
    for i, label in enumerate(DATA['quotes']):
        x = M + i * (quote_width + 18)
        c.setStrokeColor(HexColor('#9ba5ad'))
        c.setDash(2, 2)
        c.rect(x, H - top - 47, quote_width, 47, stroke=1, fill=0)
        c.setDash()
        paragraph(c, escape(label), x + 10, top + 7, quote_width - 20, 8, True)
        line(c, top + 30, x=x + 10, width=quote_width - 20)
        paragraph(c, 'Quote to add · Name / project / permission to quote', x + 10, top + 34, quote_width - 20, 7, color=MUTED)
    footer(c, top + 47)
    return path


def workflow():
    path = HERE / 'getty-image-workflow.pdf'
    c = canvas.Canvas(str(path), pagesize=(W, H))
    top = header(c, True)
    box(c, M, top, WIDTH, 98, INK)
    box(c, M, top, WIDTH, 3, GOLD)
    col = (WIDTH - 32) / 4
    for i, step in enumerate(DATA['workflowSteps']):
        x = M + 12 + i * col
        paragraph(c, f'0{i+1}', x, top + 12, col - 14, 8, True, GOLD)
        paragraph(c, escape(step['title']), x, top + 26, col - 14, 11, True, '#ffffff')
        paragraph(c, escape(step['body']), x, top + 44, col - 14, 8, color='#d3dce4')
    top += 112
    paragraph(c, 'ONE IMAGE / THREE POSSIBLE BRIEFS', M, top, WIDTH, 8, True, MUTED)
    top += 16
    line(c, top, INK)
    for use in DATA['uses']:
        t = top + 10
        a = paragraph(c, use['id'] + ' / ' + escape(use['title']), M, t, 210, 12, True)
        a += 6 + paragraph(c, escape(use['example']), M, t + a + 6, 210, 8.2, color=MUTED)
        a += 6 + paragraph(c, '<b>Potential buyer</b><br/>' + escape(use['buyer']), M, t + a + 6, 210, 8.2)
        x = M + 232
        b = paragraph(c, '<b>License brief + approval</b><br/>' + escape(use['approval']), x, t, 267, 8.2)
        b += 7 + paragraph(c, '<b>Getty revenue</b><br/>' + escape(use['revenue']), x, t + b + 7, 267, 8.2)
        d = paragraph(c, '<b>Attribution + tracking</b><br/>' + escape(use['track']), M + 522, t, WIDTH - 522, 8.2)
        top = t + max(a, b, d) + 7
        line(c, top)
    top += 12
    box(c, M, top, WIDTH, 60, '#eef0eb')
    paragraph(c, 'What the pilot asks of each side', M + 12, top + 9, WIDTH - 24, 11, True)
    paragraph(c, escape(DATA['pilot']['getty']), M + 12, top + 27, (WIDTH - 40) / 2, 8)
    paragraph(c, escape(DATA['pilot']['bltz']), M + 22 + (WIDTH - 40) / 2, top + 27, (WIDTH - 40) / 2, 8)
    footer(c, top + 60)
    return path


if __name__ == '__main__':
    for pdf in (one_sheet(), workflow()):
        reader = PdfReader(pdf)
        assert len(reader.pages) == 1, pdf
        text = ' '.join(reader.pages[0].extract_text().split())
        assert all(use['title'] in text for use in DATA['uses']), pdf
        print(f'{pdf.name}: 1 page, {len(text.split())} words')
