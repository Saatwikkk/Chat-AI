import { Link, NavLink, useMatch, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import "./chatList.css";
import { useApi } from "../../lib/api";

const ChatList = () => {
  const request = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const activeChatId = useMatch("/dashboard/chats/:id")?.params.id;

  const { isPending, error, data: chats } = useQuery({
    queryKey: ["userChats"],
    queryFn: () => request("/api/chats"),
  });

  const deleteChat = useMutation({
    mutationFn: (id) => request(`/api/chats/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      queryClient.setQueryData(["userChats"], (old) => old?.filter((chat) => chat._id !== id));
      queryClient.removeQueries({ queryKey: ["chat", id] });
      if (id === activeChatId) navigate("/dashboard");
    },
    onError: (err) => alert(err.message),
  });

  const clearHistory = useMutation({
    mutationFn: () => request("/api/chats", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.setQueryData(["userChats"], []);
      queryClient.removeQueries({ queryKey: ["chat"] });
      if (activeChatId) navigate("/dashboard");
    },
    onError: (err) => alert(err.message),
  });

  const handleDelete = (chat) => {
    if (window.confirm(`Delete "${chat.title}"? This can't be undone.`)) {
      deleteChat.mutate(chat._id);
    }
  };

  const handleClear = () => {
    if (window.confirm("Delete all of your chats? This can't be undone.")) {
      clearHistory.mutate();
    }
  };

  let list;
  if (isPending) list = <p className="listStatus">Loading…</p>;
  else if (error) list = <p className="listStatus error">{error.message}</p>;
  else if (!chats.length) list = <p className="listStatus">No chats yet. Start one above!</p>;
  else {
    list = chats.map((chat) => (
      <div key={chat._id} className="chatEntry">
        <NavLink to={`/dashboard/chats/${chat._id}`} title={chat.title}>
          {chat.title}
        </NavLink>
        <button
          className="deleteButton"
          onClick={() => handleDelete(chat)}
          disabled={deleteChat.isPending}
          aria-label={`Delete ${chat.title}`}
          title="Delete chat"
        >
          <i className="fa-solid fa-trash" />
        </button>
      </div>
    ));
  }

  return (
    <nav className="chatList" aria-label="Chats">
      <Link to="/dashboard" className="navLink">
        <i className="fa-solid fa-plus" /> New chat
      </Link>
      <Link to="/explore" className="navLink">
        <i className="fa-solid fa-compass" /> Explore CHAT AI
      </Link>
      <Link to="/contact" className="navLink">
        <i className="fa-solid fa-envelope" /> Contact
      </Link>

      <hr />
      <span className="title">Recent chats</span>
      <div className="list">{list}</div>

      {chats?.length > 0 && (
        <button className="clearButton" onClick={handleClear} disabled={clearHistory.isPending}>
          <i className="fa-solid fa-trash-can" /> Clear history
        </button>
      )}
    </nav>
  );
};

export default ChatList;
