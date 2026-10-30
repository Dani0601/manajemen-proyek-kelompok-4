import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Comment

from progress import start, step, ok, warn, finish

URL = "https://id-mpl.com/en/schedule"
SEASON = 18  # ← S18
OUTPUT = Path(__file__).resolve().parent / "matches.json"

TEAM_NAMES = {
    "TLID": "Team Liquid ID",
    "NAVI": "Natus Vincere",
    "BTR": "Bigetron by Vitality",
    "DEWA": "Dewa United Esports",
    "EVOS": "EVOS",
    "RRQ": "RRQ Hoshi",
    "AE": "Alter Ego",
    "ONIC": "ONIC",
    "GEEK": "Geek Fam ID",
}

TEAM_LOGOS = {
    "Team Liquid ID": "https://id-mpl.com/images/teams/tlid.png",
    "Natus Vincere": "https://id-mpl.com/images/teams/navi.png",
    "Bigetron by Vitality": "https://id-mpl.com/images/teams/btr.png",
    "Dewa United Esports": "https://id-mpl.com/images/teams/dewa.png",
    "EVOS": "https://id-mpl.com/images/teams/evos.png",
    "RRQ Hoshi": "https://id-mpl.com/images/teams/rrq.png",
    "Alter Ego": "https://id-mpl.com/images/teams/ae.png",
    "ONIC": "https://id-mpl.com/images/teams/onic.png",
    "Geek Fam ID": "https://id-mpl.com/images/teams/geek.png",
}


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def parse_date(value):
    value = clean(value)
    for fmt in ("%A, %d %B %Y", "%A, %B %d, %Y"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError(f"Tanggal tidak dikenali: {value}")


def extract_match_id(card):
    element = card.select_one("[onclick*='openMatchDetail']")
    if not element:
        return None
    match = re.search(
        r"openMatchDetail\(\s*['\"]?(\d+)",
        element.get("onclick", ""),
    )
    return match.group(1) if match else None


def extract_team_logo(card, team_class, team_name):
    img = card.select_one(f".team.{team_class} img")
    if img:
        src = img.get("src") or img.get("data-src") or ""
        if src and not src.startswith("http"):
            src = "https://id-mpl.com" + src
        if src:
            return src
    return TEAM_LOGOS.get(team_name, "https://id-mpl.com/images/teams/default.png")


def scrape():
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/140.0 Safari/537.36"
        )
    }

    response = None
    for attempt in range(1, 4):
        try:
            response = requests.get(URL, headers=headers, timeout=60)
            response.raise_for_status()
            break
        except Exception as e:
            warn(f"Percobaan {attempt}/3 gagal: {e}")
            if attempt == 3:
                raise

    soup = BeautifulSoup(response.text, "html.parser")
    for comment in soup.find_all(
        string=lambda text: isinstance(text, Comment)
    ):
        comment.extract()

    start(f"MPL INDONESIA S{SEASON} - MATCHES")
    matches = []
    seen = set()

    for week_number in range(1, 10):
        step(week_number, 9, f"Week {week_number}")
        week = soup.select_one(f"#t-week-{week_number}")
        if not week:
            continue

        for column in week.select(".row > .col-lg-4"):
            date_element = column.select_one(".match.date")
            if not date_element:
                continue
            date = parse_date(date_element.get_text(" ", strip=True))

            for card in column.select(".match.position-relative"):
                team1_el = card.select_one(".team.team1 .name")
                team2_el = card.select_one(".team.team2 .name")
                if not team1_el or not team2_el:
                    continue

                team1_code = clean(team1_el.get_text(" ", strip=True))
                team2_code = clean(team2_el.get_text(" ", strip=True))
                team1 = TEAM_NAMES.get(team1_code, team1_code)
                team2 = TEAM_NAMES.get(team2_code, team2_code)

                team1_logo = extract_team_logo(card, "team1", team1)
                team2_logo = extract_team_logo(card, "team2", team2)

                scores = card.select(".score.font-primary")
                if len(scores) < 2:
                    continue

                try:
                    score1 = int(clean(scores[0].get_text()))
                    score2 = int(clean(scores[1].get_text()))
                except ValueError:
                    continue

                if not (0 <= score1 <= 2 and 0 <= score2 <= 2):
                    continue

                time_el = card.select_one(".time .pt-1")
                time_val = clean(time_el.get_text(" ", strip=True)) if time_el else "00:00"
                source_match_id = extract_match_id(card)

                key = source_match_id or (date, time_val, team1, team2)
                if key in seen:
                    continue
                seen.add(key)

                winner = (
                    team1 if score1 > score2
                    else team2 if score2 > score1
                    else "draw"
                )

                matches.append({
                    "match_id": None,
                    "season": SEASON,
                    "week": week_number,
                    "date": date,
                    "time": time_val,
                    "team1": team1,
                    "team1_logo": team1_logo,
                    "team2": team2,
                    "team2_logo": team2_logo,
                    "score": {"team1": score1, "team2": score2},
                    "winner": winner,
                    "status": "completed",
                    "source": "official_mpl",
                    "source_match_id": source_match_id or "",
                })

    ok(f"{len(matches)} pertandingan selesai diambil")

    matches.sort(key=lambda x: (x["date"], x["time"] or "99:99"))

    for index, match in enumerate(matches, 1):
        match["match_id"] = f"s{SEASON}_w{match['week']:02d}_m{index:02d}"

    output = {
        "metadata": {
            "league": "MPL Indonesia",
            "season": SEASON,
            "stage": "Regular Season",
            "format": "Double Round Robin, Bo3",
            "source": URL,
            "source_type": "official_mpl_schedule",
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "total_completed_matches": len(matches),
        },
        "matches": matches,
    }

    OUTPUT.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    finish(f"matches.json dibuat - {len(matches)} pertandingan")


if __name__ == "__main__":
    scrape()
