import urllib.request, json

names = ['Zetian', 'Zhuxin', 'Suyou', 'Lukas', 'Kalea', 'Sora', 'Hirara', 'Marcel', 'Obsidia']
# Query all images used on the hero pages
found_icons = {}

for n in names:
    url = f"https://mobile-legends.fandom.com/api.php?action=query&titles={n}&prop=images&imlimit=50&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode())
    pages = data.get('query', {}).get('pages', {})
    for pid, p in pages.items():
        imgs = [x['title'] for x in p.get('images', [])]
        print(f"=== {n} images ===")
        icon_candidates = [x for x in imgs if any(k in x.lower() for k in ['icon', 'head', 'face', 'square', 'avatar', 'circle', 'mini', 'thumb'])]
        for ic in icon_candidates:
            print(" ", ic)

