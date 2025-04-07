import React, { useState, useEffect, useRef } from "react";
import {
  TextField,
  Typography,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Avatar
} from "@mui/material";
import { 
  Settings as SettingsIcon, 
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  ModelTraining as ModelIcon
} from "@mui/icons-material";
import axios from "axios";
import { Link } from "react-router-dom";

// Placeholder for your graqcloud logo - replace with your actual image import
import graqcloudLogo from "./Unsung_Cloud-removebg-preview.png";

const ChatApp = () => {
  // Available models
  const availableModels = [
    { name: "Gemma", value: "gemma", avatar: "G" },
    { name: "Llama 2", value: "llama2", avatar: "L" },
    { name: "GPT-3.5", value: "gpt-3.5-turbo", avatar: "G" },
    { name: "GPT-4", value: "gpt-4", avatar: "G" },
    { name: "Claude", value: "claude", avatar: "C" }
  ];

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { 
      sender: "System", 
      text: "Welcome to the Playground. You can start by typing a message.",
      metrics: null
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({
    max_tokens: 128,
    temperature: 1,
    top_p: 0.9,
    top_k: 10,
    stream: false,
    model: "gemma" // Added model to params
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentStream, setCurrentStream] = useState(null);
  const messagesEndRef = useRef(null);
  const [tokenUsage, setTokenUsage] = useState({
    input: 0,
    output: 0,
    limits: {
      input: 0,
      output: 0
    }
  });
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [modelMenuAnchor, setModelMenuAnchor] = useState(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const userResponse = await axios.get(`http://localhost:8000/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userResponse.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to fetch data');
        if (err.response?.status === 401) {
          // Handle unauthorized
        }
      }
    };

    fetchData();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatResponse = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.substring(2, part.length - 2);
        return (
          <span key={index} style={{ fontWeight: 'bold' }}>
            {boldText}
          </span>
        );
      }
      return part;
    });
  };

  const handleModelMenuOpen = (event) => {
    setModelMenuAnchor(event.currentTarget);
  };

  const handleModelMenuClose = () => {
    setModelMenuAnchor(null);
  };

  const selectModel = (modelValue) => {
    setParams({ ...params, model: modelValue });
    handleModelMenuClose();
  };

  const updateTokenCounts = async (inputTokens, outputTokens) => {
    try {
      const response = await axios.put(
        "http://127.0.0.1:8000/updateTokens",
        {
          input_tokens: inputTokens,
          output_tokens: outputTokens
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error updating token counts:", error);
      throw error;
    }
  };

  const logLLMInteraction = async (logData) => {
    try {
      await axios.post(
        "http://127.0.0.1:8000/api/logs/",
        logData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
    } catch (error) {
      console.error("Error logging LLM interaction:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "User", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    
    const startTime = Date.now();

    try {
      if (params.stream) {
        // Handle streaming response
        const response = await fetch("https://llm-991598001448.us-central1.run.app/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: params.model, // Use selected model
            prompt: input,
            temperature: params.temperature,
            top_p: params.top_p,
            top_k: params.top_k,
            max_length: params.max_tokens,
            stream: true
          })
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiMessage = { 
          sender: "System", 
          text: "",
          formattedText: ""
        };
        let inputTokens = 0;
        let outputTokens = 0;
        
        setMessages(prev => [...prev, aiMessage]);
        
        if (currentStream) {
          currentStream.cancel();
        }
        setCurrentStream(reader);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                
                if (parsed.finished) {
                  inputTokens = parsed.input_tokens || 0;
                  outputTokens = parsed.output_tokens || 0;
                  
                  const endTime = Date.now();
                  const latency = (endTime - startTime) / 1000;
                  const tokensPerSecond = outputTokens / latency;
                  
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    newMessages[newMessages.length - 1] = {
                      ...lastMessage,
                      metrics: {
                        latency,
                        tokensPerSecond,
                        timestamp: new Date().toLocaleTimeString()
                      }
                    };
                    return newMessages;
                  });

                  await logLLMInteraction({
                    email: user.email,
                    response_code: 200,
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    model: params.model, // Use selected model
                    additional_info: {
                      temperature: params.temperature,
                      top_p: params.top_p,
                      top_k: params.top_k,
                      max_tokens: params.max_tokens,
                      stream: true,
                      latency: latency
                    }
                  });
                } else if (parsed.response) {
                  aiMessage.text += parsed.response;
                  aiMessage.formattedText = formatResponse(aiMessage.text);
                  
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {...aiMessage};
                    return newMessages;
                  });
                }
              } catch (err) {
                console.error('Error parsing stream data:', err);
              }
            }
          }
        }
      } else {
        // Handle non-streaming response
        const res = await axios.post(
          "https://llm-991598001448.us-central1.run.app/generate",
          {
            model: params.model, // Use selected model
            prompt: input,
            temperature: params.temperature,
            top_p: params.top_p,
            top_k: params.top_k,
            max_length: params.max_tokens,
            stream: false
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token')}`
            }
          }
        );
        
        const responseText = res.data.response || "No response";
        const endTime = Date.now();
        const latency = (endTime - startTime) / 1000;
        const tokensPerSecond = res.data.output_tokens / latency;

        setMessages(prev => [...prev, { 
          sender: "System", 
          text: responseText,
          formattedText: formatResponse(responseText),
          metrics: {
            latency,
            tokensPerSecond,
            timestamp: new Date().toLocaleTimeString()
          }
        }]);
        
        await logLLMInteraction({
          email: user.email,
          response_code: 200,
          input_tokens: res.data.input_tokens,
          output_tokens: res.data.output_tokens,
          model: params.model, // Use selected model
          additional_info: {
            temperature: params.temperature,
            top_p: params.top_p,
            top_k: params.top_k,
            max_tokens: params.max_tokens,
            stream: false,
            latency: latency
          }
        });
        
        const updatedUsage = await updateTokenCounts(
          res.data.input_tokens,
          res.data.output_tokens
        );
        
        setTokenUsage({
          input: updatedUsage.input_tokens,
          output: updatedUsage.output_tokens,
          limits: {
            input: updatedUsage.subscription.input_token_limit,
            output: updatedUsage.subscription.output_token_limit
          }
        });
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        sender: "System", 
        text: "Error fetching response",
        formattedText: "Error fetching response"
      }]);
      
      await logLLMInteraction({
        email: user.email,
        response_code: error.response?.status || 500,
        input_tokens: 0,
        output_tokens: 0,
        model: params.model, // Use selected model
        additional_info: {
          error: error.message,
          temperature: params.temperature,
          top_p: params.top_p,
          top_k: params.top_k,
          max_tokens: params.max_tokens
        }
      });
      
      console.error("API Error:", error);
    } finally {
      setLoading(false);
      setCurrentStream(null);
    }
  };


  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStreamToggle = (event) => {
    setParams({ ...params, stream: event.target.checked });
  };

  // Cancel any ongoing stream when component unmounts
  useEffect(() => {
    return () => {
      if (currentStream) {
        currentStream.cancel();
      }
    };
  }, [currentStream]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      width: '100%',
      overflow: 'hidden'
    }}>
      {/* Top Navigation Bar */}
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ 
          justifyContent: 'space-between',
          backgroundColor: 'background.paper',
          borderBottom: '1px solid #eee',
          minHeight: '64px !important',
          py: 1,
          overflow: 'hidden'
        }}>
          <Box sx={{
            height: 50,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Box 
              component="img"
              src={graqcloudLogo}
              alt="graqcloud"
              sx={{ 
                height: 200,
                width: 'auto',
                maxWidth: 250,
                objectFit: 'contain'
              }}
            />
          </Box>
          <Box>
            <Button color="inherit">API Keys</Button>
            <Button color="inherit">Documentation</Button>
            <Button color="inherit" component={Link} to="/logs">Logs</Button>
            <Button color="inherit" component={Link} to="/profile">Profile</Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Header Box with Model Selector */}
      <Box 
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 48,
          px: 2,
          borderBottom: '1px solid #eee',
          backgroundColor: 'background.paper',
          flexShrink: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" color="primary" sx={{ mr: 2, marginLeft: 2 }}>Playground</Typography>
          
          {/* Model Selector */}
          <Button
            startIcon={<ModelIcon />}
            endIcon={<ExpandMoreIcon />}
            onClick={handleModelMenuOpen}
            sx={{
              textTransform: 'none',
              color: 'text.primary',
              marginLeft: 170,
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            {availableModels.find(m => m.value === params.model)?.name || 'Select Model'}
          </Button>
          
          <Menu
            anchorEl={modelMenuAnchor}
            open={Boolean(modelMenuAnchor)}
            onClose={handleModelMenuClose}
          >
            {availableModels.map((model) => (
              <MenuItem
                key={model.value}
                onClick={() => selectModel(model.value)}
                selected={params.model === model.value}
              >
                <Avatar sx={{ 
                  width: 24, 
                  height: 24, 
                  fontSize: '0.8rem',
                  mr: 1,
                  bgcolor: params.model === model.value ? 'primary.main' : 'grey.500'
                }}>
                  {model.avatar}
                </Avatar>
                {model.name}
              </MenuItem>
            ))}
          </Menu>
        </Box>
        
        <IconButton 
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          <SettingsIcon />
        </IconButton>
      </Box>

      {/* Chat Area */}
      <Box 
        sx={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#f9f9f9',
          p: 2,
          width: '100%'
        }}
      >
        <List sx={{ width: '100%', maxWidth: '100%', margin: 0 }}>
  {messages.map((message, index) => (
    <React.Fragment key={index}>
      <ListItem alignItems="flex-start" sx={{ width: '100%', maxWidth: '100%' }}>
        <ListItemText
          primary={
            <Typography 
              variant="subtitle2" 
              color={message.sender === "System" ? "primary" : "text.primary"} // Changed to text.primary
              fontWeight="bold"
              sx={{ color: '#000000' }} // Force black color
            >
              {message.sender}
            </Typography>
          }
          secondary={
            <>
              <Typography
                variant="body1"
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  color: '#000000', // Force black color
                  '& span': {
                    fontWeight: 'bold',
                    color: '#000000' // Force black color for bold spans
                  }
                }}
                component="div"
              >
                {message.formattedText || message.text}
              </Typography>
              {message.metrics && (
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1.5,
                  mt: 0.5,
                  alignItems: 'center',
                  color: 'text.secondary'
                }}>
                  <Typography variant="caption">
                    ⏱️ {message.metrics.latency.toFixed(2)}s
                  </Typography>
                  <Typography variant="caption">
                    🚀 {message.metrics.tokensPerSecond.toFixed(1)}/s
                  </Typography>
                  <Typography variant="caption">
                    🕒 {message.metrics.timestamp}
                  </Typography>
                </Box>
              )}
            </>
          }
          sx={{ width: '100%' }}
        />
      </ListItem>
      {index < messages.length - 1 && <Divider variant="inset" component="li" />}
    </React.Fragment>
  ))}
  <div ref={messagesEndRef} />
</List>
      </Box>

      {/* Input Area */}
      <Box 
        sx={{
          p: 2,
          borderTop: '1px solid #eee',
          backgroundColor: 'background.paper',
          width: '95%',
          flexShrink: 0,
          marginLeft: 5
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          multiline
          rows={2}
          disabled={loading}
          InputProps={{
            endAdornment: (
              <IconButton 
                color="primary" 
                onClick={handleSend}
                disabled={loading || !input.trim()}
              >
                <SendIcon />
              </IconButton>
            )
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Submit Ctrl + /
        </Typography>
      </Box>

      {/* Parameters Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>Parameters</Typography>
          
          <Box mb={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={params.stream}
                  onChange={handleStreamToggle}
                  color="primary"
                />
              }
              label="Stream Response"
              labelPlacement="start"
              sx={{ justifyContent: 'space-between', width: '100%', ml: 0 }}
            />
          </Box>
          
          <Box mb={2}>
            <Typography gutterBottom>Max Tokens: {params.max_tokens}</Typography>
            <Slider
              value={params.max_tokens}
              min={16}
              max={512}
              step={16}
              onChange={(e, value) => setParams({ ...params, max_tokens: value })}
              valueLabelDisplay="auto"
            />
          </Box>
          
          <Box mb={2}>
            <Typography gutterBottom>Temperature: {params.temperature}</Typography>
            <Slider
              value={params.temperature}
              min={0}
              max={2}
              step={0.1}
              onChange={(e, value) => setParams({ ...params, temperature: value })}
              valueLabelDisplay="auto"
            />
          </Box>
          
          <Box mb={2}>
            <Typography gutterBottom>Top-p: {params.top_p}</Typography>
            <Slider
              value={params.top_p}
              min={0}
              max={1}
              step={0.05}
              onChange={(e, value) => setParams({ ...params, top_p: value })}
              valueLabelDisplay="auto"
            />
          </Box>
          
          <Box mb={2}>
            <Typography gutterBottom>Top-k: {params.top_k}</Typography>
            <Slider
              value={params.top_k}
              min={1}
              max={50}
              step={1}
              onChange={(e, value) => setParams({ ...params, top_k: value })}
              valueLabelDisplay="auto"
            />
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default ChatApp;