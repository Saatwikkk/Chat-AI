import { Link } from "react-router-dom";
import "./homePage.css";
import BotShowcase from "../../components/botShowcase/BotShowcase";

const Homepage = () => {
  return (
    <div className="homepage">
      <img src="/orbital.png" alt="" className="orbital" />
      <div className="left">
        <h1>CHAT AI</h1>
        <h2>Supercharge your creativity and productivity</h2>
        <h3>
          Your virtual companion for thoughtful conversations: explore ideas, ask anything,
          anytime.
        </h3>
        <Link to="/dashboard" className="cta">
          Get Started
        </Link>
      </div>
      <div className="right">
        <BotShowcase />
      </div>
      <footer className="terms">
        <img src="/logo.png" alt="" />
        <div className="links">
          <Link to="/explore">Explore</Link>
          <span>|</span>
          <Link to="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
