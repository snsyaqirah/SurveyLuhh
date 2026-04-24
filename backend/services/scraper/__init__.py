from urllib.parse import urlparse
from . import propertyguru, mudah, iproperty


def scrape_url(url: str) -> dict:
    host = urlparse(url).hostname or ""
    if "propertyguru.com.my" in host:
        result = propertyguru.scrape(url)
        result["source"] = "propertyguru"
    elif "mudah.my" in host:
        result = mudah.scrape(url)
        result["source"] = "mudah"
    elif "iproperty.com.my" in host:
        result = iproperty.scrape(url)
        result["source"] = "iproperty"
    else:
        raise ValueError(f"Unsupported domain: {host}")
    return result
