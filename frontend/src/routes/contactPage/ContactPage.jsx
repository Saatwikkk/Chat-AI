import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import "./contactPage.css";
import { useApi } from "../../lib/api";
import BotShowcase from "../../components/botShowcase/BotShowcase";

const EMPTY_FORM = { name: "", email: "", message: "" };

const ContactPage = () => {
  const navigate = useNavigate();
  const request = useApi();
  const [form, setForm] = useState(EMPTY_FORM);

  const sendMessage = useMutation({
    mutationFn: (body) => request("/api/contact", { method: "POST", body }),
    onSuccess: () => setForm(EMPTY_FORM),
  });

  const handleChange = (e) => {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage.mutate(form);
  };

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="contactContainer">
      <button className="backButton" onClick={handleBack} aria-label="Go back">
        <i className="fa-solid fa-arrow-left" />
      </button>

      <div className="left">
        <h1 className="heading">Contact us</h1>
        <p className="subheading">Questions, feedback or ideas? We&apos;d love to hear from you.</p>

        <form className="contactForm" onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              maxLength={100}
              autoComplete="name"
              required
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              maxLength={200}
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span>Message</span>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="How can we help?"
              rows={5}
              minLength={10}
              maxLength={5000}
              required
            />
          </label>

          {sendMessage.isSuccess && (
            <p className="formStatus success" role="status">
              Thanks! Your message has been sent.
            </p>
          )}
          {sendMessage.isError && (
            <p className="formStatus error" role="alert">
              {sendMessage.error.message}
            </p>
          )}

          <button className="submitButton" type="submit" disabled={sendMessage.isPending}>
            {sendMessage.isPending ? "Sending…" : "Send message"}
          </button>
        </form>
      </div>

      <div className="right">
        <BotShowcase />
      </div>
    </div>
  );
};

export default ContactPage;
