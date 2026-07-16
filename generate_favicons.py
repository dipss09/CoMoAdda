"""Regenerate favicon/app icon set from logo.png.
Re-run whenever logo.png changes: python generate_favicons.py
"""
from PIL import Image

logo = Image.open("logo.png").convert("RGBA")
logo = logo.crop(logo.getbbox())

# Pad back to a square with a small transparent margin so icons don't look cropped
pad = int(max(logo.size) * 0.06)
square = Image.new("RGBA", (logo.width + pad * 2, logo.height + pad * 2), (0, 0, 0, 0))
square.paste(logo, (pad, pad), logo)

def save_png(size, path):
    square.resize((size, size), Image.LANCZOS).save(path, "PNG")

save_png(180, "apple-touch-icon.png")
save_png(192, "icon-192.png")
save_png(512, "icon-512.png")
save_png(32, "favicon-32.png")
save_png(16, "favicon-16.png")

# favicon.ico with multiple embedded sizes
square.save(
    "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)

print("Wrote favicon.ico, favicon-16.png, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png")
