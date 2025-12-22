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

    def _is_login_page(self, soup: BeautifulSoup, url: str) -> bool:
        """Detect if the page is a login/authentication page"""
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()
        
        # Check for LinkedIn login page indicators
        if "linkedin.com" in domain:
            page_text = soup.get_text(separator=" ", strip=True).lower()
            login_indicators = [
                "sign in",
                "sign in with apple",
                "join linkedin",
                "agree & join linkedin",
                "user agreement",
                "privacy policy",
                "cookie policy",
                "email or phone",
                "forgot password",
            ]
            # If we see multiple login indicators, it's likely a login page
            indicator_count = sum(1 for indicator in login_indicators if indicator in page_text)
            if indicator_count >= 3:
                return True
                
            # Check for specific LinkedIn login page elements
            login_selectors = [
                'input[name="session_key"]',
                'input[type="password"][name="session_password"]',
                'button[data-tracking-control-name="homepage-basic_sign-in-submit-btn"]',
            ]
            if any(soup.select_one(sel) for sel in login_selectors):
                return True
        
        # Check page title
        title_tag = soup.find('title')
        if title_tag:
            title_text = title_tag.get_text(strip=True).lower()
            if "sign in" in title_text or "login" in title_text:
                return True
        
        return False

    def _extract_linkedin_title(self, soup: BeautifulSoup) -> Optional[str]:
        selectors = [
            "h1.jobs-unified-top-card__job-title",
            "h1.job-details-jobs-unified-top-card__job-title",
            "h1.topcard__title",
            "h1[class*='job-title']",
            ".jobs-details-top-card__job-title",
            "h1",
        ]
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if text and len(text) > 0 and len(text) < 200:
                    return text
        return None

    def _extract_linkedin_company(self, soup: BeautifulSoup) -> Optional[str]:
        selectors = [
            "a.jobs-unified-top-card__company-name",
            "a.job-details-jobs-unified-top-card__company-name",
            "a.topcard__org-name-link",
            ".jobs-unified-top-card__company-name",
            ".jobs-details-top-card__company-name",
            "a[href*='/company/']",
            "[data-tracking-control-name*='org-name']",
        ]
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if text and len(text) > 0 and len(text) < 100:
                    cleaned = re.sub(r'[·|]', '', text).strip()
                    if cleaned and not any(word in cleaned.lower() for word in ['view', 'follow', 'company page']):
                        return cleaned
        return None

    def _extract_linkedin_work_type(self, soup: BeautifulSoup) -> Optional[str]:
        top_card = soup.select_one(".jobs-unified-top-card, .topcard, .job-details-jobs-unified-top-card")
        if top_card:
            text = top_card.get_text(separator=" ", strip=True).lower()
            
            if re.search(r'\b(remote|work from home|wfh|distributed)\b', text):
                return "Remote"
            elif re.search(r'\b(hybrid|partially remote)\b', text):
                return "Hybrid"
            elif re.search(r'\b(on[-\s]?site|office|in[-\s]?person)\b', text):
                return "On-site"
        
        return None

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

    def _extract_indeed_title(self, soup: BeautifulSoup) -> Optional[str]:
        selectors = [
            "h1.jobsearch-JobInfoHeader-title",
            "h2.jobsearch-JobInfoHeader-title",
            "h1[data-testid='job-title']",
            ".jobsearch-JobInfoHeader-title-container h1",
            "h1",
        ]
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if text and len(text) > 0 and len(text) < 200:
                    return text
        return None

    def _extract_indeed_company(self, soup: BeautifulSoup) -> Optional[str]:
        selectors = [
            "[data-testid='inlineHeader-companyName']",
            ".jobsearch-InlineCompanyRating a",
            ".jobsearch-CompanyReview--heading a",
            "a[data-testid='job-poster']",
            ".jobsearch-CompanyInfoContainer a",
        ]
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if text and len(text) > 0 and len(text) < 100:
                    return text
        return None

    def _extract_indeed_work_type(self, soup: BeautifulSoup) -> Optional[str]:
        job_info = soup.select_one(".jobsearch-JobMetadataHeader, .jobsearch-JobInfoHeader")
        if job_info:
            text = job_info.get_text(separator=" ", strip=True).lower()
            
            if re.search(r'\b(remote|work from home|wfh)\b', text):
                return "Remote"
            elif re.search(r'\b(hybrid)\b', text):
                return "Hybrid"
        
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

    def _extract_generic_title(self, soup: BeautifulSoup) -> Optional[str]:
        selectors = [
            "h1.job-title",
            "h1[class*='title']",
            ".job-title",
            "h1",
        ]
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if text and len(text) > 0 and len(text) < 200:
                    return text
        
        og_title = soup.select_one('meta[property="og:title"]')
        if og_title and og_title.get('content'):
            title = og_title['content'].strip()
            if len(title) > 0 and len(title) < 200:
                return title
        
        return None

    def _extract_generic_company(self, soup: BeautifulSoup) -> Optional[str]:
        selectors = [
            ".company-name",
            "[class*='company']",
            "a[href*='/company/']",
            ".employer",
        ]
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if text and len(text) > 0 and len(text) < 100:
                    return text
        
        return None

    def _extract_generic_work_type(self, soup: BeautifulSoup) -> Optional[str]:
        meta_text = soup.get_text(separator=" ", strip=True).lower()
        
        if re.search(r'\b(remote|work from home|wfh|distributed)\b', meta_text):
            return "Remote"
        elif re.search(r'\b(hybrid|partially remote)\b', meta_text):
            return "Hybrid"
        elif re.search(r'\b(on[-\s]?site|office|in[-\s]?person)\b', meta_text):
            return "On-site"
        
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
                
                # Check if we got a login page
                if self._is_login_page(soup, url):
                    parsed_url = urlparse(url)
                    domain = parsed_url.netloc.lower()
                    if "linkedin.com" in domain:
                        raise ValueError(
                            "This LinkedIn job posting requires authentication. "
                            "Please copy and paste the job description text directly, or ensure you're logged into LinkedIn and try again."
                        )
                    else:
                        raise ValueError(
                            "This job posting requires authentication. "
                            "Please copy and paste the job description text directly."
                        )
                
                parsed_url = urlparse(url)
                domain = parsed_url.netloc.lower()

                content = None
                title = None
                company = None
                work_type = None

                if "linkedin.com" in domain:
                    title = self._extract_linkedin_title(soup)
                    company = self._extract_linkedin_company(soup)
                    work_type = self._extract_linkedin_work_type(soup)
                    content = self._extract_linkedin_content(soup)
                elif "indeed.com" in domain:
                    title = self._extract_indeed_title(soup)
                    company = self._extract_indeed_company(soup)
                    work_type = self._extract_indeed_work_type(soup)
                    content = self._extract_indeed_content(soup)

                if not content:
                    content = self._extract_generic_content(soup)
                    if not title:
                        title = self._extract_generic_title(soup)
                    if not company:
                        company = self._extract_generic_company(soup)
                    if not work_type:
                        work_type = self._extract_generic_work_type(soup)

                if not content or len(content.strip()) < 100:
                    raise ValueError("Could not extract sufficient content from the URL")

                cleaned_content = self._clean_text(content)
                result = {
                    "success": True,
                    "content": cleaned_content,
                    "url": url
                }
                
                if title:
                    result["title"] = title
                if company:
                    result["company"] = company
                if work_type:
                    result["work_type"] = work_type
                
                return result

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

