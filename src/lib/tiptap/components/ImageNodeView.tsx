import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { ImageToolbar } from './ImageToolbar';

export const ImageNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
  getPos
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [captionText, setCaptionText] = useState(node.attrs.caption || '');
  const imageRef = useRef<HTMLImageElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);

  const { src, title, layout, caption } = node.attrs;

  useEffect(() => {
    setShowToolbar(selected);
    if (selected) {
      setShowCaptionInput(true);
    } else {
      setShowCaptionInput(false);
      // Save caption when deselecting if it has changed
      if (captionText !== (node.attrs.caption || '')) {
        updateAttributes({ caption: captionText.trim() || null });
      }
    }
  }, [selected, captionText, node.attrs.caption, updateAttributes]);

  // Update local caption text when node attributes change
  useEffect(() => {
    setCaptionText(node.attrs.caption || '');
  }, [node.attrs.caption]);

  useEffect(() => {
    if (showCaptionInput && captionInputRef.current && selected) {
      // Focus the caption input when it becomes visible
      setTimeout(() => {
        captionInputRef.current?.focus();
      }, 100);
    }
  }, [showCaptionInput, selected]);

  const handleLayoutChange = (newLayout: 'full-column' | 'outset' | 'full-screen') => {
    // Update the node attributes using the updateAttributes function provided by TipTap
    // This is the correct way to update node attributes in a NodeView
    updateAttributes({ layout: newLayout });
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaptionText(e.target.value);
  };

  const handleCaptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save caption and blur the input
      updateAttributes({ caption: captionText.trim() || null });
      captionInputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Reset to original caption and blur
      setCaptionText(node.attrs.caption || '');
      captionInputRef.current?.blur();
    }
  };

  const handleCaptionBlur = () => {
    // Save caption when input loses focus
    updateAttributes({ caption: captionText.trim() || null });
  };



  const getLayoutClasses = () => {
    const baseClasses = 'custom-image transition-all duration-200 rounded-lg';
    const layoutClasses = {
      'full-column': 'image-full-column max-w-full mx-auto block',
      'outset': 'image-outset max-w-none mx-auto block',
      'full-screen': 'image-full-screen w-screen max-w-none mx-auto block',
    };

    const selectedClasses = selected
      ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg'
      : 'hover:shadow-md';

    return `${baseClasses} ${layoutClasses[layout as keyof typeof layoutClasses] || layoutClasses['full-column']} ${selectedClasses}`;
  };

  return (
    <NodeViewWrapper className="relative group">
      {/* Image Toolbar */}
      {showToolbar && (
        <ImageToolbar
          layout={layout}
          onLayoutChange={handleLayoutChange}
        />
      )}

      {/* Main Image */}
      <div className="relative">
        <img
          ref={imageRef}
          src={src}
          title={title || ''}
          className={getLayoutClasses()}
          draggable={false}
          onLoad={() => {
            // Handle image load if needed
          }}
          onError={(e) => {
            console.error('Image failed to load:', src);
          }}
        />
        
        {/* Selection overlay */}
        {selected && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg pointer-events-none" />
        )}
      </div>

      {/* Caption Input (when image is selected) */}
      {showCaptionInput && selected && (
        <div className="mt-2 text-center">
          <input
            ref={captionInputRef}
            type="text"
            value={captionText}
            onChange={handleCaptionChange}
            onKeyDown={handleCaptionKeyDown}
            onBlur={handleCaptionBlur}
            placeholder="Add a caption..."
            className="w-full max-w-md px-3 py-2 text-sm text-center text-gray-700 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 focus:bg-white rounded-none"
            style={{ fontStyle: 'italic' }}
          />
        </div>
      )}

      {/* Caption Display (always show when caption exists and image is not selected) */}
      {!selected && caption && (
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-600 italic max-w-md mx-auto px-4">
            {caption}
          </p>
        </div>
      )}
    </NodeViewWrapper>
  );
};
