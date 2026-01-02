import React, { useEffect } from "react";
import Button from "@mui/material/Button";
import { TextareaAutosize } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import MicNoneIcon from "@mui/icons-material/MicNone";
import { useState } from "react";

let recordedChunks = [];
let mediaRecorder;

const Recorder = () => {
  const [accessGranted, setAccessGranted] = useState(false);
  const [recordingState, setRecordingState] = useState(false);
  const [urlaudio, setUrlAudio] = useState("");
  let accessMessage = "";

  useEffect(() => {
    checkAccess();
    console.log(88);
  }, []);

  async function startRecording() {
    try {
      recordedChunks.length = 0; // recordedChunks needed to be emptied before starting a new recording or it might contian previous recording
      const streamResult = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      mediaRecorder = new MediaRecorder(streamResult);
      mediaRecorder.ondataavailable = (event) => {
        recordedChunks.push(event.data);
      };
      mediaRecorder.start();
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
    mediaRecorder.stop();

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setUrlAudio(url);
      recordedChunks = [];
    };
    console.log("Recording Stopped");
  }

  return (
    <div className="flex flex-col justify-center items-center h-screen gap-4">
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
      {urlaudio && <audio controls src={urlaudio} className="mt-2" />}
    </div>
  );
};

export default Recorder;
