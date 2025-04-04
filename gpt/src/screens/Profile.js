import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Avatar,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Grid
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  AccountTree as PlanIcon,
  Input as InputIcon,
  Output as OutputIcon,
  Logout as LogoutIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const API_URL = 'http://localhost:8000'; // Your FastAPI backend URL

const Profile = () => {
  const [user, setUser] = useState(null);
  const [planDetails, setPlanDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Fetch user profile
        const userResponse = await axios.get(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userResponse.data);

        // Fetch plan details if user has a subscription
        if (userResponse.data.subscription) {
          const planResponse = await axios.get(
            `${API_URL}/plans/${userResponse.data.subscription}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setPlanDetails(planResponse.data);
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to fetch data');
        if (err.response?.status === 401) {
          handleLogout();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 0) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Profile
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar sx={{ width: 100, height: 100, mr: 3 }}>
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h5">{user.name}</Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {user.email}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                sx={{ mt: 1 }}
                onClick={() => navigate('/edit-profile')}
              >
                Edit Profile
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText primary="Name" secondary={user.name} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                  <ListItemText primary="Email" secondary={user.email} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PlanIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Current Plan" 
                    secondary={planDetails?.name || 'Free Plan'} 
                  />
                </ListItem>
              </List>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Plan Details
              </Typography>
              
              {planDetails ? (
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Plan Description" 
                      secondary={planDetails.description} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Price" 
                      secondary={`$${planDetails.price.toFixed(2)}/month`} 
                    />
                  </ListItem>
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No plan details available
                </Typography>
              )}
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Token Usage
          </Typography>
          
          {planDetails ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <ListItem>
                  <ListItemIcon>
                    <InputIcon />
                  </ListItemIcon>
                  <Box width="100%">
                    <Box display="flex" justifyContent="space-between">
                      <ListItemText 
                        primary="Input Tokens" 
                        secondary={`${user.input_tokens || 0} / ${planDetails.input_token_limit}`} 
                      />
                      <Chip 
                        label={
                          user.input_tokens > planDetails.input_token_limit ? 
                          'Limit Exceeded' : 'Within Limit'
                        }
                        color={
                          user.input_tokens > planDetails.input_token_limit ? 
                          'error' : 'success'
                        }
                        icon={
                          user.input_tokens > planDetails.input_token_limit ? 
                          <CloseIcon /> : <CheckIcon />
                        }
                        size="small"
                      />
                    </Box>
                    <Box mt={1}>
                      <Box 
                        bgcolor={
                          user.input_tokens > planDetails.input_token_limit ? 
                          'error.light' : 'primary.light'
                        }
                        height={8}
                        width={`${getUsagePercentage(
                          user.input_tokens, 
                          planDetails.input_token_limit
                        )}%`}
                        borderRadius={4}
                      />
                    </Box>
                  </Box>
                </ListItem>
              </Grid>

              <Grid item xs={12} md={6}>
                <ListItem>
                  <ListItemIcon>
                    <OutputIcon />
                  </ListItemIcon>
                  <Box width="100%">
                    <Box display="flex" justifyContent="space-between">
                      <ListItemText 
                        primary="Output Tokens" 
                        secondary={`${user.output_tokens || 0} / ${planDetails.output_token_limit}`} 
                      />
                      <Chip 
                        label={
                          user.output_tokens > planDetails.output_token_limit ? 
                          'Limit Exceeded' : 'Within Limit'
                        }
                        color={
                          user.output_tokens > planDetails.output_token_limit ? 
                          'error' : 'success'
                        }
                        icon={
                          user.output_tokens > planDetails.output_token_limit ? 
                          <CloseIcon /> : <CheckIcon />
                        }
                        size="small"
                      />
                    </Box>
                    <Box mt={1}>
                      <Box 
                        bgcolor={
                          user.output_tokens > planDetails.output_token_limit ? 
                          'error.light' : 'secondary.light'
                        }
                        height={8}
                        width={`${getUsagePercentage(
                          user.output_tokens, 
                          planDetails.output_token_limit
                        )}%`}
                        borderRadius={4}
                      />
                    </Box>
                  </Box>
                </ListItem>
              </Grid>
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No plan limits available
            </Typography>
          )}
        </Paper>

        <Box display="flex" justifyContent="space-between">
          <Button
            variant="contained"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Profile;