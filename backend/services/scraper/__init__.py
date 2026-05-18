from urllib.parse import urlparse
from . import propertyguru, mudah, iproperty

_ALLOWED_DOMAINS = {"mudah.my", "propertyguru.com.my", "iproperty.com.my"}


def _allowed_host(url: str) -> str | None:
    host = urlparse(url).hostname or ""
    for domain in _ALLOWED_DOMAINS:
        if host == domain or host.endswith("." + domain):
            return domain
    return None


def scrape_url(url: str) -> dict:
    domain = _allowed_host(url)
    if domain is None:
        raise ValueError(f"Unsupported domain: {urlparse(url).hostname or url}")
    if domain == "propertyguru.com.my":
        result = propertyguru.scrape(url)
        result["source"] = "propertyguru"
    elif domain == "mudah.my":
        result = mudah.scrape(url)
        result["source"] = "mudah"
    else:
        result = iproperty.scrape(url)
        result["source"] = "iproperty"
    return result
