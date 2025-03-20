import React, { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Link,
  Paper,
  Container,
  CssBaseline,
  Avatar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined"; // Icon for the signup form

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      await axios.post("https://unsung-gpt-2uqq.vercel.app/api/auth/register", { name, email, password });
      alert("Signup Successful! Please Login");
      navigate("/");
    } catch (err) {
      alert("Error Signing Up");
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Paper
        elevation={3}
        sx={{
          marginTop: 15,
          padding: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          borderRadius: 2, // Rounded corners
        }}
      >
        {/* Avatar Icon */}
        <Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
          <LockOutlinedIcon />
        </Avatar>

        {/* Title */}
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Sign Up
        </Typography>

        {/* Name Field */}
        <TextField
          label="Name"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }} // Add margin bottom
        />

        {/* Email Field */}
        <TextField
          label="Email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }} // Add margin bottom
        />

        {/* Password Field */}
        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 3 }} // Add margin bottom
        />

        {/* Sign Up Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleSignup}
          sx={{ mb: 2 }} // Add margin bottom
        >
          Sign Up
        </Button>

        {/* Login Link */}
        <Typography align="center">
          Already have an account?{" "}
          <Link href="/login" underline="hover" sx={{ fontWeight: "bold" }}>
            Login
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
};

export default Signup;