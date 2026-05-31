import requests
import time

def test_nearest():
    url = "http://127.0.0.1:8000/api/v1/geo/nearest"
    params = {
        "lat": 12.9716,
        "lng": 77.5946,
        "type": "hospital",
        "radius_km": 5,
        "limit": 5
    }
    try:
        print(f"Testing GET {url} with params {params}")
        r = requests.get(url, params=params, timeout=30)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Found {len(data)} POIs")
            for poi in data:
                print(f"- {poi['name']} ({poi['distance_km']} km) source: {poi['source']}")
        else:
            print(r.text)
    except Exception as e:
        print(f"Error: {e}")

def test_cache_region():
    url = "http://127.0.0.1:8000/api/v1/geo/cache-region"
    body = {
        "min_lat": 12.9,
        "min_lng": 77.5,
        "max_lat": 13.0,
        "max_lng": 77.7
    }
    try:
        print(f"Testing POST {url} with body {body}")
        r = requests.post(url, json=body, timeout=10)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Found {len(data)} POIs in region")
        else:
            print(r.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Wait for server to be ready
    time.sleep(2)
    test_nearest()
    test_cache_region()
