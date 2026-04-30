const chatHistory = [];

const addMessage = (text, type) => {
  const message = $("<div>").addClass(`message ${type}`);
  const bubble = $("<div>").addClass("bubble").text(text);
  message.append(bubble);
  $("#chatWindow").append(message);
  $("#chatWindow").scrollTop($("#chatWindow")[0].scrollHeight);
};

const setLoading = (isLoading) => {
  $("#sendBtn").prop("disabled", isLoading);
  $("#userInput").prop("disabled", isLoading);
};

const buildRequestBody = (history) => ({
  contents: history.map((entry) => ({
    role: entry.role,
    parts: [{ text: entry.text }],
  })),
});

const sendMessage = async (apiKey, text) => {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
    encodeURIComponent(apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRequestBody(chatHistory)),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `Failed to connect to Gemini API (HTTP ${response.status}).`;

    try {
      const errorData = JSON.parse(errorBody);
      if (errorData?.error?.message) {
        errorMessage = `${errorData.error.message} (HTTP ${response.status}).`;
      }
    } catch (parseError) {
      if (errorBody) {
        errorMessage = `${errorBody} (HTTP ${response.status}).`;
      }
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  return parts.map((part) => part.text).join(" ").trim();
};

$("#chatForm").on("submit", async (event) => {
  event.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  const userText = $("#userInput").val().trim();

  if (!apiKey) {
    addMessage("Please enter your API key first.", "system");
    return;
  }

  if (!userText) {
    return;
  }

  addMessage(userText, "user");
  chatHistory.push({ role: "user", text: userText });
  $("#userInput").val("");

  setLoading(true);
  addMessage("Typing...", "bot");
  const typingMessage = $("#chatWindow .message.bot").last();

  try {
    const reply = await sendMessage(apiKey, userText);
    typingMessage.remove();
    const finalReply = reply || "I did not get a response. Try again.";
    addMessage(finalReply, "bot");
    chatHistory.push({ role: "model", text: finalReply });
  } catch (error) {
    typingMessage.remove();
    addMessage(`Sorry, there was an error: ${error.message}`, "system");
    console.error(error);
  } finally {
    setLoading(false);
  }
});
