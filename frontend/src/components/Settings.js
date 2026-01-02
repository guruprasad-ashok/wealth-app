import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Alert,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    useTheme,
    useMediaQuery,
    CircularProgress,
} from '@mui/material';
import {
    CloudDone,
    CloudOff,
    Settings as SettingsIcon,
    CheckCircle,
    Error,
    Info,
    Refresh,
    Description,
    Key,
    Link as LinkIcon,
} from '@mui/icons-material';
import { getSettings } from '../services/api';

function Settings() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(true);
    const [sheetsStatus, setSheetsStatus] = useState(null);
    const [sheetName, setSheetName] = useState('WealthManagement');

    useEffect(() => {
        fetchSheetsStatus();
    }, []);

    const fetchSheetsStatus = async () => {
        try {
            const response = await getSettings();
            setSheetsStatus(response.data);
            if (response.data.sheetName) {
                setSheetName(response.data.sheetName);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching settings:', error);
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setLoading(true);
        fetchSheetsStatus();
    };

    const isConnected = sheetsStatus?.connected === true;

    return (
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
            {/* Header */}
            <Box mb={{ xs: 2, sm: 3, md: 4 }}>
                <Typography
                    variant={isMobile ? 'h5' : 'h4'}
                    fontWeight="bold"
                    gutterBottom
                >
                    Settings
                </Typography>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                >
                    Configure Google Sheets integration and app preferences
                </Typography>
            </Box>

            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                {/* Connection Status */}
                <Grid item xs={12} lg={6}>
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                    <SettingsIcon color="primary" sx={{ fontSize: 28 }} />
                                    <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold">
                                        Google Sheets Status
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    startIcon={<Refresh />}
                                    onClick={handleRefresh}
                                    disabled={loading}
                                >
                                    Refresh
                                </Button>
                            </Box>

                            {loading ? (
                                <Box display="flex" justifyContent="center" py={4}>
                                    <CircularProgress size={40} />
                                </Box>
                            ) : (
                                <>
                                    {/* Status Card */}
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2.5,
                                            mb: 3,
                                            backgroundColor: isConnected
                                                ? `${theme.palette.success.main}15`
                                                : `${theme.palette.warning.main}15`,
                                            borderRadius: 2,
                                            border: 1,
                                            borderColor: isConnected ? 'success.main' : 'warning.main',
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                                            {isConnected ? (
                                                <CloudDone sx={{ fontSize: 40, color: 'success.main' }} />
                                            ) : (
                                                <CloudOff sx={{ fontSize: 40, color: 'warning.main' }} />
                                            )}
                                            <Box>
                                                <Typography variant="h6" fontWeight="bold">
                                                    {isConnected ? 'Connected' : 'Not Connected'}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {isConnected
                                                        ? 'Using Google Sheets for data storage'
                                                        : 'Using mock data (local mode)'}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {sheetsStatus && (
                                            <Box>
                                                <Divider sx={{ my: 2 }} />
                                                <Grid container spacing={2}>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Mode
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {isConnected ? 'Google Sheets' : 'Mock Data'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Sheet Name
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {sheetsStatus.sheetName || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                                {sheetsStatus.message && (
                                                    <Alert severity={isConnected ? 'success' : 'info'} sx={{ mt: 2 }}>
                                                        {sheetsStatus.message}
                                                    </Alert>
                                                )}
                                            </Box>
                                        )}
                                    </Paper>

                                    {/* Current Configuration */}
                                    {!isConnected && (
                                        <Alert severity="warning" icon={<Info />}>
                                            <Typography variant="body2" fontWeight={600} gutterBottom>
                                                Google Sheets not configured
                                            </Typography>
                                            <Typography variant="caption">
                                                The app is running in mock mode with sample data. Follow the setup instructions to enable Google Sheets integration.
                                            </Typography>
                                        </Alert>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Setup Instructions */}
                <Grid item xs={12} lg={6}>
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', height: '100%' }}>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                                <Description color="primary" sx={{ fontSize: 28 }} />
                                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold">
                                    Setup Instructions
                                </Typography>
                            </Box>

                            <Typography variant="body2" color="text.secondary" mb={3}>
                                Follow these steps to connect your Google Sheets:
                            </Typography>

                            <List dense>
                                <ListItem sx={{ px: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Chip label="1" size="small" color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Create a Google Cloud Project"
                                        secondary="Visit console.cloud.google.com and create a new project"
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>

                                <ListItem sx={{ px: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Chip label="2" size="small" color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Enable Google Sheets API"
                                        secondary="Navigate to APIs & Services → Enable APIs"
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>

                                <ListItem sx={{ px: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Chip label="3" size="small" color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Create Service Account"
                                        secondary="Create credentials → Service Account → Download JSON key"
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>

                                <ListItem sx={{ px: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Chip label="4" size="small" color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Save credentials.json"
                                        secondary="Place the downloaded file in the /backend directory"
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>

                                <ListItem sx={{ px: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Chip label="5" size="small" color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Configure Sheet Name"
                                        secondary="Update SHEET_NAME in backend/.env file"
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>

                                <ListItem sx={{ px: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Chip label="6" size="small" color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Restart Backend Server"
                                        secondary="The app will automatically connect to Google Sheets"
                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>
                            </List>

                            <Alert severity="info" sx={{ mt: 3 }}>
                                <Typography variant="caption">
                                    <strong>Note:</strong> You'll need to share your Google Sheet with the service account email address from your credentials file.
                                </Typography>
                            </Alert>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Configuration Details */}
                <Grid item xs={12}>
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                                <Key color="primary" sx={{ fontSize: 28 }} />
                                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold">
                                    Environment Configuration
                                </Typography>
                            </Box>

                            <Typography variant="body2" color="text.secondary" mb={3}>
                                Current backend environment variables (read-only):
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            backgroundColor: 'grey.50',
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary">
                                            Sheet Name
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                            {sheetsStatus?.sheetName || 'Not configured'}
                                        </Typography>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            backgroundColor: 'grey.50',
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary">
                                            Credentials File
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                            {isConnected ? 'credentials.json' : 'Not found'}
                                        </Typography>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            backgroundColor: 'grey.50',
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary">
                                            Connection Status
                                        </Typography>
                                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                            {isConnected ? (
                                                <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                                            ) : (
                                                <Error sx={{ fontSize: 16, color: 'warning.main' }} />
                                            )}
                                            <Typography variant="body2" fontWeight={600}>
                                                {isConnected ? 'Active' : 'Inactive'}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            backgroundColor: 'grey.50',
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary">
                                            Data Mode
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                                            {isConnected ? 'Live Data' : 'Mock Data'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            <Box mt={3}>
                                <Alert severity="info" icon={<LinkIcon />}>
                                    <Typography variant="body2">
                                        <strong>Configuration file location:</strong>{' '}
                                        <code style={{ backgroundColor: theme.palette.grey[200], padding: '2px 6px', borderRadius: 4 }}>
                                            wealth-app/backend/.env
                                        </code>
                                    </Typography>
                                </Alert>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Quick Links */}
                <Grid item xs={12}>
                    <Card
                        elevation={0}
                        sx={{
                            border: 1,
                            borderColor: 'divider',
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}05 100%)`,
                        }}
                    >
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" gutterBottom>
                                Helpful Resources
                            </Typography>
                            <Grid container spacing={2} mt={1}>
                                <Grid item xs={12} sm={4}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        href="https://console.cloud.google.com"
                                        target="_blank"
                                        startIcon={<LinkIcon />}
                                    >
                                        Google Cloud Console
                                    </Button>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        href="https://developers.google.com/sheets/api"
                                        target="_blank"
                                        startIcon={<Description />}
                                    >
                                        Sheets API Docs
                                    </Button>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={handleRefresh}
                                        startIcon={<Refresh />}
                                    >
                                        Test Connection
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}

export default Settings;
