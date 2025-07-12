import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
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
} from "lucide-react";
import { FileUploadButton } from "./FileUpload";
import { useAuth } from "../hooks/useAuth";
import { UploadResult } from "../lib/fileUpload";
import toast from "react-hot-toast";

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
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
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
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[400px] p-6",
      },
    },
  });

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
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
      // Insert image
      editor
        .chain()
        .focus()
        .setImage({ src: result.url, alt: result.name })
        .run();
    } else {
      // Insert link for non-image files
      editor
        .chain()
        .focus()
        .setLink({ href: result.url })
        .insertContent(result.name)
        .run();
    }
    toast.success("File inserted into article!");
  };

  const handleUploadError = (error: string) => {
    toast.error(error);
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 flex flex-wrap gap-1">
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

        <FileUploadButton
          onUploadComplete={handleFileUpload}
          onUploadError={handleUploadError}
          accept="image/*,.pdf,.txt,.doc,.docx"
          folder="articles"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
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

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
};
