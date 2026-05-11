import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def make_stealth_driver():
    """Local undetected-chromedriver — bypasses Cloudflare WAF."""
    import re
    import subprocess
    import undetected_chromedriver as uc

    # Detect installed Chrome major version so uc downloads the matching ChromeDriver
    chrome_major = 0
    try:
        out = subprocess.check_output(
            ["google-chrome", "--version"], stderr=subprocess.DEVNULL
        ).decode()
        m = re.search(r"(\d+)\.", out)
        if m:
            chrome_major = int(m.group(1))
    except Exception:
        pass

    opts = uc.ChromeOptions()
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--disable-popup-blocking")
    # Run non-headless inside Xvfb virtual display — Cloudflare can't detect virtual display
    os.environ.setdefault("DISPLAY", ":99")

    kwargs: dict = dict(options=opts, headless=False, use_subprocess=False)
    if chrome_major:
        kwargs["version_main"] = chrome_major

    driver = uc.Chrome(**kwargs)
    driver.set_page_load_timeout(45)
    return driver


def make_driver() -> webdriver.Remote | webdriver.Chrome:
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1280,720")
    opts.add_argument("--disable-popup-blocking")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    # Reduce memory footprint for constrained cloud environments
    opts.add_argument("--single-process")
    opts.add_argument("--no-zygote")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--disable-background-networking")
    opts.add_argument("--disable-sync")
    opts.add_argument("--disable-translate")
    opts.add_argument("--disable-default-apps")
    opts.add_argument("--mute-audio")
    # Block image downloads — src attributes remain in HTML so scraping still works
    opts.add_argument("--blink-settings=imagesEnabled=false")
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    try:
        opts.add_experimental_option("excludeSwitches", ["enable-automation"])
        opts.add_experimental_option("useAutomationExtension", False)
    except Exception:
        pass
    remote_url = os.environ.get("SELENIUM_REMOTE_URL")
    if remote_url:
        driver = webdriver.Remote(command_executor=remote_url, options=opts)
    else:
        driver = webdriver.Chrome(options=opts)
    driver.set_page_load_timeout(60)
    # Patch navigator.webdriver via CDP (works with Selenium Grid 4 + standalone-chrome)
    try:
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});
                Object.defineProperty(navigator, 'languages', {get: () => ['en-US','en']});
                window.chrome = {runtime: {}};
            """
        })
    except Exception:
        pass
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
