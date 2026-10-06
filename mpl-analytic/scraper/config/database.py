"""
config/database.py
-------------------
Koneksi database untuk modul scraper. Membaca kredensial dari .env
(sama seperti app/config/database.php pada aplikasi utama) sehingga
scraper Python dan aplikasi PHP menunjuk ke database yang sama.
"""

import os
import contextlib
from pathlib import Path

import pymysql
import pymysql.cursors
from dotenv import load_dotenv

# Cari .env di folder scraper/, fallback ke root project
_SCRAPER_DIR = Path(__file__).resolve().parent.parent
_ENV_CANDIDATES = [_SCRAPER_DIR / ".env", _SCRAPER_DIR.parent / ".env"]

for env_path in _ENV_CANDIDATES:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        break
else:
    # Tidak ada .env ditemukan -> tetap coba baca dari environment asli
    load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "mpl_analytic"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": False,
}


def get_connection() -> pymysql.connections.Connection:
    """Membuka koneksi baru ke database MySQL/MariaDB."""
    return pymysql.connect(**DB_CONFIG)


@contextlib.contextmanager
def db_cursor(connection=None, commit: bool = True):
    """
    Context manager untuk mendapatkan cursor siap pakai.

    Contoh:
        with db_cursor() as cur:
            cur.execute("SELECT * FROM heroes")
            rows = cur.fetchall()
    """
    own_connection = connection is None
    conn = connection or get_connection()
    cur = conn.cursor()
    try:
        yield cur
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        if own_connection:
            conn.close()


# ---------------------------------------------------------------------------
# Konfigurasi umum scraping (rate limit, target situs, mode headless)
# ---------------------------------------------------------------------------
SCRAPER_SETTINGS = {
    "idmpl_base_url": os.getenv("IDMPL_BASE_URL", "https://id-mpl.com"),
    "rate_limit_min": float(os.getenv("RATE_LIMIT_MIN_SECONDS", "2")),
    "rate_limit_max": float(os.getenv("RATE_LIMIT_MAX_SECONDS", "5")),
    "headless": os.getenv("HEADLESS", "true").lower() != "false",
    # Kredensial ini dipakai LiquipediaClient (bukan Playwright) untuk
    # membentuk User-Agent sesuai Liquipedia API Terms of Use.
    "liquipedia_wiki": "mobilelegends",
    "liquipedia_project_name": os.getenv("LIQUIPEDIA_PROJECT_NAME", ""),
    "liquipedia_contact_email": os.getenv("LIQUIPEDIA_CONTACT_EMAIL", ""),
}
