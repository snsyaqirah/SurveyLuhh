"""PropertyGuru Malaysia scraper."""
import re
import time
import json
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from .base import make_stealth_driver, wait_for, safe_text


def scrape(url: str) -> dict:
    driver = make_stealth_driver()
    try:
        driver.get(url)
        wait_for(driver, "h1", timeout=15)
        time.sleep(3)

        soup = BeautifulSoup(driver.page_source, "html.parser")

        # ── Primary: __NEXT_DATA__ JSON ──────────────────────────────────────
        nd = _from_next_data(soup)

        title     = nd.get("title") or safe_text(driver, "[da-id='property-title']") or safe_text(driver, "h1")
        price     = nd.get("price") or safe_text(driver, "[da-id='price-amount']") or ""
        bedrooms  = nd.get("bedrooms",  0)
        bathrooms = nd.get("bathrooms", 0)
        sqft      = nd.get("sqft",      "")
        parking   = nd.get("parking",   0)
        facilities  = nd.get("facilities",  [])
        description = nd.get("description", "")

        # ── Images — DOM always has these ────────────────────────────────────
        images: list[str] = []
        for sel in ["[da-id='media-carousel-img']", "[da-id='media-gallery-images']"]:
            for el in driver.find_elements(By.CSS_SELECTOR, sel):
                src = el.get_attribute("src") or ""
                if _is_pg_image(src):
                    images.append(src)
        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src") or ""
            if _is_pg_image(src):
                images.append(src)
        images = _dedup(images)[:20]

        # ── Parking fallback — open "See all details" modal ──────────────────
        if not parking:
            if _click_by_text(driver, "see all details", "all details"):
                time.sleep(1)
                try:
                    for el in driver.find_elements(By.CSS_SELECTOR, "[da-id='property-modal-value']"):
                        m = re.search(r'(\d+)\s*parking', el.text, re.IGNORECASE)
                        if m:
                            parking = int(m.group(1))
                            break
                except Exception:
                    pass
                _close_modal(driver)

        # ── Facilities fallback — click amenities / facilities buttons ────────
        if not facilities:
            for keyword in ["amenities", "facilities"]:
                if _click_by_text(driver, keyword):
                    time.sleep(1)
                    for el in driver.find_elements(
                        By.CSS_SELECTOR,
                        "[da-id='facilities-amenities-modal-data'] .amenities-facilties-modal-body-value",
                    ):
                        t = el.text.strip()
                        if t:
                            facilities.append(t)
                    _close_modal(driver)
            facilities = _dedup(facilities)[:20]

        # ── Description fallback — click "See more" ───────────────────────────
        if not description:
            if _click_by_text(driver, "see more"):
                time.sleep(1.5)
                try:
                    modal = driver.find_element(By.CSS_SELECTOR, ".description-modal-body")
                    description = driver.execute_script(
                        "return arguments[0].innerText;", modal
                    ).strip()
                except Exception:
                    pass
                _close_modal(driver)

        # ── Fallback: page-text for beds/baths/sqft/parking ──────────────────
        if not bedrooms or not bathrooms or not sqft:
            try:
                page_text = driver.find_element(By.TAG_NAME, "body").text
                if not bedrooms:
                    m = re.search(r'(\d+)\s*[Bb]eds?\b', page_text)
                    bedrooms = int(m.group(1)) if m else 0
                if not bathrooms:
                    m = re.search(r'(\d+)\s*[Bb]aths?\b', page_text)
                    bathrooms = int(m.group(1)) if m else 0
                if not sqft:
                    m = re.search(r'([\d,]+)\s*sqft', page_text, re.IGNORECASE)
                    sqft = m.group(1).replace(",", "") if m else ""
                if not parking:
                    m = re.search(r'(\d+)\s*(?:parking\s*lots?|car\s*parks?)', page_text, re.IGNORECASE)
                    parking = int(m.group(1)) if m else 0
            except Exception:
                pass

        # ── Nearby ────────────────────────────────────────────────────────────
        nearby = _extract_nearby(description)
        if not nearby:
            try:
                page_text = driver.find_element(By.TAG_NAME, "body").text
                nearby = _extract_nearby(page_text)
            except Exception:
                pass

        # ── Agent ─────────────────────────────────────────────────────────────
        agent_name   = nd.get("agentName")   or _extract_agent_name(driver, description)
        agent_agency = nd.get("agentAgency") or _extract_agent_agency(driver, description)
        agent_phone  = nd.get("agentPhone")  or _extract_phone(driver)

        return {
            "title":        title,
            "price":        price,
            "images":       images,
            "description":  description,
            "details": {
                "sqft":      sqft,
                "bedrooms":  bedrooms,
                "bathrooms": bathrooms,
                "parking":   parking,
            },
            "facilities":   facilities,
            "nearbyPlaces": nearby,
            "agent":        {"name": agent_name, "phone": agent_phone, "agency": agent_agency},
        }
    finally:
        driver.quit()


# ── __NEXT_DATA__ extraction ───────────────────────────────────────────────

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
        page_props.get("listingData"),
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
        listing = _deep_find(raw, lambda d: d.get("title") and (d.get("attributes") or d.get("bedroom") is not None)) or {}

    result: dict = {}

    # Title
    result["title"] = listing.get("title") or listing.get("name") or ""

    # Price
    price_raw = (
        listing.get("formattedPrice")
        or listing.get("price")
        or listing.get("listingPrice")
        or listing.get("priceFormatted")
        or listing.get("rentalPrice")
        or ""
    )
    if isinstance(price_raw, (int, float)):
        price_raw = f"RM {price_raw:,.0f}"
    result["price"] = str(price_raw)

    # Attributes (PropertyGuru stores directly on listing OR in an attributes dict)
    attrs = listing.get("attributes") or listing.get("details") or {}
    if isinstance(attrs, dict):
        result["bedrooms"]  = _safe_int(attrs.get("bedrooms") or attrs.get("bedroom") or 0)
        result["bathrooms"] = _safe_int(attrs.get("bathrooms") or attrs.get("bathroom") or 0)
        result["parking"]   = _safe_int(attrs.get("parking") or attrs.get("carPark") or 0)
        sqft_raw = attrs.get("floorSize") or attrs.get("landSize") or attrs.get("size") or ""
        result["sqft"] = str(sqft_raw).replace(",", "") if sqft_raw else ""
    else:
        # PropertyGuru sometimes puts these directly on the listing object
        result["bedrooms"]  = _safe_int(listing.get("bedroom") or listing.get("bedrooms") or 0)
        result["bathrooms"] = _safe_int(listing.get("bathroom") or listing.get("bathrooms") or 0)
        result["parking"]   = _safe_int(listing.get("carPark") or listing.get("parking") or 0)
        sqft_raw = listing.get("floorSize") or listing.get("builtUpSize") or listing.get("landSize") or ""
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
    agent = listing.get("agent") or listing.get("advertiser") or listing.get("negotiator") or {}
    if isinstance(agent, dict):
        result["agentName"]   = agent.get("name") or agent.get("displayName") or ""
        result["agentPhone"]  = agent.get("phone") or agent.get("mobile") or ""
        result["agentAgency"] = (
            agent.get("agency") or agent.get("agencyName")
            or (agent.get("agencyInfo") or {}).get("name") if isinstance(agent.get("agencyInfo"), dict) else ""
            or ""
        )

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


# ── Button / modal helpers ─────────────────────────────────────────────────

def _click_by_text(driver, *keywords: str) -> bool:
    for k in keywords:
        lc = k.lower()
        xpath = (
            f"//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ',"
            f"'abcdefghijklmnopqrstuvwxyz'),'{lc}')]"
            f"|//span[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ',"
            f"'abcdefghijklmnopqrstuvwxyz'),'{lc}')]"
        )
        try:
            for el in driver.find_elements(By.XPATH, xpath):
                if el.is_displayed():
                    driver.execute_script("arguments[0].click();", el)
                    return True
        except Exception:
            pass
    return False


def _close_modal(driver) -> None:
    for sel in [
        "[aria-label='Close']", "[aria-label='close']",
        "[class*='modal-close']", "[class*='close-btn']",
        "[da-id='modal-close']", "button[class*='close']",
    ]:
        try:
            el = driver.find_element(By.CSS_SELECTOR, sel)
            if el.is_displayed():
                driver.execute_script("arguments[0].click();", el)
                time.sleep(0.4)
                return
        except Exception:
            pass
    try:
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(0.3)
    except Exception:
        pass


# ── Nearby ─────────────────────────────────────────────────────────────────

def _extract_nearby(text: str) -> list[str]:
    out: list[str] = []
    for m in re.finditer(
        r'[•\-]\s*[\d–\-]+\s*min\s+(?:drive\s+to|to)\s+([A-Za-z][^\n•\-]{4,80})',
        text,
    ):
        out.append(m.group(1).strip().rstrip('.'))
    for m in re.finditer(
        r'[-•]\s*([A-Za-z][^\n(]{4,80}?)\s*\(\s*(?:within\s*)?[\d]+\s*[Mm]in[^)]*\)',
        text,
    ):
        out.append(m.group(1).strip())
    for m in re.finditer(r'\d+\)\s*([A-Z][^\n]{4,60})', text):
        out.append(m.group(1).strip())
    return _dedup(out)[:10]


# ── Agent helpers ──────────────────────────────────────────────────────────

def _extract_agent_name(driver, description: str) -> str:
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

    for sel in ["[da-id='agent-name']", ".agent-name", "[class*='AgentName']"]:
        try:
            t = driver.find_element(By.CSS_SELECTOR, sel).text.strip()
            if t:
                return t
        except Exception:
            pass

    m = re.search(
        r'Contact Details[:\s]*\n\s*[•\-]?\s*([A-Z][A-Za-z\s]{2,40})\n',
        description,
    )
    if m:
        return m.group(1).strip()

    return ""


def _extract_agent_agency(driver, description: str) -> str:
    for sel in ["[da-id='agent-agency-name']", ".agent-agency", "[class*='AgencyName']"]:
        try:
            t = driver.find_element(By.CSS_SELECTOR, sel).text.strip()
            if t:
                return t
        except Exception:
            pass

    m = re.search(
        r'Contact Details[\s\S]{0,300}[•\-]\s*([A-Z][A-Za-z0-9\s&.,]+'
        r'(?:Sdn\.?\s*Bhd|Properties|Realty|Agency|Group)[A-Za-z0-9\s&.,]*)',
        description, re.IGNORECASE,
    )
    if m:
        return m.group(1).strip()

    return ""


def _extract_phone(driver) -> str:
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
    return ""


# ── Helpers ────────────────────────────────────────────────────────────────

def _is_pg_image(src: str) -> bool:
    if not src or src.endswith(".gif") or src.endswith(".svg"):
        return False
    return any(k in src.lower() for k in ("pgimgs.com", "propertyguru", "/listing/"))


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
