import { useState } from "react";
import { TypeAnimation } from "react-type-animation";
import "./botShowcase.css";

const AVATARS = {
  human1: "/human1.jpeg",
  human2: "/human2.jpeg",
  bot: "/bot.png",
};

const SEQUENCE = [
  ["human1", "Can you explain recursion simply?"],
  ["bot", "It's a function that calls itself until a base case stops it."],
  ["human2", "What's in this photo of my fridge?"],
  ["bot", "Eggs, spinach and cheese. Perfect for an omelette!"],
];

// Animated bot illustration with a typed-out sample conversation.
const BotShowcase = () => {
  const [speaker, setSpeaker] = useState(SEQUENCE[0][0]);

  // TypeAnimation only reads the sequence on mount, so rebuilding it is harmless.
  const sequence = SEQUENCE.flatMap(([, text], index) => {
    const next = SEQUENCE[(index + 1) % SEQUENCE.length][0];
    return [text, 2500, () => setSpeaker(next)];
  });

  return (
    <div className="botShowcase">
      <div className="bgContainer">
        <div className="bg" />
      </div>
      <img src="/bot.png" alt="" className="bot" />
      <div className="sampleChat">
        <img src={AVATARS[speaker]} alt="" />
        <TypeAnimation
          sequence={sequence}
          wrapper="span"
          repeat={Infinity}
          cursor
          omitDeletionAnimation
        />
      </div>
    </div>
  );
};

export default BotShowcase;
