import React, { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

const Transcript = () => {
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let detachListener;

    async function startListening() {
      detachListener = await listen("transcript", (event) => {
        const { text, is_final } = event.payload;

        if (!text) return;

        if (is_final) {
          setFinalText((prev) => prev + " " + text);
          setInterimText("");
        } else {
          setInterimText(text);
        }
      });
    }

    startListening();
    return () => {
      if (detachListener) detachListener();
    };
  }, []);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(finalText.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  }

  return (
    <div className="p-4 border rounded w-full max-w-xl bg-white">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold">Live Transcript</h2>

        <div className="flex gap-5 ">
          <button
            onClick={copyToClipboard}
            disabled={!finalText}
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white disabled:bg-gray-300"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={() => {
              setFinalText("");
              setInterimText("");
            }}
            disabled={!finalText}
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white disabled:bg-gray-300"
          >
            {!finalText ? "Cleared" : "Clear"}
          </button>
        </div>
      </div>

      <p className="whitespace-pre-wrap">
        {finalText}
        <span className="opacity-50"> {interimText}</span>
      </p>
    </div>
  );
};

export default Transcript;
