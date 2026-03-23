import React, { useState, useEffect, useCallback, useRef, ChangeEvent, DragEvent, KeyboardEvent } from "react";
import {
  FileText, Eye, Download, Upload, Copy, Check, Sun, Moon,
  Undo2, Redo2, Search, X, Maximize2, Minimize2, Columns,
  Printer, Share2, BookOpen, Plus, Edit3, ChevronDown,
  Type, History, Code, Link, Image
} from "lucide-react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import katex from "katex";
import "katex/dist/katex.min.css";
import LZString from "lz-string";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CursorPosition { line: number; column: number; }

interface Doc {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface VersionEntry {
  content: string;
  timestamp: number;
  docId: string;
}

type ThemeName = "light" | "dark" | "solarized" | "dracula";
type ViewMode = "split" | "editor" | "preview" | "zen";

interface ThemeColors {
  bg: string; headerBg: string; border: string; text: string; textMuted: string;
  editorBg: string; editorText: string; editorBorder: string; previewBg: string;
  btnBg: string; btnText: string; btnHover: string; accent: string;
  codeBg: string; placeholder: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const THEMES: Record<ThemeName, ThemeColors> = {
  light: {
    bg: "#f9fafb", headerBg: "#ffffff", border: "#e5e7eb", text: "#111827",
    textMuted: "#6b7280", editorBg: "#ffffff", editorText: "#111827",
    editorBorder: "#d1d5db", previewBg: "#ffffff", btnBg: "#f3f4f6",
    btnText: "#374151", btnHover: "#e5e7eb", accent: "#3b82f6",
    codeBg: "#f3f4f6", placeholder: "#9ca3af",
  },
  dark: {
    bg: "#111827", headerBg: "#1f2937", border: "#374151", text: "#f9fafb",
    textMuted: "#9ca3af", editorBg: "#1f2937", editorText: "#f3f4f6",
    editorBorder: "#374151", previewBg: "#1f2937", btnBg: "#374151",
    btnText: "#d1d5db", btnHover: "#4b5563", accent: "#60a5fa",
    codeBg: "#374151", placeholder: "#6b7280",
  },
  solarized: {
    bg: "#fdf6e3", headerBg: "#eee8d5", border: "#93a1a1", text: "#657b83",
    textMuted: "#839496", editorBg: "#fdf6e3", editorText: "#657b83",
    editorBorder: "#93a1a1", previewBg: "#fdf6e3", btnBg: "#eee8d5",
    btnText: "#657b83", btnHover: "#93a1a1", accent: "#268bd2",
    codeBg: "#eee8d5", placeholder: "#93a1a1",
  },
  dracula: {
    bg: "#282a36", headerBg: "#44475a", border: "#6272a4", text: "#f8f8f2",
    textMuted: "#6272a4", editorBg: "#282a36", editorText: "#f8f8f2",
    editorBorder: "#6272a4", previewBg: "#282a36", btnBg: "#44475a",
    btnText: "#f8f8f2", btnHover: "#6272a4", accent: "#bd93f9",
    codeBg: "#44475a", placeholder: "#6272a4",
  },
};

const SNIPPETS: Record<string, string> = {
  "/table": "| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |",
  "/checklist": "- [x] Completed task\n- [ ] Pending task\n- [ ] Another task",
  "/code": "```javascript\n// Your code here\n```",
  "/link": "[Link text](https://example.com)",
  "/image": "![Alt text](https://example.com/image.png)",
  "/math": "$$\nE = mc^2\n$$",
  "/hr": "\n---\n",
  "/quote": "> Blockquote text here",
  "/h1": "# Heading 1",
  "/h2": "## Heading 2",
  "/h3": "### Heading 3",
  "/bold": "**bold text**",
  "/italic": "*italic text*",
  "/footnote": "Text with a footnote[^1]\n\n[^1]: Footnote content here",
  "/strike": "~~strikethrough text~~",
};

const EMOJI_MAP: Record<string, string> = {
  smile: "😄", heart: "❤️", thumbs_up: "👍", fire: "🔥",
  rocket: "🚀", star: "⭐", coffee: "☕", book: "📚",
  computer: "💻", phone: "📱", email: "📧", home: "🏠",
  check: "✅", cross: "❌", warning: "⚠️", info: "ℹ️",
  bulb: "💡", pin: "📌", sparkles: "✨", party: "🎉",
  eyes: "👀", wave: "👋", clap: "👏", muscle: "💪",
  thinking: "🤔", laugh: "😂", cry: "😢", angry: "😠",
  sun: "☀️", moon: "🌙", cloud: "☁️", rain: "🌧️",
  lock: "🔒", key: "🔑", gear: "⚙️", wrench: "🔧",
  bug: "🐛", link: "🔗", clock: "⏰", bell: "🔔",
};

const genId = (): string => Math.random().toString(36).substring(2, 9);

// ─── Component ─────────────────────────────────────────────────────────────

const App: React.FC = () => {
  /* ─── State ─── */

  const [documents, setDocuments] = useState<Doc[]>(() => {
    try {
      const saved = localStorage.getItem("md-docs");
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    const id = genId();
    return [{ id, name: "Untitled", content: "", createdAt: Date.now(), updatedAt: Date.now() }];
  });

  const [activeDocId, setActiveDocId] = useState<string>(() => {
    return localStorage.getItem("md-active") || "";
  });

  // ensure valid active doc
  const validActiveId = documents.find(d => d.id === activeDocId)?.id || documents[0]?.id || "";
  if (validActiveId !== activeDocId) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // fix via effect below
  }
  useEffect(() => {
    if (!documents.find(d => d.id === activeDocId)) {
      setActiveDocId(documents[0]?.id || "");
    }
  }, [documents, activeDocId]);

  const activeDoc = documents.find(d => d.id === validActiveId);
  const markdown = activeDoc?.content || "";

  const [html, setHtml] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeName>(() =>
    (localStorage.getItem("md-theme") as ThemeName) || "light"
  );
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 1, column: 1 });
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [splitPos, setSplitPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [versions, setVersions] = useState<VersionEntry[]>(() => {
    try {
      const s = localStorage.getItem("md-versions");
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return [];
  });
  const [showVersions, setShowVersions] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [editingDocName, setEditingDocName] = useState<string | null>(null);
  const [docNameDraft, setDocNameDraft] = useState("");

  /* ─── Refs ─── */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markdownRef = useRef(markdown);
  markdownRef.current = markdown;
  const activeDocIdRef = useRef(validActiveId);
  activeDocIdRef.current = validActiveId;

  const colors = THEMES[theme];

  /* ─── Helpers ─── */

  const updateContent = useCallback((content: string) => {
    setDocuments(prev => prev.map(d =>
      d.id === activeDocIdRef.current ? { ...d, content, updatedAt: Date.now() } : d
    ));
  }, []);

  const pushUndo = useCallback((content: string) => {
    setUndoStack(prev => [...prev.slice(-50), content]);
    setRedoStack([]);
  }, []);

  /* ─── localStorage persistence ─── */

  useEffect(() => { localStorage.setItem("md-docs", JSON.stringify(documents)); }, [documents]);
  useEffect(() => { localStorage.setItem("md-active", validActiveId); }, [validActiveId]);
  useEffect(() => { localStorage.setItem("md-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("md-versions", JSON.stringify(versions.slice(-200))); }, [versions]);

  /* ─── Auto-save versioning (every 30s if changed) ─── */

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const md = markdownRef.current;
      if (!md.trim()) return;
      setVersions(prev => {
        const last = prev.filter(v => v.docId === activeDocIdRef.current).pop();
        if (last && last.content === md) return prev;
        return [...prev, { content: md, timestamp: Date.now(), docId: activeDocIdRef.current }];
      });
    }, 30000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [markdown]);

  /* ─── Load shared link from URL hash ─── */

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decoded = LZString.decompressFromEncodedURIComponent(hash);
        if (decoded) {
          updateContent(decoded);
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Tailwind CSS ─── */

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  /* ─── Markdown Parser ─── */

  const parseMarkdown = useCallback((text: string): string => {
    if (!text) return "";

    // Protect code blocks
    const codeBlocks: string[] = [];
    let processed = text.replace(/```(\w*)\n([\s\S]*?)```/gim, (_, lang, code) => {
      let highlighted: string;
      try {
        highlighted = (lang && hljs.getLanguage(lang))
          ? hljs.highlight(code.trimEnd(), { language: lang }).value
          : hljs.highlightAuto(code.trimEnd()).value;
      } catch {
        highlighted = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
      const ph = `%%CB${codeBlocks.length}%%`;
      codeBlocks.push(
        `<pre style="background:${colors.codeBg};padding:12px;border-radius:6px;margin:8px 0;overflow-x:auto;"><code class="hljs" style="font-size:13px;font-family:monospace;">${highlighted}</code></pre>`
      );
      return ph;
    });

    // Protect inline code
    const inlineCodes: string[] = [];
    processed = processed.replace(/`([^`]+)`/g, (_, code) => {
      const ph = `%%IC${inlineCodes.length}%%`;
      inlineCodes.push(
        `<code style="background:${colors.codeBg};padding:1px 4px;border-radius:3px;font-size:13px;font-family:monospace;">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code>`
      );
      return ph;
    });

    // Math blocks ($$...$$)
    const mathBlocks: string[] = [];
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/gim, (_, math) => {
      const ph = `%%MB${mathBlocks.length}%%`;
      try {
        mathBlocks.push(`<div style="text-align:center;margin:12px 0;">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`);
      } catch {
        mathBlocks.push(`<div style="color:red;">Math error</div>`);
      }
      return ph;
    });

    // Inline math ($...$)
    const inlineMath: string[] = [];
    processed = processed.replace(/\$([^\$\n]+)\$/g, (_, math) => {
      const ph = `%%IM${inlineMath.length}%%`;
      try {
        inlineMath.push(katex.renderToString(math.trim(), { displayMode: false, throwOnError: false }));
      } catch {
        inlineMath.push(`<span style="color:red;">${math}</span>`);
      }
      return ph;
    });

    // Process line by line
    const lines = processed.split("\n");
    const outputLines: string[] = [];
    let inTable = false;
    const tableRows: string[] = [];
    const footnotes: Record<string, string> = {};
    const footnoteRefs: string[] = [];

    // Collect footnote definitions
    for (const line of lines) {
      const m = line.match(/^\[\^(\w+)\]:\s*(.+)$/);
      if (m) footnotes[m[1]] = m[2];
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip footnote defs
      if (/^\[\^(\w+)\]:\s*/.test(line)) continue;

      // Tables
      if (line.includes("|") && line.trim().startsWith("|")) {
        if (!inTable) { inTable = true; tableRows.length = 0; }
        if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue;
        tableRows.push(line);
        if (i + 1 >= lines.length || !lines[i + 1]?.trim().startsWith("|")) {
          let t = `<table style="border-collapse:collapse;width:100%;margin:8px 0;">`;
          tableRows.forEach((row, idx) => {
            const cells = row.split("|").filter(c => c.trim() !== "");
            const tag = idx === 0 ? "th" : "td";
            const bg = idx === 0 ? `background:${colors.codeBg};font-weight:600;` : "";
            t += "<tr>";
            cells.forEach(cell => { t += `<${tag} style="border:1px solid ${colors.border};padding:8px;${bg}">${cell.trim()}</${tag}>`; });
            t += "</tr>";
          });
          t += "</table>";
          outputLines.push(t);
          inTable = false;
          tableRows.length = 0;
        }
        continue;
      }

      // Headers
      const hMatch = line.match(/^(#{1,6}) (.+)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const txt = hMatch[2];
        const id = txt.toLowerCase().replace(/[^\w]+/g, "-");
        const sizes = ["1.5rem", "1.3rem", "1.125rem", "1rem", "0.9rem", "0.85rem"];
        outputLines.push(`<h${level} id="${id}" style="font-size:${sizes[level - 1]};font-weight:${level <= 2 ? 700 : 600};margin:${level <= 2 ? 16 : 8}px 0 8px;">${txt}</h${level}>`);
        continue;
      }

      // Horizontal rule
      if (/^---+$/.test(line.trim())) {
        outputLines.push(`<hr style="margin:16px 0;border-color:${colors.border};">`);
        continue;
      }

      // Blockquote
      if (line.startsWith("> ")) {
        outputLines.push(`<blockquote style="border-left:4px solid ${colors.accent};padding-left:16px;font-style:italic;margin:8px 0;color:${colors.textMuted};">${line.slice(2)}</blockquote>`);
        continue;
      }

      // Task lists
      if (/^[-*] \[[ x]\] /.test(line)) {
        const checked = /^[-*] \[x\] /.test(line);
        const content = line.replace(/^[-*] \[[ x]\] /, "");
        outputLines.push(`<div style="margin-left:16px;margin-bottom:4px;"><input type="checkbox" ${checked ? "checked" : ""} disabled style="margin-right:8px;accent-color:${colors.accent};">${content}</div>`);
        continue;
      }

      // Unordered lists
      if (/^[-*] /.test(line)) {
        outputLines.push(`<li style="margin-left:24px;list-style:disc;margin-bottom:2px;">${line.replace(/^[-*] /, "")}</li>`);
        continue;
      }

      // Ordered lists
      if (/^\d+\. /.test(line)) {
        outputLines.push(`<li style="margin-left:24px;list-style:decimal;margin-bottom:2px;">${line.replace(/^\d+\. /, "")}</li>`);
        continue;
      }

      // Empty line or text
      if (line.trim() === "") {
        outputLines.push("<br>");
      } else {
        outputLines.push(`<p style="margin-bottom:4px;">${line}</p>`);
      }
    }

    let result = outputLines.join("\n");

    // Inline formatting
    result = result
      .replace(/~~(.*?)~~/g, "<del>$1</del>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.*?)__/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
      .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, `<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:8px 0;border-radius:4px;">`)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer" style="color:${colors.accent};text-decoration:underline;">$1</a>`)
      .replace(/\[\^(\w+)\]/g, (_, name) => {
        if (footnotes[name]) {
          if (!footnoteRefs.includes(name)) footnoteRefs.push(name);
          const idx = footnoteRefs.indexOf(name) + 1;
          return `<sup style="color:${colors.accent};cursor:help;" title="${footnotes[name]}">[${idx}]</sup>`;
        }
        return `[^${name}]`;
      });

    // Footnotes section
    if (footnoteRefs.length > 0) {
      result += `<hr style="margin:24px 0 12px;border-color:${colors.border};"><div style="font-size:0.85em;"><strong>Footnotes</strong><ol>`;
      footnoteRefs.forEach(name => {
        result += `<li style="margin-left:16px;margin-bottom:4px;">${footnotes[name]}</li>`;
      });
      result += "</ol></div>";
    }

    // Emojis
    result = result.replace(/:([\w+-]+):/g, (match, name) => EMOJI_MAP[name] || match);

    // Restore protected elements
    mathBlocks.forEach((b, i) => { result = result.replace(`%%MB${i}%%`, b); });
    inlineMath.forEach((m, i) => { result = result.replace(`%%IM${i}%%`, m); });
    codeBlocks.forEach((b, i) => { result = result.replace(`%%CB${i}%%`, b); });
    inlineCodes.forEach((c, i) => { result = result.replace(`%%IC${i}%%`, c); });

    return result;
  }, [colors]);

  /* ─── Parse on change ─── */

  useEffect(() => { setHtml(parseMarkdown(markdown)); }, [markdown, parseMarkdown]);

  /* ─── Keyboard shortcuts ─── */

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const textarea = textareaRef.current;

      const doInsert = (before: string, after: string) => {
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const md = markdownRef.current;
        const sel = md.substring(start, end);
        const newText = md.substring(0, start) + before + sel + after + md.substring(end);
        pushUndo(md);
        updateContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + before.length, start + before.length + sel.length);
        }, 0);
      };

      switch (e.key.toLowerCase()) {
        case "b": e.preventDefault(); doInsert("**", "**"); break;
        case "i": e.preventDefault(); doInsert("*", "*"); break;
        case "k": e.preventDefault(); doInsert("[", "](url)"); break;
        case "h": e.preventDefault(); setShowFind(p => !p); break;
        case "z":
          e.preventDefault();
          if (e.shiftKey) {
            setRedoStack(r => {
              if (r.length === 0) return r;
              const next = r[r.length - 1];
              setUndoStack(s => [...s, markdownRef.current]);
              updateContent(next);
              return r.slice(0, -1);
            });
          } else {
            setUndoStack(s => {
              if (s.length === 0) return s;
              const prev = s[s.length - 1];
              setRedoStack(r => [...r, markdownRef.current]);
              updateContent(prev);
              return s.slice(0, -1);
            });
          }
          break;
        case "s":
          e.preventDefault();
          if (markdownRef.current.trim()) {
            setVersions(prev => [...prev, { content: markdownRef.current, timestamp: Date.now(), docId: activeDocIdRef.current }]);
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pushUndo, updateContent]);

  /* ─── Scroll sync ─── */

  const handleEditorScroll = useCallback(() => {
    const ed = textareaRef.current;
    const pr = previewRef.current;
    if (!ed) return;
    const pct = ed.scrollTop / (ed.scrollHeight - ed.clientHeight || 1);
    // Sync line numbers
    const ln = document.querySelector('.md-line-numbers') as HTMLElement;
    if (ln) ln.scrollTop = ed.scrollTop;
    // Sync preview
    if (pr && viewMode !== "editor") {
      pr.scrollTop = pct * (pr.scrollHeight - pr.clientHeight);
    }
  }, [viewMode]);

  /* ─── Focus find when opened ─── */

  useEffect(() => { if (showFind && findInputRef.current) findInputRef.current.focus(); }, [showFind]);

  /* ─── Split panel drag ─── */

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const ct = document.getElementById("editor-container");
      if (!ct) return;
      const rect = ct.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.min(Math.max(pct, 20), 80));
    };
    const onUp = () => setIsDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [isDragging]);

  /* ─── Handlers ─── */

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    pushUndo(markdown);
    updateContent(e.target.value);
    const t = e.target;
    const text = t.value.substring(0, t.selectionStart);
    const lines = text.split("\n");
    setCursorPosition({ line: lines.length, column: lines[lines.length - 1].length + 1 });
  };

  const handleUndo = (): void => {
    if (undoStack.length === 0) return;
    setRedoStack(r => [...r, markdown]);
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    updateContent(prev);
  };

  const handleRedo = (): void => {
    if (redoStack.length === 0) return;
    setUndoStack(s => [...s, markdown]);
    const next = redoStack[redoStack.length - 1];
    setRedoStack(r => r.slice(0, -1));
    updateContent(next);
  };

  const getWordCount = (): number => markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const getCharCount = (): number => markdown.length;
  const getLineCount = (): number => markdown ? markdown.split("\n").length : 0;

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType = "text/plain"): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsHtml = (): void => {
    const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${activeDoc?.name || "Document"}</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333;}</style></head><body>${html}</body></html>`;
    downloadFile(full, `${activeDoc?.name || "document"}.html`, "text/html");
  };

  const exportAsPdf = (): void => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${activeDoc?.name || "Document"}</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333;}@media print{body{margin:0;padding:20px;}}</style></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const loadFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") { pushUndo(markdown); updateContent(result); }
    };
    reader.readAsText(file);
  };

  const insertText = (before: string, after = ""): void => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = markdown.substring(start, end);
    const newText = markdown.substring(0, start) + before + sel + after + markdown.substring(end);
    pushUndo(markdown);
    updateContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + sel.length);
    }, 0);
  };

  const insertSnippet = (key: string): void => {
    const snippet = SNIPPETS[key];
    if (!snippet) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    pushUndo(markdown);
    updateContent(markdown.substring(0, start) + snippet + markdown.substring(start));
    setShowSnippets(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  // Find & Replace
  const getFindCount = (): number => {
    if (!findText) return 0;
    try {
      const regex = useRegex
        ? new RegExp(findText, "gi")
        : new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      return (markdown.match(regex) || []).length;
    } catch { return 0; }
  };

  const handleReplace = (): void => {
    if (!findText) return;
    try {
      const regex = useRegex
        ? new RegExp(findText, "i")
        : new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      pushUndo(markdown);
      updateContent(markdown.replace(regex, replaceText));
    } catch { /* invalid regex */ }
  };

  const handleReplaceAll = (): void => {
    if (!findText) return;
    try {
      const regex = useRegex
        ? new RegExp(findText, "gi")
        : new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      pushUndo(markdown);
      updateContent(markdown.replace(regex, replaceText));
    } catch { /* invalid regex */ }
  };

  // Document management
  const createDocument = (): void => {
    const id = genId();
    setDocuments(prev => [...prev, { id, name: "Untitled", content: "", createdAt: Date.now(), updatedAt: Date.now() }]);
    setActiveDocId(id);
    setUndoStack([]);
    setRedoStack([]);
  };

  const deleteDocument = (id: string): void => {
    if (documents.length <= 1) return;
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (validActiveId === id) {
      const remaining = documents.filter(d => d.id !== id);
      setActiveDocId(remaining[0]?.id || "");
    }
  };

  const renameDocument = (id: string, name: string): void => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, name: name || "Untitled" } : d));
    setEditingDocName(null);
  };

  // Drag & drop
  const handleDrop = (e: DragEvent<HTMLTextAreaElement>): void => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (dataUrl) {
            const pos = textareaRef.current?.selectionStart || markdown.length;
            pushUndo(markdown);
            updateContent(markdown.substring(0, pos) + `![${file.name}](${dataUrl})` + markdown.substring(pos));
          }
        };
        reader.readAsDataURL(file);
      } else if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (typeof ev.target?.result === "string") { pushUndo(markdown); updateContent(ev.target.result); }
        };
        reader.readAsText(file);
      }
    }
  };

  // Share
  const shareLink = (): void => {
    const compressed = LZString.compressToEncodedURIComponent(markdown);
    const url = `${window.location.origin}${window.location.pathname}#${compressed}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Snippet detection on Tab key
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Tab") {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const pos = textarea.selectionStart;
      const lineStart = markdown.lastIndexOf("\n", pos - 1) + 1;
      const currentLine = markdown.substring(lineStart, pos);
      for (const key of Object.keys(SNIPPETS)) {
        if (currentLine.endsWith(key)) {
          e.preventDefault();
          const snippet = SNIPPETS[key];
          const before = markdown.substring(0, pos - key.length);
          const after = markdown.substring(pos);
          pushUndo(markdown);
          updateContent(before + snippet + after);
          setTimeout(() => {
            textarea.focus();
            const np = before.length + snippet.length;
            textarea.setSelectionRange(np, np);
          }, 0);
          return;
        }
      }
      e.preventDefault();
      const newText = markdown.substring(0, pos) + "  " + markdown.substring(pos);
      pushUndo(markdown);
      updateContent(newText);
      setTimeout(() => { textarea.setSelectionRange(pos + 2, pos + 2); }, 0);
    }
  };

  // TOC extraction
  const getToc = (): { level: number; text: string; id: string }[] => {
    const headings: { level: number; text: string; id: string }[] = [];
    markdown.split("\n").forEach(line => {
      const m = line.match(/^(#{1,6}) (.+)$/);
      if (m) headings.push({ level: m[1].length, text: m[2], id: m[2].toLowerCase().replace(/[^\w]+/g, "-") });
    });
    return headings;
  };

  // Version restore
  const restoreVersion = (v: VersionEntry): void => {
    pushUndo(markdown);
    updateContent(v.content);
    setShowVersions(false);
  };

  // Line numbers
  const lineCount = Math.max(markdown.split("\n").length, 1);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const isZen = viewMode === "zen";

  // Shared button style
  const btnS: React.CSSProperties = {
    background: colors.btnBg, color: colors.btnText, border: "none",
    cursor: "pointer", padding: "4px 8px", borderRadius: 4, fontSize: 13,
    display: "inline-flex", alignItems: "center", gap: 3, transition: "background 0.15s",
  };

  /* ─── Close dropdowns on outside click ─── */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) {
        setShowSnippets(false);
        setShowToc(false);
        setShowVersions(false);
        setShowThemePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ─── Render ─── */

  return (
    <div style={{ height: "100vh", background: colors.bg, color: colors.text, transition: "all 0.3s", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ═══ Header ═══ */}
      {!isZen && (
        <header style={{ borderBottom: `1px solid ${colors.border}`, background: colors.headerBg }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText style={{ width: 24, height: 24, color: colors.accent }} />
                <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>Markdown Editor</h1>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
                {/* Format */}
                <button onClick={() => insertText("**", "**")} style={btnS} title="Bold (Ctrl+B)"><strong>B</strong></button>
                <button onClick={() => insertText("*", "*")} style={{ ...btnS, fontStyle: "italic" }} title="Italic (Ctrl+I)">I</button>
                <button onClick={() => insertText("~~", "~~")} style={{ ...btnS, textDecoration: "line-through" }} title="Strikethrough">S</button>
                <button onClick={() => insertText("`", "`")} style={{ ...btnS, fontFamily: "monospace" }} title="Inline Code">&lt;/&gt;</button>
                <button onClick={() => insertText("[", "](url)")} style={btnS} title="Link (Ctrl+K)"><Link size={14} /></button>
                <button onClick={() => insertText("![alt](", ")")} style={btnS} title="Image"><Image size={14} /></button>

                <div style={{ width: 1, height: 20, background: colors.border, margin: "0 2px" }} />

                {/* Undo/Redo */}
                <button onClick={handleUndo} style={{ ...btnS, opacity: undoStack.length ? 1 : 0.4 }} title="Undo (Ctrl+Z)"><Undo2 size={14} /></button>
                <button onClick={handleRedo} style={{ ...btnS, opacity: redoStack.length ? 1 : 0.4 }} title="Redo (Ctrl+Shift+Z)"><Redo2 size={14} /></button>

                <div style={{ width: 1, height: 20, background: colors.border, margin: "0 2px" }} />

                {/* Find, Snippets, TOC */}
                <button onClick={() => setShowFind(p => !p)} style={btnS} title="Find & Replace (Ctrl+H)"><Search size={14} /></button>

                <div style={{ position: "relative" }} data-dropdown>
                  <button onClick={() => setShowSnippets(p => !p)} style={btnS} title="Snippets"><Code size={14} /><ChevronDown size={10} /></button>
                  {showSnippets && (
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: colors.headerBg, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 4, zIndex: 100, minWidth: 220, maxHeight: 300, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                      {Object.entries(SNIPPETS).map(([key, val]) => (
                        <button key={key} onClick={() => insertSnippet(key)} style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", border: "none", background: "transparent", color: colors.text, cursor: "pointer", borderRadius: 4, fontSize: 13 }}
                          onMouseEnter={e => (e.currentTarget.style.background = colors.btnBg)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <code style={{ color: colors.accent }}>{key}</code>
                          <span style={{ color: colors.textMuted, marginLeft: 8, fontSize: 11 }}>{val.substring(0, 30)}…</span>
                        </button>
                      ))}
                      <div style={{ padding: "4px 8px", fontSize: 11, color: colors.textMuted, borderTop: `1px solid ${colors.border}`, marginTop: 4 }}>Type snippet + Tab in editor</div>
                    </div>
                  )}
                </div>

                <div style={{ position: "relative" }} data-dropdown>
                  <button onClick={() => setShowToc(p => !p)} style={btnS} title="Table of Contents"><BookOpen size={14} /></button>
                  {showToc && (
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: colors.headerBg, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 8, zIndex: 100, minWidth: 220, maxHeight: 300, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Table of Contents</div>
                      {getToc().length === 0
                        ? <div style={{ color: colors.textMuted, fontSize: 12 }}>No headings found</div>
                        : getToc().map((h, i) => (
                            <a key={i} href={`#${h.id}`} onClick={e => {
                              e.preventDefault();
                              previewRef.current?.querySelector(`#${CSS.escape(h.id)}`)?.scrollIntoView({ behavior: "smooth" });
                              setShowToc(false);
                            }} style={{ display: "block", padding: "3px 0", paddingLeft: (h.level - 1) * 16, color: colors.accent, textDecoration: "none", fontSize: 13 }}>
                              {h.text}
                            </a>
                          ))
                      }
                    </div>
                  )}
                </div>

                <div style={{ width: 1, height: 20, background: colors.border, margin: "0 2px" }} />

                {/* View modes */}
                <button onClick={() => setViewMode("split")} style={{ ...btnS, background: viewMode === "split" ? colors.accent : colors.btnBg, color: viewMode === "split" ? "#fff" : colors.btnText }} title="Split View"><Columns size={14} /></button>
                <button onClick={() => setViewMode("editor")} style={{ ...btnS, background: viewMode === "editor" ? colors.accent : colors.btnBg, color: viewMode === "editor" ? "#fff" : colors.btnText }} title="Editor Only"><Edit3 size={14} /></button>
                <button onClick={() => setViewMode("preview")} style={{ ...btnS, background: viewMode === "preview" ? colors.accent : colors.btnBg, color: viewMode === "preview" ? "#fff" : colors.btnText }} title="Preview Only"><Eye size={14} /></button>
                <button onClick={() => setViewMode(isZen ? "split" : "zen")} style={btnS} title="Zen Mode"><Maximize2 size={14} /></button>

                <div style={{ width: 1, height: 20, background: colors.border, margin: "0 2px" }} />

                {/* File actions */}
                <input type="file" accept=".md,.txt" onChange={loadFile} id="file-upload" style={{ display: "none" }} />
                <label htmlFor="file-upload" style={{ ...btnS, cursor: "pointer" }} title="Upload"><Upload size={14} /></label>
                <button onClick={() => downloadFile(markdown, `${activeDoc?.name || "doc"}.md`)} style={btnS} title="Download MD"><Download size={14} /></button>
                <button onClick={exportAsHtml} style={btnS} title="Export HTML"><Type size={14} /></button>
                <button onClick={exportAsPdf} style={btnS} title="Print / PDF"><Printer size={14} /></button>
                <button onClick={() => copyToClipboard(markdown)} style={btnS} title="Copy">
                  {copied ? <Check size={14} style={{ color: "#22c55e" }} /> : <Copy size={14} />}
                </button>
                <button onClick={shareLink} style={btnS} title="Share Link"><Share2 size={14} /></button>

                <div style={{ width: 1, height: 20, background: colors.border, margin: "0 2px" }} />

                {/* Versions */}
                <div style={{ position: "relative" }} data-dropdown>
                  <button onClick={() => setShowVersions(p => !p)} style={btnS} title="Version History"><History size={14} /></button>
                  {showVersions && (
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: colors.headerBg, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 8, zIndex: 100, minWidth: 260, maxHeight: 300, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Version History</div>
                      {versions.filter(v => v.docId === validActiveId).length === 0
                        ? <div style={{ color: colors.textMuted, fontSize: 12 }}>No versions yet</div>
                        : versions.filter(v => v.docId === validActiveId).reverse().slice(0, 20).map((v, i) => (
                            <button key={i} onClick={() => restoreVersion(v)} style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", border: "none", background: "transparent", color: colors.text, cursor: "pointer", borderRadius: 4, fontSize: 12 }}
                              onMouseEnter={e => (e.currentTarget.style.background = colors.btnBg)}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <div style={{ fontWeight: 500 }}>{new Date(v.timestamp).toLocaleString()}</div>
                              <div style={{ color: colors.textMuted, fontSize: 11 }}>{v.content.substring(0, 50)}…</div>
                            </button>
                          ))
                      }
                    </div>
                  )}
                </div>

                {/* Theme picker */}
                <div style={{ position: "relative" }} data-dropdown>
                  <button onClick={() => setShowThemePicker(p => !p)} style={btnS} title="Theme">
                    {theme === "light" ? <Sun size={14} /> : <Moon size={14} />}
                  </button>
                  {showThemePicker && (
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: colors.headerBg, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 4, zIndex: 100, minWidth: 140, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                      {(Object.keys(THEMES) as ThemeName[]).map(t => (
                        <button key={t} onClick={() => { setTheme(t); setShowThemePicker(false); }} style={{
                          display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", border: "none",
                          background: theme === t ? colors.accent : "transparent", color: theme === t ? "#fff" : colors.text,
                          cursor: "pointer", borderRadius: 4, fontSize: 13, textTransform: "capitalize",
                        }}>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: THEMES[t].accent }} />
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* ═══ Document Tabs ═══ */}
      {!isZen && (
        <div style={{ borderBottom: `1px solid ${colors.border}`, background: colors.headerBg, overflowX: "auto" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center" }}>
            {documents.map(doc => (
              <div key={doc.id} onClick={() => { setActiveDocId(doc.id); setUndoStack([]); setRedoStack([]); }}
                style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", cursor: "pointer", fontSize: 13,
                  borderBottom: `2px solid ${doc.id === validActiveId ? colors.accent : "transparent"}`,
                  background: doc.id === validActiveId ? colors.bg : "transparent",
                  color: doc.id === validActiveId ? colors.text : colors.textMuted,
                  whiteSpace: "nowrap",
                }}>
                {editingDocName === doc.id ? (
                  <input value={docNameDraft} onChange={e => setDocNameDraft(e.target.value)}
                    onBlur={() => renameDocument(doc.id, docNameDraft)}
                    onKeyDown={e => { if (e.key === "Enter") renameDocument(doc.id, docNameDraft); }}
                    autoFocus onClick={e => e.stopPropagation()}
                    style={{ background: "transparent", border: `1px solid ${colors.accent}`, borderRadius: 3, padding: "1px 4px", color: colors.text, fontSize: 13, width: 100, outline: "none" }}
                  />
                ) : (
                  <span onDoubleClick={e => { e.stopPropagation(); setEditingDocName(doc.id); setDocNameDraft(doc.name); }}>{doc.name}</span>
                )}
                {documents.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); deleteDocument(doc.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, padding: 0, lineHeight: 1 }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={createDocument}
              style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, padding: "8px 12px", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
              <Plus size={14} /> New
            </button>
          </div>
        </div>
      )}

      {/* ═══ Find & Replace Bar ═══ */}
      {showFind && (
        <div style={{ borderBottom: `1px solid ${colors.border}`, background: colors.headerBg, padding: "8px 16px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <input ref={findInputRef} value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find…"
              style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${colors.border}`, background: colors.editorBg, color: colors.text, fontSize: 13, width: 200, outline: "none" }} />
            <input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace…"
              style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${colors.border}`, background: colors.editorBg, color: colors.text, fontSize: 13, width: 200, outline: "none" }} />
            <button onClick={handleReplace} style={btnS}>Replace</button>
            <button onClick={handleReplaceAll} style={btnS}>Replace All</button>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: colors.textMuted, cursor: "pointer" }}>
              <input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} /> Regex
            </label>
            <span style={{ fontSize: 12, color: colors.textMuted }}>{getFindCount()} matches</span>
            <button onClick={() => setShowFind(false)} style={{ ...btnS, marginLeft: "auto" }}><X size={14} /></button>
          </div>
        </div>
      )}

      {/* ═══ Mobile Tabs ═══ */}
      {!isZen && viewMode === "split" && (
        <div className="md-mobile-tabs" style={{ padding: "8px 16px" }}>
          <div style={{ display: "flex", borderRadius: 8, background: colors.btnBg, padding: 2 }}>
            <button onClick={() => setMobileTab("edit")} style={{
              flex: 1, padding: 8, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13,
              background: mobileTab === "edit" ? colors.headerBg : "transparent",
              color: mobileTab === "edit" ? colors.text : colors.textMuted,
              fontWeight: mobileTab === "edit" ? 600 : 400,
            }}>Edit</button>
            <button onClick={() => setMobileTab("preview")} style={{
              flex: 1, padding: 8, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13,
              background: mobileTab === "preview" ? colors.headerBg : "transparent",
              color: mobileTab === "preview" ? colors.text : colors.textMuted,
              fontWeight: mobileTab === "preview" ? 600 : 400,
            }}>Preview</button>
          </div>
        </div>
      )}

      {/* ═══ Main Content ═══ */}
      <div id="editor-container" style={{
        flex: 1, display: "flex", overflow: "hidden",
        maxWidth: isZen ? "100%" : 1280, margin: "0 auto", width: "100%",
        padding: isZen ? 0 : "12px 16px",
      }}>

        {/* Editor Panel */}
        {(viewMode === "split" || viewMode === "editor" || viewMode === "zen") && (
          <div className={viewMode === "split" ? "md-editor-panel" : undefined}
            style={{
              width: viewMode === "split" ? `${splitPos}%` : "100%",
              display: "flex", flexDirection: "column", minWidth: 0,
              padding: isZen ? 24 : 0,
            }}
            data-mobile-tab={mobileTab}>
            {!isZen && (
              <div style={{ display: "flex", alignItems: "center", marginBottom: 6, color: colors.textMuted }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                  <FileText size={14} /> Editor
                </h2>
              </div>
            )}
            <div style={{ flex: 1, display: "flex", borderRadius: 8, border: `1px solid ${colors.editorBorder}`, overflow: "hidden", position: "relative", minHeight: 0 }}>
              {/* Line numbers */}
              <div className="md-line-numbers" style={{
                padding: "12px 0", background: colors.codeBg, borderRight: `1px solid ${colors.editorBorder}`,
                userSelect: "none", fontFamily: "monospace", fontSize: 13, lineHeight: "1.5",
                textAlign: "right", minWidth: 40, overflowY: "hidden", color: colors.textMuted,
              }}>
                {lineNumbers.map(n => (
                  <div key={n} style={{ padding: "0 8px", height: "1.5em" }}>{n}</div>
                ))}
              </div>
              {/* Textarea */}
              <textarea ref={textareaRef} value={markdown} onChange={handleInputChange}
                onKeyDown={handleKeyDown} onScroll={handleEditorScroll}
                onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                spellCheck={false}
                placeholder={isZen ? "Start writing…" : "# Welcome to Markdown Editor\n\nStart typing markdown here…\n\n## Keyboard Shortcuts\n- Ctrl+B → Bold\n- Ctrl+I → Italic\n- Ctrl+K → Link\n- Ctrl+H → Find & Replace\n- Ctrl+S → Save Version\n- Ctrl+Z / Ctrl+Shift+Z → Undo/Redo\n\n## Snippets (type + Tab)\n/table /checklist /code /math /footnote /strike\n\n## Features\n**Bold** *italic* ~~strikethrough~~\n- [x] Task lists\n| Tables | Supported |\n$E=mc^2$ Math\n[^1] Footnotes"}
                style={{
                  flex: 1, padding: 12, background: colors.editorBg, color: colors.editorText,
                  border: "none", resize: "none", fontFamily: "monospace", fontSize: 13, lineHeight: "1.5",
                  outline: "none", minHeight: 0, overflowY: "auto",
                }}
              />
            </div>
          </div>
        )}

        {/* Resize Handle */}
        {viewMode === "split" && (
          <div onMouseDown={() => setIsDragging(true)} className="md-resize-handle"
            style={{ width: 6, cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, userSelect: "none" }}>
            <div style={{ width: 2, height: 40, borderRadius: 1, background: colors.border }} />
          </div>
        )}

        {/* Preview Panel */}
        {(viewMode === "split" || viewMode === "preview") && (
          <div className={viewMode === "split" ? "md-preview-panel" : undefined}
            style={{
              width: viewMode === "split" ? `${100 - splitPos}%` : "100%",
              display: "flex", flexDirection: "column", minWidth: 0,
            }}
            data-mobile-tab={mobileTab}>
            {!isZen && (
              <div style={{ display: "flex", alignItems: "center", marginBottom: 6, color: colors.textMuted }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                  <Eye size={14} /> Preview
                </h2>
              </div>
            )}
            <div ref={previewRef}
              style={{ flex: 1, padding: 16, borderRadius: 8, border: `1px solid ${colors.editorBorder}`, background: colors.previewBg, overflowY: "auto" }}>
              <div dangerouslySetInnerHTML={{ __html: html || `<p style="color:${colors.placeholder};">Preview will appear here…</p>` }}
                style={{ maxWidth: "100%", lineHeight: 1.7 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══ Zen Mode Exit ═══ */}
      {isZen && (
        <button onClick={() => setViewMode("split")}
          style={{
            position: "fixed", top: 16, right: 16, background: colors.btnBg, color: colors.btnText,
            border: `1px solid ${colors.border}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer",
            opacity: 0.5, fontSize: 13, zIndex: 50, display: "flex", alignItems: "center", gap: 4,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}>
          <Minimize2 size={14} /> Exit Zen
        </button>
      )}

      {/* ═══ Footer ═══ */}
      {!isZen && (
        <footer style={{ borderTop: `1px solid ${colors.border}`, background: colors.headerBg }}>
          <div style={{
            maxWidth: 1280, margin: "0 auto", padding: "6px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 12, color: colors.textMuted, flexWrap: "wrap", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span><strong>{getWordCount()}</strong> words</span>
              <span><strong>{getCharCount()}</strong> chars</span>
              <span><strong>{getLineCount()}</strong> lines</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span>Ln <strong>{cursorPosition.line}</strong>, Col <strong>{cursorPosition.column}</strong></span>
              <span style={{ textTransform: "capitalize" }}>{theme}</span>
              <span style={{ textTransform: "capitalize" }}>{viewMode}</span>
            </div>
          </div>
        </footer>
      )}

      {/* ═══ Styles ═══ */}
      <style>{`
        @media print {
          header, footer, .md-mobile-tabs, .md-resize-handle, button, input[type="file"], label[for="file-upload"] { display: none !important; }
          #editor-container { display: block !important; max-width: 100% !important; padding: 0 !important; }
          textarea, .md-line-numbers { display: none !important; }
        }
        @media (max-width: 768px) {
          .md-mobile-tabs { display: block !important; }
          .md-resize-handle { display: none !important; }
          .md-editor-panel { width: 100% !important; }
          .md-preview-panel { width: 100% !important; }
          .md-editor-panel[data-mobile-tab="preview"] { display: none !important; }
          .md-preview-panel[data-mobile-tab="edit"] { display: none !important; }
        }
        @media (min-width: 769px) {
          .md-mobile-tabs { display: none !important; }
        }
        * { box-sizing: border-box; }
        textarea::placeholder { color: ${colors.placeholder}; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${colors.textMuted}; }
        .hljs { background: transparent !important; }
      `}</style>
    </div>
  );
};

export default App;
