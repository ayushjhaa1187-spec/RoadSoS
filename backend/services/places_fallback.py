import requests
import time

def fetch_overpass_fallback(lat, lng, radius_km=5, poi_type=None):
    # Convert radius_km to meters for Overpass
    radius_m = radius_km * 1000
    
    type_query = ""
    if poi_type == "hospital":
        type_query = 'node["amenity"="hospital"]'
    elif poi_type == "police":
        type_query = 'node["amenity"="police"]'
    elif poi_type == "fire_station":
        type_query = 'node["amenity"="fire_station"]'
    elif poi_type == "fuel":
        type_query = 'node["amenity"="fuel"]'
    else:
        type_query = 'node["amenity"~"hospital|police|fire_station|fuel"]'

    query = f"""
    [out:json];
    (
      {type_query}(around:{radius_m},{lat},{lng});
    );
    out body;
    """
    
    url = "https://overpass-api.de/api/interpreter"
    headers = {'User-Agent': 'RoadSoS-Backend/1.0'}
    
    try:
        response = requests.post(url, data={'data': query}, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            results = []
            for element in data.get('elements', []):
                results.append({
                    "id": element.get('id'),
                    "name": element.get('tags', {}).get('name', 'Unknown'),
                    "type": element.get('tags', {}).get('amenity', poi_type or 'other'),
                    "lat": element.get('lat'),
                    "lng": element.get('lon'),
                    "phone": element.get('tags', {}).get('phone', element.get('tags', {}).get('contact:phone')),
                    "address": element.get('tags', {}).get('addr:street', ''),
                    "source": "Overpass-Fallback"
                })
            return results
    except Exception as e:
        print(f"Overpass fallback error: {e}")
    
    return []
