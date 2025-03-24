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
  ListSubheader,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MicIcon from "@mui/icons-material/Mic";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Groq from "groq-sdk";
import loadingGif from './ai2.gif';
import axios from 'axios';

const groq = new Groq({ apiKey: process.env.REACT_APP_GROQ_API_KEY, dangerouslyAllowBrowser: true });

const Chat = () => {
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
  const [imageFile, setImageFile] = useState(null);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    // Simulate a delay for loading or complete initial setup
    const timer = setTimeout(() => {
      setIsLoading(false); // Set loading to false after a delay
    }, 3000); // Adjust delay as needed (e.g., 2 seconds)
    return () => clearTimeout(timer); // Clean up timer if the component unmounts
  }, []);

  // Fetch user profile if token exists
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("User profile not found!!! Please log in!")
        console.log("No token found. User is not logged in.");
        return;
      }

      try {
        // Fetch user profile to verify authentication
        const profileResponse = await axios.get(
          "https://unsung-gpt-2uqq.vercel.app/api/auth/profile",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUserDetails(profileResponse.data); // User is logged in

        console.log("User is logged in:", profileResponse.data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        alert("Cannot retreive the profile!!!")
      }
    };

    fetchUserProfile();
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

  // Update user's inputTokens or outputTokens in the backend
  const updateUserTokens = async (tokens, type) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("User not logged in!");
      return;
    }

    try {
      await axios.put(
        "https://unsung-gpt-2uqq.vercel.app/api/auth/updateTokens",
        { [type]: tokens }, // `type` can be "inputTokens" or "outputTokens"
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(`${type} updated successfully`);
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
    }
  };

  if (isLoading) {
    return (
      <div style={styles.fullScreenContainer}>
        <img src={loadingGif} alt="Loading..." />
      </div>
    );
  };

  const handleImageUpload = (event) => {
    setImageFile(event.target.files[0]);
  };

  const handleSendMessage = async () => {
    if (!userMessage) return;
  
    // Count tokens for the user's message
    const userTokenCount = await countTokens(userMessage);
  
    // Check if the user is eligible to process the request
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("User not logged in!");
        return;
      }
  
      // Validate token limits before proceeding
      const validationResponse = await axios.post(
        `https://unsung-gpt-2uqq.vercel.app/api/plan/users/${userDetails._id}/check-tokens`,
        { inputTokens: userTokenCount, outputTokens: 0 }, // Only input tokens for now
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      if (validationResponse.status !== 200) {
        alert(validationResponse.data.message || "Token limit exceeded");
        return;
      }
    } catch (error) {
      console.error("Error validating token limits:", error);
      alert("Error validating token limits. Please try again.");
      return;
    }
  
    // Add user's message to chat history with token count
    setChatHistory((prev) => [
      ...prev,
      { role: "user", message: userMessage, tokens: userTokenCount },
    ]);
  
    const systemContent = systemMessage || "You are a helpful assistant.";
  
    if (stream) {
      // Stream mode
      try {
        // Add a placeholder for the system response
        setChatHistory((prev) => [
          ...prev,
          { role: "system", message: "...", tokens: 0 }, // Placeholder for streaming
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
            { role: "system", message: systemResponse, tokens: 0 }, // Tokens will be updated later
          ]);
        }
  
        // Count tokens for the system's response after streaming completes
        const systemTokenCount = await countTokens(systemResponse);
  
        // Update output tokens in the backend
        await axios.post(
          `https://unsung-gpt-2uqq.vercel.app/api/plan/users/${userDetails._id}/check-tokens`,
          { inputTokens: 0, outputTokens: systemTokenCount }, // Only output tokens now
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
  
        // Update chat history with the final system response and token count
        setChatHistory((prev) => [
          ...prev.slice(0, -1), // Remove the last message
          { role: "system", message: systemResponse, tokens: systemTokenCount },
        ]);
      } catch (error) {
        console.error("Error during streaming:", error);
        setChatHistory((prev) => [
          ...prev,
          { role: "system", message: "An error occurred during streaming.", tokens: 0 },
        ]);
      }
    } else {
      // Non-stream mode
      try {
        const systemResponse = await getGroqChatCompletion(userMessage, systemContent);
  
        // Count tokens for the system's response
        const systemTokenCount = await countTokens(systemResponse);
  
        // Update output tokens in the backend
        await axios.post(
          `https://unsung-gpt-2uqq.vercel.app/api/plan/users/${userDetails._id}/check-tokens`,
          { inputTokens: 0, outputTokens: systemTokenCount }, // Only output tokens now
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
  
        // Add system's response to chat history with token count
        setChatHistory((prev) => [
          ...prev,
          { role: "system", message: systemResponse, tokens: systemTokenCount },
        ]);
      } catch (error) {
        console.error("Error in non-stream mode:", error);
        setChatHistory((prev) => [
          ...prev,
          { role: "system", message: "The tokens limit has been exceeded.", tokens: 0 },
        ]);
      }
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

  const handleSendVisionRequest = async () => {
    if (!imageFile) {
      alert("Please upload an image file.");
      return;
    }
  
    try {
      // Convert the image file to base64
      const convertToBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]); // Get base64 part
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
  
      const base64Image = await convertToBase64(imageFile);
  
      // Prepare the messages array with both text and image content
      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: userMessage || "What is in this image?" },
            { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }, // Base64 URL
          ],
        },
      ];
  
      // Send the request to the Groq API
      const response = await groq.chat.completions.create({
        model: selectedModel, // e.g., "llama-3.2-11b-vision-preview"
        messages: messages,
        temperature: temperature,
        max_completion_tokens: maxTokens,
        top_p: topP,
        stream: stream,
        stop: stopSequence,
      });
  
      // Update chat history with the response
      setChatHistory((prev) => [
        ...prev,
        {
          role: "system",
          message: response.choices[0].message.content || "Vision processing complete.",
        },
      ]);
    } catch (error) {
      console.error("Error with vision API:", error);
      setChatHistory((prev) => [
        ...prev,
        { role: "system", message: "An error occurred while processing the image." },
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

  const renderVisionInterface = () => (
    <div>
      <Button
        variant="outlined"
        component="label"
        style={{ marginBottom: "10px" }}
      >
        Upload Image
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={handleImageUpload}
        />
      </Button>
      {imageFile && <p>Selected Image: {imageFile.name}</p>}

      <TextField
        fullWidth
        label="Enter your message"
        value={userMessage}
        onChange={(e) => setUserMessage(e.target.value)}
        style={{ marginTop: "10px" }}
      />

      <Button
        variant="contained"
        color="primary"
        onClick={handleSendVisionRequest}
        style={{ marginTop: "10px" }}
      >
        Send
      </Button>
    </div>
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

  const countTokens = async (text) => {
    try {
      const response = await fetch("https://flask-app-991598001448.us-central1.run.app/count_tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to count tokens");
      }
  
      const data = await response.json();
      return data.token_count;
    } catch (error) {
      console.error("Error counting tokens:", error);
      return 0; // Fallback to 0 if token counting fails
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
            Cloud Playground
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
  {/* Group 1 */}
  <ListSubheader>Alibaba Cloud</ListSubheader>
  {[
    "qwen-2.5-32b",
    "qwen-2.5-coder-32b",   
  ].map((model) => (
    <MenuItem key={model} value={model}>
      {model}
    </MenuItem>
  ))}

  {/* Group 2 */}
  <ListSubheader>DeepSeek / Alibaba Cloud</ListSubheader>
  {[
    "deepseek-r1-distill-qwen-32b",
  ].map((model) => (
    <MenuItem key={model} value={model}>
      {model}
    </MenuItem>
  ))}

  {/* Group 2.5 */}
  <ListSubheader>DeepSeek / Meta</ListSubheader>
  {[
    "deepseek-r1-distill-llama-70b",
  ].map((model) => (
    <MenuItem key={model} value={model}>
      {model}
    </MenuItem>
  ))}

  {/* Group 2.5 */}
  <ListSubheader>Google</ListSubheader>
  {[
      "gemma2-9b-it",
  ].map((model) => (
    <MenuItem key={model} value={model}>
      {model}
    </MenuItem>
  ))}

  {/* Group 2.5 */}
  <ListSubheader>Hugging Face</ListSubheader>
  {[
    "distil-whisper-large-v3-en",
  ].map((model) => (
    <MenuItem key={model} value={model}>
      {model}
    </MenuItem>
  ))}

  {/* Group 3 */}
  <ListSubheader>Meta</ListSubheader>
  {[
    "llama-3.1-8b-instant",
    "llama-3.2-11b-vision-preview",
    "llama-3.2-1b-preview",
    "llama-3.2-3b-preview",
    "llama-3.2-90b-vision-preview",
    "llama-3.2-70b-specdec",
    "llama-3.3-70b-versatile",
    "llama-guard-3-8b",
    "llama3-70b-8192",
    "llama3-8b-8192",
  ].map((model) => (
    <MenuItem key={model} value={model}>
      {model}
    </MenuItem>
  ))}

  {/* Group 4 */}
  <ListSubheader>Mistral</ListSubheader>
  {[
    "mixtral-8x7b-32768",
  ].map((model) => (
    <MenuItem key={model} value={model}>
      {model}
    </MenuItem>
  ))}

  {/* Group 5 */}
  <ListSubheader>OpenAI</ListSubheader>
  {[
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
          :["llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"].includes(
            selectedModel
          )
            ? renderVisionInterface() 
            :(
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
                <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#666" }}>
          Tokens: {chat.tokens}
        </Typography>
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


export default Chat;
