# Focus Town — Sprite Assets

All assets in this folder are CC0 (public domain) from Kenney.nl.
No attribution required; included here for documentation.

## Packs to download (manual step)

### 1. Tiny Town  
URL: https://kenney.nl/assets/tiny-town  
License: CC0 1.0  
Extract the PNG tiles you need into: `environment/`  
Key tiles to grab:
  - Desk / table tiles (top-down view)
  - Chair sprites
  - Bookshelf, plant, lamp tiles
  - Floor/wall tiles for the room background

### 2. Top-Down Shooter (characters)
URL: https://kenney.nl/assets/topdown-shooter  
License: CC0 1.0  
Extract character sprite sheets into: `characters/`  
Key files to grab:
  - `survivor1_*.png` (or whichever character set you prefer)
  - Character sheets have idle + walk frames in 8 directions
  - Pick 2-3 character color variants for visual variety among students

## Folder layout (after manual download)

```
public/assets/focus-town/
  characters/
    char-blue.png        ← one PNG per character variant (spritesheet)
    char-red.png
    char-green.png
  environment/
    desk.png
    chair.png
    bookshelf.png
    plant.png
    floor-tile.png
    wall-tile.png
  README.md              ← this file
```

## Usage in code

Assets are served statically. Reference them as:
  `/assets/focus-town/characters/char-blue.png`
  `/assets/focus-town/environment/desk.png`

Sprite animation uses CSS `animation` with `steps()` — no library needed
for frame cycling. Framer Motion handles movement, entrance, and layout
transitions of the characters across the room.
