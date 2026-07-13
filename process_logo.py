import subprocess
import sys

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    from PIL import Image
except ImportError:
    install('Pillow')
    from PIL import Image

def remove_white(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # Change all white (also shades of whites)
        # to transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

remove_white(r"C:\Users\dippo\.gemini\antigravity\brain\43001bd0-0dd5-4ac9-88f3-17a5d8ca31b6\media__1783917081963.png", r"d:\BrewDipu\logo.png")
print("Logo processed successfully")
