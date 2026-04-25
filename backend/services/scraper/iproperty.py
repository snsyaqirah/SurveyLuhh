"""iProperty Malaysia scraper — __NEXT_DATA__ primary, DOM/regex fallback."""
import re
import json
import time
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from .base import make_driver, wait_for, safe_text


def scrape(url: str) -> dict:
    driver = make_driver()
    try:
        driver.get(url)
        wait_for(driver, "h1", timeout=15)
        time.sleep(2)

        soup = BeautifulSoup(driver.page_source, "html.parser")

        # ── Primary: extract from Next.js __NEXT_DATA__ JSON ───────────────
        nd = _from_next_data(soup)

        title        = nd.get("title") or safe_text(driver, "h1")
        price        = nd.get("price") or _scrape_price(driver)
        bedrooms     = nd.get("bedrooms", 0)
        bathrooms    = nd.get("bathrooms", 0)
        sqft         = nd.get("sqft", "")
        parking      = nd.get("parking", 0)
        facilities   = nd.get("facilities", [])
        description  = nd.get("description", "")
        agent_name   = nd.get("agentName", "")
        agent_phone  = nd.get("agentPhone", "")
        agent_agency = nd.get("agentAgency", "")

        # ── Images ─────────────────────────────────────────────────────────
        images: list[str] = []
        for img in soup.find_all("img"):
            src = img.get("data-src") or img.get("src") or ""
            if _is_listing_image(src):
                images.append(src)
        # Also grab from preload hints — highest quality
        for link in soup.find_all("link", rel="preload", as_="image"):
            href = link.get("href", "")
            if _is_listing_image(href):
                images.insert(0, href)
        images = _dedup(images)[:20]

        # ── Fallback: expand + DOM if __NEXT_DATA__ was incomplete ──────────
        if not bedrooms or not bathrooms or not sqft:
            _expand_all(driver)
            time.sleep(1.5)
            page_text = driver.find_element(By.TAG_NAME, "body").text

            if not bedrooms:
                bedrooms = (_stat_from_label(driver, "Beds", "Bed")
                            or _first_int(page_text, r'(\d+)\s*[Bb]eds?\b'))
            if not bathrooms:
                bathrooms = (_stat_from_label(driver, "Baths", "Bath")
                             or _first_int(page_text, r'(\d+)\s*[Bb]aths?\b'))
            if not sqft:
                m = re.search(r'([\d,]+)\s*sqft', page_text, re.IGNORECASE)
                if m:
                    sqft = m.group(1).replace(",", "")
            if not parking:
                parking = (_first_int(page_text, r'(\d+)\s*(?:parking\s*lots?|car\s*parks?|car\s*park\b)')
                           or _stat_from_label(driver, "Car Park", "Parking"))

        # ── Description: DOM direct → then modal fallback ──────────────────
        if not description:
            description = _extract_description_dom(driver)
        if not description:
            description = _extract_description(driver)

        # ── Facilities fallback ─────────────────────────────────────────────
        if not facilities:
            page_text = driver.find_element(By.TAG_NAME, "body").text
            facilities = _extract_facilities(driver, page_text, description)

        # ── Nearby from description ─────────────────────────────────────────
        nearby = _extract_nearby(description)
        if not nearby:
            page_text = driver.find_element(By.TAG_NAME, "body").text
            nearby = _extract_nearby(page_text)

        # ── Agent fallback ─────────────────────────────────────────────────
        if not agent_name:
            agent_name = _extract_agent_name(driver)
        if not agent_agency:
            try:
                agent_agency = driver.find_element(
                    By.CSS_SELECTOR, "[da-id='agent-agency-name']"
                ).text.strip()
            except Exception:
                pass
        if not agent_phone:
            agent_phone = _extract_phone(driver)

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
    finally:
        driver.quit()


# ── __NEXT_DATA__ extraction ───────────────────────────────────────────────

def _from_next_data(soup: BeautifulSoup) -> dict:
    """Parse the Next.js __NEXT_DATA__ JSON blob embedded in the page."""
    script = soup.find("script", id="__NEXT_DATA__")
    if not script or not script.string:
        return {}
    try:
        raw = json.loads(script.string)
    except Exception:
        return {}

    # Navigate to pageProps
    page_props = raw.get("props", {}).get("pageProps", {})
    page_data  = page_props.get("pageData") or {}
    page_data_inner = page_data.get("data") if isinstance(page_data, dict) else {}

    # Try to locate the listing object under various paths
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

    # Title
    result["title"] = (listing.get("title") or listing.get("name") or "")

    # Price
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

    # Attributes
    attrs = listing.get("attributes") or listing.get("details") or {}
    if isinstance(attrs, dict):
        result["bedrooms"]  = _safe_int(attrs.get("bedrooms") or attrs.get("bedroom") or 0)
        result["bathrooms"] = _safe_int(attrs.get("bathrooms") or attrs.get("bathroom") or 0)
        result["parking"]   = _safe_int(attrs.get("parking") or attrs.get("carPark") or 0)
        sqft_raw = attrs.get("floorSize") or attrs.get("landSize") or attrs.get("size") or ""
        result["sqft"] = str(sqft_raw).replace(",", "") if sqft_raw else ""

    # Facilities
    fac_raw = listing.get("facilities") or listing.get("amenities") or []
    if isinstance(fac_raw, list):
        result["facilities"] = [
            f.get("name") or f if isinstance(f, dict) else str(f)
            for f in fac_raw if f
        ]

    # Description
    result["description"] = (
        listing.get("description")
        or listing.get("about")
        or listing.get("listingDescription")
        or ""
    )

    # Agent
    agent = listing.get("agent") or listing.get("advertiser") or {}
    if isinstance(agent, dict):
        result["agentName"]   = agent.get("name") or agent.get("displayName") or ""
        result["agentPhone"]  = agent.get("phone") or agent.get("mobile") or ""
        result["agentAgency"] = agent.get("agency") or agent.get("agencyName") or ""

    return result


def _deep_find(obj, predicate, _depth=0):
    """Recursively search for a dict matching predicate (max depth 8)."""
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


# ── Price fallback ─────────────────────────────────────────────────────────

def _scrape_price(driver) -> str:
    for sel in ["[da-id='price-amount']", "[da-id='listing-price']", "[class*='listing-price']", "[class*='Price']"]:
        v = safe_text(driver, sel)
        if v and "RM" in v:
            return v.strip()
    page_text = driver.find_element(By.TAG_NAME, "body").text
    m = re.search(r'RM\s*[\d,]{3,}(?:\s*/\s*\w+)?', page_text)
    return m.group(0).strip() if m else ""


# ── Stat label extraction ──────────────────────────────────────────────────

def _stat_from_label(driver, *labels: str) -> int:
    for label in labels:
        try:
            els = driver.find_elements(By.XPATH, f"//*[normalize-space(text())='{label}']")
            for el in els:
                for xpath in ["..", "preceding-sibling::*[1]", "following-sibling::*[1]"]:
                    try:
                        target = el.find_element(By.XPATH, xpath)
                        m = re.search(r'(\d+)', target.text)
                        if m:
                            return int(m.group(1))
                    except Exception:
                        pass
        except Exception:
            pass
    return 0


# ── Expand hidden sections ─────────────────────────────────────────────────

def _expand_all(driver) -> None:
    phrases = ["see all details", "see all features", "see all", "view all"]
    for phrase in phrases:
        try:
            xpath = (
                f"//button[contains(translate(normalize-space(text()),"
                f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{phrase}')]"
                f"|//span[contains(translate(normalize-space(text()),"
                f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{phrase}')]"
            )
            for el in driver.find_elements(By.XPATH, xpath):
                try:
                    driver.execute_script("arguments[0].click();", el)
                    time.sleep(0.4)
                except Exception:
                    pass
        except Exception:
            pass


# ── Description modal ──────────────────────────────────────────────────────

def _extract_description(driver) -> str:
    try:
        xpath = (
            "//button[contains(translate(normalize-space(text()),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'see more')]"
            "|//span[contains(translate(normalize-space(text()),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'see more')]"
        )
        for btn in driver.find_elements(By.XPATH, xpath):
            try:
                driver.execute_script("arguments[0].click();", btn)
                time.sleep(1.2)
                for sel in [".description-modal-body", ".modal-body", "[class*='description-modal']"]:
                    els = driver.find_elements(By.CSS_SELECTOR, sel)
                    if els and els[0].text.strip():
                        text = els[0].text.strip()
                        # Close modal
                        try:
                            driver.find_element(By.CSS_SELECTOR,
                                "[class*='modal-close'],[aria-label='Close'],[aria-label='close']"
                            ).click()
                        except Exception:
                            pass
                        return text
            except Exception:
                pass
    except Exception:
        pass
    return ""


# ── Description DOM direct ────────────────────────────────────────────────

def _extract_description_dom(driver) -> str:
    # 1. JS: scan every [da-id] element for description/about
    try:
        text = driver.execute_script("""
            for (const el of document.querySelectorAll('[da-id]')) {
                const id = (el.getAttribute('da-id') || '').toLowerCase();
                if (id.includes('description') || id.includes('about')) {
                    const t = el.innerText.trim();
                    if (t.length > 30) return t;
                }
            }
            return null;
        """)
        if text and len(text) > 30:
            return text
    except Exception:
        pass

    # 2. CSS selectors
    for sel in [
        "[class*='ListingDescription']", "[class*='listing-description']",
        "[class*='DescriptionContent']", "[class*='description-content']",
        "[data-testid*='description']", "[data-testid*='about']",
        ".listing-details__description",
    ]:
        try:
            for el in driver.find_elements(By.CSS_SELECTOR, sel):
                t = el.text.strip()
                if t and len(t) > 30:
                    return t
        except Exception:
            pass

    # 3. Page-text regex: grab text block after an "About" heading
    try:
        page_text = driver.find_element(By.TAG_NAME, "body").text
        m = re.search(
            r'(?:^|\n)(?:About|About this (?:property|unit)|Description|Listing Description)\s*\n'
            r'([\s\S]{50,1200}?)(?=\n{2,}|\nFacilities|\nCommon|\nAgent|\nListed by|\nContact|\Z)',
            page_text, re.IGNORECASE | re.MULTILINE,
        )
        if m:
            return m.group(1).strip()
    except Exception:
        pass

    return ""


# ── Agent name DOM ────────────────────────────────────────────────────────

def _extract_agent_name(driver) -> str:
    # 1. Use JS to get only the direct text of [da-id='agent-name'] (excludes child elements)
    try:
        t = driver.execute_script("""
            const el = document.querySelector("[da-id='agent-name']");
            if (!el) return null;
            return Array.from(el.childNodes)
                .filter(n => n.nodeType === 3)
                .map(n => n.textContent.trim())
                .filter(t => t)
                .join(' ') || el.textContent.trim() || null;
        """)
        if t and t.strip():
            return t.strip()
    except Exception:
        pass

    # 2. CSS selectors (Selenium .text includes child text, use as broader fallback)
    for sel in [
        "[da-id='agent-name']", "[da-id='agent-card-name']",
        "[da-id='enquiry-widget-agent-name']",
        "[class*='AgentName']", "[class*='agent-name']", ".agent-name",
    ]:
        try:
            t = driver.find_element(By.CSS_SELECTOR, sel).text.strip()
            if t:
                return t
        except Exception:
            pass

    # 2. JS: scan [da-id] elements for agent (broader fallback)
    try:
        text = driver.execute_script("""
            for (const el of document.querySelectorAll('[da-id]')) {
                const id = (el.getAttribute('da-id') || '').toLowerCase();
                if (id.includes('agent') || id.includes('negotiator') || id.includes('advertiser')) {
                    const lines = el.innerText.trim().split('\\n');
                    for (const line of lines) {
                        const t = line.trim();
                        if (t && t.length > 2 && t.length < 60 && !/^[0-9+]/.test(t)
                            && !t.toLowerCase().includes('whatsapp')
                            && !t.toLowerCase().includes('enquir')
                            && !t.toLowerCase().includes('call')) {
                            return t;
                        }
                    }
                }
            }
            return null;
        """)
        if text:
            return text
    except Exception:
        pass

    # 3. Page-text regex after "Listed by" / "Agent" heading
    try:
        page_text = driver.find_element(By.TAG_NAME, "body").text
        m = re.search(
            r'(?:Listed by|Contact agent)\s*\n([A-Z][A-Za-z\s.\-]{2,50})\n',
            page_text,
        )
        if m:
            return m.group(1).strip()
    except Exception:
        pass

    return ""


# ── Facilities ─────────────────────────────────────────────────────────────

_ICON_RE = re.compile(r'^[\w]+-[\w-]+$')


def _extract_facilities(driver, page_text: str, desc_text: str) -> list[str]:
    candidates: list[str] = []
    for sel in ["[da-id='amenity-tag']", "[class*='AmenityTag']", "[class*='FacilityTag']"]:
        els = driver.find_elements(By.CSS_SELECTOR, sel)
        if els:
            candidates = [e.text.strip() for e in els if e.text.strip()]
            break

    common_m = re.search(
        r'[Cc]ommon\s+facilities?\s*\n(.*?)(?:\n{3,}|Agent|Edward|\Z)',
        page_text, re.DOTALL
    )
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


# ── Nearby ─────────────────────────────────────────────────────────────────

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


# ── Agent phone ────────────────────────────────────────────────────────────

def _extract_phone(driver) -> str:
    # Click WhatsApp button and capture the phone from the new tab URL
    original_handles = set(driver.window_handles)
    try:
        btn = driver.find_element(By.CSS_SELECTOR, "[da-id='enquiry-widget-whatsapp-btn']")
        driver.execute_script("arguments[0].click();", btn)
        time.sleep(3)
    except Exception:
        return ""

    new_handles = set(driver.window_handles) - original_handles
    for handle in new_handles:
        url = ""
        try:
            driver.switch_to.window(handle)
            url = driver.current_url
        except Exception:
            pass
        try:
            driver.close()
        except Exception:
            pass
        try:
            driver.switch_to.window(list(original_handles)[0])
        except Exception:
            pass
        m = re.search(r'phone=(\d{10,15})', url)
        if m:
            return m.group(1)

    # No new tab opened — nothing to capture
    return ""


# ── Helpers ────────────────────────────────────────────────────────────────

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
