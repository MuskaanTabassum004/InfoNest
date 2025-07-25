import React, { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import ListItem from "@tiptap/extension-list-item";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";

import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Upload,
  Type,
  Palette,
} from "lucide-react";
import { FileUploadButton } from "./FileUpload";
import { useAuth } from "../hooks/useAuth";
import { UploadResult } from "../lib/fileUpload";
import toast from "react-hot-toast";
import { ResumableFileUploadButton } from "./ResumableFileUpload";
import { CustomImageExtension } from "../lib/tiptap/extensions/CustomImageExtension";
import { ImageGridManager } from "./extensions/ImageGridManager";

const lowlight = createLowlight();

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Start writing your article...",
}) => {
  const { userProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const gridManagerRef = useRef<ImageGridManager | null>(null);
  
  // Predefined colors like MS Word
  const textColors = [
    { name: "Black", value: "#000000" },
    { name: "Dark Gray", value: "#404040" },
    { name: "Gray", value: "#808080" },
    { name: "Light Gray", value: "#C0C0C0" },
    { name: "Red", value: "#FF0000" },
    { name: "Orange", value: "#FFA500" },
    { name: "Yellow", value: "#FFFF00" },
    { name: "Green", value: "#008000" },
    { name: "Blue", value: "#0000FF" },
    { name: "Purple", value: "#800080" },
    { name: "Dark Red", value: "#8B0000" },
    { name: "Dark Orange", value: "#FF8C00" },
    { name: "Dark Yellow", value: "#B8860B" },
    { name: "Dark Green", value: "#006400" },
    { name: "Dark Blue", value: "#000080" },
    { name: "Dark Purple", value: "#4B0082" },
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the default list extensions from StarterKit
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TextStyle,
      Color.configure({
        types: [TextStyle.name, ListItem.name],
      }),
      // Custom list extensions with stable configuration
      ListItem.configure({
        HTMLAttributes: {
          class: "list-item",
        },
        keepMarks: true,
        keepAttributes: true,
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: "bullet-list",
        },
        keepMarks: true,
        keepAttributes: true,
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: "ordered-list",
        },
        keepMarks: true,
        keepAttributes: true,
      }),
      // Use custom image extension instead of default Image extension
      CustomImageExtension.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "custom-image",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 hover:text-blue-800 underline",
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "bg-gray-100 rounded-lg p-4 font-mono text-sm",
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      // Initialize grid manager when editor is created
      gridManagerRef.current = new ImageGridManager(editor);
    },
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[400px] p-6",
      },
      handleKeyDown: (view, event) => {
        const { state } = view;
        const { selection } = state;

        // Handle Tab for list indentation with stability
        if (event.key === "Tab" && !event.shiftKey) {
          if (
            editor?.isActive("bulletList") ||
            editor?.isActive("orderedList")
          ) {
            event.preventDefault();
            event.stopPropagation();

            // Use transaction for smoother operation
            const tr = state.tr;
            if (editor.can().sinkListItem("listItem")) {
              return editor.chain().focus().sinkListItem("listItem").run();
            }
            return true;
          }
        }

        // Handle Shift+Tab for list outdentation with stability
        if (event.key === "Tab" && event.shiftKey) {
          if (
            editor?.isActive("bulletList") ||
            editor?.isActive("orderedList")
          ) {
            event.preventDefault();
            event.stopPropagation();

            // Use transaction for smoother operation
            const tr = state.tr;
            if (editor.can().liftListItem("listItem")) {
              return editor.chain().focus().liftListItem("listItem").run();
            }
            return true;
          }
        }

        // Handle Enter in lists with stability
        if (event.key === "Enter" && !event.shiftKey) {
          if (
            editor?.isActive("bulletList") ||
            editor?.isActive("orderedList")
          ) {
            // Prevent default to avoid jumping, let TipTap handle it smoothly
            const canSplit = editor.can().splitListItem("listItem");
            if (canSplit) {
              event.preventDefault();
              return editor.chain().focus().splitListItem("listItem").run();
            }
            return false;
          }
        }

        // Handle Backspace in lists to prevent jumping
        if (event.key === "Backspace") {
          if (
            editor?.isActive("bulletList") ||
            editor?.isActive("orderedList")
          ) {
            const { $from } = selection;
            // If at the start of a list item, handle carefully
            if ($from.parentOffset === 0) {
              const canLift = editor.can().liftListItem("listItem");
              if (canLift) {
                event.preventDefault();
                return editor.chain().focus().liftListItem("listItem").run();
              }
            }
          }
        }

        return false;
      },
    },
  });

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.commands.setImage({
        src: url,
        alt: '',
        layout: 'full-column'
      });
    }
  };

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleFileUpload = (result: UploadResult) => {
    if (result.type.startsWith("image/")) {
      // Insert image using custom image extension with default layout
      editor.commands.setImage({
        src: result.url,
        alt: result.name || '',
        title: result.name || '',
        layout: 'full-column',
      });
    } else {
      // Insert link for non-image files (PDFs, documents, etc.)
      const fileType = result.type === "application/pdf" ? "PDF" : "Document";
      const linkText = `📄 ${result.name} (${fileType})`;
      editor
        .chain()
        .focus()
        .setLink({ href: result.url, target: "_blank" })
        .insertContent(linkText)
        .run();
    }
  };

  const handleUploadError = (error: string) => {
    toast.error(error);
  };

  const handleMultipleImageUpload = (results: UploadResult[]) => {
    const imageResults = results.filter(result => result.type.startsWith("image/"));

    if (imageResults.length === 0) {
      return;
    }

    if (imageResults.length === 1) {
      // Single image - use normal upload
      handleFileUpload(imageResults[0]);
    } else {
      // Multiple images - create grid
      const images = imageResults.map(result => ({
        src: result.url,
        alt: result.name || '',
        title: result.name || '',
      }));

      if (gridManagerRef.current) {
        gridManagerRef.current.createGrid(images);
      }
    }
  };

  const applyTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
    setShowColorPicker(false);
  };

  const removeTextColor = () => {
    editor.chain().focus().unsetColor().run();
    setShowColorPicker(false);
  };
  return (
    <div className="border border-gray-200 rounded-xl bg-white relative flex flex-col max-h-[600px]">
      <style>{`
        /* Typography styles for both editor and preview */
        .ProseMirror h1, .article-content h1, h1 {
          font-size: 32px !important;
          font-weight: bold !important;
          margin: 16px 0 8px 0 !important;
          line-height: 48px !important;
        }
        .ProseMirror h3, .article-content h3, h3 {
          font-size: 24px !important;
          font-weight: 600 !important;
          margin: 12px 0 6px 0 !important;
          line-height: 27.6px !important;
        }
        .ProseMirror p, .article-content p, p {
          font-size: 16px !important;
          line-height: 18.4px !important;
          margin: 8px 0 !important;
        }
        .ProseMirror, .article-content {
          font-size: 16px !important;
          line-height: 18.4px !important;
        }
        /* Custom Image Layout Styles */
        .custom-image {
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
          height: auto;
        }

        /* Full Column Width Layout */
        .image-full-column {
          max-width: 100%;
          width: auto;
          display: block;
          margin: 16px auto;
          text-align: center;
        }

        /* Outset Layout - extends beyond column boundaries */
        .image-outset {
          max-width: 120%;
          width: auto;
          display: block;
          margin: 16px auto;
          margin-left: -10%;
          margin-right: -10%;
        }

        /* Full Screen Width Layout */
        .image-full-screen {
          width: calc(100% + 2rem);
          max-width: none;
          display: block;
          margin: 16px 0;
          margin-left: -1rem;
          margin-right: -1rem;
          object-fit: cover;
        }

        /* Image Grid Layouts */
        .image-grid-item {
          display: inline-block;
          margin: 4px;
          border-radius: 8px;
          vertical-align: top;
        }

        /* 2-image grid */
        .image-grid-item:nth-child(2n) {
          width: calc(50% - 8px);
        }

        /* 3-image grid */
        .image-grid-item:nth-child(3n) {
          width: calc(33.333% - 8px);
        }

        /* 4+ image grid */
        .image-grid-item:nth-child(4n) {
          width: calc(25% - 8px);
        }

        /* Grid container */
        .image-grid-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 16px 0;
          justify-content: center;
        }

        /* Responsive grid adjustments */
        @media (max-width: 768px) {
          .image-outset {
            max-width: 100%;
            margin-left: 0;
            margin-right: 0;
          }

          .image-full-screen {
            width: 100%;
            margin-left: 0;
            margin-right: 0;
            padding: 0;
          }

          .image-grid-item:nth-child(n) {
            width: calc(50% - 8px);
          }
        }

        @media (max-width: 480px) {
          .image-grid-item:nth-child(n) {
            width: 100%;
            margin: 4px 0;
          }
        }

        /* Hover and selection states */
        .custom-image:hover {
          outline: 2px solid #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .ProseMirror .custom-image.ProseMirror-selectednode {
          outline: 2px solid #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        /* Legacy image styles for backward compatibility */
        .ProseMirror img:not(.custom-image), .article-content img:not(.custom-image) {
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
          max-width: 100%;
          height: auto;
          display: block;
          margin: 8px auto;
        }

        .ProseMirror img:not(.custom-image):hover, .article-content img:not(.custom-image):hover {
          outline: 2px solid #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .ProseMirror img:not(.custom-image).ProseMirror-selectednode {
          outline: 2px solid #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        /* Float left images (legacy) */
        .ProseMirror img[style*="float: left"], .article-content img[style*="float: left"] {
          float: left !important;
          margin: 0 16px 8px 0 !important;
          max-width: 50% !important;
          display: inline !important;
        }

        /* Float right images (legacy) */
        .ProseMirror img[style*="float: right"], .article-content img[style*="float: right"] {
          float: right !important;
          margin: 0 0 8px 16px !important;
          max-width: 50% !important;
          display: inline !important;
        }

        /* Centered images (legacy) */
        .ProseMirror img[style*="margin: 16px auto"], .article-content img[style*="margin: 16px auto"] {
          display: block !important;
          margin: 16px auto !important;
          max-width: 100% !important;
          float: none !important;
        }

        /* Resizable images (legacy) */
        .ProseMirror img[style*="resize: both"], .article-content img[style*="resize: both"] {
          resize: both !important;
          overflow: auto !important;
        }
        .ProseMirror ul, .ProseMirror ol {
          font-size: 16px !important;
          line-height: 18.4px !important;
          margin: 8px 0 !important;
          padding-left: 24px !important;
          position: relative !important;
          display: block !important;
          box-sizing: border-box !important;
        }
        .ProseMirror ul li, .ProseMirror ol li {
          font-size: 16px !important;
          line-height: 18.4px !important;
          margin: 2px 0 !important;
          padding-left: 4px !important;
          position: relative !important;
          display: list-item !important;
          box-sizing: border-box !important;
          min-height: 1.2em !important;
        }
        .ProseMirror ul {
          list-style-type: disc !important;
        }
        .ProseMirror ol {
          list-style-type: decimal !important;
        }
        .ProseMirror ul ul {
          list-style-type: circle !important;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
        }
        .ProseMirror ul ul ul {
          list-style-type: square !important;
        }
        .ProseMirror ol ol {
          list-style-type: lower-alpha !important;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
        }
        .ProseMirror ol ol ol {
          list-style-type: lower-roman !important;
        }
        /* Prevent list jumping and ensure stable positioning */
        .ProseMirror ul, .ProseMirror ol {
          transform: translateZ(0) !important;
          backface-visibility: hidden !important;
          will-change: auto !important;
        }
        .ProseMirror li {
          transform: translateZ(0) !important;
          backface-visibility: hidden !important;
        }
        /* Ensure consistent list marker positioning */
        .ProseMirror ul li::marker, .ProseMirror ol li::marker {
          content: normal !important;
        }
        /* Stable list item content */
        .ProseMirror li p {
          margin: 0 !important;
          padding: 0 !important;
          display: inline !important;
        }
        /* Smooth scrolling and stable positioning during scroll */
        .ProseMirror {
          scroll-behavior: smooth !important;
          -webkit-overflow-scrolling: touch !important;
        }
        /* Prevent layout shifts during scrolling */
        .ProseMirror ul, .ProseMirror ol {
          contain: layout style !important;
          isolation: isolate !important;
        }
        .ProseMirror li {
          contain: layout !important;
        }
        /* Medium-style smooth editing experience */
        .ProseMirror * {
          transition: none !important;
        }
        /* Stable focus states during scrolling */
        .ProseMirror:focus-within {
          outline: none !important;
        }
      `}</style>
      {/* Fixed Toolbar */}
      <div className="border-b border-gray-200 p-3 flex flex-wrap gap-1 sticky top-0 z-10 bg-white flex-shrink-0">
        {/* Font Size Controls */}
        <select
          onChange={(e) => {
            const level = parseInt(e.target.value);
            const { selection } = editor.state;
            const { $from } = selection;

            // Get current position
            const currentPos = $from.pos;

            // Apply formatting to current line
            if (level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().toggleHeading({ level }).run();
            }

            // Find and format previous line if it exists
            if ($from.nodeBefore || $from.start() > 1) {
              // Move to start of current line
              const lineStart = $from.start($from.depth);

              // Find previous line by going back from line start
              if (lineStart > 1) {
                const prevLineEnd = lineStart - 1;
                const prevLineNode = editor.state.doc.resolve(prevLineEnd);
                const prevLineStart = prevLineNode.start(prevLineNode.depth);

                // Select previous line and apply same formatting
                editor
                  .chain()
                  .focus()
                  .setTextSelection({ from: prevLineStart, to: prevLineEnd })
                  .run();

                if (level === 0) {
                  editor.chain().focus().setParagraph().run();
                } else {
                  editor.chain().focus().toggleHeading({ level }).run();
                }

                // Return cursor to original position
                editor.chain().focus().setTextSelection(currentPos).run();
              }
            }
          }}
          value={
            editor.isActive("heading", { level: 1 })
              ? "1"
              : editor.isActive("heading", { level: 2 })
              ? "2"
              : editor.isActive("heading", { level: 3 })
              ? "3"
              : "0"
          }
          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="0">Content (16px)</option>
          <option value="3">Subheading (24px)</option>
          <option value="1">Heading (32px)</option>
        </select>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-lg hover:bg-gray-100 ${
            editor.isActive("bold")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600"
          }`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-lg hover:bg-gray-100 ${
            editor.isActive("italic")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600"
          }`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>

        {/* Text Color */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`p-2 rounded-lg hover:bg-gray-100 ${
              showColorPicker ? "bg-blue-100 text-blue-700" : "text-gray-600"
            }`}
            title="Text Color"
          >
            <Palette className="h-4 w-4" />
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20">
              <div className="grid grid-cols-4 gap-1 mb-2">
                {textColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => applyTextColor(color.value)}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
              <button
                onClick={removeTextColor}
                className="w-full text-xs text-gray-600 hover:text-gray-800 py-1 border-t border-gray-200"
              >
                Remove Color
              </button>
            </div>
          )}
        </div>
        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-lg hover:bg-gray-100 ${
            editor.isActive("bulletList")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600"
          }`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded-lg hover:bg-gray-100 ${
            editor.isActive("orderedList")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600"
          }`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        {/* List Indentation Controls */}
        {(editor.isActive("bulletList") || editor.isActive("orderedList")) && (
          <>
            <button
              onClick={() =>
                editor.chain().focus().sinkListItem("listItem").run()
              }
              disabled={!editor.can().sinkListItem("listItem")}
              className={`p-2 rounded-lg hover:bg-gray-100 text-gray-600 ${
                !editor.can().sinkListItem("listItem")
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              title="Indent List Item (Tab)"
            >
              →
            </button>

            <button
              onClick={() =>
                editor.chain().focus().liftListItem("listItem").run()
              }
              disabled={!editor.can().liftListItem("listItem")}
              className={`p-2 rounded-lg hover:bg-gray-100 text-gray-600 ${
                !editor.can().liftListItem("listItem")
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              title="Outdent List Item (Shift+Tab)"
            >
              ←
            </button>
          </>
        )}

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded-lg hover:bg-gray-100 ${
            editor.isActive("blockquote")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600"
          }`}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded-lg hover:bg-gray-100 ${
            editor.isActive("codeBlock")
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600"
          }`}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={addLink}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        <button
          onClick={addImage}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          title="Add Image"
        >
          <ImageIcon className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />


        <FileUploadButton
          onUploadComplete={handleFileUpload}
          onUploadError={handleUploadError}
          accept="image/*,.pdf,.txt,.doc,.docx"
          folder="articles"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          useResumable={true}
        >
          <Upload className="h-4 w-4" title="Upload File" />
        </FileUploadButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-50"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-50"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Editor Content */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ scrollBehavior: "smooth" }}
      >
        <EditorContent
          editor={editor}
          className="prose prose-lg max-w-none focus:outline-none min-h-[300px]"
          style={{ fontSize: "16px", lineHeight: "18.4px" }}
        />
      </div>
    </div>
  );
};
