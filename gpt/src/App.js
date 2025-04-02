import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Chatapp from './screens/Chat'

function App() {
  return (
    <Router>
        <Routes>
          <Route path="/" element={<Chatapp />} />
        </Routes>
    </Router>
  );
}

export default App;
