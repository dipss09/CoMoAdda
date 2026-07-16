"""Regenerate og-image.png (1200x630) from logo.png on the brand primary color.
Re-run whenever logo.png changes: python generate_og_image.py
"""
from PIL import Image

CANVAS_SIZE = (1200, 630)
BRAND_PRIMARY = (51, 25, 23, 255)  # #331917

logo = Image.open("logo.png").convert("RGBA")
logo = logo.crop(logo.getbbox())  # trim transparent padding

canvas = Image.new("RGBA", CANVAS_SIZE, BRAND_PRIMARY)

target_h = int(CANVAS_SIZE[1] * 0.72)
scale = target_h / logo.height
target_w = int(logo.width * scale)
logo = logo.resize((target_w, target_h), Image.LANCZOS)

x = (CANVAS_SIZE[0] - target_w) // 2
y = (CANVAS_SIZE[1] - target_h) // 2
canvas.paste(logo, (x, y), logo)

canvas.convert("RGB").save("og-image.png", "PNG", optimize=True)
print("Wrote og-image.png", CANVAS_SIZE)
