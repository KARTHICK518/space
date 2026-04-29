import os
import urllib.request

TEXTURES_DIR = os.path.join("d:\\", "Projects", "space", "frontend", "public", "textures")

if not os.path.exists(TEXTURES_DIR):
    os.makedirs(TEXTURES_DIR)

TEXTURE_URLS = {
    "sun.jpg": "https://www.solarsystemscope.com/textures/download/2k_sun.jpg",
    "mercury.jpg": "https://www.solarsystemscope.com/textures/download/2k_mercury.jpg",
    "venus.jpg": "https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg",
    "earth.jpg": "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg",
    "mars.jpg": "https://www.solarsystemscope.com/textures/download/2k_mars.jpg",
    "jupiter.jpg": "https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg",
    "saturn.jpg": "https://www.solarsystemscope.com/textures/download/2k_saturn.jpg",
    "uranus.jpg": "https://www.solarsystemscope.com/textures/download/2k_uranus.jpg",
    "neptune.jpg": "https://www.solarsystemscope.com/textures/download/2k_neptune.jpg"
}

for filename, url in TEXTURE_URLS.items():
    filepath = os.path.join(TEXTURES_DIR, filename)
    print(f"Downloading {filename}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        print(f"Successfully downloaded {filename}")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")

print("All downloads complete.")
