"""Mudah.my scraper — lighter site, BS4 first, Selenium fallback."""
import re
import requests
from bs4 import BeautifulSoup
from .base import make_driver, wait_for, safe_text, safe_texts, safe_attrs


_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}


def scrape(url: str) -> dict:
    # Try lightweight BS4 pass first
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=15)
        if resp.status_code == 200:
            result = _parse_bs4(resp.text, url)
            if result["title"]:
                return result
    except Exception:
        pass

    # Fall back to Selenium
    return _parse_selenium(url)


def _parse_bs4(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    title = _text(soup, "h1") or _text(soup, ".title")
    price = _text(soup, ".price-container") or _text(soup, "[data-track='price']") or ""

    images: list[str] = []
    for img in soup.select(".gallery img, .slider img, .ad-image img"):
        src = img.get("data-src") or img.get("src") or ""
        if src and "placeholder" not in src:
            images.append(src)

    # Details table
    sqft = ""
    bedrooms = 0
    bathrooms = 0
    for row in soup.select(".detail-list li, .attributes li, table tr"):
        label = row.get_text(" ", strip=True).lower()
        val = row.get_text(" ", strip=True)
        if "sqft" in label or "sq ft" in label or "size" in label:
            sqft = val
        elif "bedroom" in label or "bilik tidur" in label:
            bedrooms = _int(val)
        elif "bathroom" in label or "bilik air" in label:
            bathrooms = _int(val)

    agent_name = _text(soup, ".seller-name, .username, .agent-name") or ""
    phone = _text(soup, ".phone-number, .tel") or ""

    return {
        "title": title or "",
        "price": price,
        "images": list(dict.fromkeys(images))[:20],
        "details": {"sqft": sqft, "bedrooms": bedrooms, "bathrooms": 0, "parking": 0},
        "facilities": [],
        "nearbyPlaces": [],
        "agent": {"name": agent_name, "phone": phone},
    }


def _parse_selenium(url: str) -> dict:
    driver = make_driver()
    try:
        driver.get(url)
        wait_for(driver, "h1", timeout=15)

        title = safe_text(driver, "h1")
        price = safe_text(driver, ".price-container, [data-track='price']")
        images = safe_attrs(driver, ".gallery img, .slider img", "src")
        images = [i for i in images if i and "placeholder" not in i]

        agent_name = safe_text(driver, ".seller-name, .username")
        phone = ""
        try:
            from selenium.webdriver.common.by import By
            btn = driver.find_element(By.CSS_SELECTOR, ".phone-btn, .reveal-phone")
            btn.click()
            import time; time.sleep(1)
            phone = safe_text(driver, ".phone-number, .tel")
        except Exception:
            phone = safe_text(driver, ".phone-number, .tel")

        return {
            "title": title,
            "price": price,
            "images": images[:20],
            "details": {"sqft": "", "bedrooms": 0, "bathrooms": 0, "parking": 0},
            "facilities": [],
            "nearbyPlaces": [],
            "agent": {"name": agent_name, "phone": phone},
        }
    finally:
        driver.quit()


def _text(soup: BeautifulSoup, selector: str) -> str:
    el = soup.select_one(selector)
    return el.get_text(strip=True) if el else ""


def _int(val: str) -> int:
    digits = re.sub(r"[^\d]", "", val)
    return int(digits) if digits else 0
