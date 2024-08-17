import React, { useState, useEffect } from "react";
import "./App.css";
import { marked } from "marked";
import emoji from "emoji-dictionary";

function App() {
  const [markdown, setMarkdown] = useState<string>("");
  const [html, setHtml] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value);
  };

  const parseEmojis = (text: string) => {
    return text.replace(/:\w+:/g, (name) => emoji.getUnicode(name) || name);
  };

  useEffect(() => {
    const convertMarkdownToHtml = async () => {
      try {
        // Assuming `marked` is asynchronous in your version
        const rawMarkup = await marked(markdown);
        const emojiMarkup = parseEmojis(rawMarkup);
        setHtml(emojiMarkup);
      } catch (error) {
        console.error("Error parsing markdown:", error);
      }
    };

    convertMarkdownToHtml();
  }, [markdown]);

  return (
    <>
      <div className="container">
        <textarea
          id="markdown-input"
          value={markdown}
          onChange={handleInputChange}
          placeholder="Enter your markdown here..."
        />
        <div id="preview" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
  );
}

export default App;
