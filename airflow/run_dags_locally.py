import sqlite3
import os
import random
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)

DB_PATH = os.path.join(os.path.dirname(__file__), "../backend/freightiq_data.db")

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS route_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_name TEXT NOT NULL,
            origin TEXT,
            destination TEXT,
            base_rate REAL,
            distance_nm REAL,
            cargo TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(route_name)
        )
    ''')
    conn.commit()
    conn.close()

def run_baltic_scrape():
    logging.info("Attempting to scrape Baltic Dry Index from investing.com...")
    
    url = "https://www.investing.com/indices/baltic-dry"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    
    simulated_payload = {
        "timestamp": datetime.now().isoformat(),
        "source": "simulated",
        "data": [
            {"route": "Paradip → Rotterdam", "rate": 14200 + random.randint(-500, 500), "cargo": "Iron Ore", "distance": 7800},
            {"route": "Haldia → Shanghai", "rate": 12800 + random.randint(-500, 500), "cargo": "Coal", "distance": 4200},
            {"route": "Mundra → Fujairah", "rate": 9500 + random.randint(-500, 500), "cargo": "POL / Crude", "distance": 850},
            {"route": "Vizag → Yokohama", "rate": 16500 + random.randint(-500, 500), "cargo": "Iron Ore", "distance": 5100},
            {"route": "Kandla → Houston", "rate": 19800 + random.randint(-500, 500), "cargo": "Chemicals", "distance": 10200},
        ]
    }
    
    payload = simulated_payload
    try:
        import cloudscraper
        from bs4 import BeautifulSoup
        
        scraper = cloudscraper.create_scraper()
        response = scraper.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'lxml')
        price_elem = soup.select_one('[data-test="instrument-price-last"]')
        
        if not price_elem:
            raise ValueError("Could not find the price element in the HTML.")
            
        bdi_value = float(price_elem.text.replace(',', ''))
        logging.info(f"Successfully scraped BDI value: {bdi_value}")
        
        scale_factor = bdi_value / 2000.0
        payload = {
            "timestamp": datetime.now().isoformat(),
            "source": "investing.com_scrape",
            "data": [
                {"route": "Paradip → Rotterdam", "rate": int(14200 * scale_factor), "cargo": "Iron Ore", "distance": 7800},
                {"route": "Haldia → Shanghai", "rate": int(12800 * scale_factor), "cargo": "Coal", "distance": 4200},
                {"route": "Mundra → Fujairah", "rate": int(9500 * scale_factor), "cargo": "POL / Crude", "distance": 850},
                {"route": "Vizag → Yokohama", "rate": int(16500 * scale_factor), "cargo": "Iron Ore", "distance": 5100},
                {"route": "Kandla → Houston", "rate": int(19800 * scale_factor), "cargo": "Chemicals", "distance": 10200},
            ]
        }
    except Exception as e:
        logging.warning(f"Scraping failed ({e}). Falling back to simulated data.")

    # Load into DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for item in payload["data"]:
        route = item["route"]
        parts = route.split(" → ")
        origin = parts[0]
        dest = parts[1]
        
        cursor.execute('''
            INSERT INTO route_rates (route_name, origin, destination, base_rate, distance_nm, cargo, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(route_name) DO UPDATE SET
                base_rate = excluded.base_rate,
                updated_at = CURRENT_TIMESTAMP
        ''', (route, origin, dest, item["rate"], item["distance"], item["cargo"]))
    conn.commit()
    conn.close()
    logging.info(f"Data source used: {payload['source']}")
    logging.info(f"Successfully loaded {len(payload['data'])} routes into {DB_PATH}.")

if __name__ == "__main__":
    init_db()
    run_baltic_scrape()
    print("\nCheck your browser! If you refresh the Route Planner, it will now fetch from this newly populated database.")
