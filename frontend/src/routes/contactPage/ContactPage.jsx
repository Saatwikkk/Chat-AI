import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TypeAnimation } from "react-type-animation";
import "./contactPage.css";

const ContactPage = () => {
    const navigate = useNavigate();
    const [typingStatus, setTypingStatus] = useState("human1");

    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Form submitted!");
    };

    const handleBack = () => {
        navigate("/Dashboard");
    };

    return (
        <div className="contactContainer">
            <button className="backTopButton" onClick={handleBack}>
                ←
            </button>

            <div className="left">
                <div className="heading">
                    <h1>Contact us</h1>
                </div>

                <form className="contactForm" onSubmit={handleSubmit}>
                    <input type="text" placeholder="Enter your full name" required />
                    <input className="loginInput" type="email" placeholder="Email" required />
                    <input className="message" type="text" placeholder="Your Message" required />
                    <button className="submitButton" type="submit">Submit</button>
                </form>
            </div>

            <div className="right">
                <div className="imgContainer">
                    <div className="bgContainer">
                        <div className="bg"></div>
                    </div>
                    <img src="/bot.png" alt="" className="bot" />
                    <div className="chat">
                        <img
                            src={
                                typingStatus === "human1"
                                    ? "/human1.jpeg"
                                    : typingStatus === "human2"
                                    ? "/human2.jpeg"
                                    : "bot.png"
                            }
                            alt=""
                        />
                        <TypeAnimation
                            sequence={[
                                "Human: We produce food for Mice",
                                2000,
                                () => setTypingStatus("bot"),
                                "Bot: We produce food for Hamsters",
                                2000,
                                () => setTypingStatus("human2"),
                                "Human2: We produce food for Guinea Pigs",
                                2000,
                                () => setTypingStatus("bot"),
                                "Bot: We produce food for Chinchillas",
                                2000,
                                () => setTypingStatus("human1"),
                            ]}
                            wrapper="span"
                            repeat={Infinity}
                            cursor={true}
                            omitDeletionAnimation={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
