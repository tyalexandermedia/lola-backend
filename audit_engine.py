import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re
from typing import Dict, List
import time

def run_seo_audit(website: str, business_type: str, location: str) -> Dict:
    if not website.startswith(('http://', 'https://')):
        website = 'https://' + website
    
    findings = []
    scores = {
        "technical": 100,
        "on_page": 100,
        "local": 100,
        "content": 100
    }
    quick_wins = []
    
    try:
        print(f"Fetching {website}...")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        start_time = time.time()
        response = requests.get(website, headers=headers, timeout=10, allow_redirects=True)
        load_time = time.time() - start_time
        
        soup = BeautifulSoup(response.content, 'html.parser')
        html_text = response.text
        page_size_kb = len(response.content) / 1024
        
        is_https = response.url.startswith('https://')
        if not is_https:
            findings.append({
                "category": "Technical",
                "issue": "Site not using HTTPS",
                "impact": "High",
                "fix": "Install SSL certificate and redirect all HTTP traffic to HTTPS"
            })
            scores["technical"] -= 15
            quick_wins.append("Install SSL certificate (HTTPS) - critical for trust and rankings")
        
        parsed_url = urlparse(response.url)
        if parsed_url.netloc.startswith('www.') and website.replace('www.', '') in website:
            findings.append({
                "category": "Technical",
                "issue": "Inconsistent WWW usage",
                "impact": "Low",
                "fix": "Choose either www or non-www and redirect the other consistently"
            })
            scores["technical"] -= 3
        
        title = soup.find('title')
        if not title or not title.string:
            findings.append({
                "category": "On-Page",
                "issue": "Missing title tag",
                "impact": "High",
                "fix": "Add a descriptive title tag (50-60 characters) including main keyword and location"
            })
            scores["on_page"] -= 20
            quick_wins.append(f"Add title tag like '{business_type} in {location} | Your Business Name'")
        else:
            title_length = len(title.string.strip())
            if title_length < 30:
                findings.append({
                    "category": "On-Page",
                    "issue": f"Title tag too short ({title_length} chars)",
                    "impact": "Medium",
                    "fix": "Expand title to 50-60 characters with location and service keywords"
                })
                scores["on_page"] -= 10
            elif title_length > 60:
                findings.append({
                    "category": "On-Page",
                    "issue": f"Title tag too long ({title_length} chars)",
                    "impact": "Low",
                    "fix": "Shorten title to under 60 characters to avoid truncation in search results"
                })
                scores["on_page"] -= 5
        
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if not meta_desc or not meta_desc.get('content'):
            findings.append({
                "category": "On-Page",
                "issue": "Missing meta description",
                "impact": "Medium",
                "fix": "Add meta description (150-160 characters) highlighting services and location"
            })
            scores["on_page"] -= 10
            quick_wins.append("Add meta description mentioning your services and location")
        else:
            desc_length = len(meta_desc.get('content', ''))
            if desc_length < 120:
                findings.append({
                    "category": "On-Page",
                    "issue": f"Meta description too short ({desc_length} chars)",
                    "impact": "Low",
                    "fix": "Expand to 150-160 characters for better click-through rates"
                })
                scores["on_page"] -= 5
            elif desc_length > 160:
                findings.append({
                    "category": "On-Page",
                    "issue": f"Meta description too long ({desc_length} chars)",
                    "impact": "Low",
                    "fix": "Shorten to 150-160 characters to avoid truncation"
                })
                scores["on_page"] -= 3
        
        h1_tags = soup.find_all('h1')
        if not h1_tags:
            findings.append({
                "category": "On-Page",
                "issue": "No H1 heading found",
                "impact": "High",
                "fix": "Add one clear H1 tag describing your main service and location"
            })
            scores["on_page"] -= 15
            quick_wins.append(f"Add H1 heading like '{business_type} Services in {location}'")
        elif len(h1_tags) > 1:
            findings.append({
                "category": "On-Page",
                "issue": f"Multiple H1 tags found ({len(h1_tags)})",
                "impact": "Low",
                "fix": "Use only one H1 per page for main heading"
            })
            scores["on_page"] -= 5
        
        canonical = soup.find('link', attrs={'rel': 'canonical'})
        if not canonical:
            findings.append({
                "category": "Technical",
                "issue": "Missing canonical tag",
                "impact": "Medium",
                "fix": "Add canonical tag to prevent duplicate content issues"
            })
            scores["technical"] -= 8
        
        robots_meta = soup.find('meta', attrs={'name': 'robots'})
        if robots_meta:
            content = robots_meta.get('content', '').lower()
            if 'noindex' in content:
                findings.append({
                    "category": "Technical",
                    "issue": "Page set to NOINDEX - blocking search engines",
                    "impact": "High",
                    "fix": "Remove 'noindex' from robots meta tag immediately"
                })
                scores["technical"] -= 25
                quick_wins.append("Remove NOINDEX tag - your site is currently hidden from Google!")
        
        og_tags = soup.find_all('meta', attrs={'property': re.compile(r'^og:')})
        if len(og_tags) < 3:
            findings.append({
                "category": "On-Page",
                "issue": "Incomplete Open Graph tags for social sharing",
                "impact": "Low",
                "fix": "Add og:title, og:description, og:image for better social media sharing"
            })
            scores["on_page"] -= 5
        
        schema_scripts = soup.find_all('script', attrs={'type': 'application/ld+json'})
        if not schema_scripts:
            findings.append({
                "category": "Technical",
                "issue": "No structured data (Schema.org) found",
                "impact": "Medium",
                "fix": "Add LocalBusiness schema markup for better local search visibility"
            })
            scores["technical"] -= 12
            quick_wins.append("Add LocalBusiness schema for Google Business Profile integration")
        
        if page_size_kb > 2000:
            findings.append({
                "category": "Technical",
                "issue": f"Large page size ({page_size_kb:.0f} KB)",
                "impact": "Medium",
                "fix": "Optimize images and minimize CSS/JS to improve load speed"
            })
            scores["technical"] -= 8
        
        if load_time > 3:
            findings.append({
                "category": "Technical",
                "issue": f"Slow page load ({load_time:.1f} seconds)",
                "impact": "Medium",
                "fix": "Improve server response time and enable caching"
            })
            scores["technical"] -= 10
        
        internal_links = [a for a in soup.find_all('a', href=True) 
                         if urlparse(a['href']).netloc == '' or 
                         urlparse(a['href']).netloc == parsed_url.netloc]
        
        if len(internal_links) < 5:
            findings.append({
                "category": "On-Page",
                "issue": f"Few internal links ({len(internal_links)})",
                "impact": "Low",
                "fix": "Add more internal links to improve site navigation and SEO"
            })
            scores["on_page"] -= 5
        
        text_content = soup.get_text()
        word_count = len(text_content.split())
        
        if word_count < 300:
            findings.append({
                "category": "Content",
                "issue": f"Thin content ({word_count} words)",
                "impact": "High",
                "fix": "Add more descriptive content (aim for 500+ words) about services, process, and benefits"
            })
            scores["content"] -= 20
            quick_wins.append("Expand homepage content to at least 500 words with service details")
        elif word_count < 500:
            findings.append({
                "category": "Content",
                "issue": f"Limited content ({word_count} words)",
                "impact": "Medium",
                "fix": "Add more content about services, benefits, and unique value proposition"
            })
            scores["content"] -= 10
        
        location_mentioned = location.lower() in html_text.lower()
        if not location_mentioned:
            findings.append({
                "category": "Local SEO",
                "issue": f"Location '{location}' not mentioned on homepage",
                "impact": "High",
                "fix": f"Add '{location}' to title, headings, and content for local SEO"
            })
            scores["local"] -= 20
            quick_wins.append(f"Add '{location}' to your homepage title and content")
        
        phone_pattern = r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        has_phone = bool(re.search(phone_pattern, html_text))
        
        if not has_phone:
            findings.append({
                "category": "Local SEO",
                "issue": "No phone number detected on homepage",
                "impact": "Medium",
                "fix": "Add visible phone number in header/footer for local trust signals"
            })
            scores["local"] -= 15
        
        has_gbp_link = 'google.com/maps' in html_text.lower() or 'g.page' in html_text.lower()
        if not has_gbp_link:
            findings.append({
                "category": "Local SEO",
                "issue": "No Google Business Profile link detected",
                "impact": "Medium",
                "fix": "Link to your Google Business Profile from homepage"
            })
            scores["local"] -= 10
        
        business_keywords = business_type.lower().split()
        content_lower = html_text.lower()
        keywords_found = sum(1 for kw in business_keywords if kw in content_lower)
        
        if keywords_found < len(business_keywords) / 2:
            findings.append({
                "category": "Content",
                "issue": "Service keywords underutilized",
                "impact": "Medium",
                "fix": f"Use '{business_type}' keywords more naturally throughout content"
            })
            scores["content"] -= 12
        
        try:
            sitemap_url = urljoin(website, '/sitemap.xml')
            sitemap_response = requests.get(sitemap_url, timeout=5)
            if sitemap_response.status_code != 200:
                findings.append({
                    "category": "Technical",
                    "issue": "No sitemap.xml found",
                    "impact": "Medium",
                    "fix": "Create and submit XML sitemap to Google Search Console"
                })
                scores["technical"] -= 10
        except:
            findings.append({
                "category": "Technical",
                "issue": "sitemap.xml not accessible",
                "impact": "Medium",
                "fix": "Create XML sitemap at /sitemap.xml"
            })
            scores["technical"] -= 10
        
        try:
            robots_url = urljoin(website, '/robots.txt')
            robots_response = requests.get(robots_url, timeout=5)
            if robots_response.status_code != 200:
                findings.append({
                    "category": "Technical",
                    "issue": "No robots.txt found",
                    "impact": "Low",
                    "fix": "Create robots.txt file to guide search engine crawlers"
                })
                scores["technical"] -= 5
        except:
            pass
        
        for key in scores:
            scores[key] = max(0, scores[key])
        
        avg_score = sum(scores.values()) / len(scores)
        
        if avg_score >= 80:
            summary = f"Great job! Your site has a strong SEO foundation with an overall score of {avg_score:.0f}/100. Focus on the quick wins below to improve further."
        elif avg_score >= 60:
            summary = f"Good start! Your site scores {avg_score:.0f}/100. There are several opportunities to improve rankings with the fixes below."
        elif avg_score >= 40:
            summary = f"Your site scores {avg_score:.0f}/100. Significant SEO improvements needed, but the good news is many are quick fixes!"
        else:
            summary = f"Your site needs SEO attention (score: {avg_score:.0f}/100). The issues below are holding you back from ranking well."
        
        critical_fixes = [f for f in findings if f["impact"] == "High"]
        medium_fixes = [f for f in findings if f["impact"] == "Medium"]
        
        thirty_day_plan = []
        
        if critical_fixes:
            week1_items = [f"Fix: {f['issue']}" for f in critical_fixes[:2]]
            thirty_day_plan.append(f"Week 1: {'; '.join(week1_items)}")
        else:
            thirty_day_plan.append(f"Week 1: Create Google Business Profile and verify location")
        
        if medium_fixes:
            week2_items = [f"Fix: {f['issue']}" for f in medium_fixes[:2]]
            thirty_day_plan.append(f"Week 2: {'; '.join(week2_items)}")
        else:
            thirty_day_plan.append(f"Week 2: Build 5 local citations (Yelp, Facebook, industry directories)")
        
        thirty_day_plan.append(f"Week 3: Create 2-3 service pages targeting '{business_type}' + '{location}' keywords")
        thirty_day_plan.append(f"Week 4: Get 3-5 customer reviews on Google Business Profile")
        
        if len(quick_wins) < 3:
            if not location_mentioned:
                quick_wins.append(f"Add '{location}' to homepage title and content")
            if word_count < 500:
                quick_wins.append("Expand homepage to 500+ words")
            if not has_phone:
                quick_wins.append("Add phone number to header/footer")
        
        return {
            "summary": summary,
            "scores": scores,
            "findings": sorted(findings, key=lambda x: {"High": 0, "Medium": 1, "Low": 2}[x["impact"]]),
            "quick_wins": quick_wins[:5],
            "30_day_plan": thirty_day_plan,
            "disclaimer": "This audit provides general SEO recommendations. Results may vary. For best results, implement fixes systematically and monitor progress in Google Search Console."
        }
        
    except requests.RequestException as e:
        raise Exception(f"Failed to fetch website: {str(e)}")
    except Exception as e:
        raise Exception(f"Audit error: {str(e)}")
