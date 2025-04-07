import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  TablePagination,
  CircularProgress,
  Chip,
  Avatar,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Drawer,
  ListItemButton,
  ListItemIcon,
  Card,
  CardContent,
  Grid,
  TextField
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  Equalizer as LimitsIcon,
  ModelTraining as ModelUsageIcon,
  Settings as SettingsIcon,
  History as LogsIcon,
  Info as AboutIcon
} from '@mui/icons-material';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import DatePicker from 'react-datepicker';

const drawerWidth = 240;

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);
  const [filterModel, setFilterModel] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [models, setModels] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('logs');
  const [limitsData, setLimitsData] = useState(null);
  const [tokenUsageData, setTokenUsageData] = useState([]);
  const [apiCallData, setApiCallData] = useState([]);
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [modelFilter, setModelFilter] = useState('all');

  const [chartData, setChartData] = useState([]);
  const [apiCallChartData, setApiCallChartData] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [dateRange, setDateRange] = useState('all'); // 'all', 'month', 'week', 'custom'

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('token');
        const userResponse = await axios.get(`http://localhost:8000/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userResponse.data);
        
        await fetchModels(userResponse.data.email);
        await fetchLogs(userResponse.data.email);
        await fetchLimitsData(userResponse.data.email);
        await fetchAllAnalyticsData(userResponse.data.email); // Fetch all data initially
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch all analytics data without date filtering
  const fetchAllAnalyticsData = async (userEmail) => {
    try {
      setLoading(true);
      
      // Get earliest log date
      const earliestLog = await axios.get(`http://127.0.0.1:8000/api/logs/`, {
        params: {
          email: userEmail,
          limit: 1,
          skip: 0,
          sort: 'timestamp:asc'
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const startDate = earliestLog.data.length > 0 ? 
        new Date(earliestLog.data[0].timestamp) : 
        subDays(new Date(), 30);

      // Fetch token usage by model for all time
      const tokenResponse = await axios.get('http://127.0.0.1:8000/api/logs/token-usage', {
        params: {
          email: userEmail,
          start_date: startDate.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Format token data for charts
      const formattedTokenData = tokenResponse.data.map(item => ({
        date: item.date,
        ...item.models.reduce((acc, model) => {
          acc[model.name] = model.total_tokens;
          return acc;
        }, {})
      }));
      
      setTokenUsageData(formattedTokenData);
      setChartData(formattedTokenData);
      setSelectedModels(models); // Select all models by default

      // Fetch API call counts for all time
      const callsResponse = await axios.get('http://127.0.0.1:8000/api/logs/api-calls', {
        params: {
          email: userEmail,
          start_date: startDate.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setApiCallData(callsResponse.data);
      setApiCallChartData(callsResponse.data);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    let newStartDate = new Date();
    
    switch(range) {
      case 'week':
        newStartDate = subDays(new Date(), 7);
        break;
      case 'month':
        newStartDate = subDays(new Date(), 30);
        break;
      case 'custom':
        // Will use the manually selected dates
        return;
      default: // 'all'
        fetchAllAnalyticsData(user.email);
        return;
    }
    
    setStartDate(newStartDate);
    setEndDate(new Date());
    fetchAnalyticsData(user.email, newStartDate, new Date());
  };

  // Update Model Usage view
  const renderModelUsageView = () => {
    // Get unique model names from the data
    const availableModels = Array.from(
      new Set(
        tokenUsageData.flatMap(item => 
          item.models ? item.models.map(m => m.name) : []
        )
      )
    );

    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>Model Usage Analytics</Typography>
        
        {/* Date Range Selector */}
        <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant={dateRange === 'all' ? 'contained' : 'outlined'}
            onClick={() => handleDateRangeChange('all')}
          >
            All Time
          </Button>
          <Button
            variant={dateRange === 'month' ? 'contained' : 'outlined'}
            onClick={() => handleDateRangeChange('month')}
          >
            Last 30 Days
          </Button>
          <Button
            variant={dateRange === 'week' ? 'contained' : 'outlined'}
            onClick={() => handleDateRangeChange('week')}
          >
            Last 7 Days
          </Button>
          <Button
            variant={dateRange === 'custom' ? 'contained' : 'outlined'}
            onClick={() => handleDateRangeChange('custom')}
          >
            Custom Range
          </Button>

          {dateRange === 'custom' && (
            <>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Start Date"
                className="date-picker"
              />
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                placeholderText="End Date"
                className="date-picker"
              />
              <Button 
                variant="contained" 
                onClick={() => fetchAnalyticsData(user.email, startDate, endDate)}
                disabled={loading}
              >
                Apply
              </Button>
            </>
          )}
        </Box>

        {/* Model Selector */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>Select Models to Display</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {models.map((model) => (
              <Chip
                key={model}
                label={model}
                color={selectedModels.includes(model) ? 'primary' : 'default'}
                onClick={() => {
                  setSelectedModels(prev =>
                    prev.includes(model)
                      ? prev.filter(m => m !== model)
                      : [...prev, model]
                  );
                }}
                variant={selectedModels.includes(model) ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>

        {/* Token Usage Chart */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Token Usage Over Time
            </Typography>
            <Box sx={{ height: 400 }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis label={{ value: 'Tokens', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value, name) => [`${value} tokens`, name]}
                      labelFormatter={(date) => `Date: ${format(new Date(date), 'PP')}`}
                    />
                    <Legend />
                    {selectedModels.map((model) => {
                      const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
                      return (
                        <Line
                          key={model}
                          type="monotone"
                          dataKey={model}
                          stroke={color}
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                          dot={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography>No data available</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* API Calls Chart */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              API Calls Over Time
            </Typography>
            <Box sx={{ height: 400 }}>
              {apiCallChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={apiCallChartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis label={{ value: 'API Calls', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value) => [`${value} calls`, 'API Calls']}
                      labelFormatter={(date) => `Date: ${format(new Date(date), 'PP')}`}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography>No data available</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Fetch logs from backend with filtering
  const fetchLogs = async (userEmail) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://127.0.0.1:8000/api/logs/`, {
        params: {
          email: userEmail,
          model: filterModel !== 'all' ? filterModel : undefined,
          limit: rowsPerPage,
          skip: page * rowsPerPage
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setLogs(response.data);
      setTotalLogs(response.headers['x-total-count'] || response.data.length);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available models for the user
  const fetchModels = async (userEmail) => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/logs/models', {
        params: { email: userEmail },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setModels(response.data);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  // Fetch limits data
  const fetchLimitsData = async (userEmail) => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/logs/usage-stats', {
        params: { email: userEmail },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setLimitsData(response.data);
    } catch (error) {
      console.error('Error fetching limits data:', error);
    }
  };

  // Fetch analytics data (token usage and API calls)
  const fetchAnalyticsData = async (userEmail) => {
    try {
      setLoading(true);
      
      // Fetch token usage by model
      const tokenResponse = await axios.get('http://127.0.0.1:8000/api/logs/token-usage', {
        params: {
          email: userEmail,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          model: modelFilter !== 'all' ? modelFilter : undefined
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Format token data for charts
      const formattedTokenData = tokenResponse.data.map(item => ({
        date: item.date,
        ...item.models.reduce((acc, model) => {
          acc[model.name] = model.total_tokens;
          return acc;
        }, {})
      }));
      
      setTokenUsageData(formattedTokenData);

      // Fetch API call counts
      const callsResponse = await axios.get('http://127.0.0.1:8000/api/logs/api-calls', {
        params: {
          email: userEmail,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          model: modelFilter !== 'all' ? modelFilter : undefined
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setApiCallData(callsResponse.data);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when view changes
  useEffect(() => {
    if (user?.email) {
      if (activeView === 'logs') {
        fetchLogs(user.email);
      } else if (activeView === 'modelUsage') {
        fetchAnalyticsData(user.email);
      } else if (activeView === 'limits') {
        fetchLimitsData(user.email);
      }
    }
  }, [page, rowsPerPage, filterModel, activeView, startDate, endDate, modelFilter]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleRefresh = () => {
    if (user?.email) {
      fetchLogs(user.email);
    }
  };

  const getStatusColor = (statusCode) => {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 400 && statusCode < 500) return 'warning';
    if (statusCode >= 500) return 'error';
    return 'info';
  };

  const formatTimestamp = (timestamp) => {
    try {
      return format(new Date(timestamp), 'PPpp');
    } catch {
      return timestamp;
    }
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'limits':
        return (
          <Paper elevation={0} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Usage Limits</Typography>
            {limitsData ? (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Total Tokens Used: {limitsData.total_tokens}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Total API Calls: {limitsData.total_calls}
                </Typography>
                <Typography variant="h6" sx={{ mt: 2 }}>Usage by Model:</Typography>
                {limitsData.models.map((model) => (
                  <Box key={model.name} sx={{ mb: 1 }}>
                    <Typography variant="body1">
                      {model.name}: {model.usage} tokens ({model.percentage}%)
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <CircularProgress />
            )}
          </Paper>
        );
      case 'modelUsage':
        return renderModelUsageView();
      case 'about':
        return (
          <Paper elevation={0} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>About</Typography>
            <Typography variant="body1">
              This is the LLM Playground interface. You can interact with various language models,
              view your usage statistics, and monitor your API logs.
            </Typography>
          </Paper>
        );
      case 'logs':
      default:
        return (
          <>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : logs.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6">No logs found</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {filterModel !== 'all' 
                    ? `No logs found for model: ${filterModel}`
                    : 'Your LLM interaction logs will appear here'}
                </Typography>
              </Paper>
            ) : (
              <Paper elevation={0} sx={{ p: 1 }}>
                <List sx={{ width: '100%' }}>
                  {logs.map((log, index) => (
                    <React.Fragment key={log.id || index}>
                      <ListItem alignItems="flex-start">
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Chip
                                label={`${log.response_code}`}
                                size="small"
                                color={getStatusColor(log.response_code)}
                                sx={{ mr: 1 }}
                              />
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mr: 2 }}>
                                {log.model}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatTimestamp(log.timestamp)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <>
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                <Chip
                                  avatar={<Avatar>IN</Avatar>}
                                  label={`${log.input_tokens} tokens`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mr: 1 }}
                                />
                                <Chip
                                  avatar={<Avatar>OUT</Avatar>}
                                  label={`${log.output_tokens} tokens`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mr: 1 }}
                                />
                                {log.additional_info?.latency && (
                                  <Chip
                                    label={`${log.additional_info.latency.toFixed(2)}s`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                              {log.additional_info && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                  Params: Temp {log.additional_info.temperature}, Top-p {log.additional_info.top_p}, Top-k {log.additional_info.top_k}
                                </Typography>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                      {index < logs.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
                </List>
                <TablePagination
                  component="div"
                  count={totalLogs}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              </Paper>
            )}
          </>
        );
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Permanent Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
            backgroundColor: 'background.paper'
          },
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton 
                selected={activeView === 'logs'}
                onClick={() => setActiveView('logs')}
              >
                <ListItemIcon>
                  <LogsIcon />
                </ListItemIcon>
                <ListItemText primary="API Logs" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton 
                selected={activeView === 'limits'}
                onClick={() => setActiveView('limits')}
              >
                <ListItemIcon>
                  <LimitsIcon />
                </ListItemIcon>
                <ListItemText primary="Usage Limits" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton 
                selected={activeView === 'modelUsage'}
                onClick={() => setActiveView('modelUsage')}
              >
                <ListItemIcon>
                  <ModelUsageIcon />
                </ListItemIcon>
                <ListItemText primary="Model Usage" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton 
                selected={activeView === 'about'}
                onClick={() => setActiveView('about')}
              >
                <ListItemIcon>
                  <AboutIcon />
                </ListItemIcon>
                <ListItemText primary="About" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* App Bar */}
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton component={Link} to="/chat" edge="start" color="inherit">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {activeView === 'logs' && 'LLM Interaction Logs'}
              {activeView === 'limits' && 'Usage Limits'}
              {activeView === 'modelUsage' && 'Model Usage Statistics'}
              {activeView === 'about' && 'About'}
            </Typography>
            {activeView === 'logs' && (
              <>
                <IconButton onClick={handleRefresh} color="inherit">
                  <RefreshIcon />
                </IconButton>
                <IconButton onClick={handleFilterClick} color="inherit">
                  <FilterIcon />
                </IconButton>
              </>
            )}
          </Toolbar>
        </AppBar>

        {/* Filter Menu (for logs view) */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleFilterClose}
          PaperProps={{
            sx: {
              width: 300,
              p: 2
            }
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Filter Logs
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Model</InputLabel>
            <Select
              value={filterModel}
              label="Model"
              onChange={(e) => setFilterModel(e.target.value)}
            >
              <MenuItem value="all">All Models</MenuItem>
              {models.map((model) => (
                <MenuItem key={model} value={model}>
                  {model}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              setPage(0);
              handleFilterClose();
            }}
          >
            Apply Filters
          </Button>
        </Menu>

        {/* Content Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 2,
          mt: 8 // Account for AppBar height
        }}>
          {renderMainContent()}
        </Box>
      </Box>
    </Box>
  );
};

export default LogsPage;