import React, { useState } from "react";
import "./App.css";
import { marked } from "marked";
import emoji from "emoji-dictionary";

function App() {
  const [markdown, setMarkdown] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value);
  };

  const parseEmojis = (text: string) => {
    return text.replace(/:\w+:/g, (name) => emoji.getUnicode(name) || name);
  };

  const getMarkdownText = () => {
    const rawMarkup = marked(markdown);
    const emojiMarkup = parseEmojis(rawMarkup);
    return { __html: emojiMarkup };
  };

  return (
    <>
      <div className="container">
        <textarea
          id="markdown-input"
          value={markdown}
          onChange={handleInputChange}
          placeholder="Enter your markdown here..."
        />
        <div id="preview" dangerouslySetInnerHTML={getMarkdownText()} />
      </div>
    </>
  );
}

export default App;
