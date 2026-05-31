import overpy
import json
import time

api = overpy.Overpass()

# Target cities with bounding boxes [min_lat, min_lng, max_lat, max_lng]
CITIES = {
    "Chennai": [12.8, 80.0, 13.2, 80.4],
    "Delhi": [28.4, 76.8, 28.9, 77.4],
    "Mumbai": [18.9, 72.7, 19.3, 73.1],
    "New_York": [40.5, -74.2, 40.9, -73.7],
    "London": [51.3, -0.5, 51.7, 0.3]
}

CATEGORIES = {
    "hospital": "['amenity'='hospital']",
    "police": "['amenity'='police']",
    "fire_station": "['amenity'='fire_station']",
    "fuel": "['amenity'='fuel']",
    "ambulance": "['emergency'='ambulance_station']"
}

def scrape():
    all_pois = []
    for city, bbox in CITIES.items():
        print(f"Scraping {city}...")
        for cat_name, tag in CATEGORIES.items():
            query = f"""
            [out:json];
            node{tag}({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
            out;
            """
            try:
                result = api.query(query)
                for node in result.nodes:
                    poi = {
                        "id": f"osm_{node.id}",
                        "name": node.tags.get("name", "Unknown"),
                        "type": cat_name,
                        "lat": float(node.lat),
                        "lng": float(node.lon),
                        "phone": node.tags.get("phone") or node.tags.get("contact:phone"),
                        "address": node.tags.get("addr:full") or node.tags.get("addr:street"),
                        "city": city,
                        "source": "overpass"
                    }
                    all_pois.append(poi)
                time.sleep(2) # Avoid rate limits
            except Exception as e:
                print(f"Error scraping {cat_name} in {city}: {e}")
    
    with open("pipeline/scraped_pois.json", "w") as f:
        json.dump(all_pois, f, indent=2)
    print(f"Scraped {len(all_pois)} POIs total.")

if __name__ == "__main__":
    scrape()
