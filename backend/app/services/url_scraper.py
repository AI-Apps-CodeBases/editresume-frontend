"""URL scraper service for extracting job description content from job posting URLs"""

import logging
import re
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class URLScraper:
    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

    def is_valid_url(self, url: str) -> bool:
        try:
            result = urlparse(url)
            return all([result.scheme in ["http", "https"], result.netloc])
        except Exception:
            return False

    def _extract_linkedin_content(self, soup: BeautifulSoup) -> Optional[str]:
        selectors = [
            ".description__text",
            ".show-more-less-html__markup",
            ".jobs-description__text",
            "[data-test-id='job-description-text']",
            ".jobs-box__html-content",
        ]
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(separator="\n", strip=True)
                if len(text) > 100:
                    return text
        return None

    def _extract_indeed_content(self, soup: BeautifulSoup) -> Optional[str]:
        selectors = [
            "#jobDescriptionText",
            ".jobsearch-jobDescriptionText",
            "[data-testid='job-description']",
        ]
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(separator="\n", strip=True)
                if len(text) > 100:
                    return text
        return None

    def _extract_generic_content(self, soup: BeautifulSoup) -> Optional[str]:
        main_selectors = [
            "main",
            "[role='main']",
            ".main-content",
            "#main-content",
            ".content",
            "#content",
            "article",
            ".job-description",
            "#job-description",
            ".job-description-content",
        ]

        for selector in main_selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(separator="\n", strip=True)
                if len(text) > 200:
                    return text

        body_text = soup.get_text(separator="\n", strip=True)
        if len(body_text) > 200:
            return body_text

        return None

    def _clean_text(self, text: str) -> str:
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r" {2,}", " ", text)
        text = text.strip()
        return text

    def scrape_url(self, url: str) -> dict:
        if not self.is_valid_url(url):
            raise ValueError(f"Invalid URL: {url}")

        try:
            with httpx.Client(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                response = client.get(url)
                response.raise_for_status()

                soup = BeautifulSoup(response.content, "lxml")
                
                parsed_url = urlparse(url)
                domain = parsed_url.netloc.lower()

                content = None

                if "linkedin.com" in domain:
                    content = self._extract_linkedin_content(soup)
                elif "indeed.com" in domain:
                    content = self._extract_indeed_content(soup)

                if not content:
                    content = self._extract_generic_content(soup)

                if not content or len(content.strip()) < 100:
                    raise ValueError("Could not extract sufficient content from the URL")

                cleaned_content = self._clean_text(content)
                return {"success": True, "content": cleaned_content, "url": url}

        except httpx.TimeoutException:
            logger.error(f"Timeout while fetching URL: {url}")
            raise ValueError("Request timed out. The URL may be unreachable or taking too long to respond.")
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code} while fetching URL: {url}")
            raise ValueError(f"Failed to fetch URL: HTTP {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Request error while fetching URL: {url} - {str(e)}")
            raise ValueError(f"Failed to fetch URL: {str(e)}")
        except Exception as e:
            logger.error(f"Error scraping URL {url}: {str(e)}", exc_info=True)
            raise ValueError(f"Failed to scrape URL: {str(e)}")

