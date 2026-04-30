const DEFAULT_MODEL = "openai/gpt-3.5-turbo";
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

const getFriendlyErrorMessage = (error) => {
  const statusCode = error.statusCode || null;
  const isNetworkError =
    error.name === "TypeError" ||
    /network|failed to fetch|load failed/i.test(error.message);

  if (statusCode === 401 || statusCode === 403) {
    return "Authentication failed. Check your API key.";
  }

  if (statusCode === 429) {
    return "Rate limit reached. Please wait and try again.";
  }

  if (statusCode && statusCode >= 500) {
    return "The API server had an issue. Please try again later.";
  }

  if (isNetworkError) {
    return "Network error. Check your internet connection and try again.";
  }

  if (error.message.toLowerCase().includes("unexpected api response")) {
    return "Unexpected response from the API. Please try again.";
  }

  return "Sorry, there was an error. Check your API key and try again.";
};

const buildRequestBody = (history) => ({
  model: DEFAULT_MODEL,
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
    let errorMessage = `OpenRouter API request failed.`;

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

    const requestError = new Error(errorMessage);
    requestError.statusCode = response.status;
    throw requestError;
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message?.content;

  if (!message) {
    console.warn("Unexpected API response format.", data);
    throw new Error("Unexpected API response.");
  }

  return message.trim();
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
      const emptyMessage =
        "The AI returned an empty response. Please try rephrasing your question.";
      addMessage(emptyMessage, "system");
      chatHistory.push({ role: "system", content: emptyMessage });
    }
  } catch (error) {
    typingMessage.remove();
    addMessage(getFriendlyErrorMessage(error), "system");
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
