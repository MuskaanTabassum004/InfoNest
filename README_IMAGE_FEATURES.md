# Enhanced Image Features for RichTextEditor

This document describes the new image upload and layout features implemented in the RichTextEditor component.

## Features Overview

### 1. Image Upload with Layout Options
When an image is uploaded to the article content, a toolbar appears on top of the selected image providing the following layout options:

- **Full Column Width**: Standard width within the content column (default)
- **Outset Image**: Extends beyond the column boundaries (120% width)
- **Full Screen Width**: Spans the entire article view width with proper padding
- **Alt Text**: Option to add/edit alternative text for accessibility

### 2. Image Toolbar
The image toolbar appears when an image is selected and provides:
- Layout option buttons with visual icons
- Alt text editing functionality
- Grid creation option for multiple images
- Responsive design that works on all screen sizes

### 3. Alt Text Functionality
- Inline alt text input field that appears below each image
- Visible in the editor for content creators to add descriptive text
- Proper accessibility compliance with alt attributes
- Character limit of 250 characters
- Save/Cancel functionality with keyboard shortcuts (Enter/Escape)

### 4. Image Grid System
- Automatic grid generation when multiple images are selected
- Responsive grid layout that adapts to screen size:
  - Desktop: Up to 4 columns
  - Tablet: Up to 2 columns  
  - Mobile: Single column
- Proper spacing and alignment between grid images
- Grid images can be individually edited for alt text

## Technical Implementation

### Custom TipTap Extension
- `CustomImageExtension`: Extends the base TipTap Image extension
- Supports custom attributes: `layout`, `gridId`, `alt`, `title`
- Commands for layout changes and alt text updates

### React Components
- `ImageNodeView`: React component for rendering images with toolbar
- `ImageToolbar`: Floating toolbar with layout options
- `AltTextInput`: Inline alt text editing component
- `ImageGridManager`: Utility class for grid operations

### CSS Classes
- `.image-full-column`: Standard column width layout
- `.image-outset`: Extended width beyond column boundaries
- `.image-full-screen`: Full viewport width with padding
- `.image-grid-item`: Grid item styling with responsive behavior
- `.image-grid-container`: Container for image grids

## Usage

### Basic Image Upload
1. Click the upload button in the editor toolbar
2. Select an image file
3. Image is inserted with default "Full Column" layout
4. Click on the image to see the layout toolbar

### Changing Image Layout
1. Select an image in the editor
2. Use the toolbar buttons to choose layout:
   - **Full Column**: Standard width
   - **Outset**: Extended width
   - **Full Width**: Full screen width
3. Layout changes are applied immediately

### Adding Alt Text
1. Select an image
2. Click "Alt Text" in the toolbar OR click the alt text placeholder below the image
3. Enter descriptive text (up to 250 characters)
4. Press Enter to save or Escape to cancel

### Creating Image Grids
1. Upload multiple images or select multiple existing images
2. Click the "Grid" button in the image toolbar
3. Images are automatically arranged in a responsive grid
4. Each grid image can still be edited individually

## Browser Compatibility
- Modern browsers with CSS Grid support
- Responsive design works on all screen sizes
- Touch-friendly interface for mobile devices

## Accessibility Features
- Proper alt text support for screen readers
- Keyboard navigation support
- High contrast focus indicators
- Semantic HTML structure

## File Structure
```
src/components/extensions/
├── CustomImageExtension.ts    # Main TipTap extension
├── ImageNodeView.tsx          # React component for image rendering
├── ImageToolbar.tsx           # Floating toolbar component
├── AltTextInput.tsx           # Alt text editing component
└── ImageGridManager.ts        # Grid management utilities
```

## Future Enhancements
- Image resizing handles
- Drag and drop reordering in grids
- Image filters and effects
- Batch alt text editing
- Image compression options
