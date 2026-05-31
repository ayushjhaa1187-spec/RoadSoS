import csv

EMERGENCY_NUMBERS = {
    "IN": "112", "US": "911", "UK": "999", "AU": "000",
    "CA": "911", "FR": "112", "DE": "112", "IT": "112",
    "ES": "112", "CN": "120", "JP": "119", "RU": "103"
}

def scrape_numbers():
    with open("pipeline/national_numbers.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["country_code", "number"])
        for cc, num in EMERGENCY_NUMBERS.items():
            writer.writerow([cc, num])
    print("National numbers saved to CSV.")

if __name__ == "__main__":
    scrape_numbers()
