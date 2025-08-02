/**
 * Shared HTML utility functions for parsing and manipulating HTML content
 */

/**
 * Strips HTML tags from text content
 * @param html - HTML string to strip tags from
 * @returns Plain text without HTML tags
 */
export const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary div element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Get text content and clean up extra whitespace
  return tempDiv.textContent || tempDiv.innerText || '';
};

/**
 * Extracts image URLs from HTML content using regex
 * @param content - HTML content string
 * @returns Array of image URLs
 */
export const extractImageUrls = (content: string): string[] => {
  if (!content) return [];
  
  const urls: string[] = [];
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  let match;

  while ((match = imgRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }

  return urls;
};

/**
 * Extracts Firebase Storage path from URL
 * @param url - Firebase Storage URL
 * @returns Decoded path string
 */
export const extractFirebaseStoragePath = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Extract path from Firebase Storage URL format
    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/);
    if (pathMatch) {
      const decodedPath = decodeURIComponent(pathMatch[1]);
      return decodedPath;
    }
    return '';
  } catch (error) {
    console.error("Error parsing URL:", error);
    return '';
  }
};

/**
 * Creates a temporary DOM element for HTML parsing
 * @param htmlContent - HTML content to parse
 * @returns DOM element
 */
export const createTempDomElement = (htmlContent: string): HTMLDivElement => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  return tempDiv;
};

/**
 * Parses HTML content using DOMParser
 * @param content - HTML content string
 * @param mimeType - MIME type for parsing (default: 'text/html')
 * @returns Parsed document
 */
export const parseHtmlContent = (content: string, mimeType: DOMParserSupportedType = 'text/html'): Document => {
  const parser = new DOMParser();
  return parser.parseFromString(content, mimeType);
};
