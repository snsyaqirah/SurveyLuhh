"""PropertyGuru Malaysia scraper."""
import re
from selenium.webdriver.common.by import By
from .base import make_driver, wait_for, safe_text, safe_attr, safe_texts, safe_attrs


def scrape(url: str) -> dict:
    driver = make_driver()
    try:
        driver.get(url)
        wait_for(driver, "h1", timeout=15)

        title = safe_text(driver, "h1")

        # Price — try several selectors used across listing types
        price = (
            safe_text(driver, "[data-automation-id='listing-price']")
            or safe_text(driver, ".listing-price")
            or safe_text(driver, "span.price")
            or ""
        )

        # Images — main gallery images
        images = safe_attrs(driver, "ul.gallery-items img, [data-testid='gallery'] img", "src")
        # Deduplicate while preserving order
        seen: set[str] = set()
        images = [i for i in images if i and not i.endswith(".gif") and i not in seen and not seen.add(i)]  # type: ignore[func-returns-value]

        # Details
        sqft = ""
        bedrooms = 0
        bathrooms = 0
        parking = 0

        attribute_els = driver.find_elements(By.CSS_SELECTOR, "li[data-automation-id]")
        for el in attribute_els:
            aid = el.get_attribute("data-automation-id") or ""
            val = el.text.strip()
            if "bedroom" in aid.lower() or "bed" in aid.lower():
                bedrooms = _int(val)
            elif "bathroom" in aid.lower() or "bath" in aid.lower():
                bathrooms = _int(val)
            elif "car" in aid.lower() or "park" in aid.lower():
                parking = _int(val)
            elif "floor" in aid.lower() or "sqft" in aid.lower() or "sqm" in aid.lower() or "area" in aid.lower():
                sqft = val

        # Fallback: scrape the attributes table
        if not sqft:
            sqft = safe_text(driver, "[data-automation-id='floor-area']")
        if not bedrooms:
            bedrooms = _int(safe_text(driver, "[data-automation-id='bedrooms']"))
        if not bathrooms:
            bathrooms = _int(safe_text(driver, "[data-automation-id='bathrooms']"))

        # Facilities
        facilities = safe_texts(driver, "ul.facilities li, [data-testid='amenity-item']")

        # Nearby places
        nearby = safe_texts(driver, "[data-testid='nearby-place-item'], .nearby-place")

        # Agent — try to reveal phone first
        agent_name = safe_text(driver, "[data-testid='agent-name'], .agent-name, .agent-info h3")
        phone = ""
        try:
            reveal_btn = driver.find_element(By.CSS_SELECTOR, "[data-testid='reveal-phone'], .btn-reveal-phone")
            reveal_btn.click()
            import time; time.sleep(1)
            phone = safe_text(driver, "[data-testid='agent-phone'], .agent-phone")
        except Exception:
            phone = safe_text(driver, "[data-testid='agent-phone'], .agent-phone")

        return {
            "title": title,
            "price": price,
            "images": images[:20],
            "details": {"sqft": sqft, "bedrooms": bedrooms, "bathrooms": bathrooms, "parking": parking},
            "facilities": facilities[:20],
            "nearbyPlaces": nearby[:10],
            "agent": {"name": agent_name, "phone": phone},
        }
    finally:
        driver.quit()


def _int(val: str) -> int:
    digits = re.sub(r"[^\d]", "", val)
    return int(digits) if digits else 0
