import React, { useCallback, useEffect, useRef, useState } from "react";
import "./EVChatbot.css";

const RAG_API_URL =
  process.env.REACT_APP_RAG_API_URL || "http://127.0.0.1:8000";
const NODE_API_URL =
  process.env.REACT_APP_API_URL || "http://127.0.0.1:5000/api";

const firstMessage = {
  id: 1,
  role: "assistant",
  text: "Namaste! 👋 Main TataEV AI Assistant hoon. Aap EV range, battery, charging aur features ke baare mein pooch sakte hain.",
};

function FormattedMessage({ text }) {
  const formatBold = (line) =>
    line.split(/(\*\*.*?\*\*)/g).map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <React.Fragment key={index}>{part}</React.Fragment>
      )
    );

  return (
    <div className="ev-message-content">
      {text.split("\n").map((line, index) => {
        const value = line.trim();

        if (!value) {
          return <div className="ev-line-space" key={index} />;
        }

        const heading = value.match(/^#{1,6}\s+(.*)$/);

        if (heading) {
          return (
            <div className="ev-message-heading" key={index}>
              {formatBold(heading[1])}
            </div>
          );
        }

        const bullet = value.match(/^[-*]\s+(.*)$/);

        if (bullet) {
          return (
            <div className="ev-message-bullet" key={index}>
              <span>•</span>
              <span>{formatBold(bullet[1])}</span>
            </div>
          );
        }

        return (
          <div className="ev-message-line" key={index}>
            {formatBold(value)}
          </div>
        );
      })}
    </div>
  );
}

export default function EVChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([firstMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [service, setService] = useState("checking");

  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !isOpen) return undefined;

    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const checkServices = useCallback(async () => {
    setService("checking");

    const readHealth = async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    };

    const ragHealth = await readHealth(`${RAG_API_URL}/health`);

    if (ragHealth && ragHealth.ready !== false) {
      setService(ragHealth.mode === "mistral" ? "mistral" : "rag");
      return;
    }

    const nodeHealth = await readHealth(`${NODE_API_URL}/health`);

    if (nodeHealth) {
      setService(
        nodeHealth.assistant?.mode === "mistral" ? "mistral" : "fallback",
      );
      return;
    }

    setService("offline");
  }, []);

  useEffect(() => {
    checkServices();
  }, [checkServices]);

  useEffect(() => {
    if (isOpen) checkServices();
  }, [checkServices, isOpen]);

  const clearChat = () => {
    setMessages([firstMessage]);
    setInput("");
  };

  const sendMessage = async () => {
    const question = input.trim();

    if (!question || loading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      text: question,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(-8).map((message) => ({
        role: message.role,
        content: message.text,
      }));
      const services = [
        { url: `${RAG_API_URL}/chat`, answerKey: "answer", status: "rag", timeout: 30000 },
        { url: `${NODE_API_URL}/chat`, answerKey: "response", status: "fallback", timeout: 7000 },
      ];
      let answer = "";

      for (const current of services) {
        const controller = new AbortController();
        const timeout = window.setTimeout(
          () => controller.abort(),
          current.timeout,
        );

        try {
          const response = await fetch(current.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: question, history }),
            signal: controller.signal,
          });
          const data = await response.json();

          if (response.ok && data[current.answerKey]) {
            answer = data[current.answerKey];
            if (data.mode === "mistral") {
              setService("mistral");
            } else if (current.status === "rag") {
              setService("rag");
            } else {
              setService("fallback");
            }
            break;
          }
        } catch {
          // Try the next available service.
        } finally {
          window.clearTimeout(timeout);
        }
      }

      if (!answer) throw new Error("No EV assistant service is available.");

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: answer,
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          role: "assistant",
          error: true,
          text: "AI service abhi offline hai. Backend ya RAG service start karke **Retry connection** dabaiye.",
        },
      ]);
      setService("offline");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="ev-chatbot-root">
      {isOpen && (
        <section
          className="ev-chat-window"
          onWheel={(event) => event.stopPropagation()}
        >
          <header className="ev-chat-header">
            <div className="ev-chat-agent">
              <img
                src="/ev-ai-chatbot-logo.png"
                alt="EV AI Assistant"
                className="ev-chat-header-logo"
              />

              <div>
                <div className="ev-chat-title">TataEV AI Assistant</div>

                <div className={`ev-chat-status ${service}`}>
                  <span className="ev-status-dot" />
                  {service === "rag" && "RAG Assistant Online"}
                  {service === "mistral" && "Mistral Assistant Online"}
                  {service === "fallback" && "Local EV Assistant Online"}
                  {service === "checking" && "Checking AI service..."}
                  {service === "offline" && "AI service offline"}
                </div>
              </div>
            </div>

            <div className="ev-chat-actions">
              <button
                type="button"
                className="ev-header-button"
                onClick={clearChat}
                title="Clear chat"
              >
                ↻
              </button>

              <button
                type="button"
                className="ev-header-button"
                onClick={() => setIsOpen(false)}
                title="Close chatbot"
              >
                ×
              </button>
            </div>
          </header>

          <div
            ref={messagesContainerRef}
            className="ev-chat-messages"
            onWheel={(event) => event.stopPropagation()}
          >
            {messages.map((message) => (
              <div
                className={`ev-message-row ${message.role} ${
                  message.error ? "error" : ""
                }`}
                key={message.id}
              >
                {message.role === "assistant" && (
                  <img
                    src="/ev-ai-chatbot-logo.png"
                    alt=""
                    className="ev-message-avatar"
                  />
                )}

                <div className="ev-message-bubble">
                  <FormattedMessage text={message.text} />
                </div>
              </div>
            ))}

            {loading && (
              <div className="ev-message-row assistant">
                <img
                  src="/ev-ai-chatbot-logo.png"
                  alt=""
                  className="ev-message-avatar"
                />

                <div className="ev-message-bubble ev-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <div className="ev-suggestions">
            <button
              type="button"
              onClick={() => setInput("Nexon EV aur Curvv EV ki range compare karo")}
            >
              Compare range
            </button>

            <button
              type="button"
              onClick={() => setInput("Fast charging ke baare mein batao")}
            >
              Charging
            </button>

            <button type="button" onClick={checkServices}>
              Retry connection
            </button>
          </div>

          <footer className="ev-chat-footer">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="EV ke baare mein poochiye..."
              rows="1"
              maxLength="500"
              disabled={loading}
            />

            <button
              type="button"
              className="ev-send-button"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              ➤
            </button>
          </footer>

          <div className="ev-chat-powered">
            {service === "fallback"
              ? "Grounded local EV knowledge"
              : service === "mistral"
                ? "Powered by Mistral AI"
                : "Powered by Mistral AI + RAG"}
          </div>
        </section>
      )}

      <button
        type="button"
        className={`ev-chat-launcher ${isOpen ? "opened" : ""}`}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Open EV AI chatbot"
      >
        {isOpen ? (
          <span>×</span>
        ) : (
          <img src="/ev-ai-chatbot-logo.png" alt="Open EV chatbot" />
        )}
      </button>
    </div>
  );
}
