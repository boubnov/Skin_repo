import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import time
import random

class BaseScraper:
    def __init__(self, user_agent: str = None):
        self.headers = {
            "User-Agent": user_agent or "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    
    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetches a URL and returns a BeautifulSoup object."""
        try:
            print(f"📥 Fetching: {url}")
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                return BeautifulSoup(response.text, "html.parser")
            else:
                print(f"❌ Failed to fetch {url}: Status {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error fetching {url}: {e}")
            return None
            
    def safe_delay(self):
        """Sleeps for a random interval to avoid rate limiting."""
        delay = random.uniform(1.0, 3.0)
        time.sleep(delay)

    def scrape_products(self) -> List[Dict]:
        """Override this method to return a list of product dictionaries."""
        raise NotImplementedError("Subclasses must implement scrape_products()")
