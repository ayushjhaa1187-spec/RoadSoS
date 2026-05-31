import sqlite3
import json
import os

def build():
    db_path = "emergency_data.db"
    if os.path.exists(db_path):
        os.remove(db_path)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute("""
    CREATE TABLE poi (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT UNIQUE,
        name TEXT,
        type TEXT,
        lat REAL,
        lng TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        source TEXT,
        verified INTEGER DEFAULT 0,
        last_updated TEXT
    )
    """)
    
    cursor.execute("CREATE VIRTUAL TABLE poi_rtree USING rtree(id, min_lat, max_lat, min_lng, max_lng)")
    
    # Load data
    try:
        with open("pipeline/deduped_pois.json", "r") as f:
            pois = json.load(f)
    except FileNotFoundError:
        print("No deduped POIs found.")
        return

    for p in pois:
        try:
            cursor.execute("""
                INSERT INTO poi (id, name, type, lat, lng, phone, address, city, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (p['id'], p['name'], p['type'], p['lat'], p['lng'], p['phone'], p['address'], p['city'], p['source']))
            
            rowid = cursor.lastrowid
            cursor.execute("INSERT INTO poi_rtree (id, min_lat, max_lat, min_lng, max_lng) VALUES (?, ?, ?, ?, ?)",
                           (rowid, p['lat'], p['lat'], p['lng'], p['lng']))
        except Exception as e:
            print(f"Error inserting {p['id']}: {e}")
            
    conn.commit()
    conn.close()
    print("Database built successfully.")

if __name__ == "__main__":
    build()
