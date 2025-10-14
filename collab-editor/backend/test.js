const fetch = require("node-fetch");

const JUDGE0_KEY = "6f15682a24mshddf5398f24b125ep12236ajsnba0e704cb53c";

(async () => {
  try {
    const response = await fetch(
      "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          "X-RapidAPI-Key": JUDGE0_KEY,
        },
        body: JSON.stringify({
          source_code: "print('Hello World')",
          language_id: 71, // Python
        }),
      }
    );

    const data = await response.json();
    console.log("Judge0 API Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
})();
