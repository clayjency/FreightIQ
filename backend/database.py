import sqlite3
import os
import logging

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "freightiq_data.db")

def get_db_connection():
    """Returns a sqlite3 connection to the application database."""
    # Ensure the database exists or can be created
    if not os.path.exists(os.path.dirname(DB_PATH)):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def get_user_by_username(username: str) -> sqlite3.Row | None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return row

def create_user(username: str, hashed_password: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, hashed_password) VALUES (?, ?)",
            (username, hashed_password)
        )
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        return False
    except Exception as e:
        logging.error(f"Error creating user: {e}")
        return False

def get_route_rate_from_db(route_name: str) -> dict | None:
    """Fetch the latest ingested base rate from Airflow."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT base_rate, distance_nm, cargo FROM route_rates WHERE route_name = ?", (route_name,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "base": row["base_rate"],
                "distance_nm": row["distance_nm"],
                "cargo": row["cargo"],
                "volatility": 0.20, # Assume standard volatility if fetched from DB
                "trend_bias": 0.003
            }
    except sqlite3.OperationalError:
        # Table might not exist yet if Airflow hasn't run
        pass
    except Exception as e:
        logging.error(f"Failed to query route_rates: {e}")
        
    return None

def get_all_routes_from_db() -> list[dict]:
    """Fetch all ingested routes."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT route_name, base_rate, distance_nm, cargo FROM route_rates")
        rows = cursor.fetchall()
        conn.close()
        
        return [
            {
                "route_name": r["route_name"],
                "base": r["base_rate"],
                "distance_nm": r["distance_nm"],
                "cargo": r["cargo"],
                "volatility": 0.20,
                "trend_bias": 0.003
            } for r in rows
        ]
    except sqlite3.OperationalError:
        return []
    except Exception as e:
        logging.error(f"Failed to query all route_rates: {e}")
        return []
