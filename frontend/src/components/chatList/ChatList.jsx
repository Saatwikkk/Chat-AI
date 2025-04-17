import { Link } from "react-router-dom";
import "./chatList.css";
import { useQuery } from "@tanstack/react-query";

<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
  integrity="sha512-Kc323vGBEqzTmouAECnVceyQqyqdsSiqLQISBL29aUW4U/M7pSPA/gEUZQqv1cwx4OnYxTxve5UMg5GT6L4JJg=="
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
/>;

const ChatList = () => {
  const { isPending, error, data } = useQuery({
    queryKey: ["userChats"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/api/userchats`, {
        credentials: "include",
      }).then((res) => res.json()),
  });

  return (
    <div className="chatList">
      <Link
        to="/dashboard"
        style={{ fontSize: 18, color: "white", textDecoration: "none" }}
      >
        <i class="fa-solid fa-plus"></i>
        Create a new Chat
      </Link>
      <Link
        to="/"
        style={{ fontSize: 18, color: "white", textDecoration: "none" }}
      >
        Explore CHAT AI
      </Link>
      <Link
        to="/contact"
        style={{ fontSize: 18, color: "white", textDecoration: "none" }}
      >
        Contact
      </Link>
      <hr />
      <span className="title">Previous chats</span>
      <div className="list">
        {isPending
          ? "No previous chats !"
          : error
          ? "Something went wrong!"
          : data?.map((chat) => (
              <Link to={`/dashboard/chats/${chat._id}`} key={chat._id}>
                {chat.title}
              </Link>
            ))}
      </div>
      <hr />
      <div className="upgrade">
        <img src="/logo.png" alt="" />
        <div className="texts">
          <span>Upgrade to CHAT AI Pro</span>
          <span>Get unlimited access to all features</span>
        </div>
      </div>
    </div>
  );
};

export default ChatList;
