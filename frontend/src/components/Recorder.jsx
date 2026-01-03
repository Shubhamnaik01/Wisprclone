import React, { useEffect } from "react";
import Button from "@mui/material/Button";
import { TextareaAutosize } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import MicNoneIcon from "@mui/icons-material/MicNone";
import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

const Recorder = () => {
  const [accessGranted, setAccessGranted] = useState(false);
  const [recordingState, setRecordingState] = useState(false);
  const [urlaudio, setUrlAudio] = useState("");

  const recordedChunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    checkAccess();
    console.log(88);
  }, []);

  async function startRecording() {
    try {
      recordedChunksRef.current = []; // recordedChunks needed to be emptied before starting a new recording or it might contian previous recording
      await invoke("start_listening");
      console.log("RUST ACKNOWLEDGED");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.start();

      const audioContext = new AudioContext({ sampleRate: 48000 });
      await audioContext.resume();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = audioContext.createScriptProcessor(2048, 1, 1); // smaller buffer = lower latency
      processorRef.current = processor;

      processor.onaudioprocess = async (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(input.length);

        for (let i = 0; i < input.length; i++) {
          pcm16[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
        }

        try {
          await invoke("send_audio_chunk", {
            chunk: Array.from(new Uint8Array(pcm16.buffer)),
          });
        } catch (err) {
          console.error("Failed to send chunk to Rust:", err);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log("Recording started");
    } catch (error) {
      setRecordingState(false);
      console.log("Access denied ", error.message);
    }
  }

  async function checkAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (stream) {
        setAccessGranted(true);
        console.log("Access Granted");
      }
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      setAccessGranted(false);
      console.log("Access not granted" + error.message);
    }
  }

  function stopRecording() {
    const mediaRecorder = mediaRecorderRef.current;
    const audioContext = audioContextRef.current;
    const processor = processorRef.current;
    const source = sourceRef.current;

    mediaRecorder.onstop = () => {
      if (urlaudio) URL.revokeObjectURL(urlaudio);
      const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setUrlAudio(url);
      recordedChunksRef.current = [];
    };

    processor?.disconnect();
    source?.disconnect();
    audioContext?.close();
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());

    mediaRecorder.stop();

    console.log("Recording Stopped");
  }

  return (
    <div className="flex flex-col justify-center items-center gap-4">
      <IconButton
        color="primary"
        sx={{
          backgroundColor: "#white",
          color: "red",
          "&:hover": {
            backgroundColor: "#fabbb8",
          },
          width: 72,
          height: 72,
        }}
        onClick={() => {
          if (accessGranted) {
            if (!recordingState) {
              startRecording();
              setRecordingState(true);
            } else {
              setRecordingState(false);
              stopRecording();
            }
          } else {
            console.log("Access not granted");
          }
        }}
      >
        <MicNoneIcon sx={{ fontSize: 45 }} />
      </IconButton>
      {accessGranted && recordingState ? (
        <h1 className="animate-pulse font-bold text-xl text-black-600">
          Recording....
        </h1>
      ) : accessGranted && !recordingState ? (
        <h1 className=" text-xl text-black-600 ">
          Click on this mic to start recording
        </h1>
      ) : (
        <h1 className="text-xl text-black-600 ">
          Please provide microphone access
        </h1>
      )}
      {urlaudio && (
        <audio key={urlaudio} controls src={urlaudio} className="mt-2" />
      )}
    </div>
  );
};

export default Recorder;
