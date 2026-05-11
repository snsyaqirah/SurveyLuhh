"""iProperty Malaysia scraper — httpx + BeautifulSoup, __NEXT_DATA__ primary, no Chrome."""
import re
import json
from bs4 import BeautifulSoup
from .base import fetch_html

_ICON_RE = re.compile(r'^[\w]+-[\w-]+$')


def scrape(url: str) -> dict:
    html = fetch_html(url, timeout=30)
    soup = BeautifulSoup(html, "html.parser")
    nd = _from_next_data(soup)
    page_text = soup.get_text(separator="\n")

    h1_el = soup.find("h1")
    title        = nd.get("title") or (h1_el.get_text(strip=True) if h1_el else "")
    price        = nd.get("price") or _scrape_price(soup, page_text)
    bedrooms     = nd.get("bedrooms") or _first_int(page_text, r'(\d+)\s*[Bb]eds?\b')
    bathrooms    = nd.get("bathrooms") or _first_int(page_text, r'(\d+)\s*[Bb]aths?\b')
    sqft         = nd.get("sqft") or _extract_sqft(page_text)
    parking      = nd.get("parking") or _first_int(page_text, r'(\d+)\s*(?:parking\s*lots?|car\s*parks?|car\s*park\b)')
    description  = nd.get("description") or _extract_description(soup, page_text)
    facilities   = nd.get("facilities") or _extract_facilities(soup, page_text, description)
    agent_name   = nd.get("agentName") or _extract_agent_name(soup, page_text)
    agent_phone  = nd.get("agentPhone") or _extract_phone(soup, page_text)
    agent_agency = nd.get("agentAgency") or _extract_agent_agency(soup)

    images: list[str] = []
    for img in soup.find_all("img"):
        src = img.get("data-src") or img.get("src") or ""
        if _is_listing_image(src):
            images.append(src)
    for link in soup.find_all("link"):
        if "preload" in (link.get("rel") or []) and link.get("as") == "image":
            href = link.get("href", "")
            if _is_listing_image(href):
                images.insert(0, href)
    images = _dedup(images)[:20]

    nearby = _extract_nearby(description) or _extract_nearby(page_text)

    return {
        "title": title,
        "price": price,
        "images": images,
        "description": description,
        "details": {
            "sqft": sqft,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "parking": parking,
        },
        "facilities": facilities,
        "nearbyPlaces": nearby,
        "agent": {"name": agent_name, "phone": agent_phone, "agency": agent_agency},
    }


# ── __NEXT_DATA__ extraction ───────────────────────────────────────────────────

def _from_next_data(soup: BeautifulSoup) -> dict:
    script = soup.find("script", id="__NEXT_DATA__")
    if not script or not script.string:
        return {}
    try:
        raw = json.loads(script.string)
    except Exception:
        return {}

    page_props = raw.get("props", {}).get("pageProps", {})
    page_data  = page_props.get("pageData") or {}
    page_data_inner = page_data.get("data") if isinstance(page_data, dict) else {}

    listing = None
    candidates = [
        page_props.get("listing"),
        page_props.get("property"),
        page_props.get("unit"),
        page_data.get("listing") if isinstance(page_data, dict) else None,
        page_data.get("property") if isinstance(page_data, dict) else None,
        page_data.get("listingDetail") if isinstance(page_data, dict) else None,
        page_data_inner.get("listing") if isinstance(page_data_inner, dict) else None,
        page_data_inner.get("property") if isinstance(page_data_inner, dict) else None,
        page_data_inner if isinstance(page_data_inner, dict) and page_data_inner.get("title") else None,
        page_props.get("data", {}).get("listing") if isinstance(page_props.get("data"), dict) else None,
        page_props.get("initialData", {}).get("listing") if isinstance(page_props.get("initialData"), dict) else None,
    ]
    for c in candidates:
        if isinstance(c, dict) and c:
            listing = c
            break

    if not listing:
        listing = _deep_find(raw, lambda d: d.get("title") and d.get("attributes")) or {}

    result: dict = {}
    result["title"] = listing.get("title") or listing.get("name") or ""

    price_raw = (
        listing.get("price")
        or listing.get("listingPrice")
        or listing.get("priceFormatted")
        or listing.get("rentalPrice")
        or ""
    )
    if isinstance(price_raw, (int, float)):
        price_raw = f"RM {price_raw:,.0f}"
    result["price"] = str(price_raw)

    attrs = listing.get("attributes") or listing.get("details") or {}
    if isinstance(attrs, dict):
        result["bedrooms"]  = _safe_int(attrs.get("bedrooms") or attrs.get("bedroom") or 0)
        result["bathrooms"] = _safe_int(attrs.get("bathrooms") or attrs.get("bathroom") or 0)
        result["parking"]   = _safe_int(attrs.get("parking") or attrs.get("carPark") or 0)
        sqft_raw = attrs.get("floorSize") or attrs.get("landSize") or attrs.get("size") or ""
        result["sqft"] = str(sqft_raw).replace(",", "") if sqft_raw else ""

    fac_raw = listing.get("facilities") or listing.get("amenities") or []
    if isinstance(fac_raw, list):
        result["facilities"] = [
            f.get("name") or f if isinstance(f, dict) else str(f)
            for f in fac_raw if f
        ]

    result["description"] = (
        listing.get("description")
        or listing.get("about")
        or listing.get("listingDescription")
        or ""
    )

    agent = listing.get("agent") or listing.get("advertiser") or {}
    if isinstance(agent, dict):
        result["agentName"]   = agent.get("name") or agent.get("displayName") or ""
        result["agentPhone"]  = agent.get("phone") or agent.get("mobile") or ""
        result["agentAgency"] = agent.get("agency") or agent.get("agencyName") or ""

    return result


def _deep_find(obj, predicate, _depth=0):
    if _depth > 8:
        return None
    if isinstance(obj, dict):
        if predicate(obj):
            return obj
        for v in obj.values():
            r = _deep_find(v, predicate, _depth + 1)
            if r is not None:
                return r
    elif isinstance(obj, list):
        for item in obj:
            r = _deep_find(item, predicate, _depth + 1)
            if r is not None:
                return r
    return None


# ── Price ─────────────────────────────────────────────────────────────────────

def _scrape_price(soup: BeautifulSoup, page_text: str) -> str:
    for attr_val in ["price-amount", "listing-price"]:
        el = soup.find(attrs={"da-id": attr_val})
        if el:
            t = el.get_text(strip=True)
            if "RM" in t:
                return t
    for el in soup.find_all(class_=re.compile(r"listing.?price|Price", re.IGNORECASE)):
        t = el.get_text(strip=True)
        if "RM" in t:
            return t
    m = re.search(r'RM\s*[\d,]{3,}(?:\s*/\s*\w+)?', page_text)
    return m.group(0).strip() if m else ""


# ── Description ───────────────────────────────────────────────────────────────

def _extract_description(soup: BeautifulSoup, page_text: str) -> str:
    # [da-id] elements
    for el in soup.find_all(attrs={"da-id": True}):
        da_id = (el.get("da-id") or "").lower()
        if "description" in da_id or "about" in da_id:
            t = el.get_text(strip=True)
            if len(t) > 30:
                return t

    # Class-based
    for cls_re in [r"ListingDescription", r"listing-description", r"DescriptionContent", r"description-content"]:
        el = soup.find(class_=re.compile(cls_re))
        if el:
            t = el.get_text(strip=True)
            if len(t) > 30:
                return t

    for testid in ["description", "about"]:
        el = soup.find(attrs={"data-testid": re.compile(testid)})
        if el:
            t = el.get_text(strip=True)
            if len(t) > 30:
                return t

    el = soup.find(class_="listing-details__description")
    if el:
        t = el.get_text(strip=True)
        if len(t) > 30:
            return t

    # Page-text regex
    m = re.search(
        r'(?:^|\n)(?:About|About this (?:property|unit)|Description|Listing Description)\s*\n'
        r'([\s\S]{50,1200}?)(?=\n{2,}|\nFacilities|\nCommon|\nAgent|\nListed by|\nContact|\Z)',
        page_text, re.IGNORECASE | re.MULTILINE,
    )
    if m:
        return m.group(1).strip()

    return ""


# ── Agent ─────────────────────────────────────────────────────────────────────

def _extract_agent_name(soup: BeautifulSoup, page_text: str) -> str:
    for attr_val in ["agent-name", "agent-card-name", "enquiry-widget-agent-name"]:
        el = soup.find(attrs={"da-id": attr_val})
        if el:
            t = el.get_text(strip=True)
            if t:
                return t

    for cls_re in [r"AgentName", r"agent-name"]:
        el = soup.find(class_=re.compile(cls_re))
        if el:
            t = el.get_text(strip=True)
            if t:
                return t

    for el in soup.find_all(attrs={"da-id": True}):
        da_id = (el.get("da-id") or "").lower()
        if "agent" in da_id or "negotiator" in da_id or "advertiser" in da_id:
            for line in el.get_text(strip=True).split("\n"):
                t = line.strip()
                if (t and 2 < len(t) < 60
                        and not re.match(r'^[0-9+]', t)
                        and "whatsapp" not in t.lower()
                        and "enquir" not in t.lower()
                        and "call" not in t.lower()):
                    return t

    m = re.search(r'(?:Listed by|Contact agent)\s*\n([A-Z][A-Za-z\s.\-]{2,50})\n', page_text)
    if m:
        return m.group(1).strip()

    return ""


def _extract_phone(soup: BeautifulSoup, page_text: str) -> str:
    for a in soup.find_all("a", href=re.compile(r"wa\.me")):
        href = a.get("href", "")
        m = re.search(r'wa\.me/(\d{10,15})', href)
        if m:
            return m.group(1)
    cleaned = page_text.replace(" ", "").replace("-", "")
    m = re.search(r'(?:0[1-9]\d{7,9}|\+?60\d{8,10})', cleaned)
    return m.group(0) if m else ""


def _extract_agent_agency(soup: BeautifulSoup) -> str:
    el = soup.find(attrs={"da-id": "agent-agency-name"})
    return el.get_text(strip=True) if el else ""


# ── Facilities ────────────────────────────────────────────────────────────────

def _extract_facilities(soup: BeautifulSoup, page_text: str, desc_text: str = "") -> list[str]:
    candidates: list[str] = []

    els = soup.find_all(attrs={"da-id": "amenity-tag"})
    if not els:
        els = soup.find_all(class_=re.compile(r"AmenityTag|FacilityTag"))
    if els:
        candidates = [e.get_text(strip=True) for e in els if e.get_text(strip=True)]

    common_m = re.search(r'[Cc]ommon\s+facilities?\s*\n(.*?)(?:\n{3,}|Agent|\Z)', page_text, re.DOTALL)
    if common_m:
        for line in common_m.group(1).splitlines():
            line = line.strip()
            if line and len(line) > 2 and not _ICON_RE.match(line):
                candidates.append(line)

    for text in [desc_text, page_text]:
        m = re.search(r'[Oo]ther\s+facilities?:?\s*(.+?)(?:\n\n|\Z)', text, re.DOTALL)
        if m:
            for item in re.split(r'[,\n]+', m.group(1)):
                item = item.strip().strip('-').strip()
                if item and len(item) > 2 and not _ICON_RE.match(item):
                    candidates.append(item.capitalize())
            break

    return [f for f in _dedup(candidates)
            if not re.fullmatch(r'[\d,\s]+', f) and not _ICON_RE.match(f)][:20]


# ── Nearby ────────────────────────────────────────────────────────────────────

def _extract_nearby(text: str) -> list[str]:
    out: list[str] = []
    for m in re.finditer(
        r'[-•]\s*([A-Za-z][^\n(]{4,80}?)\s*\(\s*(?:within\s*)?[\d]+\s*[Mm]in[^)]*\)',
        text,
    ):
        out.append(m.group(1).strip())
    for m in re.finditer(r'\d+\)\s*([A-Z][^\n]{4,60})', text):
        out.append(m.group(1).strip())
    return _dedup(out)[:10]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_sqft(page_text: str) -> str:
    m = re.search(r'([\d,]+)\s*sqft', page_text, re.IGNORECASE)
    return m.group(1).replace(",", "") if m else ""


def _is_listing_image(src: str) -> bool:
    if not src or src.endswith(".gif") or src.endswith(".svg"):
        return False
    low = src.lower()
    return any(k in low for k in ("/photos/", "/photo/", "/listing/", "iproperty", "iprop", "my-iproperty"))


def _safe_int(v) -> int:
    try:
        return int(str(v).replace(",", "").strip() or 0)
    except Exception:
        return 0


def _first_int(text: str, pattern: str) -> int:
    m = re.search(pattern, text)
    return int(m.group(1)) if m else 0


def _dedup(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for i in items:
        if i not in seen:
            seen.add(i)
            out.append(i)
    return out
