# Markdown Editor

A simple web-based markdown editor that allows users to write and preview markdown content in real-time. It supports common markdown syntax and provides a clean interface for note-taking, documentation, or blogging.

## Features

### Markdown Syntax
- **Headers** (H1–H6), **Bold**, **Italic**, **Strikethrough**
- **Tables** with styled headers and borders
- **Task/Checkbox Lists** (`- [x]` / `- [ ]`)
- **Footnotes** with auto-numbered references
- **Code Blocks** with syntax highlighting (highlight.js)
- **Inline Code**, **Blockquotes**, **Horizontal Rules**
- **Links**, **Images**, **Ordered & Unordered Lists**
- **Math/LaTeX** rendering with KaTeX (`$inline$` and `$$block$$`)
- **40+ Emoji** shortcuts (`:smile:`, `:rocket:`, `:fire:`, etc.)

### Editor
- **Live Split-View Preview** with real-time rendering
- **Line Numbers** alongside the editor
- **Syntax Highlighting** for fenced code blocks with language detection
- **Find & Replace** with regex support and match count
- **Undo/Redo** toolbar buttons with 50-level history
- **Auto-Complete Snippets** — type `/table`, `/checklist`, `/code`, `/math`, `/footnote`, `/strike` + Tab
- **Keyboard Shortcuts** — Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+K (Link), Ctrl+H (Find), Ctrl+S (Save Version), Ctrl+Z / Ctrl+Shift+Z (Undo/Redo)
- **Drag & Drop Images** directly into the editor (base64 embedded)
- **Scroll Sync** between editor and preview

### Productivity
- **localStorage Persistence** — content, documents, and settings survive page refresh
- **Multiple Documents** with tabs (create, rename, switch, delete)
- **Auto-Save Versioning** every 30 seconds + manual Ctrl+S
- **Version History** — browse and restore previous versions
- **Export to HTML** — downloads a complete standalone HTML file
- **Print / Export to PDF** — opens a print-friendly view
- **Copy to Clipboard** with visual feedback
- **Upload** `.md` and `.txt` files
- **Shareable Links** — compresses markdown into a URL hash for sharing

### UI/UX
- **4 Themes** — Light, Dark, Solarized, Dracula (persisted across sessions)
- **4 View Modes** — Split, Editor-only, Preview-only, Zen (distraction-free)
- **Adjustable Split Panel** — drag the divider to resize editor vs preview
- **Table of Contents** — auto-generated from headings
- **Responsive Design** — mobile tab switching for edit/preview
- **Print-Friendly Styles** — clean output via CSS `@media print`

### Stats
- **Word Count**, **Character Count**, **Line Count**
- **Cursor Position** (line & column)
- Current theme and view mode displayed in footer

## Technologies Used
- **React** — UI library
- **TypeScript** — type-safe JavaScript
- **Vite** — fast build tool and dev server
- **highlight.js** — syntax highlighting for code blocks
- **KaTeX** — math/LaTeX rendering
- **lz-string** — URL compression for shareable links
- **lucide-react** — icon library

## Getting Started

### Clone the Repository
```bash
git clone https://github.com/sewakgautam/Markdown-Editor.git
cd Markdown-Editor
```

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```




