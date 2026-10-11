#!/usr/bin/env python3
"""Safely extract Google Stitch export .zip files and list the screens they contain.

Usage:
    python import_design_zip.py --feature-dir <FEATURE_DIR> [--zip <path> ...]

Without --zip, every *.zip directly inside FEATURE_DIR and FEATURE_DIR/design/ is used.
Each zip is extracted to FEATURE_DIR/design/imports/<zip-stem>-<sha8>/ (skipped if that
folder already exists). Prints a JSON inventory to stdout. Nothing inside a zip is executed.
"""
import argparse
import hashlib
import json
import re
import shutil
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath

MAX_TOTAL_BYTES = 500 * 1024 * 1024
MAX_FILES = 5000
HTML_EXT = {".html", ".htm"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".svg"}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_member_path(name: str):
    """Return a safe relative path for a zip entry, or None if it must be skipped."""
    p = PurePosixPath(name.replace("\\", "/"))
    if p.is_absolute() or ".." in p.parts or not p.parts:
        return None
    if re.match(r"^[A-Za-z]:", p.parts[0]):
        return None
    if p.parts[0] == "__MACOSX" or any(part.startswith(".") for part in p.parts):
        return None
    return p


def extract(zip_path: Path, dest: Path) -> list:
    skipped = []
    with zipfile.ZipFile(zip_path) as zf:
        infos = zf.infolist()
        if len(infos) > MAX_FILES:
            raise ValueError(f"{zip_path.name}: too many entries ({len(infos)} > {MAX_FILES})")
        if sum(i.file_size for i in infos) > MAX_TOTAL_BYTES:
            raise ValueError(f"{zip_path.name}: uncompressed size exceeds {MAX_TOTAL_BYTES} bytes")
        dest.mkdir(parents=True, exist_ok=False)
        root = dest.resolve()
        for info in infos:
            if info.is_dir():
                continue
            if stat.S_ISLNK(info.external_attr >> 16):
                skipped.append({"entry": info.filename, "reason": "symlink"})
                continue
            rel = safe_member_path(info.filename)
            if rel is None:
                skipped.append({"entry": info.filename, "reason": "unsafe or hidden path"})
                continue
            target = (dest / Path(*rel.parts)).resolve()
            if root not in target.parents:
                skipped.append({"entry": info.filename, "reason": "outside extraction folder"})
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, target.open("wb") as out:
                while chunk := src.read(1 << 20):
                    out.write(chunk)
    return skipped


def html_title(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")[:200_000]
    except OSError:
        return ""
    m = re.search(r"<title[^>]*>(.*?)</title>", text, re.I | re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""


def inventory(folder: Path, feature_dir: Path) -> list:
    """Group design files by the folder that contains them; each group is a candidate screen."""
    groups = {}
    for f in sorted(folder.rglob("*")):
        if not f.is_file():
            continue
        ext = f.suffix.lower()
        if ext not in HTML_EXT | IMAGE_EXT:
            continue
        g = groups.setdefault(f.parent, {"html": [], "images": []})
        g["html" if ext in HTML_EXT else "images"].append(f)
    screens = []
    for parent, g in groups.items():
        rel = lambda p: p.relative_to(feature_dir).as_posix()
        titles = [t for t in (html_title(h) for h in g["html"]) if t]
        screens.append({
            "folder": rel(parent),
            "folder_name": parent.name,
            "titles": titles,
            "html": [rel(p) for p in g["html"]],
            "images": [rel(p) for p in g["images"]],
        })
    return screens


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--feature-dir", required=True)
    ap.add_argument("--zip", action="append", default=[])
    args = ap.parse_args()

    feature_dir = Path(args.feature_dir).resolve()
    if not feature_dir.is_dir():
        print(json.dumps({"error": f"feature dir not found: {feature_dir}"}))
        return 1

    if args.zip:
        zips = [Path(z).resolve() for z in args.zip]
    else:
        zips = sorted(set(feature_dir.glob("*.zip")) | set((feature_dir / "design").glob("*.zip")))

    imports_dir = feature_dir / "design" / "imports"
    result = {"feature_dir": str(feature_dir), "zips": []}
    for z in zips:
        entry = {"zip": str(z)}
        try:
            if not z.is_file():
                raise ValueError("file not found")
            digest = sha256(z)
            dest = imports_dir / f"{z.stem}-{digest[:8]}"
            entry["sha256"] = digest
            entry["extracted_to"] = dest.relative_to(feature_dir).as_posix()
            if dest.exists():
                entry["status"] = "already_extracted"
                entry["skipped"] = []
            else:
                try:
                    entry["skipped"] = extract(z, dest)
                except Exception:
                    shutil.rmtree(dest, ignore_errors=True)
                    raise
                entry["status"] = "extracted"
            entry["screens"] = inventory(dest, feature_dir)
        except (zipfile.BadZipFile, ValueError, OSError) as e:
            entry["status"] = "error"
            entry["error"] = str(e)
        result["zips"].append(entry)

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
