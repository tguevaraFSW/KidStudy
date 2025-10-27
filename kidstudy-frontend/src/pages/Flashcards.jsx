import { useState } from "react";

function Flashcards() {
  const [cards] = useState([
    { front: "What is photosynthesis?", back: "It’s how plants make food using sunlight." },
    { front: "What do plants need for photosynthesis?", back: "They need water, sunlight, and carbon dioxide." },
  ]);

  const [flippedIndex, setFlippedIndex] = useState(null);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Flashcards</h2>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {cards.map((card, i) => (
          <div
            key={i}
            className="border p-4 bg-white rounded-lg shadow hover:shadow-md cursor-pointer"
            onClick={() => setFlippedIndex(flippedIndex === i ? null : i)}
          >
            <p className="text-center">
              {flippedIndex === i ? card.back : card.front}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Flashcards;
