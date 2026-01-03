import { useState } from "react";
import "./App.css";
import Recorder from "./components/Recorder";
import Transcript from "./components/Transcript";

function App() {
  return (
    <div className="flex flex-col justify-center items-center gap-20 min-h-screen">
      <Recorder />
      <Transcript />
    </div>
  );
}

export default App;
