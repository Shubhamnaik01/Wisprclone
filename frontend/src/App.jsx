import { useState } from "react";
import "./App.css";
import Recorder from "./components/Recorder";

function App() {
  return (
    <div className="flex flex-col">
      <Recorder />
    </div>
  );
}

export default App;
