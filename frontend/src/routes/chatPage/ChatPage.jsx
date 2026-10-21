import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import "./chatPage.css";
import { useApi } from "../../lib/api";
import ChatMessage from "../../components/chatMessage/ChatMessage";
import PromptForm from "../../components/promptForm/PromptForm";

// Remount per chat so streaming state never leaks between conversations.
const ChatPage = () => {
  const { id } = useParams();
  return <ChatView key={id} chatId={id} />;
};

const ChatView = ({ chatId }) => {
  const request = useApi();
  const queryClient = useQueryClient();
  const fetchChat = useCallback(() => request(`/api/chats/${chatId}`), [request, chatId]);

  const { isPending, error, data: chat } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: fetchChat,
  });

  // The exchange currently being generated (or the last one that failed):
  // { message, answer, status: "streaming" | "error", error }
  const [reply, setReply] = useState(null);
  const abortRef = useRef(null);
  const autoReplied = useRef(false);
  const endRef = useRef(null);

  const refreshChat = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chat", chatId] }),
        queryClient.invalidateQueries({ queryKey: ["userChats"] }),
      ]),
    [queryClient, chatId]
  );

  /**
   * Streams the AI reply. With `message`, it's a new user message; with null,
   * the chat's last (unanswered) user message gets answered.
   */
  const sendReply = useCallback(
    async (message) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const startLength = queryClient.getQueryData(["chat", chatId])?.history.length ?? 0;
      setReply({ message, answer: "", status: "streaming", error: null });

      try {
        const res = await request(`/api/chats/${chatId}/reply`, {
          method: "POST",
          body: message ?? {},
          signal: controller.signal,
          raw: true,
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let answer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          setReply((current) => ({ ...current, answer }));
        }

        await refreshChat();
        setReply(null);
      } catch (err) {
        if (controller.signal.aborted) {
          // The server saves the partial answer once it notices the disconnect.
          await new Promise((resolve) => setTimeout(resolve, 800));
          await refreshChat();
          setReply(null);
          return;
        }
        // If the connection dropped mid-stream, the server may still have saved
        // the exchange; only offer a retry when it didn't.
        const latest = await queryClient
          .fetchQuery({ queryKey: ["chat", chatId], queryFn: fetchChat, staleTime: 0 })
          .catch(() => null);
        if (latest && latest.history.length > startLength) {
          queryClient.invalidateQueries({ queryKey: ["userChats"] });
          setReply(null);
          return;
        }
        setReply((current) => ({
          ...current,
          status: "error",
          error: err.message || "The reply was interrupted. Please try again.",
        }));
      } finally {
        abortRef.current = null;
      }
    },
    [request, chatId, queryClient, fetchChat, refreshChat]
  );

  // A brand-new chat (or one whose reply failed earlier) ends with an
  // unanswered user message: answer it once when the chat first loads.
  useEffect(() => {
    if (!chat || autoReplied.current) return;
    autoReplied.current = true;
    if (chat.history.at(-1)?.role === "user") sendReply(null);
  }, [chat, sendReply]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat?.history.length, reply?.message, reply?.answer, reply?.status]);

  if (isPending) return <div className="pageStatus">Loading chat…</div>;

  if (error) {
    return (
      <div className="pageStatus">
        <p>{error.status === 404 ? "This chat doesn't exist or was deleted." : error.message}</p>
        <Link to="/dashboard">Start a new chat</Link>
      </div>
    );
  }

  const isStreaming = reply?.status === "streaming";

  return (
    <div className="chatPage">
      <div className="messages">
        <div className="chat">
          {chat.history.map((message, i) => (
            <ChatMessage
              key={i}
              role={message.role}
              text={message.parts?.map((part) => part.text).join("\n")}
              img={message.img}
            />
          ))}

          {reply?.message && (
            <ChatMessage role="user" text={reply.message.text} img={reply.message.img} />
          )}
          {reply?.answer && <ChatMessage role="model" text={reply.answer} />}
          {isStreaming && !reply.answer && (
            <div className="typingIndicator" aria-label="CHAT AI is typing">
              <span />
              <span />
              <span />
            </div>
          )}
          {reply?.status === "error" && (
            <div className="replyError" role="alert">
              <span>{reply.error}</span>
              <button onClick={() => sendReply(reply.message)}>
                <i className="fa-solid fa-rotate-right" /> Retry
              </button>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="composer">
        <PromptForm
          onSubmit={(message) => {
            sendReply(message);
          }}
          isGenerating={isStreaming}
          onStop={() => abortRef.current?.abort()}
          placeholder="Message CHAT AI..."
          autoFocus
        />
        <p className="disclaimer">CHAT AI can make mistakes. Check important info.</p>
      </div>
    </div>
  );
};

export default ChatPage;
