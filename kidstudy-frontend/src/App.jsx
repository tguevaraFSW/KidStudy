import { useState } from "react";
import axios from "axios";

function App() {
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState([]);

  const handleGenerate = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE}/api/prompt`, {
        topic,
      });
      setCards(res.data);
    } catch (error) {
      console.error("Error generating flashcards:", error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-3">KidStudy Flashcard Generator</h1>
      <input
        className="border p-2 mr-2"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter a topic..."
      />
      <button
        onClick={handleGenerate}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Generate
      </button>

      <ul className="mt-4">
        {cards.map((c, i) => (
          <li key={i} className="border-b py-1">
            {c.front_text} → {c.back_text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
