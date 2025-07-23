import { Editor } from '@tiptap/react';

export interface ImageGridOptions {
  maxColumns?: number;
  spacing?: number;
  responsive?: boolean;
}

export class ImageGridManager {
  private editor: Editor;
  private options: ImageGridOptions;

  constructor(editor: Editor, options: ImageGridOptions = {}) {
    this.editor = editor;
    this.options = {
      maxColumns: 4,
      spacing: 8,
      responsive: true,
      ...options,
    };
  }

  /**
   * Create a grid from multiple images
   */
  createGrid(images: Array<{ src: string; alt?: string; title?: string }>): boolean {
    if (images.length < 2) {
      return false;
    }

    const gridId = `grid-${Date.now()}`;
    const gridImages = images.map(img => ({
      type: 'customImage',
      attrs: {
        ...img,
        layout: 'grid',
        gridId,
      },
    }));

    // Insert grid container with images
    return this.editor
      .chain()
      .focus()
      .insertContent([
        {
          type: 'paragraph',
          attrs: {
            class: 'image-grid-container',
            'data-grid-id': gridId,
          },
          content: gridImages,
        },
      ])
      .run();
  }

  /**
   * Convert selected images to a grid
   */
  convertSelectionToGrid(): boolean {
    const { selection } = this.editor.state;
    const selectedImages: Array<{ src: string; alt?: string; title?: string }> = [];

    // Find all selected images
    this.editor.state.doc.nodesBetween(selection.from, selection.to, (node) => {
      if (node.type.name === 'customImage') {
        selectedImages.push({
          src: node.attrs.src,
          alt: node.attrs.alt,
          title: node.attrs.title,
        });
      }
    });

    if (selectedImages.length < 2) {
      return false;
    }

    // Delete selected content and create grid
    this.editor.chain().focus().deleteSelection().run();
    return this.createGrid(selectedImages);
  }

  /**
   * Add image to existing grid
   */
  addToGrid(gridId: string, image: { src: string; alt?: string; title?: string }): boolean {
    const { state } = this.editor;
    let gridFound = false;
    let insertPos = -1;

    // Find the grid container
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs['data-grid-id'] === gridId) {
        gridFound = true;
        insertPos = pos + node.nodeSize - 1; // Insert at the end of the grid
        return false; // Stop searching
      }
    });

    if (!gridFound || insertPos === -1) {
      return false;
    }

    // Insert new image into the grid
    return this.editor
      .chain()
      .focus()
      .insertContentAt(insertPos, {
        type: 'customImage',
        attrs: {
          ...image,
          layout: 'grid',
          gridId,
        },
      })
      .run();
  }

  /**
   * Remove image from grid
   */
  removeFromGrid(gridId: string, imagePos: number): boolean {
    const { state } = this.editor;
    let gridContainer: { node: any; pos: number } | null = null;
    const gridImages: Array<{ node: any; pos: number }> = [];

    // Find grid container and its images
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs['data-grid-id'] === gridId) {
        gridContainer = { node, pos };
        
        // Find all images in this grid
        node.descendants((childNode: any, childPos: number) => {
          if (childNode.type.name === 'customImage' && childNode.attrs.gridId === gridId) {
            gridImages.push({ node: childNode, pos: pos + childPos + 1 });
          }
        });
        
        return false; // Stop searching
      }
    });

    if (!gridContainer || gridImages.length === 0) {
      return false;
    }

    // Remove the specified image
    if (imagePos >= 0 && imagePos < gridImages.length) {
      const imageToRemove = gridImages[imagePos];
      this.editor.chain().focus().deleteRange({
        from: imageToRemove.pos,
        to: imageToRemove.pos + imageToRemove.node.nodeSize,
      }).run();

      // If only one image left, convert back to single image
      if (gridImages.length === 2) {
        const remainingImage = gridImages.find((_, index) => index !== imagePos);
        if (remainingImage) {
          this.convertGridToSingleImage(gridId);
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Convert grid back to single images
   */
  convertGridToSingleImage(gridId: string): boolean {
    const { state } = this.editor;
    let gridContainer: { node: any; pos: number } | null = null;
    const gridImages: Array<{ node: any; pos: number }> = [];

    // Find grid container and its images
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs['data-grid-id'] === gridId) {
        gridContainer = { node, pos };
        
        node.descendants((childNode: any, childPos: number) => {
          if (childNode.type.name === 'customImage' && childNode.attrs.gridId === gridId) {
            gridImages.push({ node: childNode, pos: pos + childPos + 1 });
          }
        });
        
        return false;
      }
    });

    if (!gridContainer || gridImages.length === 0) {
      return false;
    }

    // Convert grid images to individual images
    const individualImages = gridImages.map(({ node }) => ({
      type: 'customImage',
      attrs: {
        ...node.attrs,
        layout: 'full-column',
        gridId: null,
      },
    }));

    // Replace grid with individual images
    return this.editor
      .chain()
      .focus()
      .deleteRange({
        from: gridContainer.pos,
        to: gridContainer.pos + gridContainer.node.nodeSize,
      })
      .insertContent(individualImages.map(img => ({
        type: 'paragraph',
        content: [img],
      })))
      .run();
  }

  /**
   * Get optimal grid layout based on number of images
   */
  getOptimalLayout(imageCount: number): { columns: number; rows: number } {
    const maxCols = this.options.maxColumns || 4;
    
    if (imageCount <= 1) return { columns: 1, rows: 1 };
    if (imageCount === 2) return { columns: 2, rows: 1 };
    if (imageCount === 3) return { columns: 3, rows: 1 };
    if (imageCount === 4) return { columns: 2, rows: 2 };
    
    const columns = Math.min(maxCols, Math.ceil(Math.sqrt(imageCount)));
    const rows = Math.ceil(imageCount / columns);
    
    return { columns, rows };
  }

  /**
   * Update grid layout based on screen size
   */
  updateResponsiveLayout(gridId: string): void {
    if (!this.options.responsive) return;

    // This would be called on window resize
    // Implementation would update CSS classes based on screen size
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    
    if (mediaQuery.matches) {
      // Mobile layout - force 2 columns max
      this.updateGridColumns(gridId, 2);
    } else {
      // Desktop layout - use original columns
      this.updateGridColumns(gridId, this.options.maxColumns || 4);
    }
  }

  private updateGridColumns(gridId: string, columns: number): void {
    // Update CSS custom properties for the specific grid
    const gridElement = document.querySelector(`[data-grid-id="${gridId}"]`);
    if (gridElement) {
      (gridElement as HTMLElement).style.setProperty('--grid-columns', columns.toString());
    }
  }
}
