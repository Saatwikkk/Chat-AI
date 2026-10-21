import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import "./dashBoardPage.css";
import { useApi } from "../../lib/api";
import PromptForm from "../../components/promptForm/PromptForm";

const CAPABILITIES = [
  { icon: "/chat.png", label: "Ask anything" },
  { icon: "/image.png", label: "Analyze images" },
  { icon: "/code.png", label: "Help me with my code" },
];

const DashboardPage = () => {
  const request = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const createChat = useMutation({
    mutationFn: (message) => request("/api/chats", { method: "POST", body: message }),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ["userChats"] });
      navigate(`/dashboard/chats/${id}`);
    },
  });

  const handleSubmit = async (message) => {
    setError(null);
    try {
      await createChat.mutateAsync(message);
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  return (
    <div className="dashboardPage">
      <div className="texts">
        <div className="logo">
          <img src="/logo.png" alt="" />
          <h1>CHAT AI</h1>
        </div>
        <div className="options">
          {CAPABILITIES.map(({ icon, label }) => (
            <div className="option" key={label}>
              <img src={icon} alt="" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="composer">
        {error && (
          <p className="formError" role="alert">
            {error}
          </p>
        )}
        <PromptForm onSubmit={handleSubmit} autoFocus />
      </div>
    </div>
  );
};

export default DashboardPage;
