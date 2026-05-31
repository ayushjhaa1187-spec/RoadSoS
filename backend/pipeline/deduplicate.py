import json

def deduplicate():
    try:
        with open("pipeline/scraped_pois.json", "r") as f:
            pois = json.load(f)
    except FileNotFoundError:
        print("No scraped POIs found. Run scrape_osm.py first.")
        return

    unique_pois = {}
    for poi in pois:
        # Deduplicate by name and approximate coords (3 decimal places ~= 110m)
        key = f"{poi['name']}_{round(poi['lat'], 3)}_{round(poi['lng'], 3)}"
        if key not in unique_pois:
            unique_pois[key] = poi
    
    deduped = list(unique_pois.values())
    with open("pipeline/deduped_pois.json", "w") as f:
        json.dump(deduped, f, indent=2)
    print(f"Deduplicated: {len(pois)} -> {len(deduped)}")

if __name__ == "__main__":
    deduplicate()
