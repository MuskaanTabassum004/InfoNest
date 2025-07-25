import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageNodeView } from '../components/ImageNodeView';

export interface ImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      /**
       * Add an image
       */
      setImage: (options: {
        src: string;
        title?: string;
        caption?: string;
        layout?: 'full-column' | 'outset' | 'full-screen';
      }) => ReturnType;
      /**
       * Update image layout
       */
      updateImageLayout: (layout: 'full-column' | 'outset' | 'full-screen') => ReturnType;
    };
  }
}

export const CustomImageExtension = Node.create<ImageOptions>({
  name: 'customImage',

  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },

      title: {
        default: null,
      },
      caption: {
        default: null,
        parseHTML: element => element.getAttribute('data-caption') || null,
      },
      layout: {
        default: 'full-column',
        parseHTML: element => element.getAttribute('data-layout') || 'full-column',
      },

      width: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
          };
        },
        parseHTML: element => element.getAttribute('width'),
      },
      height: {
        default: null,
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return {
            height: attributes.height,
          };
        },
        parseHTML: element => element.getAttribute('height'),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { layout, caption, ...imgAttributes } = HTMLAttributes;

    // Apply layout-specific classes
    const layoutClasses = {
      'full-column': 'image-full-column',
      'outset': 'image-outset',
      'full-screen': 'image-full-screen',
    };

    const className = [
      'custom-image',
      layoutClasses[layout as keyof typeof layoutClasses] || layoutClasses['full-column'],
    ].filter(Boolean).join(' ');

    // Always return just the img element with caption data as attribute
    // We'll use a post-processing approach to add captions
    const attributes = {
      class: className,
      'data-layout': layout || 'full-column',
      style: layout === 'full-column' ? 'display: block; margin: 16px auto; text-align: center;' : undefined,
    };

    // Add data-caption attribute if caption exists and is not empty
    if (caption && caption.trim()) {
      attributes['data-caption'] = caption.trim();
    }

    return ['img', mergeAttributes(this.options.HTMLAttributes, imgAttributes, attributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },

  addCommands() {
    return {
      setImage: options => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
      updateImageLayout: layout => ({ tr, state }) => {
        const { selection } = state;
        const { from } = selection;
        const node = state.doc.nodeAt(from);
        
        if (node && node.type.name === this.name) {
          tr.setNodeMarkup(from, undefined, {
            ...node.attrs,
            layout,
          });
          return true;
        }
        return false;
      },

    };
  },
});
