import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import "./chatMessage.css";
import { imageUrl } from "../../lib/config";

const markdownComponents = {
  a: ({ node, ...props }) => ( // eslint-disable-line no-unused-vars
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
};

const ChatMessage = ({ role, text, img }) => {
  const isUser = role === "user";

  return (
    <div className={`chatMessage ${isUser ? "user" : "model"}`}>
      {img && (
        <a href={imageUrl(img)} target="_blank" rel="noopener noreferrer">
          <img
            className="messageImage"
            src={imageUrl(img, "w-800")}
            alt="Attached by user"
            loading="lazy"
          />
        </a>
      )}
      {text &&
        (isUser ? (
          <p className="userText">{text}</p>
        ) : (
          <div className="markdown">
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {text}
            </Markdown>
          </div>
        ))}
    </div>
  );
};

export default memo(ChatMessage);
