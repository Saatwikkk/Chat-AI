import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useMatch, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import "./chatList.css";
import { useApi } from "../../lib/api";
import { useDebouncedValue } from "../../lib/hooks";
import { useConfirm, useToast } from "../dialogs/useDialogs";

const MAX_TITLE_LENGTH = 100;

// Applies `update(chats)` to every cached page of every chat-list query
// (one per search term).
const updateCachedChats = (queryClient, update) => {
  queryClient.setQueriesData({ queryKey: ["userChats"] }, (data) =>
    data ? { ...data, pages: data.pages.map((page) => ({ ...page, chats: update(page.chats) })) } : data
  );
};

const ChatList = () => {
  const request = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const activeChatId = useMatch("/dashboard/chats/:id")?.params.id;

  const [search, setSearch] = useState("");
  const searchTerm = useDebouncedValue(search.trim());
  const [editingId, setEditingId] = useState(null);

  const { data, error, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["userChats", searchTerm],
      queryFn: ({ pageParam, signal }) => {
        const params = new URLSearchParams();
        if (searchTerm) params.set("q", searchTerm);
        if (pageParam) params.set("cursor", pageParam);
        return request(`/api/chats?${params}`, { signal });
      },
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: (previous) => previous,
    });
  const chats = data?.pages.flatMap((page) => page.chats) ?? [];

  // Load the next page when the "Load more" button scrolls into view.
  const loadMoreRef = useRef(null);
  useEffect(() => {
    const button = loadMoreRef.current;
    if (!button || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
    });
    observer.observe(button);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const deleteChat = useMutation({
    mutationFn: (id) => request(`/api/chats/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      updateCachedChats(queryClient, (list) => list.filter((chat) => chat._id !== id));
      queryClient.removeQueries({ queryKey: ["chat", id] });
      if (id === activeChatId) navigate("/dashboard");
    },
    onError: (err) => toast(err.message),
  });

  const renameChat = useMutation({
    mutationFn: ({ id, title }) =>
      request(`/api/chats/${id}`, { method: "PATCH", body: { title } }),
    onSuccess: ({ title }, { id }) => {
      updateCachedChats(queryClient, (list) =>
        list.map((chat) => (chat._id === id ? { ...chat, title } : chat))
      );
      queryClient.setQueryData(["chat", id], (chat) => (chat ? { ...chat, title } : chat));
    },
    onError: (err) => toast(err.message),
  });

  const clearHistory = useMutation({
    mutationFn: () => request("/api/chats", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.resetQueries({ queryKey: ["userChats"] });
      queryClient.removeQueries({ queryKey: ["chat"] });
      if (activeChatId) navigate("/dashboard");
      toast("All chats deleted.", { type: "success" });
    },
    onError: (err) => toast(err.message),
  });

  const handleDelete = async (chat) => {
    const confirmed = await confirm({
      title: "Delete chat?",
      message: `"${chat.title}" and its images will be permanently deleted.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (confirmed) deleteChat.mutate(chat._id);
  };

  const handleClear = async () => {
    const confirmed = await confirm({
      title: "Delete all chats?",
      message: "Every chat and uploaded image will be permanently deleted. This can't be undone.",
      confirmLabel: "Delete all",
      danger: true,
    });
    if (confirmed) clearHistory.mutate();
  };

  const handleRename = (chat, title) => {
    setEditingId(null);
    const cleaned = title.replace(/\s+/g, " ").trim();
    if (cleaned && cleaned !== chat.title) renameChat.mutate({ id: chat._id, title: cleaned });
  };

  let list;
  if (isPending) {
    list = <p className="listStatus">Loading…</p>;
  } else if (error) {
    list = <p className="listStatus error">{error.message}</p>;
  } else if (!chats.length) {
    list = (
      <p className="listStatus">
        {searchTerm ? `No chats match "${searchTerm}".` : "No chats yet. Start one above!"}
      </p>
    );
  } else {
    list = (
      <ul className="list">
        {chats.map((chat) => (
          <li key={chat._id} className="chatEntry">
            {editingId === chat._id ? (
              <RenameInput
                initialTitle={chat.title}
                onSave={(title) => handleRename(chat, title)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <NavLink to={`/dashboard/chats/${chat._id}`} title={chat.title}>
                  {chat.title}
                </NavLink>
                <div className="entryActions">
                  <button
                    className="entryButton"
                    onClick={() => setEditingId(chat._id)}
                    aria-label={`Rename "${chat.title}"`}
                    title="Rename"
                  >
                    <i className="fa-solid fa-pen" aria-hidden="true" />
                  </button>
                  <button
                    className="entryButton delete"
                    onClick={() => handleDelete(chat)}
                    disabled={deleteChat.isPending}
                    aria-label={`Delete "${chat.title}"`}
                    title="Delete"
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <nav className="chatList" aria-label="Chats">
      <Link to="/dashboard" className="navLink">
        <i className="fa-solid fa-plus" aria-hidden="true" /> New chat
      </Link>
      <Link to="/explore" className="navLink">
        <i className="fa-solid fa-compass" aria-hidden="true" /> Explore CHAT AI
      </Link>
      <Link to="/contact" className="navLink">
        <i className="fa-solid fa-envelope" aria-hidden="true" /> Contact
      </Link>

      <hr />
      <h2 className="title" id="recent-chats">
        Recent chats
      </h2>

      <div className="search">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats"
          aria-label="Search chats by title"
          maxLength={100}
        />
      </div>

      <div className="listContainer" aria-labelledby="recent-chats">
        {list}
        {hasNextPage && (
          <button
            ref={loadMoreRef}
            className="loadMore"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        )}
      </div>

      {chats.length > 0 && !searchTerm && (
        <button className="clearButton" onClick={handleClear} disabled={clearHistory.isPending}>
          <i className="fa-solid fa-trash-can" aria-hidden="true" /> Clear history
        </button>
      )}
    </nav>
  );
};

const RenameInput = ({ initialTitle, onSave, onCancel }) => {
  const [value, setValue] = useState(initialTitle);
  const inputRef = useRef(null);
  const cancelled = useRef(false);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      className="renameInput"
      value={value}
      maxLength={MAX_TITLE_LENGTH}
      aria-label="New chat title. Press Enter to save or Escape to cancel."
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          cancelled.current = true;
          onCancel();
        }
      }}
      onBlur={() => {
        if (!cancelled.current) onSave(value);
      }}
    />
  );
};

export default ChatList;
