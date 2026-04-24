import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def make_driver() -> webdriver.Remote | webdriver.Chrome:
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
    remote_url = os.environ.get("SELENIUM_REMOTE_URL")
    if remote_url:
        driver = webdriver.Remote(command_executor=remote_url, options=opts)
    else:
        driver = webdriver.Chrome(options=opts)
    driver.set_page_load_timeout(30)
    return driver


def wait_for(driver: webdriver.Chrome, css: str, timeout: int = 10):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, css))
    )


def safe_text(driver: webdriver.Chrome, css: str, default: str = "") -> str:
    try:
        el = driver.find_element(By.CSS_SELECTOR, css)
        return el.text.strip()
    except Exception:
        return default


def safe_attr(driver: webdriver.Chrome, css: str, attr: str, default: str = "") -> str:
    try:
        el = driver.find_element(By.CSS_SELECTOR, css)
        return (el.get_attribute(attr) or "").strip()
    except Exception:
        return default


def safe_texts(driver: webdriver.Chrome, css: str) -> list[str]:
    try:
        els = driver.find_elements(By.CSS_SELECTOR, css)
        return [e.text.strip() for e in els if e.text.strip()]
    except Exception:
        return []


def safe_attrs(driver: webdriver.Chrome, css: str, attr: str) -> list[str]:
    try:
        els = driver.find_elements(By.CSS_SELECTOR, css)
        return [e.get_attribute(attr) or "" for e in els if e.get_attribute(attr)]
    except Exception:
        return []
