import argparse
import csv
import json
import os
from pathlib import Path

from dotenv import load_dotenv

from image_conversion import download_and_convert

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL", "")

OUTPUT_COLUMNS = [
    "apartment_id",
    "layout_name",
    "sq_ft",
    "bathrooms",
    "bedrooms",
    "room_type",
    "floor",
    "windows",
    "image_url",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert llm-output.json into normalized layouts CSV."
    )
    parser.add_argument(
        "row_number",
        type=int,
        help="One-indexed row number from apartments_rows.csv (excluding header).",
    )
    parser.add_argument(
        "--apartments-csv",
        default="apartments_rows.csv",
        help="Path to apartments CSV input file.",
    )
    parser.add_argument(
        "--json-input",
        default="llm-output.json",
        help="Path to LLM JSON input file.",
    )
    parser.add_argument(
        "--output-csv",
        default="llm-output.csv",
        help="Path to generated output CSV.",
    )
    return parser.parse_args()


def read_apartment_row(csv_path: Path, one_indexed_row: int) -> tuple[str, str]:
    if one_indexed_row < 1:
        raise ValueError("row_number must be >= 1.")

    with csv_path.open("r", newline="", encoding="utf-8") as file:
        reader = csv.reader(file)
        header = next(reader, None)
        if not header:
            raise ValueError(f"{csv_path} is empty.")

        for current_row_num, row in enumerate(reader, start=1):
            if current_row_num == one_indexed_row:
                if len(row) < 2:
                    raise ValueError(
                        f"Row {one_indexed_row} in {csv_path} does not have at least 2 columns."
                    )
                apartment_id = row[0].strip()
                apartment_name = row[1].strip()
                if not apartment_id:
                    raise ValueError(f"Row {one_indexed_row} has an empty UUID in column 1.")
                return apartment_id, apartment_name

    raise IndexError(
        f"Row {one_indexed_row} not found in {csv_path}. Check how many apartment rows exist."
    )


def coerce_int(value):
    if value is None or value == "":
        return ""
    try:
        return int(value)
    except (TypeError, ValueError):
        return ""


def build_image_url(filename: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/images/Unit_Images/{filename}"


def build_output_row(
    layout: dict,
    apartment_id: str,
    apartment_name: str,
) -> dict:
    is_studio = bool(layout.get("is_studio"))

    if is_studio:
        bedrooms = 1
        bathrooms = 1
        room_type = "Studio"
    else:
        bedrooms = coerce_int(layout.get("bedrooms"))
        bathrooms = coerce_int(layout.get("bathrooms"))
        if bedrooms == "" or bathrooms == "":
            room_type = ""
        else:
            room_type = f"{bedrooms} x {bathrooms}"

    raw_url = layout.get("image_url", "")
    layout_name = layout.get("layout_name", "")

    print(f"Processing image for {layout_name}...")
    filename = download_and_convert(raw_url, apartment_name, layout_name)
    image_url = build_image_url(filename) if filename else ""

    return {
        "apartment_id": apartment_id,
        "layout_name": layout_name,
        "sq_ft": coerce_int(layout.get("sq_ft")),
        "bathrooms": bathrooms,
        "bedrooms": bedrooms,
        "room_type": room_type,
        "floor": "",
        "windows": "",
        "image_url": image_url,
    }


def load_layouts(json_path: Path) -> list[dict]:
    with json_path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise ValueError(f"{json_path} must contain a top-level JSON array.")

    for idx, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Entry #{idx} in {json_path} is not a JSON object.")
    return data


def write_output_csv(output_path: Path, rows: list[dict]) -> None:
    with output_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    args = parse_args()

    apartments_csv_path = Path(args.apartments_csv)
    json_input_path = Path(args.json_input)
    output_csv_path = Path(args.output_csv)

    apartment_id, apartment_name = read_apartment_row(
        apartments_csv_path, args.row_number
    )
    print(f"Apartment: {apartment_name}")

    layouts = load_layouts(json_input_path)
    output_rows = [
        build_output_row(layout, apartment_id, apartment_name) for layout in layouts
    ]
    write_output_csv(output_csv_path, output_rows)

    print(f"Wrote {len(output_rows)} rows to {output_csv_path}")


if __name__ == "__main__":
    main()
