"""Mudah.my scraper — data-testid DOM selectors primary, __NEXT_DATA__ fallback."""
import re
import json
import time
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from .base import make_driver


def scrape(url: str) -> dict:
    driver = make_driver()
    try:
        driver.get(url)
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='ad-price']"))
            )
        except Exception:
            pass
        time.sleep(1)

        soup = BeautifulSoup(driver.page_source, "html.parser")
        nd = _from_next_data(soup)

        # ── Title ──────────────────────────────────────────────────────────
        title = (
            nd.get("title")
            or _attr_text(soup, "description-header")
            or _attr_text(soup, "ad-title")
            or ""
        )

        # ── Price ──────────────────────────────────────────────────────────
        price_main = nd.get("price") or _attr_text(soup, "ad-price")
        if price_main and "month" not in price_main.lower():
            # Check sibling span for "per month"
            price_el = soup.find(attrs={"data-testid": "ad-price"})
            if price_el:
                nxt = price_el.find_next_sibling("span")
                if nxt and "month" in nxt.get_text().lower():
                    price_main = f"{price_main}/month"
        # Normalise: "RM 1,300 per month" → "RM 1,300/month"
        price_main = re.sub(r'\s+per\s+month', '/month', price_main or '', flags=re.IGNORECASE)
        price = price_main or ""

        # ── Stats ──────────────────────────────────────────────────────────
        sqft      = nd.get("sqft")      or _extract_number(_attr_text(soup, "ad-detail-size"))
        bedrooms  = nd.get("bedrooms")  or _safe_int(_extract_number(_attr_text(soup, "ad-detail-bed")))
        bathrooms = nd.get("bathrooms") or _safe_int(_extract_number(_attr_text(soup, "ad-detail-bath")))
        parking   = nd.get("parking")   or _extract_carpark(soup)

        # ── Description ────────────────────────────────────────────────────
        description = nd.get("description") or ""
        if not description:
            desc_el = soup.find(id="property-adview-description")
            if desc_el:
                description = _clean_description(desc_el)
        elif description:
            description = _clean_description_text(description)

        # ── Facilities ─────────────────────────────────────────────────────
        facilities = nd.get("facilities") or _extract_facilities(soup)

        # ── Nearby amenities ───────────────────────────────────────────────
        nearby = _extract_nearby_amenities(soup)
        if not nearby:
            nearby = _extract_nearby_from_desc(description)

        # ── Images ─────────────────────────────────────────────────────────
        images: list[str] = list(nd.get("imageUrls", []))
        if not images:
            images = _extract_images(soup)
        images = _dedup(images)[:20]

        # ── Agent ──────────────────────────────────────────────────────────
        agent_name  = nd.get("agentName")  or _extract_agent_name(soup)
        agent_phone = nd.get("agentPhone") or _extract_phone(soup, driver, description)

        return {
            "title":       title,
            "price":       price,
            "images":      images,
            "description": description,
            "details": {
                "sqft":      sqft,
                "bedrooms":  bedrooms,
                "bathrooms": bathrooms,
                "parking":   parking,
            },
            "facilities":   facilities,
            "nearbyPlaces": nearby,
            "agent":        {"name": agent_name, "phone": agent_phone, "agency": ""},
        }
    finally:
        driver.quit()


# ── __NEXT_DATA__ (best-effort, may be empty) ─────────────────────────────

def _from_next_data(soup: BeautifulSoup) -> dict:
    script = soup.find("script", id="__NEXT_DATA__")
    if not script or not script.string:
        return {}
    try:
        raw = json.loads(script.string)
    except Exception:
        return {}

    page_props = raw.get("props", {}).get("pageProps", {})
    ad = (
        page_props.get("ad")
        or page_props.get("listing")
        or page_props.get("adDetail")
        or _deep_find(raw, lambda d: bool(d.get("subject") or d.get("body")))
        or {}
    )
    advertiser = page_props.get("advertiser") or page_props.get("seller") or {}

    result: dict = {}
    result["title"] = ad.get("subject") or ad.get("title") or ""

    price_val  = ad.get("price") or ad.get("price_value") or ""
    price_type = (ad.get("price_type") or "").upper()
    if isinstance(price_val, (int, float)) and price_val:
        suffix = "/month" if price_type == "RENT" else ""
        result["price"] = f"RM {int(price_val):,}{suffix}"
    elif price_val:
        result["price"] = str(price_val)

    params = ad.get("params") or ad.get("attributes") or {}
    if isinstance(params, list):
        params = {p.get("param_key", ""): p.get("param_value", "") for p in params if isinstance(p, dict)}
    result["bedrooms"]  = _safe_int(params.get("bedroom_total") or params.get("bedrooms") or params.get("rooms") or 0)
    result["bathrooms"] = _safe_int(params.get("bathroom_total") or params.get("bathrooms") or 0)
    result["parking"]   = _safe_int(params.get("parking_total") or params.get("carpark") or params.get("parking") or 0)
    sqft_raw = params.get("size_sqft") or params.get("sqft") or params.get("land_area") or ""
    result["sqft"] = str(sqft_raw).replace(",", "") if sqft_raw else ""

    result["description"] = ad.get("body") or ad.get("description") or ""

    image_list = ad.get("images") or ad.get("photos") or []
    urls: list[str] = []
    for img in image_list:
        if isinstance(img, dict):
            u = img.get("image_url") or img.get("src") or img.get("url") or img.get("thumbnail") or ""
        else:
            u = str(img)
        if u and _is_mudah_image(u):
            urls.append(u)
    result["imageUrls"] = urls

    if isinstance(advertiser, dict):
        result["agentName"]  = advertiser.get("name") or advertiser.get("nickname") or ""
        result["agentPhone"] = str(advertiser.get("phone") or "")

    return result


# ── DOM helpers ───────────────────────────────────────────────────────────

def _attr_text(soup: BeautifulSoup, testid: str) -> str:
    el = soup.find(attrs={"data-testid": testid})
    return el.get_text(strip=True) if el else ""


def _extract_number(text: str) -> str:
    """'1,147 sq.ft' → '1147'"""
    m = re.search(r'[\d,]+', text)
    return m.group(0).replace(",", "") if m else ""


def _extract_carpark(soup: BeautifulSoup) -> int:
    """Find 'Carpark' label in property details grid and read adjacent value."""
    for p in soup.find_all("p"):
        if p.get_text(strip=True).lower() in ("carpark", "car park", "parking"):
            parent = p.find_parent()
            if parent:
                ps = parent.find_all("p")
                for i, s in enumerate(ps):
                    if s.get_text(strip=True).lower() in ("carpark", "car park", "parking") and i + 1 < len(ps):
                        return _safe_int(ps[i + 1].get_text(strip=True))
    return 0


def _extract_facilities(soup: BeautifulSoup) -> list[str]:
    items: list[str] = []
    for el in soup.select("[class*='ItemsWrapper']"):
        for p in el.find_all("p"):
            text = p.get_text(strip=True)
            if text and text not in ("•",):
                items.append(text)
    return _dedup(items)


def _extract_images(soup: BeautifulSoup) -> list[str]:
    out: list[str] = []
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or ""
        if _is_mudah_image(src):
            out.append(src)
    return out


def _extract_nearby_amenities(soup: BeautifulSoup) -> list[str]:
    """Extract place names from the Nearby Amenities accordion."""
    nearby: list[str] = []
    for content in soup.select("[class*='ContentContainer']"):
        for base in content.select("[class*='BaseContent']"):
            ps = base.find_all("p")
            for p in ps:
                text = p.get_text(strip=True)
                if text and text != "•" and len(text) > 4:
                    nearby.append(text)
    return _dedup(nearby)[:15]


def _extract_nearby_from_desc(text: str) -> list[str]:
    out: list[str] = []
    for m in re.finditer(
        r'[-•]\s*([A-Za-z][^\n(]{4,80}?)\s*\(\s*(?:within\s*)?[\d]+\s*[Mm]in[^)]*\)',
        text,
    ):
        out.append(m.group(1).strip())
    return _dedup(out)[:10]


def _extract_agent_name(soup: BeautifulSoup) -> str:
    for a in soup.find_all("a", attrs={"data-label": "pro_profile"}):
        span = a.find("span")
        if span:
            return span.get_text(strip=True)
    return ""


def _extract_phone(soup: BeautifulSoup, driver, description: str) -> str:
    # Call button — only use if unmasked (no asterisks)
    for btn in soup.find_all("button", attrs={"data-label": "call"}):
        text = btn.get_text(strip=True).replace("-", "").replace(" ", "")
        if re.match(r'^0\d{8,10}$', text):
            return text

    # Description text (agents sometimes embed their number)
    if description:
        m = re.search(r'(?:0[1-9]\d{7,9}|\+?60\d{8,10})', description.replace(" ", "").replace("-", ""))
        if m:
            return m.group(0)

    # Full page text
    try:
        page_text = driver.find_element(By.TAG_NAME, "body").text
        m = re.search(r'(?:0[1-9]\d{7,9}|\+?60\d{8,10})', page_text.replace(" ", "").replace("-", ""))
        if m:
            return m.group(0)
    except Exception:
        pass

    return ""


# ── Description cleaning ─────────────────────────────────────────────────

def _clean_description(el) -> str:
    """Convert BeautifulSoup element to clean text: <br> → newline, strip leading dashes."""
    for br in el.find_all("br"):
        br.replace_with("\n")
    raw = el.get_text(separator="", strip=False)
    return _clean_description_text(raw)


def _clean_description_text(text: str) -> str:
    lines = []
    for line in text.splitlines():
        line = line.strip()
        line = re.sub(r'^[-–—•]+\s*', '', line)
        if line:
            lines.append(line)
    return "\n".join(lines)


# ── Misc ──────────────────────────────────────────────────────────────────

def _is_mudah_image(src: str) -> bool:
    if not src or src.endswith(".gif") or src.endswith(".svg"):
        return False
    low = src.lower()
    return any(k in low for k in ("mudah", "rnudah", "imgix", "/ads/", "/photos/", "/listing/"))


def _safe_int(v) -> int:
    try:
        return int(str(v).replace(",", "").strip() or 0)
    except Exception:
        return 0


def _dedup(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for i in items:
        if i not in seen:
            seen.add(i)
            out.append(i)
    return out


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
