import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Stack,
    Chip,
    useTheme,
    useMediaQuery,
    IconButton,
    Tooltip,
    Snackbar,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Flag as FlagIcon,
    TrendingUp,
    Edit,
    Delete,
    Grid as GridIcon,
    Refresh,
} from '@mui/icons-material';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../services/api';

const GOAL_CATEGORIES = [
    { value: 'retirement', label: 'Retirement', icon: '🏖️', color: '#008577' },
    { value: 'education', label: 'Education', icon: '🎓', color: '#009688' },
    { value: 'house', label: 'House', icon: '🏠', color: '#4db6ac' },
    { value: 'car', label: 'Car', icon: '🚗', color: '#80cbc4' },
    { value: 'emergency', label: 'Emergency Fund', icon: '🚑', color: '#ffc107' },
    { value: 'wedding', label: 'Wedding', icon: '💒', color: '#ff9800' },
    { value: 'vacation', label: 'Vacation', icon: '✈️', color: '#03a9f4' },
    { value: 'other', label: 'Other', icon: '🎯', color: '#9c27b0' },
];

function Goals() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [goalToDelete, setGoalToDelete] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [formData, setFormData] = useState({
        name: '',
        targetAmount: '',
        targetDate: '',
        category: 'retirement',
    });

    useEffect(() => {
        fetchGoals();
    }, []);

    const fetchGoals = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            }
            const response = await getGoals();
            setGoals(response.data || []);
            setLoading(false);
            if (isRefresh) {
                setRefreshing(false);
                setSnackbar({ open: true, message: 'Goals refreshed successfully', severity: 'success' });
            }
        } catch (error) {
            console.error('Error fetching goals:', error);
            setLoading(false);
            setRefreshing(false);
            if (isRefresh) {
                setSnackbar({ open: true, message: 'Failed to refresh goals', severity: 'error' });
            }
        }
    };

    const handleRefresh = () => {
        fetchGoals(true);
    };

    const handleOpen = () => {
        setEditMode(false);
        setSelectedGoal(null);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditMode(false);
        setSelectedGoal(null);
        setFormData({
            name: '',
            targetAmount: '',
            targetDate: '',
            category: 'retirement',
        });
    };

    const handleEdit = (goal) => {
        setEditMode(true);
        setSelectedGoal(goal);
        setFormData({
            name: goal.name,
            targetAmount: goal.targetAmount.toString(),
            targetDate: goal.targetDate,
            category: goal.category,
        });
        setOpen(true);
    };

    const handleDeleteClick = (goal) => {
        setGoalToDelete(goal);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false);
        setGoalToDelete(null);
    };

    const handleDeleteConfirm = async () => {
        try {
            await deleteGoal(goalToDelete.id);
            setDeleteConfirmOpen(false);
            setGoalToDelete(null);
            setTimeout(() => {
                fetchGoals();
            }, 1000);
        } catch (error) {
            console.error('Error deleting goal:', error);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async () => {
        try {
            if (editMode && selectedGoal) {
                // Update existing goal
                await updateGoal(selectedGoal.id, {
                    ...formData,
                    targetAmount: parseFloat(formData.targetAmount),
                });
            } else {
                // Create new goal
                await createGoal({
                    ...formData,
                    targetAmount: parseFloat(formData.targetAmount),
                });
            }
            handleClose();
            // Delay to allow Google Sheets to sync
            setTimeout(() => {
                fetchGoals();
            }, 1000);
        } catch (error) {
            console.error('Error saving goal:', error);
        }
    };

    const getProgressColor = (progress) => {
        if (progress >= 75) return 'success';
        if (progress >= 25) return 'warning';
        return 'error';
    };

    const getIcon = (category) => {
        const cat = GOAL_CATEGORIES.find((c) => c.value === category);
        return cat ? cat.icon : '🎯';
    };

    const getCategoryColor = (category) => {
        const cat = GOAL_CATEGORIES.find((c) => c.value === category);
        return cat ? cat.color : theme.palette.primary.main;
    };

    return (
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
            {/* Header */}
            <Box mb={{ xs: 2, sm: 3, md: 4 }}>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    flexDirection={{ xs: 'column', sm: 'row' }}
                    gap={2}
                >
                    <Box>
                        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
                            Financial Goals
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                            Set and track your wealth objectives
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1} alignItems="center">
                        <Tooltip title="Refresh goals">
                            <IconButton
                                onClick={handleRefresh}
                                disabled={refreshing}
                                sx={{
                                    color: 'primary.main',
                                    '&:hover': { backgroundColor: 'primary.light' + '20' }
                                }}
                            >
                                <Refresh sx={{
                                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                                    '@keyframes spin': {
                                        '0%': { transform: 'rotate(0deg)' },
                                        '100%': { transform: 'rotate(360deg)' }
                                    }
                                }} />
                            </IconButton>
                        </Tooltip>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpen}
                            fullWidth={isMobile}
                        >
                            Add Goal
                        </Button>
                    </Box>
                </Box>
            </Box>

            {goals.length === 0 ? (
                <Card
                    elevation={0}
                    sx={{
                        textAlign: 'center',
                        py: 8,
                        border: 1,
                        borderColor: 'divider',
                        borderStyle: 'dashed',
                    }}
                >
                    <FlagIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No goals yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        Create your first financial goal to start tracking your progress
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
                        Add Your First Goal
                    </Button>
                </Card>
            ) : (
                <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                    {goals.map((goal) => {
                        const categoryColor = getCategoryColor(goal.category);
                        return (
                            <Grid item xs={12} sm={6} lg={4} key={goal.id}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        height: '100%',
                                        border: 1,
                                        borderColor: 'divider',
                                        position: 'relative',
                                        overflow: 'visible',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            borderColor: categoryColor,
                                            boxShadow: theme.shadows[2],
                                        },
                                    }}
                                    onClick={() => navigate(`/holdings?goal=${encodeURIComponent(goal.name)}`)}
                                >
                                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                        {/* Header */}
                                        <Box display="flex" alignItems="flex-start" mb={{ xs: 2, sm: 3 }}>
                                            <Box
                                                sx={{
                                                    width: { xs: 48, sm: 56 },
                                                    height: { xs: 48, sm: 56 },
                                                    borderRadius: 2,
                                                    backgroundColor: `${categoryColor}20`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: { xs: 24, sm: 28 },
                                                    mr: { xs: 1.5, sm: 2 },
                                                }}
                                            >
                                                {getIcon(goal.category)}
                                            </Box>
                                            <Box flex={1}>
                                                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" gutterBottom>
                                                    {goal.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                                    Target: {new Date(goal.targetDate).toLocaleDateString('en-IN', {
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Progress */}
                                        <Box mb={3}>
                                            <Box display="flex" justifyContent="space-between" mb={1.5}>
                                                <Typography variant="body2" fontWeight={500}>
                                                    Progress
                                                </Typography>
                                                <Chip
                                                    label={`${goal.progress.toFixed(2)}%`}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: `${categoryColor}20`,
                                                        color: categoryColor,
                                                        fontWeight: 700,
                                                    }}
                                                />
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={goal.progress}
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 5,
                                                    backgroundColor: `${categoryColor}15`,
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: categoryColor,
                                                        borderRadius: 5,
                                                    },
                                                }}
                                            />
                                        </Box>

                                        {/* Values */}
                                        <Stack spacing={2}>
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    backgroundColor: 'grey.50',
                                                    borderRadius: 2,
                                                    border: 1,
                                                    borderColor: 'divider',
                                                }}
                                            >
                                                <Grid container spacing={2}>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Current
                                                        </Typography>
                                                        <Typography variant="h6" fontWeight="bold">
                                                            ₹{(goal.value / 100000).toFixed(2)}L
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Target
                                                        </Typography>
                                                        <Typography variant="h6" fontWeight="bold">
                                                            ₹{(goal.targetAmount / 100000).toFixed(2)}L
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                            </Box>

                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Remaining
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        ₹{((goal.targetAmount - goal.value) / 100000).toFixed(2)}L
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                    <IconButton size="small" color="primary" onClick={() => handleEdit(goal)}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(goal)}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Add/Edit Goal Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Typography variant="h6" fontWeight="bold">
                        {editMode ? 'Edit Goal' : 'Add New Goal'}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                        <TextField
                            label="Goal Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            fullWidth
                            placeholder="e.g., Retirement Fund, House Down Payment"
                        />
                        <TextField
                            select
                            label="Category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            fullWidth
                        >
                            {GOAL_CATEGORIES.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Typography variant="h6">{option.icon}</Typography>
                                        <Typography>{option.label}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Target Amount (₹)"
                            name="targetAmount"
                            type="number"
                            value={formData.targetAmount}
                            onChange={handleChange}
                            fullWidth
                            helperText="Enter amount in rupees"
                        />
                        <TextField
                            label="Target Date"
                            name="targetDate"
                            type="date"
                            value={formData.targetDate}
                            onChange={handleChange}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                        <Card
                            sx={{
                                backgroundColor: 'primary.main',
                                color: 'white',
                            }}
                        >
                            <CardContent>
                                <Typography variant="body2" sx={{ opacity: 0.9 }} gutterBottom>
                                    Target Goal
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    ₹
                                    {formData.targetAmount
                                        ? parseFloat(formData.targetAmount).toLocaleString()
                                        : '0'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={handleClose} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editMode ? 'Update Goal' : 'Add Goal'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Goal?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this goal? This action cannot be undone.
                    </Typography>
                    {goalToDelete && (
                        <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
                            <Typography variant="body2" color="text.secondary">
                                {goalToDelete.name}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                                ₹{goalToDelete.targetAmount?.toLocaleString()}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default Goals;
