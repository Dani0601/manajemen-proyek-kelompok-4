import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
path = BASE_DIR / "game_players.json"

PLAYER_PHOTOS = {
    # RRQ Hoshi
    "R7": "https://id-mpl.com/images/players/rrq/r7.png",
    "Alberttt": "https://id-mpl.com/images/players/rrq/alberttt.png",
    "Lemon": "https://id-mpl.com/images/players/rrq/lemon.png",
    "Skylar": "https://id-mpl.com/images/players/rrq/skylar.png",
    "CW": "https://id-mpl.com/images/players/rrq/cw.png",
    # ONIC
    "Kairi": "https://id-mpl.com/images/players/onic/kairi.png",
    "Sanz": "https://id-mpl.com/images/players/onic/sanz.png",
    "Butsss": "https://id-mpl.com/images/players/onic/butsss.png",
    "Udil": "https://id-mpl.com/images/players/onic/udil.png",
    "Biboo": "https://id-mpl.com/images/players/onic/biboo.png",
    # EVOS
    "Luminaire": "https://id-mpl.com/images/players/evos/luminaire.png",
    "Sarang": "https://id-mpl.com/images/players/evos/sarang.png",
    "Warlord": "https://id-mpl.com/images/players/evos/warlord.png",
    "Clover": "https://id-mpl.com/images/players/evos/clover.png",
    "Eman": "https://id-mpl.com/images/players/evos/eman.png",
    # Alter Ego
    "CongThi": "https://id-mpl.com/images/players/ae/congthi.png",
    "Branz": "https://id-mpl.com/images/players/ae/branz.png",
    "Vynnn": "https://id-mpl.com/images/players/ae/vynnn.png",
    "Rexxy": "https://id-mpl.com/images/players/ae/rexxy.png",
    "Fico": "https://id-mpl.com/images/players/ae/fico.png",
}

if path.exists():
    players = json.load(open(path, encoding="utf-8"))
    for row in players:
        p_name = row.get("player") or ""
        clean_name = re.sub(r"[^a-zA-Z0-9]+", "_", p_name.lower()).strip("_")
        photo = PLAYER_PHOTOS.get(
            p_name,
            f"https://id-mpl.com/images/players/{clean_name}.png"
        )
        row["player_photo_url"] = photo
        
        # Ensure hero image is valid URL
        from clean_hero_images import get_hero_avatar
        h_name = row.get("hero") or ""
        h_slug = re.sub(r"[^a-zA-Z0-9]+", "-", h_name.lower()).strip("-")
        row["hero_image_url"] = get_hero_avatar(h_name, h_slug)
        
    with open(path, "w", encoding="utf-8") as f:
        json.dump(players, f, indent=2, ensure_ascii=False)
        
    print(f"[OK] game_players.json: {len(players)} records updated with non-null player_photo_url and hero_image_url")
