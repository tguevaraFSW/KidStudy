import { useState } from "react";

function Quiz() {
  const [questions] = useState([
    {
      question: "What is photosynthesis?",
      options: ["A process plants use to make food", "A type of rock"],
      correct: 0,
    },
    {
      question: "What do plants need to perform photosynthesis?",
      options: ["Sunlight, water, and carbon dioxide", "Just water"],
      correct: 0,
    },
  ]);

  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleAnswer = (index) => {
    if (index === questions[current].correct) setScore(score + 1);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      setFinished(true);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Quiz</h2>
      {!finished ? (
        <div>
          <p className="text-lg font-semibold mb-2">
            {questions[current].question}
          </p>
          <div className="flex flex-col gap-2">
            {questions[current].options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className="bg-blue-500 text-white p-2 rounded"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-lg font-semibold">
            Quiz complete! Your score: {score}/{questions.length}
          </p>
        </div>
      )}
    </div>
  );
}

export default Quiz;
