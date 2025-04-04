import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Chatapp from './screens/Chat';
import Login from './screens/Login';
import Register from './screens/Register';
import PrivateRoute from './components/PrivateRoute';
import Profile from './screens/Profile';
import { CssBaseline, ThemeProvider } from '@mui/material';

function App() {
  return (
    <Router>
        <Routes>
          <Route path="/chat" element={<Chatapp />} />
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } 
          />
        </Routes>
    </Router>
  );
}

export default App;
