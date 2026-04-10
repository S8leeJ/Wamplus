import re
import requests
from io import BytesIO
from pathlib import Path
from PIL import Image

OUTPUT_DIR = Path("Unit_Images")


def sanitize_for_url(name: str) -> str:
    name = name.strip().lower()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    name = name.strip("_")
    return name


def download_and_convert(
    source_url: str,
    apartment_name: str,
    layout_name: str,
) -> str | None:
    """Download an image, convert to WebP, save locally, and return the filename.

    Returns the sanitised filename (e.g. 'moontower_a1_sx1_the_mcconaughey.webp')
    or None if the download/conversion failed.
    """
    if not source_url:
        print(f"  Skipping {layout_name}: no source URL.")
        return None

    safe_apartment = sanitize_for_url(apartment_name)
    safe_layout = sanitize_for_url(layout_name)
    filename = f"{safe_apartment}_{safe_layout}.webp"

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = OUTPUT_DIR / filename

    try:
        response = requests.get(source_url, timeout=30)
        if response.status_code != 200:
            print(f"  Failed to download {layout_name} (HTTP {response.status_code}).")
            return None

        img = Image.open(BytesIO(response.content))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")

        img.save(dest, format="WEBP", quality=80)
        print(f"  Saved {filename}")
        return filename

    except Exception as exc:
        print(f"  Error processing {layout_name}: {exc}")
        return None
