#!/usr/bin/env python3
"""
Genere des Reels/TikTok verticaux (1080x1920) a partir de scripts/carousels_data.json,
en reutilisant exactement le rendu visuel des carrousels (mêmes slides, mêmes couleurs)
et en ajoutant une voix off (champ "voix_off" de chaque slide) + un fondu par slide.

Pipeline par slide :
  1. Rendu de l'image de la slide (1080x1350) via les renderers de generate_carousels.py
  2. Incrustation sur un canevas 1080x1920 (letterbox haut/bas dans la couleur de fond
     de la slide — navy pour cover/cta, ivoire pour le contenu — donc invisible)
  3. Synthese vocale FR (espeak-ng + voix mbrola fr4) sur le texte de "voix_off"
  4. Segment video ffmpeg (image figee + audio, fondu d'entree)
Puis concatenation des 7 segments en un seul MP4 par thematique, et mise a jour
de public/downloads/videos-manifest.json pour que /videos.html les liste aussi.

Necessite : ffmpeg, ffprobe, espeak-ng (+ voix mbrola-fr4), Pillow, police DejaVu.
"""
import json
import os
import sys
import tempfile

from PIL import Image

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPTS_DIR)
sys.path.insert(0, SCRIPTS_DIR)

from generate_carousels import (  # noqa: E402
    DATA_FILE, RENDERERS, NAVY, IVORY, W as CW, H as CH,
)
from generate_videos import (  # noqa: E402
    run, ffprobe_duration, synth_tts, build_segment, concat_segments, W, H,
)

OUT_DIR = os.path.join(ROOT, "public", "downloads")
MANIFEST_PATH = os.path.join(OUT_DIR, "videos-manifest.json")

DM_PILIER = {
    "epargne-pension": "EPARGNE",
    "epargne-long-terme": "PLAN",
    "epargne-enfant": "ENFANT",
    "couverture-sante": "SANTE",
    "couverture-obseques": "OBSEQUES",
    "incapacite-travail-salarie": "INCAPACITE",
}

assert (W, H) == (1080, 1920), "generate_videos.py W/H changed — reel canvas expects 1080x1920"


def pad_to_reel(slide_img, slide_type):
    bg = NAVY if slide_type in ("cover", "cta") else IVORY
    canvas = Image.new("RGB", (W, H), bg)
    y_offset = (H - CH) // 2
    canvas.paste(slide_img, (0, y_offset))
    return canvas


def build_reel(entry, tmp_root):
    slides = entry["slides"]
    total = len(slides)
    tmp_dir = os.path.join(tmp_root, entry["id"])
    os.makedirs(tmp_dir, exist_ok=True)

    segments = []
    for idx, slide in enumerate(slides):
        renderer = RENDERERS[slide["type"]]
        if slide["type"] == "cover":
            frame = renderer(entry, slide, idx, total, for_video=True)
        else:
            frame = renderer(entry, slide, idx, total)
        reel_frame = pad_to_reel(frame, slide["type"])

        png_path = os.path.join(tmp_dir, f"slide_{idx}.png")
        wav_path = os.path.join(tmp_dir, f"slide_{idx}.wav")
        seg_path = os.path.join(tmp_dir, f"seg_{idx}.mp4")

        reel_frame.save(png_path)
        synth_tts(slide["voix_off"], wav_path)
        audio_dur = ffprobe_duration(wav_path)
        duration = max(2.6, audio_dur + 0.5)

        build_segment(png_path, wav_path, duration, seg_path)
        segments.append(seg_path)

    out_path = os.path.join(OUT_DIR, f"reel-{entry['id']}.mp4")
    concat_segments(segments, out_path, tmp_dir)
    return out_path, ffprobe_duration(out_path)


def update_manifest(new_entries):
    existing = []
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, encoding="utf-8") as f:
            existing = json.load(f)

    new_files = {e["file"] for e in new_entries}
    merged = [e for e in existing if e["file"] not in new_files] + new_entries

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(DATA_FILE, encoding="utf-8") as f:
        carousels = json.load(f)

    manifest_entries = []
    with tempfile.TemporaryDirectory(prefix="reelgen_") as tmp_root:
        for entry in carousels:
            print(f"Génération reel : {entry['name']} ({len(entry['slides'])} slides)...")
            out_path, duration = build_reel(entry, tmp_root)
            mins, secs = divmod(int(round(duration)), 60)
            pilier = DM_PILIER[entry["id"]]
            manifest_entries.append({
                "file": os.path.basename(out_path),
                "title": f"Reel — {entry['name']}",
                "pilier": pilier,
                "description": f"Version Reel/TikTok du carrousel {entry['name']}, voix off + mêmes visuels. CTA : DM \"{entry['dm_keyword']}\".",
                "duration": f"{mins}:{secs:02d}",
            })
            print(f"  -> {out_path} ({duration:.1f}s)")

    update_manifest(manifest_entries)
    print(f"Manifest mis à jour : {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
