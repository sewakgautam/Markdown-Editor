import React, { useState } from "react";
import "./App.css";
import { marked } from "marked";

function App() {
  const [markdown, setMarkdown] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value);
  };

  const getMarkdownText = () => {
    return { __html: marked(markdown) };
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
