import requests

urls = [
    "https://static.wikia.nocookie.net/mobile-legends/images/7/75/Fighting_Spirit.png",
    "https://static.wikia.nocookie.net/mobile-legends/images/8/84/Cleaving_Axe.png",
    "https://static.wikia.nocookie.net/mobile-legends/images/4/40/Divine_Resurrection.png",
    "https://static.wikia.nocookie.net/mobile-legends/images/b/be/Spinning_Lightwheel.png",
    "https://static.wikia.nocookie.net/mobile-legends/images/5/51/Rasho_Umbrella_Flee.png",
]

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/124.0.0.0"}

for url in urls:
    try:
        r = requests.head(url, headers=HEADERS, timeout=5)
        fname = url.split("/")[-1]
        print(f"[{r.status_code}] {fname}")
    except Exception as e:
        print(f"[ERR] {url}: {e}")
