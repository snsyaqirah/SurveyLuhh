"""iProperty Malaysia scraper — JSON-LD + click-expand + regex fallback."""
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

        # Expand all collapsed sections before extracting
        _expand_all(driver)
        time.sleep(1.5)

        soup = BeautifulSoup(driver.page_source, "html.parser")
        page_text = driver.find_element(By.TAG_NAME, "body").text

        # ── Title ──────────────────────────────────────────────────────────
        h1 = soup.find("h1")
        title = h1.get_text(strip=True) if h1 else ""

        # ── Price ──────────────────────────────────────────────────────────
        # Require 3+ digit chars so "RM 0.81 psf" (1 digit before decimal) is skipped
        price = ""
        m = re.search(r'RM\s*[\d,]{3,}(?:\s*/\s*\w+)?', page_text)
        if m:
            price = m.group(0).strip()

        # ── Images ─────────────────────────────────────────────────────────
        images: list[str] = []
        for img in soup.find_all("img"):
            src = img.get("data-src") or img.get("src") or ""
            if _is_listing_image(src):
                images.append(src)
        images = _dedup(images)[:20]

        # ── Property details — regex first, JSON-LD as last resort ────────────
        # Regex is more reliable; JSON-LD on multi-unit listings can be wrong
        bedrooms = _first_int(page_text, r'(\d+)\s*(?:[Bb]eds?\b|[Bb]edrooms?|BEDS?)')
        bathrooms = _first_int(page_text, r'(\d+)\s*(?:[Bb]aths?\b|[Bb]athrooms?|BATHS?)')
        parking = _first_int(page_text, r'(\d+)\s*(?:parking\s*lots?|car\s*parks?|car\s*park\b)')

        sqft = ""
        m2 = re.search(r'([\d,]+)\s*sqft', page_text, re.IGNORECASE)
        if m2:
            sqft = m2.group(1).replace(",", "")  # store as plain number; frontend adds " sqft"

        # Fall back to JSON-LD only if regex found nothing
        if not bedrooms or not bathrooms:
            jl_beds, jl_baths, jl_sqft, _ = _from_jsonld(soup)
            bedrooms = bedrooms or jl_beds
            bathrooms = bathrooms or jl_baths
            sqft = sqft or jl_sqft

        # ── Facilities ──────────────────────────────────────────────────────
        facilities = _extract_facilities(driver, page_text)

        # ── Nearby places ───────────────────────────────────────────────────
        nearby = _extract_nearby(page_text)

        # ── Agent ───────────────────────────────────────────────────────────
        agent_name, phone = _extract_agent(driver)

        return {
            "title": title,
            "price": price,
            "images": images,
            "details": {
                "sqft": sqft,
                "bedrooms": bedrooms,
                "bathrooms": bathrooms,
                "parking": parking,
            },
            "facilities": facilities,
            "nearbyPlaces": nearby,
            "agent": {"name": agent_name, "phone": phone},
        }
    finally:
        driver.quit()


# ── Expand hidden sections ─────────────────────────────────────────────────

def _expand_all(driver) -> None:
    phrases = [
        "see all details", "see all features", "see all",
        "see more", "show more", "read more", "view all",
    ]
    for phrase in phrases:
        try:
            xpath = (
                f"//button[contains(translate(normalize-space(text()),"
                f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{phrase}')]"
                f"|//a[contains(translate(normalize-space(text()),"
                f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{phrase}')]"
                f"|//span[contains(translate(normalize-space(text()),"
                f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'{phrase}')]"
            )
            for el in driver.find_elements(By.XPATH, xpath):
                try:
                    driver.execute_script("arguments[0].scrollIntoView(true);", el)
                    driver.execute_script("arguments[0].click();", el)
                    time.sleep(0.4)
                except Exception:
                    pass
        except Exception:
            pass


# ── JSON-LD extraction ─────────────────────────────────────────────────────

def _from_jsonld(soup: BeautifulSoup) -> tuple[int, int, str, int]:
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, list):
                data = next((d for d in data if isinstance(d, dict)), {})
            beds = int(data.get("numberOfBedrooms", 0) or 0)
            baths = int(
                data.get("numberOfBathroomsTotal", 0)
                or data.get("numberOfBathrooms", 0)
                or 0
            )
            sqft = ""
            fs = data.get("floorSize", {})
            if isinstance(fs, dict) and fs.get("value"):
                sqft = str(fs["value"])  # plain number; frontend adds " sqft"
            if beds or baths or sqft:
                return beds, baths, sqft, 0
        except Exception:
            pass
    return 0, 0, "", 0


# ── Facilities ─────────────────────────────────────────────────────────────

_ICON_PATTERN = re.compile(r'^[\w]+-[\w-]+$')  # matches "asterisk-o", "check-small-f" etc.


def _extract_facilities(driver, page_text: str) -> list[str]:
    candidates: list[str] = []

    # Try CSS selectors (class-based)
    for sel in [
        "[data-testid='amenity-tag']", "[data-testid='amenity-item']",
        "[class*='AmenityTag']", "[class*='FacilityTag']",
        "[class*='amenity-tag']", "[class*='facility-tag']",
    ]:
        els = driver.find_elements(By.CSS_SELECTOR, sel)
        if els:
            candidates = [e.text.strip() for e in els if e.text.strip()]
            break

    # Parse "Common facilities" block from page text
    # Lines look like: "asterisk-o\n24-hour security\n\nasterisk-o\nBbq"
    common_m = re.search(
        r'[Cc]ommon\s+facilities?\s*\n(.*?)(?:\n{3,}|Agent|Edward|\Z)',
        page_text, re.DOTALL
    )
    if common_m:
        for line in common_m.group(1).splitlines():
            line = line.strip()
            if line and len(line) > 2 and not _ICON_PATTERN.match(line):
                candidates.append(line.capitalize())

    # "Other facilities: basketball court, music room, study room"
    other_m = re.search(r'[Oo]ther\s+facilities?:?\s*(.+?)(?:\n\n|\Z)', page_text, re.DOTALL)
    if other_m:
        for item in re.split(r'[,\n]+', other_m.group(1)):
            item = item.strip().strip('-').strip()
            if item and len(item) > 2 and not _ICON_PATTERN.match(item):
                candidates.append(item.capitalize())

    # Filter: remove pure digits and icon class names
    return [f for f in _dedup(candidates)
            if not re.fullmatch(r'[\d,\s]+', f) and not _ICON_PATTERN.match(f)][:20]


# ── Nearby places ──────────────────────────────────────────────────────────

def _extract_nearby(page_text: str) -> list[str]:
    out: list[str] = []

    # "- Alice Smith International school (3 Min)"
    for m in re.finditer(
        r'[-•]\s*([A-Za-z][^\n(]{4,80}?)\s*\(\s*(?:within\s*)?[\d]+\s*[Mm]in[^)]*\)',
        page_text,
    ):
        out.append(m.group(1).strip())

    # "1) IOI City Mall, Putrajaya"
    for m in re.finditer(r'\d+\)\s*([A-Z][^\n]{4,60})', page_text):
        out.append(m.group(1).strip())

    return _dedup(out)[:10]


# ── Agent ──────────────────────────────────────────────────────────────────

def _extract_agent(driver) -> tuple[str, str]:
    agent_name = ""
    for sel in ["[data-testid='agent-name']", "[class*='AgentName']", ".agent-name"]:
        v = safe_text(driver, sel)
        if v:
            agent_name = v
            break

    try:
        btn = driver.find_element(By.CSS_SELECTOR,
            "[data-testid='reveal-phone'],[class*='RevealPhone'],.reveal-phone-btn")
        driver.execute_script("arguments[0].click();", btn)
        time.sleep(1.5)
    except Exception:
        pass

    phone = ""
    for sel in ["[data-testid='agent-phone']", "[class*='AgentPhone']",
                ".agent-phone", ".phone-number"]:
        v = safe_text(driver, sel)
        if v:
            phone = v
            break

    return agent_name, phone


# ── Helpers ────────────────────────────────────────────────────────────────

def _is_listing_image(src: str) -> bool:
    if not src or src.endswith(".gif") or src.endswith(".svg"):
        return False
    low = src.lower()
    return any(k in low for k in ("/photos/", "/photo/", "/listing/", "iproperty", "iprop"))


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
