"""iProperty Malaysia scraper."""
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

        # ── Price ──────────────────────────────────────────────────────────
        # Try specific element first (most reliable), then regex
        price = ""
        for sel in ["[da-id='listing-price']", "[class*='listing-price']",
                    "[class*='Price']", ".price"]:
            v = safe_text(driver, sel)
            if v and "RM" in v:
                price = v.strip()
                break
        if not price:
            soup_price = BeautifulSoup(driver.page_source, "html.parser")
            # require 3+ digit chars so "RM 0.81 psf" (1 digit before decimal) is skipped
            m = re.search(r'RM\s*[\d,]{3,}(?:\s*/\s*\w+)?',
                          driver.find_element(By.TAG_NAME, "body").text)
            if m:
                price = m.group(0).strip()

        # ── Images ─────────────────────────────────────────────────────────
        soup = BeautifulSoup(driver.page_source, "html.parser")
        images: list[str] = []
        for img in soup.find_all("img"):
            src = img.get("data-src") or img.get("src") or ""
            if _is_listing_image(src):
                images.append(src)
        images = _dedup(images)[:20]

        # ── Beds / Baths — target the stats elements directly ───────────────
        bedrooms = _stat_from_label(driver, "Beds", "Bed")
        bathrooms = _stat_from_label(driver, "Baths", "Bath")
        parking = _stat_from_label(driver, "Parking", "Car Park", "parking lots")

        # ── sqft ────────────────────────────────────────────────────────────
        sqft = ""
        page_text = driver.find_element(By.TAG_NAME, "body").text
        sqft_m = re.search(r'([\d,]+)\s*sqft', page_text, re.IGNORECASE)
        if sqft_m:
            sqft = sqft_m.group(1).replace(",", "")  # plain number; frontend adds " sqft"

        # ── Fallback to JSON-LD if element search found nothing ─────────────
        if not bedrooms or not bathrooms:
            jl_beds, jl_baths, jl_sqft = _from_jsonld(soup)
            bedrooms = bedrooms or jl_beds
            bathrooms = bathrooms or jl_baths
            sqft = sqft or jl_sqft

        # ── Expand hidden sections (see all / see more) ─────────────────────
        _expand_all(driver)
        time.sleep(1.5)

        # ── Description / About — may open in a modal ───────────────────────
        desc_text = _extract_description(driver)

        # ── Parking from description if not found via element ───────────────
        if not parking:
            parking = _first_int(desc_text or page_text,
                                 r'(\d+)\s*(?:car\s*park|parking\s*lots?)')

        # ── Facilities ──────────────────────────────────────────────────────
        # Re-read page text after expansions
        page_text = driver.find_element(By.TAG_NAME, "body").text
        facilities = _extract_facilities(driver, page_text, desc_text)

        # ── Nearby places ───────────────────────────────────────────────────
        nearby = _extract_nearby(desc_text or page_text)

        # ── Agent ───────────────────────────────────────────────────────────
        agent_name, phone = _extract_agent(driver)

        return {
            "title": safe_text(driver, "h1") or "",
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


# ── Stat label extraction ──────────────────────────────────────────────────

def _stat_from_label(driver, *labels: str) -> int:
    """Find elements whose text matches any label, return the adjacent number."""
    for label in labels:
        try:
            els = driver.find_elements(By.XPATH,
                f"//*[normalize-space(text())='{label}']")
            for el in els:
                # Number is usually in the parent or a sibling
                for xpath in ["..", "preceding-sibling::*[1]", "following-sibling::*[1]"]:
                    try:
                        target = el.find_element(By.XPATH, xpath)
                        m = re.search(r'(\d+)', target.text)
                        if m:
                            return int(m.group(1))
                    except Exception:
                        pass
                # Fallback: number in parent's full text
                try:
                    parent_text = el.find_element(By.XPATH, "..").text
                    m = re.search(r'(\d+)', parent_text)
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


# ── Description / About ────────────────────────────────────────────────────

def _extract_description(driver) -> str:
    """Click 'see more' to open the description modal and extract its text."""
    # Click any 'see more' button (description-specific)
    try:
        for xpath in [
            "//button[contains(translate(normalize-space(text()),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'see more')]",
            "//span[contains(translate(normalize-space(text()),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'see more')]",
        ]:
            btns = driver.find_elements(By.XPATH, xpath)
            for btn in btns:
                try:
                    driver.execute_script("arguments[0].click();", btn)
                    time.sleep(1)
                    # Look for the description modal
                    for modal_sel in [".description-modal-body", ".modal-body", "[class*='description-modal']"]:
                        modals = driver.find_elements(By.CSS_SELECTOR, modal_sel)
                        if modals and modals[0].text.strip():
                            text = modals[0].text
                            # Close the modal
                            try:
                                close = driver.find_element(By.CSS_SELECTOR,
                                    "[class*='modal-close'], [aria-label='Close'], [aria-label='close'], button.close")
                                close.click()
                            except Exception:
                                try:
                                    driver.find_element(By.TAG_NAME, "body").send_keys("")  # ESC
                                except Exception:
                                    pass
                            return text
                except Exception:
                    pass
    except Exception:
        pass
    return ""


# ── JSON-LD fallback ───────────────────────────────────────────────────────

def _from_jsonld(soup: BeautifulSoup) -> tuple[int, int, str]:
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
                sqft = str(fs["value"])
            if beds or baths or sqft:
                return beds, baths, sqft
        except Exception:
            pass
    return 0, 0, ""


# ── Facilities ─────────────────────────────────────────────────────────────

_ICON_RE = re.compile(r'^[\w]+-[\w-]+$')  # "asterisk-o", "check-small-f" etc.


def _extract_facilities(driver, page_text: str, desc_text: str) -> list[str]:
    candidates: list[str] = []

    # Try CSS class selectors
    for sel in ["[da-id='amenity-tag']", "[class*='AmenityTag']",
                "[class*='FacilityTag']", "[class*='amenity-tag']"]:
        els = driver.find_elements(By.CSS_SELECTOR, sel)
        if els:
            candidates = [e.text.strip() for e in els if e.text.strip()]
            break

    # Parse "Common facilities" block from page text
    common_m = re.search(
        r'[Cc]ommon\s+facilities?\s*\n(.*?)(?:\n{3,}|Agent|Edward|\Z)',
        page_text, re.DOTALL
    )
    if common_m:
        for line in common_m.group(1).splitlines():
            line = line.strip()
            if line and len(line) > 2 and not _ICON_RE.match(line):
                candidates.append(line)

    # "Other facilities: basketball court, music room, study room"
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


# ── Nearby places ──────────────────────────────────────────────────────────

def _extract_nearby(text: str) -> list[str]:
    out: list[str] = []
    # "- Alice Smith International school (3 Min)"
    for m in re.finditer(
        r'[-•]\s*([A-Za-z][^\n(]{4,80}?)\s*\(\s*(?:within\s*)?[\d]+\s*[Mm]in[^)]*\)',
        text,
    ):
        out.append(m.group(1).strip())
    # "1) IOI City Mall, Putrajaya"
    for m in re.finditer(r'\d+\)\s*([A-Z][^\n]{4,60})', text):
        out.append(m.group(1).strip())
    return _dedup(out)[:10]


# ── Agent ──────────────────────────────────────────────────────────────────

def _extract_agent(driver) -> tuple[str, str]:
    agent_name = ""
    for sel in ["[da-id='agent-name']", ".agent-name", "[class*='AgentName']"]:
        v = safe_text(driver, sel)
        if v:
            agent_name = v.strip()
            break

    phone = ""
    # Click the phone/call button and look for a phone number pattern
    try:
        phone_btn = driver.find_element(By.CSS_SELECTOR,
            "[da-id='enquiry-widget-phone-btn']")
        driver.execute_script("arguments[0].click();", phone_btn)
        time.sleep(2)
        # Phone number usually appears somewhere on page after reveal
        body_text = driver.find_element(By.TAG_NAME, "body").text
        phone_m = re.search(r'(?:\+?60|0)\d[\d\s-]{7,11}', body_text)
        if phone_m:
            phone = re.sub(r'[\s-]', '', phone_m.group(0))
    except Exception:
        pass

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
