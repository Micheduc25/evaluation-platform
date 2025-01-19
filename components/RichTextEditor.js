import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Image from "@tiptap/extension-image";
import { useState } from "react";
import FileUpload from "./FileUpload";
import { PhotoIcon as ImageIcon } from "@heroicons/react/24/outline";

// Update MenuBar to receive showImageUpload and setShowImageUpload as props
export const MenuBar = ({
  editor,
  onUploadStart,
  onUploadEnd,
  showImageUpload,
  setShowImageUpload,
  allowImageUpload,
}) => {
  if (!editor) return null;

  const buttonStyle = (isActive) => `
    p-1.5 rounded hover:bg-gray-100 transition-colors
    ${isActive ? "bg-blue-50 text-blue-600" : "text-gray-600"}
    focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50
  `;

  const Divider = () => <div className="w-px h-6 bg-gray-200 mx-2" />;

  const handleImageUpload = async (file) => {
    if (file?.url) {
      try {
        onUploadStart?.(); // Signal upload start
        // Add image validation
        const img = new Image();
        img.onload = function () {
          // Reject screenshots (exact screen dimensions)
          if (
            this.width === window.screen.width ||
            this.height === window.screen.height
          ) {
            toast.error("Screenshots are not allowed");
            return;
          }

          // Check for suspicious image dimensions (too large/small)
          if (this.width > 2000 || this.height > 2000) {
            toast.error("Image dimensions too large");
            return;
          }

          // Allow the image if it passes checks
          editor.chain().focus().setImage({ src: file.url }).run();
          setShowImageUpload(false);
        };
        img.src = file.url;
      } finally {
        onUploadEnd?.(); // Signal upload end
      }
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1 mb-2 p-1 bg-white rounded-md">
        {/* Text styling */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={buttonStyle(editor.isActive("bold"))}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={buttonStyle(editor.isActive("italic"))}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={buttonStyle(editor.isActive("strike"))}
            title="Strikethrough"
          >
            <span className="line-through">S</span>
          </button>
        </div>

        <Divider />

        {/* Headings */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={buttonStyle(editor.isActive("heading", { level: 2 }))}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={buttonStyle(editor.isActive("heading", { level: 3 }))}
            title="Heading 3"
          >
            H3
          </button>
        </div>

        <Divider />

        {/* Lists */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={buttonStyle(editor.isActive("bulletList"))}
            title="Bullet List"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={buttonStyle(editor.isActive("orderedList"))}
            title="Numbered List"
          >
            1.
          </button>
        </div>

        <Divider />

        {/* Special formats */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={buttonStyle(editor.isActive("code"))}
            title="Code"
          >
            <code>{"</>"}</code>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={buttonStyle(editor.isActive("blockquote"))}
            title="Quote"
          >
            ""
          </button>
        </div>

        {/* Only show image upload button if allowed */}
        {allowImageUpload && (
          <>
            <Divider />
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShowImageUpload(!showImageUpload)}
                className={buttonStyle(showImageUpload)}
                title="Insert Image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function RichTextEditor({
  content,
  onChange,
  error,
  preventCopy = false,
  onUploadStart,
  onUploadEnd,
  allowImageUpload = true, // Add new prop with default value
}) {
  const [showImageUpload, setShowImageUpload] = useState(false); // Move this from MenuBar to main component

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: "bullet-list",
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: "ordered-list",
        },
      }),
      ListItem.configure({
        HTMLAttributes: {
          class: "list-item",
        },
      }),
      // Only include Image extension if uploads are allowed
      ...(allowImageUpload
        ? [
            Image.configure({
              HTMLAttributes: {
                class: "rounded-lg max-w-full mx-auto my-4",
              },
            }),
          ]
        : []),
    ],
    content,
    onUpdate: ({ editor }) => {
      // Ensure proper HTML formatting
      const cleanHtml = editor
        .getHTML()
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .replace(/<p><\/p>/g, "")
        .trim();
      onChange(cleanHtml);
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none focus:outline-none px-4 py-3",
      },
      handleKeyDown: (view, event) => {
        if (preventCopy) {
          // Prevent copy/paste keyboard shortcuts
          if (
            (event.ctrlKey || event.metaKey) &&
            (event.key === "c" || event.key === "v")
          ) {
            event.preventDefault();
            return true;
          }
        }
        if (event.key === "Tab" && editor?.isActive("listItem")) {
          if (event.shiftKey) {
            editor.commands.liftListItem("listItem");
          } else {
            editor.commands.sinkListItem("listItem");
          }
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        if (preventCopy) {
          event.preventDefault();
          return true;
        }
        return false;
      },
      // Prevent drag and drop
      handleDrop: (view, event) => {
        if (preventCopy) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
  });

  return (
    <div
      className={`border rounded-md ${
        error ? "border-red-500 bg-red-50" : "border-gray-300"
      }`}
      onPaste={preventCopy ? (e) => e.preventDefault() : undefined}
      onDrop={preventCopy ? (e) => e.preventDefault() : undefined}
    >
      <div className="p-2 border-b bg-gray-50 sticky top-0">
        <MenuBar
          editor={editor}
          onUploadStart={onUploadStart}
          onUploadEnd={onUploadEnd}
          showImageUpload={showImageUpload}
          setShowImageUpload={setShowImageUpload}
          allowImageUpload={allowImageUpload}
        />
      </div>
      <div
        className={`min-h-[200px] max-h-[500px] overflow-y-auto ${
          showImageUpload ? "pointer-events-none" : ""
        }`}
      >
        <EditorContent
          editor={editor}
          className="prose prose-sm sm:prose-base max-w-none focus:outline-none"
        />
      </div>

      {/* Only render upload modal if allowed */}
      {allowImageUpload && showImageUpload && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-25"
            onClick={() => setShowImageUpload(false)}
          />
          <div className="relative pointer-events-auto w-full max-w-md p-4 mx-auto mt-20">
            <div className="bg-white rounded-lg shadow-xl p-4">
              <FileUpload
                onUploadComplete={(file) => {
                  if (file?.url) {
                    editor.chain().focus().setImage({ src: file.url }).run();
                    setShowImageUpload(false);
                  }
                }}
                onUploadStart={onUploadStart}
                onUploadEnd={onUploadEnd}
                onError={(error) => console.error("Upload error:", error)}
                allowedTypes={["image/jpeg", "image/png"]}
                maxSize={1048576}
                path="editor-images"
                multiple={false}
                maxUploads={3}
              />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .ProseMirror {
          min-height: 200px;
          padding: 1rem;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror li {
          margin: 0.2em 0;
        }
        .ProseMirror li p {
          margin: 0;
        }
        .ProseMirror ul[data-type="taskList"] {
          list-style-type: none;
          padding-left: 0;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror:focus {
          outline: none;
        }

        /* Add styles for images */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          cursor: default;
          display: block;
          margin: 1rem auto;
        }

        .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid #60a5fa;
        }
      `}</style>
    </div>
  );
}
