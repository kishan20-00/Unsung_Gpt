import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Chat from './screens/Chat'
import Login from "./screens/Login";
import Signup from "./screens/Register";

function App() {
  return (
    <Router>
        <Routes>
          <Route path="/Home" element={<Chat />} />
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
    </Router>
  );
}

export default App;
