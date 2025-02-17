import React, { useState, useEffect } from "react";
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
import MicIcon from "@mui/icons-material/Mic";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Groq from "groq-sdk";
import loadingGif from './ai2.gif';

const groq = new Groq({ apiKey: process.env.REACT_APP_GROQ_API_KEY, dangerouslyAllowBrowser: true });

const App = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [userMessage, setUserMessage] = useState("");
  const [systemMessage, setSystemMessage] = useState("You are a helpful assistant.");
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
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verboseJson, setVerboseJson] = useState(false);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    // Simulate a delay for loading or complete initial setup
    const timer = setTimeout(() => {
      setIsLoading(false); // Set loading to false after a delay
    }, 3000); // Adjust delay as needed (e.g., 2 seconds)

    return () => clearTimeout(timer); // Clean up timer if the component unmounts
  }, []);

  const getGroqChatCompletion = async (userInput, systemInput) => {
    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemInput || "You are a helpful assistant." },
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

  if (isLoading) {
    return (
      <div style={styles.fullScreenContainer}>
        <img src={loadingGif} alt="Loading..." />
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!userMessage) return;
  
    // Add user's message to chat history
    setChatHistory((prev) => [...prev, { role: "user", message: userMessage }]);
  
    const systemContent = systemMessage || "You are a helpful assistant.";
  
    if (stream) {
      // Stream mode
      try {
        // Add a placeholder for the system response
        setChatHistory((prev) => [
          ...prev,
          { role: "system", message: "..." }, // Placeholder for streaming
        ]);
  
        const stream = await getGroqChatStream(userMessage, systemContent);
  
        let systemResponse = ""; // Accumulated response
        for await (const chunk of stream) {
          const deltaContent = chunk.choices[0]?.delta?.content || "";
  
          // Append new content to the system response
          systemResponse += deltaContent;
  
          // Update the placeholder with the latest system response
          setChatHistory((prev) => [
            ...prev.slice(0, -1), // Remove the last placeholder message
            { role: "system", message: systemResponse },
          ]);
        }
      } catch (error) {
        console.error("Error during streaming:", error);
        setChatHistory((prev) => [
          ...prev,
          { role: "system", message: "An error occurred during streaming." },
        ]);
      }
    } else {
      // Non-stream mode
      const systemResponse = await getGroqChatCompletion(userMessage, systemContent);
  
      // Add system's response to chat history
      setChatHistory((prev) => [...prev, { role: "system", message: systemResponse }]);
    }
  
    // Clear user input
    setUserMessage("");
  };

  // Handle checkbox change
  const handleCheckboxChange = (event) => {
    if (event.target.checked) {
      setVerboseJson("verbose_json");
    } else {
      setVerboseJson("");
    }
  };

  const getGroqChatStream = async (userInput, systemInput) => {
    return groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInput },
        { role: "user", content: userInput },
      ],
      model: selectedModel,
      temperature,
      max_completion_tokens: maxTokens,
      top_p: topP,
      stop: stopSequence || null,
      stream: true,
    });
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const handleSendAudioRequest = async () => {
    if (!file) {
      alert("Please upload or record an audio file.");
      return;
    }
  
    try {
      let response;
      const fileStream = file;
      const commonParams = {
        file: fileStream,
        temperature: temperature,
      };
  
      if (verboseJson) {
        commonParams.response_format = verboseJson; // Conditionally add response_format
      }
  
      if (selectedModel === "whisper-large-v3-turbo") {
        response = await groq.audio.transcriptions.create({
          ...commonParams,
          model: "whisper-large-v3-turbo",
          language: language,
        });
      } else if (selectedModel === "whisper-large-v3") {
        response = await groq.audio.translations.create({
          ...commonParams,
          model: "whisper-large-v3",
        });
      } else if (selectedModel === "distil-whisper-large-v3-en") {
        response = await groq.audio.transcriptions.create({
          ...commonParams,
          model: "distil-whisper-large-v3-en",
        });
      }
  
      setChatHistory((prev) => [
        ...prev,
        {
          role: "system",
          message: response.text || "Transcription/Translation complete.",
        },
      ]);
    } catch (error) {
      console.error("Error with audio API:", error);
      setChatHistory((prev) => [
        ...prev,
        { role: "system", message: "An error occurred while processing the audio." },
      ]);
    }
  };
  

  const renderAudioInterface = () => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6">Upload or Record Audio</Typography>
      <Button
        variant="contained"
        component="label"
        startIcon={<UploadFileIcon />}
        sx={{ mt: 2, mb: 2 }}
      >
        Upload Audio
        <input
          type="file"
          accept="audio/*"
          hidden
          onChange={handleFileUpload}
        />
      </Button>
      <Button
        variant="contained"
        startIcon={<MicIcon />}
        onClick={() => alert("Recording feature not implemented yet.")}
        sx={{ ml: 2, mb: 0 }}
      >
        Record Audio
      </Button>
      <Button
        variant="contained"
        color="primary"
        onClick={handleSendAudioRequest}
        disabled={!file}
        sx={{ display: "block", mt: 2 }}
      >
        Send
      </Button>
    </Box>
  );

  const renderRightSidebar = () => {
    if (selectedModel === "distil-whisper-large-v3-en") {
      return (
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={verboseJson === "verbose_json"}
                onChange={handleCheckboxChange}
              />
            }
            label="Verbose JSON"
          />
          <Typography gutterBottom>Temperature</Typography>
          <Slider
            value={temperature}
            onChange={(e, value) => setTemperature(value)}
            step={0.1}
            min={0}
            max={0}
            aria-label="Temperature"
            valueLabelDisplay="auto"
          />
        </Box>
      );
    } else if (selectedModel === "whisper-large-v3") {
      return (
        <Box>
          <Typography gutterBottom>Response Format</Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={verboseJson === "verbose_json"}
                  onChange={handleCheckboxChange}
                />
              }
              label="JSON Mode"
            />
            <Typography gutterBottom>Temperature</Typography>
          <Slider
            value={temperature}
            onChange={(e, value) => setTemperature(value)}
            step={0.1}
            min={0}
            max={0}
            aria-label="Temperature"
            valueLabelDisplay="auto"
          />
          </FormGroup>
        </Box>
      );
    } else if (selectedModel === "whisper-large-v3-turbo") {
      return (
        <Box>
          <Typography gutterBottom>Response Format</Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={verboseJson === "verbose_json"}
                  onChange={handleCheckboxChange}
                />
              }
              label="JSON Mode"
            />
          </FormGroup>
          <Typography gutterBottom>Language</Typography>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            fullWidth
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="zh">Chinese</MenuItem>
            <MenuItem value="de">German</MenuItem>
            <MenuItem value="es">Spanish</MenuItem>
            <MenuItem value="ru">Russian</MenuItem>
            <MenuItem value="ko">Korean</MenuItem>
            <MenuItem value="fr">French</MenuItem>
            <MenuItem value="ja">Japanese</MenuItem>
            <MenuItem value="pt">Portuguese</MenuItem>
            <MenuItem value="tr">Turkish</MenuItem>
            <MenuItem value="pl">Polish</MenuItem>
            <MenuItem value="ca">Catalan</MenuItem>
            <MenuItem value="nl">Dutch</MenuItem>
            <MenuItem value="ar">Arabic</MenuItem>
            <MenuItem value="sv">Swedish</MenuItem>
            <MenuItem value="it">Italian</MenuItem>
            <MenuItem value="id">Indonesian</MenuItem>
            <MenuItem value="hi">Hindi</MenuItem>
            <MenuItem value="fi">Finnish</MenuItem>
            <MenuItem value="vi">Vietnamese</MenuItem>
            <MenuItem value="he">Hebrew</MenuItem>
            <MenuItem value="uk">Ukrainian</MenuItem>
            <MenuItem value="el">Greek</MenuItem>
            <MenuItem value="ms">Malay</MenuItem>
            <MenuItem value="cs">Czech</MenuItem>
            <MenuItem value="ro">Romanian</MenuItem>
            <MenuItem value="da">Danish</MenuItem>
            <MenuItem value="ta">Tamil</MenuItem>
            <MenuItem value="no">Norwegian</MenuItem>
            <MenuItem value="th">Thai</MenuItem>
            <MenuItem value="ur">Urdu</MenuItem>
            <MenuItem value="hr">Croatian</MenuItem>
            <MenuItem value="bg">Bulgarian</MenuItem>
            <MenuItem value="lt">Lithuanian</MenuItem>
            <MenuItem value="la">Latin</MenuItem>
            <MenuItem value="mi">Maori</MenuItem>
            <MenuItem value="ml">Malayalam</MenuItem>
            <MenuItem value="cy">Welsh</MenuItem>
            <MenuItem value="sk">Slovak</MenuItem>
            <MenuItem value="te">Telugu</MenuItem>
            <MenuItem value="fa">Persian</MenuItem>
            <MenuItem value="lv">Latvian</MenuItem>
            <MenuItem value="bn">Bengali</MenuItem>
            <MenuItem value="sr">Serbian</MenuItem>
            <MenuItem value="az">Azerbaijani</MenuItem>
            <MenuItem value="sl">Slovenian</MenuItem>
            <MenuItem value="kn">Kannada</MenuItem>
            <MenuItem value="et">Estonian</MenuItem>
            <MenuItem value="mk">Macedonian</MenuItem>
            <MenuItem value="br">Breton</MenuItem>
            <MenuItem value="eu">Basque</MenuItem>
            <MenuItem value="is">Icelandic</MenuItem>
            <MenuItem value="hy">Armenian</MenuItem>
            <MenuItem value="ne">Nepali</MenuItem>
            <MenuItem value="mn">Mongolian</MenuItem>
            <MenuItem value="bs">Bosnian</MenuItem>
            <MenuItem value="kk">Kazakh</MenuItem>
            <MenuItem value="sq">Albanian</MenuItem>
            <MenuItem value="sw">Swahili</MenuItem>
            <MenuItem value="gl">Galician</MenuItem>
            <MenuItem value="mr">Marathi</MenuItem>
            <MenuItem value="pa">Panjabi</MenuItem>
            <MenuItem value="si">Sinhala</MenuItem>
            <MenuItem value="km">Khmer</MenuItem>
            <MenuItem value="sn">Shona</MenuItem>
            <MenuItem value="yo">Yoruba</MenuItem>
            <MenuItem value="so">Somali</MenuItem>
            <MenuItem value="af">Afrikaans</MenuItem>
            <MenuItem value="oc">Occitan</MenuItem>
            <MenuItem value="ka">Georgian</MenuItem>
            <MenuItem value="be">Belarusian</MenuItem>
            <MenuItem value="tg">Tajik</MenuItem>
            <MenuItem value="sd">Sindhi</MenuItem>
            <MenuItem value="gu">Gujarati</MenuItem>
            <MenuItem value="am">Amharic</MenuItem>
            <MenuItem value="yi">Yiddish</MenuItem>
            <MenuItem value="lo">Lao</MenuItem>
            <MenuItem value="uz">Uzbek</MenuItem>
            <MenuItem value="fo">Faroese</MenuItem>
            <MenuItem value="ht">Haitian Creole</MenuItem>
            <MenuItem value="af">Pashto</MenuItem>
            <MenuItem value="tk">Turkmen</MenuItem>
            <MenuItem value="nn">Nynorsk</MenuItem>
            <MenuItem value="mt">Maltese</MenuItem>
            <MenuItem value="sa">Sanskrit</MenuItem>
            <MenuItem value="lb">Luxembourgish</MenuItem>
            <MenuItem value="my">Myanmar</MenuItem>
            <MenuItem value="bo">Tibetan</MenuItem>
            <MenuItem value="tl">Tagalog</MenuItem>
            <MenuItem value="mg">Malagasy</MenuItem>
            <MenuItem value="as">Assamese</MenuItem>
            <MenuItem value="tt">Tatar</MenuItem>
            <MenuItem value="haw">Hawaiian</MenuItem>
            <MenuItem value="ln">Lingala</MenuItem>
            <MenuItem value="ha">Hausa</MenuItem>
            <MenuItem value="ba">Bashkir</MenuItem>
            <MenuItem value="jv">Javanese</MenuItem>
            <MenuItem value="su">Sundanese</MenuItem>
            <MenuItem value="yue">Cantonese</MenuItem>
          </Select>
          <Typography gutterBottom>Temperature</Typography>
          <Slider
            value={temperature}
            onChange={(e, value) => setTemperature(value)}
            step={0.1}
            min={0}
            max={0}
            aria-label="Temperature"
            valueLabelDisplay="auto"
          />
        </Box>
      );
    } else {
      return (
        <Box>
        <Typography gutterBottom>Temperature</Typography>
          <Slider
            value={temperature}
            onChange={(e, value) => setTemperature(value)}
            step={0.1}
            min={0}
            max={2}
            aria-label="Small"
            valueLabelDisplay="auto"
          />

          <Typography gutterBottom>Max Completion Tokens</Typography>
          <Slider
            value={maxTokens}
            onChange={(e, value) => setMaxTokens(value)}
            step={1}
            min={1}
            max={8092}
            aria-label="Small"
            valueLabelDisplay="auto"
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
      );
    }
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

          {renderRightSidebar()}
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

        <Container sx={{ mt: 4 }}>
        {/* System Role Input */}
        <TextField
          label="System Role Content"
          value={systemMessage}
          onChange={(e) => setSystemMessage(e.target.value)}
          fullWidth
          sx={{ mb: 4 }}
        />

        {["whisper-large-v3-turbo", "whisper-large-v3", "distil-whisper-large-v3-en"].includes(
          selectedModel
        )
          ? renderAudioInterface()
          : (
            <Box>
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
        </Box>
          )}

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
      </Container>
    </Box>
  );
};

const styles = {
  fullScreenContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    backgroundColor: "black", // Optional, to create a uniform background
    margin: 0,
    padding: 0,
    overflow: "hidden", // Prevent scrollbars
  },
  fullScreenImage: {
    maxHeight: "100%",
    maxWidth: "100%",
    objectFit: "cover", // Ensures the image covers the screen without distortion
  },
};


export default App;
