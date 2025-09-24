import React, { useState, useEffect, useCallback, ChangeEvent } from "react";
import { FileText, Eye, Download, Upload, Copy, Check, Sun, Moon } from "lucide-react";

interface CursorPosition {
  line: number;
  column: number;
}

const App: React.FC = () => {
  const [markdown, setMarkdown] = useState<string>("");
  const [html, setHtml] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>("edit");
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 1, column: 1 });

  // Load Tailwind CSS
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Simple markdown parser
  const parseMarkdown = useCallback((text: string): string => {
    if (!text) return "";
    
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/__(.*?)__/gim, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
      .replace(/_(.*?)_/gim, '<em class="italic">$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-2 overflow-x-auto"><code class="text-sm font-mono">$1</code></pre>')
      // Inline code
      .replace(/`(.*?)`/gim, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm font-mono">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline hover:no-underline">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" class="max-w-full h-auto mb-2 rounded" />')
      // Unordered lists
      .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-400 pl-4 italic mb-2">$1</blockquote>')
      // Horizontal rules
      .replace(/^---$/gim, '<hr class="my-4 border-gray-300 dark:border-gray-600">')
      // Line breaks
      .replace(/\n/gim, '<br>');

    // Wrap consecutive list items
    html = html.replace(/(<li.*?<\/li>[\s\S]*?)+/g, '<ul class="list-disc mb-2">$&</ul>');
    
    // Parse emojis
    const emojiMap: { [key: string]: string } = {
      smile: '😄', heart: '❤️', thumbs_up: '👍', fire: '🔥',
      rocket: '🚀', star: '⭐', coffee: '☕', book: '📚',
      computer: '💻', phone: '📱', email: '📧', home: '🏠'
    };
    
    html = html.replace(/:([\w+-]+):/g, (match, name) => {
      return emojiMap[name] || match;
    });

    return html;
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;
    setMarkdown(value);
    
    // Calculate cursor position
    const textarea = e.target;
    const text = textarea.value.substring(0, textarea.selectionStart);
    const lines = text.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    setCursorPosition({ line, column });
  };

  useEffect(() => {
    const convertedHtml = parseMarkdown(markdown);
    setHtml(convertedHtml);
  }, [markdown, parseMarkdown]);

  const getWordCount = (): number => {
    if (!markdown.trim()) return 0;
    return markdown.trim().split(/\s+/).length;
  };

  const getCharCount = (): number => {
    return markdown.length;
  };

  const getLineCount = (): number => {
    if (!markdown) return 0;
    return markdown.split('\n').length;
  };

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadFile = (content: string, filename: string): void => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const loadFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setMarkdown(result);
        }
      };
      reader.readAsText(file);
    }
  };

  const insertText = (before: string, after: string = ''): void => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const newText = markdown.substring(0, start) + before + selectedText + after + markdown.substring(end);
    setMarkdown(newText);
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const toggleTheme = (): void => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`border-b transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <FileText className={`h-8 w-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Markdown Editor
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Toolbar */}
              <div className="hidden md:flex items-center space-x-2">
                <button
                  onClick={() => insertText('**', '**')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <strong>B</strong>
                </button>
                <button
                  onClick={() => insertText('*', '*')}
                  className={`px-3 py-1 rounded text-sm font-medium italic transition-colors ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  I
                </button>
                <button
                  onClick={() => insertText('`', '`')}
                  className={`px-3 py-1 rounded text-sm font-mono transition-colors ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  &lt;/&gt;
                </button>
                <button
                  onClick={() => insertText('[', '](url)')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔗
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept=".md,.txt"
                  onChange={loadFile}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Upload file"
                >
                  <Upload className="h-5 w-5" />
                </label>
                
                <button
                  onClick={() => downloadFile(markdown, 'document.md')}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Download markdown"
                >
                  <Download className="h-5 w-5" />
                </button>

                <button
                  onClick={() => copyToClipboard(markdown)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Copy markdown"
                >
                  {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                </button>

                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Toggle theme"
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile tabs */}
        <div className="md:hidden mb-4">
          <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'edit'
                  ? darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'
                  : darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow'
                  : darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </button>
          </div>
        </div>

        {/* Editor and preview */}
        <div className="grid md:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Editor */}
          <div className={`${activeTab !== 'edit' ? 'hidden md:block' : ''} flex flex-col`}>
            <div className={`flex items-center justify-between mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <h2 className="text-lg font-semibold flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Editor
              </h2>
            </div>
            <textarea
              value={markdown}
              onChange={handleInputChange}
              placeholder="# Welcome to Markdown Editor

Start typing your markdown here...

## Features
- **Live preview**
- *Syntax highlighting*
- `Code blocks`
- [Links](https://example.com)
- Lists and more!

Try some emojis: :smile: :heart: :rocket:"
              className={`flex-1 p-4 rounded-lg border resize-none font-mono text-sm transition-colors duration-300 ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
            />
          </div>

          {/* Preview */}
          <div className={`${activeTab !== 'preview' ? 'hidden md:block' : ''} flex flex-col`}>
            <div className={`flex items-center justify-between mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <h2 className="text-lg font-semibold flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Preview
              </h2>
            </div>
            <div
              className={`flex-1 p-4 rounded-lg border overflow-auto transition-colors duration-300 ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <div
                dangerouslySetInnerHTML={{ 
                  __html: html || '<p class="text-gray-500">Preview will appear here...</p>' 
                }}
                className="prose prose-sm max-w-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <footer className={`border-t mt-6 transition-colors duration-300 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className={`flex flex-wrap items-center justify-between text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <div className="flex flex-wrap items-center space-x-6">
              <span><strong>{getWordCount()}</strong> words</span>
              <span><strong>{getCharCount()}</strong> characters</span>
              <span><strong>{getLineCount()}</strong> lines</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Ln <strong>{cursorPosition.line}</strong>, Col <strong>{cursorPosition.column}</strong></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
