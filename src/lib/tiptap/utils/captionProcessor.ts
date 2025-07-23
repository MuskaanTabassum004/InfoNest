/**
 * Utility functions for processing image captions in rendered HTML content
 */

/**
 * Processes HTML content to add caption elements below images with data-caption attributes
 * @param htmlContent - The HTML content string to process
 * @returns Processed HTML content with caption elements added
 */
export function processImageCaptions(htmlContent: string): string {
  if (!htmlContent) return htmlContent;

  // Create a temporary DOM element to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Find all images with data-caption attributes
  const imagesWithCaptions = tempDiv.querySelectorAll('img[data-caption]');

  imagesWithCaptions.forEach((img) => {
    const caption = img.getAttribute('data-caption');
    if (caption && caption.trim()) {
      // Create a figure element to wrap the image and caption
      const figure = document.createElement('figure');
      figure.className = 'image-figure-container';
      figure.style.cssText = 'margin: 16px auto; text-align: center; display: block;';

      // Create the figcaption element
      const figcaption = document.createElement('figcaption');
      figcaption.className = 'image-caption-text';
      figcaption.style.cssText = `
        margin-top: 12px;
        margin-bottom: 16px;
        font-size: 0.875rem;
        color: #6b7280;
        font-style: italic;
        line-height: 1.5;
        text-align: center;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
        padding: 0 20px;
        box-sizing: border-box;
        font-family: inherit;
      `.replace(/\s+/g, ' ').trim();
      figcaption.textContent = caption.trim();

      // Clone the image to preserve all attributes
      const clonedImg = img.cloneNode(true) as HTMLImageElement;
      
      // Remove the data-caption attribute from the cloned image to avoid duplication
      clonedImg.removeAttribute('data-caption');

      // Replace the original image with the figure containing image and caption
      if (img.parentNode) {
        figure.appendChild(clonedImg);
        figure.appendChild(figcaption);
        img.parentNode.replaceChild(figure, img);
      }
    }
  });

  return tempDiv.innerHTML;
}

/**
 * Processes captions for different image layouts
 * @param htmlContent - The HTML content string to process
 * @returns Processed HTML content with layout-specific caption styling
 */
export function processLayoutSpecificCaptions(htmlContent: string): string {
  const processedContent = processImageCaptions(htmlContent);
  
  // Create a temporary DOM element to apply layout-specific styles
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = processedContent;

  // Apply layout-specific caption styling
  const figures = tempDiv.querySelectorAll('figure.image-figure-container');
  
  figures.forEach((figure) => {
    const img = figure.querySelector('img');
    const caption = figure.querySelector('figcaption');
    
    if (img && caption) {
      const layout = img.getAttribute('data-layout');
      
      // Apply layout-specific caption width constraints
      if (layout === 'outset') {
        caption.style.maxWidth = '500px';
      } else if (layout === 'full-screen') {
        caption.style.maxWidth = '800px';
      }
    }
  });

  return tempDiv.innerHTML;
}
