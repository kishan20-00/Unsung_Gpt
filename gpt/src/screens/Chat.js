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
  Toolbar
} from "@mui/material";
import { Settings as SettingsIcon, Send as SendIcon } from "@mui/icons-material";
import axios from "axios";

// Placeholder for your graqcloud logo - replace with your actual image import
import graqcloudLogo from "./Unsung_Cloud-removebg-preview.png"; 

const ChatApp = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { sender: "System", text: "Welcome to the Playground. You can start by typing a message." }
  ]);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({
    max_tokens: 128,
    temperature: 1,
    top_p: 0.9,
    top_k: 10,
    stream: false
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentStream, setCurrentStream] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage = { sender: "User", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      if (params.stream) {
        // Handle streaming response
        const response = await fetch("http://localhost:7000/v1/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B",
            prompt: input,
            ...params
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
        
        // Add initial empty AI message
        setMessages(prev => [...prev, aiMessage]);
        
        // Cancel any existing stream
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
                const text = parsed.choices[0]?.text || '';
                
                if (text) {
                  aiMessage.text += text;
                  aiMessage.formattedText = formatResponse(aiMessage.text);
                  
                  // Update the last message
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
        const res = await axios.post("http://localhost:7000/v1/completions", {
          model: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B",
          prompt: input,
          ...params
        });
        
        const responseText = res.data.choices[0]?.text || "No response";
        setMessages(prev => [...prev, { 
          sender: "System", 
          text: responseText,
          formattedText: formatResponse(responseText)
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        sender: "System", 
        text: "Error fetching response",
        formattedText: "Error fetching response"
      }]);
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
    minHeight: '64px !important', // Fixed toolbar height
    py: 1, // Vertical padding to control spacing
    overflow: 'hidden' // Prevent content from expanding container
  }}>
    <Box sx={{
      height: 50, // Fixed height for container
      display: 'flex',
      alignItems: 'center'
    }}>
      <Box 
        component="img"
        src={graqcloudLogo}
        alt="graqcloud"
        sx={{ 
          height: 200, // Take full height of container
          width: 'auto', // Maintain aspect ratio
          maxWidth: 250, // Maximum width
          objectFit: 'contain'
        }}
      />
    </Box>
          <Box>
            <Button color="inherit">Home</Button>
            <Button color="inherit">Playground</Button>
            <Button color="inherit">Documentation</Button>
            <Button color="inherit">API</Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Header Box with just "Playground" text */}
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
        <Typography variant="h6" color="primary">Playground</Typography>
        <IconButton 
          onClick={() => setDrawerOpen(!drawerOpen)}
          sx={{ position: 'absolute', right: 16 }}
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
        <List sx={{ 
          width: '100%',
          maxWidth: '100%',
          margin: 0
        }}>
          {messages.map((message, index) => (
            <React.Fragment key={index}>
              <ListItem alignItems="flex-start" sx={{ 
                width: '100%',
                maxWidth: '100%'
              }}>
                <ListItemText
                  primary={
                    <Typography 
                      variant="subtitle2" 
                      color={message.sender === "System" ? "primary" : "textPrimary"}
                      fontWeight="bold"
                    >
                      {message.sender}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="body1"
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        '& span': {
                          fontWeight: 'bold',
                          color: message.sender === "System" ? 'primary.main' : 'text.primary'
                        }
                      }}
                      component="div"
                    >
                      {message.formattedText || message.text}
                    </Typography>
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
          width: '100%',
          flexShrink: 0
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