import "./explorePage.css";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "../../lib/hooks";

const ExplorePage = () => {
  const navigate = useNavigate();
  useDocumentTitle("Explore");

  const features = [
    {
      title: "Image Analysis",
      desc: "Upload an image and ask about it: describe a scene, read the text in a screenshot, or explain a chart or diagram.",
      icon: "/image.png",
    },
    {
      title: "Code Assistance",
      desc: "Debug, refactor, or generate code in multiple languages with AI that understands your logic.",
      icon: "/code.png",
    },
    {
      title: "Knowledge Q&A",
      desc: "Ask questions about any topic (science, history, tech) and get clear answers that build on the rest of the conversation.",
      icon: "/chat.png",
    },
    {
      title: "Summaries",
      desc: "Paste long text and get the key points, a shorter version, or a simpler explanation of complex material.",
      icon: "/summary.png",
    },
    {
      title: "Brainstorming",
      desc: "Not sure where to start? Bounce ideas off CHAT AI for essays, projects, names, emails and more.",
      icon: "/prompt.png",
    },
    {
      title: "Streaming Replies",
      desc: "Answers appear as they are written, and you can stop a reply at any time. Your chats are saved so you can pick up where you left off.",
      icon: "/message.png",
    },
  ];

  return (
    <div className="explore-page">
      <section className="hero">
        <h1>Welcome to CHAT AI</h1>
        <p className="tagline">
          Your all-in-one AI companion for productivity, creativity, learning,
          and automation.
        </p>
        <button className="explore-btn" onClick={() => navigate("/dashboard")}>
          Start Exploring
        </button>
      </section>

      <section className="about">
        <div className="about-text">
          <h2>What is CHAT AI?</h2>
          <p>
            CHAT AI is a powerful conversational and multimodal assistant
            designed to help you with tasks ranging from generating code and
            analyzing images to summarizing text and answering complex
            questions. Powered by Google Gemini, it gives you instant, streaming answers and
            keeps your conversations saved to your account.
          </p>
          <p>
            Whether you&apos;re a student, developer, researcher, or enthusiast—CHAT
            AI adapts to your needs. Just ask, upload, or describe your task,
            and let the AI handle the rest.
          </p>
        </div>

        <div className="about-logo">
          <img src="/logo.png" alt="Chat AI Logo" />
        </div>
      </section>
      <section className="features">
        <h2>Explore Key Features</h2>
        <div className="features-grid">
          {features.map((feat) => (
            <div className="feature-card" key={feat.title}>
              <img src={feat.icon} alt="" />
              <h3>{feat.title}</h3>
              <p>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ExplorePage;
