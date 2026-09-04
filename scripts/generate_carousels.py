#!/usr/bin/env python3
"""
Genere des carrousels Instagram/TikTok (1080x1350, format 4:5) a partir de
scripts/carousels_data.json.

Chaque carrousel = une liste de slides typees (cover, fact, stat, myth, list, cta),
rendues avec un systeme visuel coherent : couverture et CTA en navy dramatique,
slides de contenu en ivoire pour la lisibilite, une couleur d'accent par theme,
et des points de progression pour encourager le swipe complet.

Sortie : content/carousels/<theme-id>/slide-N.png (+ un zip par theme).
"""
import json
import os
import zipfile

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(ROOT, "scripts", "carousels_data.json")
OUT_DIR = os.path.join(ROOT, "content", "carousels")

W, H = 1080, 1350

FONT_SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
FONT_SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

NAVY = (11, 22, 40)
NAVY2 = (17, 36, 62)
IVORY = (247, 243, 234)
TEXT_NAVY = (22, 32, 50)
TEXT_MUTED_DARK = (108, 114, 128)
TEXT_MUTED_LIGHT = (176, 190, 214)
WHITE = (255, 255, 255)

MARGIN = 90


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def font(path, size):
    return ImageFont.truetype(path, size)


def navy_gradient():
    img = Image.new("RGB", (W, H), NAVY)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(NAVY[0] + (NAVY2[0] - NAVY[0]) * t)
        g = int(NAVY[1] + (NAVY2[1] - NAVY[1]) * t)
        b = int(NAVY[2] + (NAVY2[2] - NAVY[2]) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    return img


def measure(draw, text, fnt):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    return bbox[2] - bbox[0], bbox[3] - bbox[1], bbox[1]


def rich_wrap_paragraph(draw, text, highlight, fnt, max_width):
    """Wrap one paragraph into lines of (word, is_highlight) tuples."""
    words = text.split(" ")
    highlight_words = highlight.split(" ") if highlight else []

    tagged = []
    i = 0
    while i < len(words):
        if highlight_words and words[i:i + len(highlight_words)] == highlight_words:
            for w in highlight_words:
                tagged.append((w, True))
            i += len(highlight_words)
        else:
            tagged.append((words[i], False))
            i += 1

    # Glue lone punctuation to the previous word (nbsp) so it never wraps alone.
    merged = []
    for word, hl in tagged:
        if merged and word in ("?", "!", ":", ";"):
            prev_word, prev_hl = merged[-1]
            merged[-1] = (prev_word + " " + word, prev_hl)
        else:
            merged.append((word, hl))
    tagged = merged

    lines, cur = [], []
    for word, hl in tagged:
        trial = cur + [(word, hl)]
        trial_text = " ".join(w for w, _ in trial)
        w, _, _ = measure(draw, trial_text, fnt)
        if w <= max_width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = [(word, hl)]
    if cur:
        lines.append(cur)
    return lines


def draw_rich_text(draw, paragraphs, highlight, fnt, max_width, start_y, canvas_w,
                    normal_color, accent_color, align="left", line_spacing=1.18, para_gap=None,
                    left_x=MARGIN):
    y = start_y
    _, lh, top_off = measure(draw, "Ag", fnt)
    para_gap = para_gap if para_gap is not None else lh * 0.9

    for p_idx, para in enumerate(paragraphs):
        lines = rich_wrap_paragraph(draw, para, highlight, fnt, max_width)
        for line in lines:
            line_text = " ".join(w for w, _ in line)
            lw, _, _ = measure(draw, line_text, fnt)
            x = (canvas_w - lw) // 2 if align == "center" else left_x
            cx = x
            for word, hl in line:
                color = accent_color if hl else normal_color
                draw.text((cx, y - top_off), word, font=fnt, fill=color)
                ww, _, _ = measure(draw, word + " ", fnt)
                cx += ww
            y += int(lh * line_spacing)
        if p_idx < len(paragraphs) - 1:
            y += int(para_gap)
    return y


def eyebrow(draw, text, color, y, align="left", canvas_w=W):
    fnt = font(FONT_SANS_BOLD, 26)
    spaced = " ".join(list(text.upper())) if len(text) < 6 else text.upper()
    w, _, _ = measure(draw, text.upper(), fnt)
    x = (canvas_w - w) // 2 if align == "center" else MARGIN
    draw.text((x, y), text.upper(), font=fnt, fill=color)


def footer(draw, wordmark, sources, accent):
    fnt_word = font(FONT_SANS_BOLD, 24)
    fnt_src = font(FONT_SANS, 20)
    draw.text((MARGIN, H - 96), wordmark, font=fnt_word, fill=TEXT_MUTED_DARK)
    if sources:
        w, _, _ = measure(draw, sources, fnt_src)
        draw.text((W - MARGIN - w, H - 94), sources, font=fnt_src, fill=(150, 150, 145))


def progress_dots(draw, idx, total, accent):
    r = 6
    gap = 22
    total_w = total * (r * 2) + (total - 1) * gap
    x0 = (W - total_w) // 2
    y = H - 58
    for i in range(total):
        cx = x0 + i * (r * 2 + gap) + r
        if i == idx:
            draw.ellipse([cx - r, y - r, cx + r, y + r], fill=accent)
        else:
            draw.ellipse([cx - r, y - r, cx + r, y + r], outline=(200, 200, 195), width=2)


def top_hairline(img, accent):
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W, 6], fill=accent)


def render_cover(entry, slide, idx, total, for_video=False):
    accent = hex_to_rgb(entry["accent"])
    img = navy_gradient()
    draw = ImageDraw.Draw(img)
    top_hairline(img, accent)

    eyebrow(draw, slide["eyebrow"], accent, 130)
    slide_no = font(FONT_SANS, 24)
    label = f"1 / {total}"
    w, _, _ = measure(draw, label, slide_no)
    draw.text((W - MARGIN - w, 130), label, font=slide_no, fill=TEXT_MUTED_LIGHT)

    headline_font = font(FONT_SERIF_BOLD, 76)
    paragraphs = slide["headline"].split("\n")
    y = draw_rich_text(draw, paragraphs, slide.get("highlight"), headline_font,
                        W - MARGIN * 2, 560, W, WHITE, accent, align="left")

    draw.line([(MARGIN, H - 140), (W - MARGIN, H - 140)], fill=(255, 255, 255, 40), width=1)
    fnt_word = font(FONT_SANS_BOLD, 30)
    draw.text((MARGIN, H - 108), "BORIS AKOE", font=fnt_word, fill=WHITE)

    if not for_video:
        swipe = "GLISSE →"
        fnt_swipe = font(FONT_SANS_BOLD, 26)
        w, _, _ = measure(draw, swipe, fnt_swipe)
        draw.text((W - MARGIN - w, H - 104), swipe, font=fnt_swipe, fill=accent)

    return img


def render_content_shell(entry, slide, idx, total):
    accent = hex_to_rgb(entry["accent"])
    img = Image.new("RGB", (W, H), IVORY)
    draw = ImageDraw.Draw(img)
    top_hairline(img, accent)

    eyebrow(draw, slide["eyebrow"], accent, 130)
    fnt_no = font(FONT_SANS, 24)
    label = f"{idx + 1} / {total}"
    w, _, _ = measure(draw, label, fnt_no)
    draw.text((W - MARGIN - w, 130), label, font=fnt_no, fill=TEXT_MUTED_DARK)

    progress_dots(draw, idx, total, accent)
    footer(draw, "BORIS AKOE", entry.get("sources", ""), accent)
    return img, draw, accent


def render_fact(entry, slide, idx, total):
    img, draw, accent = render_content_shell(entry, slide, idx, total)
    headline_font = font(FONT_SERIF_BOLD, 58)
    y = draw_rich_text(draw, [slide["headline"]], slide.get("highlight"), headline_font,
                        W - MARGIN * 2, 230, W, TEXT_NAVY, accent, align="left")
    y += 30
    body_font = font(FONT_SANS, 34)
    draw_rich_text(draw, [slide["body"]], slide.get("highlight"), body_font,
                    W - MARGIN * 2, y, W, TEXT_MUTED_DARK, accent, align="left", line_spacing=1.35)
    return img


def render_stat(entry, slide, idx, total):
    img, draw, accent = render_content_shell(entry, slide, idx, total)
    stat_font = font(FONT_SERIF_BOLD, 130)
    draw.text((MARGIN, 260), slide["stat_number"], font=stat_font, fill=accent)
    label_font = font(FONT_SANS_BOLD, 34)
    _, sh, _ = measure(draw, slide["stat_number"], stat_font)
    y = 260 + sh + 60
    draw_rich_text(draw, [slide["stat_label"]], None, label_font, W - MARGIN * 2, y, W,
                    TEXT_NAVY, accent, align="left", line_spacing=1.3)
    body_font = font(FONT_SANS, 32)
    draw_rich_text(draw, [slide["body"]], None, body_font, W - MARGIN * 2, y + 140, W,
                    TEXT_MUTED_DARK, accent, align="left", line_spacing=1.35)
    return img


def render_myth(entry, slide, idx, total):
    img, draw, accent = render_content_shell(entry, slide, idx, total)

    # The headline holds the myth stated as a quote, in the lighter serif face.
    quote_font = font(FONT_SERIF, 46)
    y = draw_rich_text(draw, [slide["headline"]], None, quote_font, W - MARGIN * 2, 230, W,
                        TEXT_NAVY, accent, align="left", line_spacing=1.25)
    y += 60

    box_w = W - MARGIN * 2
    indent = MARGIN + 34
    label_font = font(FONT_SANS_BOLD, 28)
    body_font = font(FONT_SANS, 32)

    myth_top = y
    draw.text((indent, y), f"✕  {slide['myth'].upper()}", font=label_font, fill=(190, 74, 64))
    draw.rectangle([MARGIN, myth_top, MARGIN + 6, myth_top + 42], fill=(214, 92, 82))
    y += 90

    reality_top = y
    draw.text((indent, y), "✓  RÉALITÉ", font=label_font, fill=accent)
    y_end = draw_rich_text(draw, [slide["reality"]], None, body_font, box_w - 44, y + 46, W,
                            TEXT_NAVY, accent, align="left", line_spacing=1.35, left_x=indent)
    draw.rectangle([MARGIN, reality_top, MARGIN + 6, y_end + 6], fill=accent)
    return img


def render_list(entry, slide, idx, total):
    img, draw, accent = render_content_shell(entry, slide, idx, total)
    headline_font = font(FONT_SERIF_BOLD, 54)
    y = draw_rich_text(draw, [slide["headline"]], None, headline_font, W - MARGIN * 2, 230, W,
                        TEXT_NAVY, accent, align="left", line_spacing=1.2)
    y += 50
    item_font = font(FONT_SANS, 34)
    item_indent = MARGIN + 46
    for item in slide["items"]:
        draw.rectangle([MARGIN, y + 14, MARGIN + 18, y + 32], fill=accent)
        y = draw_rich_text(draw, [item], None, item_font, W - MARGIN - item_indent, y, W,
                            TEXT_NAVY, accent, align="left", line_spacing=1.3, left_x=item_indent)
        y += 26
    return img


def render_cta(entry, slide, idx, total):
    accent = hex_to_rgb(entry["accent"])
    img = navy_gradient()
    draw = ImageDraw.Draw(img)
    top_hairline(img, accent)

    headline_font = font(FONT_SERIF_BOLD, 64)
    y = draw_rich_text(draw, [slide["headline"]], None, headline_font, W - MARGIN * 2, 340, W,
                        WHITE, accent, align="center", line_spacing=1.2)
    y += 20
    body_font = font(FONT_SANS, 32)
    draw_rich_text(draw, [slide["body"]], None, body_font, W - MARGIN * 2, y, W,
                    TEXT_MUTED_LIGHT, accent, align="center", line_spacing=1.3)

    btn_font = font(FONT_SANS_BOLD, 38)
    label = slide["keyword_label"]
    tw, th, _ = measure(draw, label, btn_font)
    pad_x, pad_y = 50, 30
    bw, bh = tw + pad_x * 2, th + pad_y * 2
    bx0 = (W - bw) // 2
    by0 = 780
    draw.rounded_rectangle([bx0, by0, bx0 + bw, by0 + bh], radius=bh // 2, fill=accent)
    draw.text((bx0 + pad_x, by0 + pad_y - 4), label, font=btn_font, fill=NAVY)

    fnt_word = font(FONT_SANS_BOLD, 28)
    w, _, _ = measure(draw, "BORIS AKOE", fnt_word)
    draw.text(((W - w) // 2, H - 100), "BORIS AKOE", font=fnt_word, fill=WHITE)
    return img


RENDERERS = {
    "cover": render_cover,
    "fact": render_fact,
    "stat": render_stat,
    "myth": render_myth,
    "list": render_list,
    "cta": render_cta,
}


def build_carousel(entry):
    slides = entry["slides"]
    total = len(slides)
    out_dir = os.path.join(OUT_DIR, entry["id"])
    os.makedirs(out_dir, exist_ok=True)

    paths = []
    for idx, slide in enumerate(slides):
        renderer = RENDERERS[slide["type"]]
        img = renderer(entry, slide, idx, total)
        path = os.path.join(out_dir, f"slide-{idx + 1}.png")
        img.save(path)
        paths.append(path)

    zip_path = os.path.join(OUT_DIR, f"{entry['id']}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in paths:
            zf.write(p, os.path.basename(p))

    return paths, zip_path


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(DATA_FILE) as f:
        carousels = json.load(f)

    for entry in carousels:
        print(f"Génération : {entry['name']} ({len(entry['slides'])} slides)...")
        paths, zip_path = build_carousel(entry)
        print(f"  -> {len(paths)} slides -> {zip_path}")


if __name__ == "__main__":
    main()
