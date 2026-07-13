import re
import os

files = ['index.html', 'downloaded_index.html', 'code.html']

for file in files:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            html = f.read()
        
        # Add loading="lazy" to <img> tags that don't have it
        html = re.sub(r'<img(?![^>]*loading=)', r'<img loading="lazy" ', html)
        
        # Add transform-gpu to animate-float classes for hardware acceleration
        html = re.sub(r'animate-float(?! transform-gpu)', r'animate-float transform-gpu', html)
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"Processed {file}")
