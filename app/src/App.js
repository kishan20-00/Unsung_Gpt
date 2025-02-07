import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Drawer,
  IconButton,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.REACT_APP_GROQ_API_KEY, dangerouslyAllowBrowser: true });

const App = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [userMessage, setUserMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");
  const [temperature, setTemperature] = useState(0.5);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [stream, setStream] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [llamaguard, setLlamaguard] = useState(false);
  const [topP, setTopP] = useState(1.0);
  const [seed, setSeed] = useState(0);
  const [stopSequence, setStopSequence] = useState("");
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  const getGroqChatCompletion = async (userInput) => {
    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userInput },
        ],
        model: selectedModel,
        temperature,
        max_completion_tokens: maxTokens,
        top_p: topP,
        stop: stopSequence || null,
        stream,
      });
      return response.choices[0]?.message?.content || "No response received.";
    } catch (error) {
      console.error("Error communicating with Groq API:", error);
      return "An error occurred while fetching the response.";
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage) return;

    // Add user's message to chat history
    setChatHistory((prev) => [...prev, { role: "user", message: userMessage }]);

    // Fetch response from Groq API
    const systemMessage = await getGroqChatCompletion(userMessage);

    // Add system's response to chat history
    setChatHistory((prev) => [...prev, { role: "system", message: systemMessage }]);

    // Clear user input
    setUserMessage("");
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setLeftDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Unsung Fields Cloud Playground
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            aria-label="menu"
            onClick={() => setRightDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Left Drawer */}
      <Drawer anchor="left" open={leftDrawerOpen} onClose={() => setLeftDrawerOpen(false)}>
        <Box sx={{ width: 250, padding: 2 }}>
          <Typography variant="h6" gutterBottom>
            Options
          </Typography>
          <Button fullWidth sx={{ mb: 1 }}>Documentation</Button>
          <Button fullWidth sx={{ mb: 1 }}>Metrics</Button>
          <Button fullWidth sx={{ mb: 1 }}>API Keys</Button>
          <Button fullWidth sx={{ mb: 1 }}>Settings</Button>
          <Divider sx={{ my: 2 }} />
          <Button fullWidth sx={{ mb: 1 }}>Status</Button>
          <Button fullWidth sx={{ mb: 1 }}>Discord</Button>
          <Button fullWidth>Chat with us</Button>
        </Box>
      </Drawer>

      {/* Right Drawer */}
      <Drawer anchor="right" open={rightDrawerOpen} onClose={() => setRightDrawerOpen(false)}>
        <Box sx={{ width: 300, padding: 2 }}>
          <Typography variant="h6" gutterBottom>
            Parameters
          </Typography>

          <Typography gutterBottom>Temperature</Typography>
          <Slider
            value={temperature}
            onChange={(e, value) => setTemperature(value)}
            step={0.1}
            min={0}
            max={2}
          />

          <Typography gutterBottom>Max Completion Tokens</Typography>
          <Slider
            value={maxTokens}
            onChange={(e, value) => setMaxTokens(value)}
            step={1}
            min={1}
            max={8092}
          />

          <FormGroup>
            <FormControlLabel
              control={<Checkbox checked={stream} onChange={(e) => setStream(e.target.checked)} />}
              label="Stream"
            />
            <FormControlLabel
              control={<Checkbox checked={jsonMode} onChange={(e) => setJsonMode(e.target.checked)} />}
              label="JSON Mode"
            />
          </FormGroup>

          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Advanced</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={llamaguard}
                      onChange={(e) => {
                        setLlamaguard(e.target.checked);
                        if (e.target.checked) setSelectedModel("llama-guard-3-8b");
                      }}
                    />
                  }
                  label="Llamaguard"
                />
              </FormGroup>

              <Typography gutterBottom>Top-P</Typography>
              <Slider
                value={topP}
                onChange={(e, value) => setTopP(value)}
                step={0.01}
                min={0}
                max={1}
              />

              <TextField
                label="Seed"
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                fullWidth
                sx={{ mt: 2 }}
              />

              <TextField
                label="Stop Sequence"
                value={stopSequence}
                onChange={(e) => setStopSequence(e.target.value)}
                fullWidth
                sx={{ mt: 2 }}
              />
            </AccordionDetails>
          </Accordion>
        </Box>
      </Drawer>

      <Container sx={{ mt: 4 }}>
        {/* Model Selector */}
        <FormControl fullWidth sx={{ mb: 4 }}>
          <InputLabel>Select Model</InputLabel>
          <Select
            value={selectedModel}
            label="Select Model"
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {[
              "deepseek-r1-distill-llama-70b",
              "distil-whisper-large-v3-en",
              "gemma2-9b-it",
              "llama-3.3-70b-versatile",
              "llama-3.1-8b-instant",
              "llama-guard-3-8b",
              "llama3-70b-8192",
              "llama3-8b-8192",
              "mixtral-8x7b-32768",
              "whisper-large-v3",
              "whisper-large-v3-turbo",
            ].map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Chat Interface */}
        <Typography variant="h6" sx={{ mt: 4 }}>
          Chat
        </Typography>
        <TextField
          label="Enter your message"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
        />
        <Button
          variant="contained"
          onClick={handleSendMessage}
          sx={{ mt: 2, mb: 4 }}
        >
          Send
        </Button>

        {/* Chat History */}
        <Box>
          {chatHistory.map((chat, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                justifyContent: chat.role === "user" ? "flex-end" : "flex-start",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  maxWidth: "60%",
                  padding: 2,
                  borderRadius: 2,
                  backgroundColor: chat.role === "user" ? "#DCF8C6" : "#E6E6E6",
                }}
              >
                {chat.message}
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default App;
