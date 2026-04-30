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
  model: "openai/gpt-3.5-turbo",
  messages: history,
});

const sendMessage = async (apiKey) => {
  const url = "https://openrouter.ai/api/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.href,
      "X-Title": "Neuron AI Chatbot",
    },
    body: JSON.stringify(buildRequestBody(chatHistory)),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `Failed to connect to OpenRouter API (HTTP ${response.status}).`;

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
  return data.choices?.[0]?.message?.content?.trim() || "";
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
  chatHistory.push({ role: "user", content: userText });
  $("#userInput").val("");

  setLoading(true);
  addMessage("Typing...", "bot");
  const typingMessage = $("#chatWindow .message.bot").last();

  try {
    const reply = await sendMessage(apiKey);
    typingMessage.remove();
    if (reply) {
      addMessage(reply, "bot");
      chatHistory.push({ role: "assistant", content: reply });
    } else {
      addMessage(
        "The AI returned an empty response. Please try rephrasing your question.",
        "system"
      );
    }
  } catch (error) {
    typingMessage.remove();
    addMessage(
      "Sorry, there was an error. Check your API key and try again.",
      "system"
    );
    console.error(error);
  } finally {
    setLoading(false);
  }
});

$("#newChatBtn").on("click", () => {
  chatHistory.length = 0;
  $("#chatWindow").empty();
  addMessage("New chat started. Ask me anything!", "system");
});
