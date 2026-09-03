#!/usr/bin/env python3
"""
Genere les videos verticales (1080x1920) a partir de scripts/video_data.json.

Pipeline par ligne (voix off + texte a l'ecran) :
  1. Synthese vocale FR (espeak-ng + voix mbrola fr4) -> wav
  2. Image de fond (PIL) avec le texte a l'ecran, la pilule "PILIER X" et une
     barre de progression
  3. Segment video ffmpeg (image figee + audio, avec fondu d'entree et
     l'audio complete jusqu'a la duree du segment)
Puis concatenation de tous les segments d'une video en un seul MP4.

Necessite : ffmpeg, ffprobe, espeak-ng (+ voix mbrola-fr4), police DejaVu.
"""
import json
import os
import subprocess
import sys
import textwrap
import shutil
import tempfile

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(ROOT, "scripts", "video_data.json")
OUT_DIR = os.path.join(ROOT, "public", "downloads")

W, H = 1080, 1920
FPS = 25
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

NAVY = (11, 27, 50)
NAVY2 = (18, 42, 74)
WHITE = (255, 255, 255)
MUTED = (180, 196, 220)

TTS_VOICE = "mb-fr4"
TTS_SPEED = "160"


def run(cmd):
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if result.returncode != 0:
        print(" ".join(cmd))
        print(result.stdout.decode(errors="replace"))
        raise RuntimeError(f"Command failed: {cmd[0]}")
    return result.stdout.decode(errors="replace")


def ffprobe_duration(path):
    out = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path,
    ])
    return float(out.strip())


def synth_tts(text, out_wav):
    run([
        "espeak-ng", "-v", TTS_VOICE, "-s", TTS_SPEED, "-p", "45",
        "-a", "180", text, "-w", out_wav,
    ])


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def make_gradient(accent_rgb):
    img = Image.new("RGB", (W, H), NAVY)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(NAVY[0] + (NAVY2[0] - NAVY[0]) * t)
        g = int(NAVY[1] + (NAVY2[1] - NAVY[1]) * t)
        b = int(NAVY[2] + (NAVY2[2] - NAVY[2]) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    # subtle accent glow band
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([-300, H // 2 - 500, 500, H // 2 + 500], fill=accent_rgb + (25,))
    od.ellipse([W - 500, 200, W + 300, 900], fill=accent_rgb + (18,))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    return img


def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        bbox = draw.textbbox((0, 0), trial, font=font)
        if bbox[2] - bbox[0] <= max_width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_pill(draw, text, accent_rgb):
    font = ImageFont.truetype(FONT_BOLD, 30)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad_x, pad_y = 30, 16
    x0, y0 = 80, 130
    x1, y1 = x0 + tw + pad_x * 2, y0 + th + pad_y * 2
    draw.rounded_rectangle([x0, y0, x1, y1], radius=(y1 - y0) // 2, fill=accent_rgb)
    draw.text((x0 + pad_x, y0 + pad_y - bbox[1]), text, font=font, fill=NAVY)


def draw_progress(draw, idx, total, accent_rgb):
    margin = 80
    y = H - 90
    bar_w = W - margin * 2
    draw.rounded_rectangle([margin, y, margin + bar_w, y + 8], radius=4, fill=(255, 255, 255, 40))
    filled = int(bar_w * (idx + 1) / total)
    draw.rounded_rectangle([margin, y, margin + filled, y + 8], radius=4, fill=accent_rgb)


def render_frame(out_png, accent_hex, pill_text, main_text, footer_text, idx, total, highlight=False):
    accent_rgb = hex_to_rgb(accent_hex)
    img = make_gradient(accent_rgb)
    draw = ImageDraw.Draw(img)

    draw_pill(draw, pill_text, accent_rgb)

    size = 108 if highlight else 72
    font = ImageFont.truetype(FONT_BOLD, size)
    max_width = W - 160
    lines = wrap_text(draw, main_text, font, max_width)

    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_heights.append(bbox[3] - bbox[1])
    spacing = int(size * 0.35)
    total_h = sum(line_heights) + spacing * (len(lines) - 1)
    y = (H - total_h) // 2

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        x = (W - lw) // 2
        fill = accent_rgb if highlight else WHITE
        draw.text((x, y - bbox[1]), line, font=font, fill=fill)
        y += line_heights[i] + spacing

    footer_font = ImageFont.truetype(FONT_REG, 32)
    fbbox = draw.textbbox((0, 0), footer_text, font=footer_font)
    fw = fbbox[2] - fbbox[0]
    draw.text(((W - fw) // 2, H - 150), footer_text, font=footer_font, fill=MUTED)

    draw_progress(draw, idx, total, accent_rgb)

    img.save(out_png)


def build_segment(image_png, audio_wav, duration, out_mp4):
    run([
        "ffmpeg", "-y",
        "-loop", "1", "-i", image_png,
        "-i", audio_wav,
        "-t", f"{duration:.2f}",
        "-vf", f"scale={W}:{H},fade=t=in:st=0:d=0.25,format=yuv420p",
        "-af", "apad",
        "-r", str(FPS),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
        "-pix_fmt", "yuv420p",
        out_mp4,
    ])


def concat_segments(segment_paths, out_mp4, tmp_dir):
    list_path = os.path.join(tmp_dir, "concat_list.txt")
    with open(list_path, "w") as f:
        for p in segment_paths:
            f.write(f"file '{p}'\n")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_path, "-c", "copy", out_mp4])


def build_video(entry, tmp_root):
    footer = "Kit Sérénité & Transmission" if entry["pilier"] == "KIT" else "Mon Écart Pension"
    pill_text = f"PILIER {entry['pilier']}"
    tmp_dir = os.path.join(tmp_root, entry["id"])
    os.makedirs(tmp_dir, exist_ok=True)

    segments = []
    total_rows = len(entry["rows"])
    for idx, row in enumerate(entry["rows"]):
        wav_path = os.path.join(tmp_dir, f"row_{idx}.wav")
        png_path = os.path.join(tmp_dir, f"row_{idx}.png")
        seg_path = os.path.join(tmp_dir, f"seg_{idx}.mp4")

        synth_tts(row["voix_off"], wav_path)
        audio_dur = ffprobe_duration(wav_path)
        duration = max(row["duree_cible"], audio_dur + 0.6)

        render_frame(
            png_path, entry["accent"], pill_text, row["texte_ecran"], footer,
            idx, total_rows, highlight=row.get("highlight", False),
        )
        build_segment(png_path, wav_path, duration, seg_path)
        segments.append(seg_path)

    out_path = os.path.join(OUT_DIR, entry["file"])
    concat_segments(segments, out_path, tmp_dir)
    return out_path, ffprobe_duration(out_path)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(DATA_FILE) as f:
        videos = json.load(f)

    manifest = []
    with tempfile.TemporaryDirectory(prefix="videogen_") as tmp_root:
        for entry in videos:
            print(f"Generation : {entry['title']} ...")
            out_path, duration = build_video(entry, tmp_root)
            mins, secs = divmod(int(round(duration)), 60)
            manifest.append({
                "file": entry["file"],
                "title": entry["title"],
                "pilier": entry["pilier"],
                "description": entry["description"],
                "duration": f"{mins}:{secs:02d}",
            })
            print(f"  -> {out_path} ({duration:.1f}s)")

    manifest_path = os.path.join(OUT_DIR, "videos-manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"Manifest ecrit : {manifest_path}")


if __name__ == "__main__":
    main()
