import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Box,
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Chip,
    useTheme,
    useMediaQuery,
    IconButton,
    Tooltip,
    Snackbar,
    Alert,
    TableSortLabel,
    Button
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';

import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Refresh,
    SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import { getPortfolioOverview, getPortfolioPerformance } from '../services/api';

const COLORS = ['#008577', '#009688', '#4db6ac', '#80cbc4', '#b2dfdb', '#e0f2f1'];

function Dashboard() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showXirrCurrent, setShowXirrCurrent] = useState(false);
    const [showXirrRealized, setShowXirrRealized] = useState(false);
    const [portfolio, setPortfolio] = useState(null);
    const [performance, setPerformance] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Sort State
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('value');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            }
            const [portfolioRes, performanceRes] = await Promise.all([
                getPortfolioOverview(),
                getPortfolioPerformance(),
            ]);
            setPortfolio(portfolioRes.data);
            setPerformance(performanceRes.data);
            setLoading(false);
            if (isRefresh) {
                setRefreshing(false);
                setSnackbar({ open: true, message: 'Data refreshed successfully', severity: 'success' });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
            setRefreshing(false);
            if (isRefresh) {
                setSnackbar({ open: true, message: 'Failed to refresh data', severity: 'error' });
            }
        }
    };

    const handleRefresh = () => {
        fetchData(true);
    };

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="60vh"
            >
                <CircularProgress size={60} />
            </Box>
        );
    }

    const totalPL = portfolio?.unrealizedPL + portfolio?.realizedPL;
    const plPercentage = ((totalPL / portfolio?.totalInvested) * 100).toFixed(2);
    const isProfit = totalPL >= 0;

    // Sorting Helpers
    function descendingComparator(a, b, orderBy) {
        // Handle calculated fields
        let valA = a[orderBy];
        let valB = b[orderBy];

        if (orderBy === 'unrealizedPL') {
            valA = a.value - a.invested;
            valB = b.value - b.invested;
        } else if (orderBy === 'totalGain') {
            valA = (a.value - a.invested) + (a.realizedPL || 0) + (a.dividends || 0);
            valB = (b.value - b.invested) + (b.realizedPL || 0) + (b.dividends || 0);
        }

        if (valB < valA) {
            return -1;
        }
        if (valB > valA) {
            return 1;
        }
        return 0;
    }

    function getComparator(order, orderBy) {
        return order === 'desc'
            ? (a, b) => descendingComparator(a, b, orderBy)
            : (a, b) => -descendingComparator(a, b, orderBy);
    }

    function stableSort(array, comparator) {
        const stabilizedThis = array.map((el, index) => [el, index]);
        stabilizedThis.sort((a, b) => {
            const order = comparator(a[0], b[0]);
            if (order !== 0) {
                return order;
            }
            return a[1] - b[1];
        });
        return stabilizedThis.map((el) => el[0]);
    }

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const createSortHandler = (property) => (event) => {
        handleRequestSort(property);
    };



    return (
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, mt: 4, mb: 4 }}>
            {/* Main Stats Grid */}
            <Grid container spacing={3}>
                {/* Left Column: Main Portfolio Card */}
                <Grid item xs={12} lg={8}>
                    <Card
                        elevation={0}
                        sx={{
                            background: '#FFF3E0', // Light Orange
                            border: 1,
                            borderColor: 'divider',
                            borderRight: '6px solid #E65100',
                            borderRadius: 2,
                            height: '100%',
                            overflow: 'visible',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                        }}
                    >
                        <CardContent sx={{ p: 2.5 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Box>
                                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                        <Typography variant="body2" color="text.secondary">
                                            Overall Portfolio Value
                                        </Typography>
                                        <Tooltip title="Refresh data">
                                            <IconButton
                                                size="small"
                                                onClick={handleRefresh}
                                                disabled={refreshing}
                                                sx={{ color: 'primary.main', p: 0.5 }}
                                            >
                                                <Refresh fontSize="small" sx={{
                                                    fontSize: '1rem',
                                                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                                                    '@keyframes spin': {
                                                        '0%': { transform: 'rotate(0deg)' },
                                                        '100%': { transform: 'rotate(360deg)' }
                                                    }
                                                }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                    <Typography variant={isMobile ? 'h4' : 'h3'} fontWeight="bold" color="text.primary">
                                        ₹{Math.round(portfolio?.totalValue || 0).toLocaleString('en-IN')}
                                    </Typography>
                                </Box>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    endIcon={<TrendingUpIcon sx={{ fontSize: '1rem !important' }} />}
                                    onClick={() => navigate('/holdings')}
                                    sx={{
                                        borderRadius: '50px',
                                        textTransform: 'uppercase',
                                        borderColor: '#F58220',
                                        color: '#F58220',
                                        fontWeight: 'bold',
                                        px: 2,
                                        py: 0.25,
                                        fontSize: '0.75rem',
                                        borderWidth: '1.5px',
                                        backgroundColor: 'rgba(255,255,255,0.5)',
                                        whiteSpace: 'nowrap',
                                        '&:hover': {
                                            borderWidth: '1.5px',
                                            backgroundColor: '#FFFFFF',
                                            borderColor: '#E65100'
                                        }
                                    }}
                                >
                                    VIEW PORTFOLIO
                                </Button>
                            </Box>

                            {/* Divider Area / Sub-stats */}
                            <Box
                                sx={{
                                    mt: 2,
                                    pt: 2,
                                    borderTop: 1,
                                    borderColor: 'divider',
                                    display: 'flex',
                                    flexDirection: { xs: 'column', md: 'row' },
                                    gap: { xs: 2, md: 6 }
                                }}
                            >
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                                        ₹{Math.round(portfolio?.totalInvested || 0).toLocaleString('en-IN')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Invested Value
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: portfolio?.unrealizedPL >= 0 ? 'success.main' : 'error.main' }}>
                                        ₹{portfolio?.unrealizedPL >= 0 ? '+' : ''}{Math.round(portfolio?.unrealizedPL || 0).toLocaleString('en-IN')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Unrealized Gain
                                    </Typography>
                                </Box>

                                <Box>
                                    <Box
                                        onClick={() => setShowXirrCurrent(!showXirrCurrent)}
                                        sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                                    >
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: (showXirrCurrent ? (portfolio?.xirr || 0) : parseFloat(plPercentage)) >= 0 ? 'success.main' : 'error.main' }}>
                                                {(showXirrCurrent ? (portfolio?.xirr || 0) : parseFloat(plPercentage)) >= 0 ? '+' : ''}
                                                {showXirrCurrent ? (portfolio?.xirr !== undefined ? portfolio?.xirr : '-') : plPercentage}%
                                            </Typography>
                                            {(showXirrCurrent ? (portfolio?.xirr || 0) : parseFloat(plPercentage)) >= 0 ?
                                                <TrendingUpIcon sx={{ fontSize: '1rem' }} color="success" /> :
                                                <TrendingDownIcon sx={{ fontSize: '1rem' }} color="error" />
                                            }
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <Typography variant="caption" color="text.secondary">
                                                {showXirrCurrent ? 'XIRR' : 'Returns'}
                                            </Typography>
                                            <SwapHorizIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Column: Key Performance Metrics (Realized) */}
                <Grid item xs={12} lg={4}>
                    <Card
                        elevation={0}
                        sx={{
                            background: '#FFF3E0', // Light Orange
                            border: 1,
                            borderColor: 'divider',
                            borderRight: '6px solid #E65100',
                            borderRadius: 2,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                        }}
                    >
                        <CardContent sx={{ p: 2.5 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 0.5 }}>
                                        Total Realized Gain
                                    </Typography>
                                    <Typography
                                        variant={isMobile ? 'h4' : 'h3'}
                                        fontWeight="bold"
                                        sx={{
                                            color: ((portfolio?.realizedPL || 0) + (portfolio?.dividends || 0)) >= 0 ? 'success.main' : 'error.main'
                                        }}
                                    >
                                        ₹{Math.round((portfolio?.realizedPL || 0) + (portfolio?.dividends || 0)).toLocaleString('en-IN')}
                                    </Typography>
                                </Box>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    endIcon={<TrendingUpIcon sx={{ fontSize: '1rem !important' }} />}
                                    onClick={() => navigate('/holdings?type=realized')}
                                    sx={{
                                        borderRadius: '50px',
                                        textTransform: 'uppercase',
                                        borderColor: '#F58220',
                                        color: '#F58220',
                                        fontWeight: 'bold',
                                        px: 2,
                                        py: 0.25,
                                        fontSize: '0.75rem',
                                        borderWidth: '1.5px',
                                        backgroundColor: 'rgba(255,255,255,0.5)',
                                        whiteSpace: 'nowrap',
                                        '&:hover': {
                                            borderWidth: '1.5px',
                                            backgroundColor: '#FFFFFF',
                                            borderColor: '#E65100'
                                        }
                                    }}
                                >
                                    View Details
                                </Button>
                            </Box>

                            <Box
                                sx={{
                                    mt: 2,
                                    pt: 2,
                                    borderTop: 1,
                                    borderColor: 'divider',
                                    display: 'flex',
                                    gap: 4
                                }}
                            >
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Capital Gains
                                    </Typography>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        ₹{Math.round(portfolio?.realizedPL || 0).toLocaleString('en-IN')}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Dividends
                                    </Typography>
                                    <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                                        ₹{Math.round(portfolio?.dividends || 0).toLocaleString('en-IN')}
                                    </Typography>
                                </Box>

                                <Box
                                    onClick={() => setShowXirrRealized(!showXirrRealized)}
                                    sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                                >
                                    {(() => {
                                        const realizedAbsReturn = portfolio?.realizedInvested ? ((portfolio?.realizedPL || 0) / portfolio?.realizedInvested * 100).toFixed(2) : '0.00';
                                        const displayValue = showXirrRealized ? (portfolio?.realizedXirr !== undefined ? portfolio?.realizedXirr : '-') : realizedAbsReturn;
                                        const isPositive = parseFloat(displayValue === '-' ? 0 : displayValue) >= 0;

                                        return (
                                            <>
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {showXirrRealized ? 'XIRR' : 'Returns'}
                                                    </Typography>
                                                    <SwapHorizIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                                                </Box>
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: isPositive ? 'success.main' : 'error.main' }}>
                                                        {isPositive && displayValue !== '-' ? '+' : ''}{displayValue}%
                                                    </Typography>
                                                    {isPositive ?
                                                        <TrendingUpIcon sx={{ fontSize: '1rem' }} color="success" /> :
                                                        <TrendingDownIcon sx={{ fontSize: '1rem' }} color="error" />
                                                    }
                                                </Box>
                                            </>
                                        );
                                    })()}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Asset Class View Table */}
                <Grid item xs={12}>
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" fontWeight="bold">
                                    Asset Class View
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Detailed breakdown of your portfolio performance
                                </Typography>
                            </Box>

                            <TableContainer>
                                <Table sx={{ minWidth: 800 }}>
                                    <TableHead>
                                        <TableRow sx={{
                                            // Minimalistic Header: White bg, Orange bottom border
                                            borderBottom: `2px solid ${theme.palette.primary.main}40`,
                                        }}>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem' }}>
                                                <TableSortLabel
                                                    active={orderBy === 'name'}
                                                    direction={orderBy === 'name' ? order : 'asc'}
                                                    onClick={createSortHandler('name')}
                                                >
                                                    Asset Class
                                                    {orderBy === 'name' ? (
                                                        <Box component="span" sx={visuallyHidden}>
                                                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                        </Box>
                                                    ) : null}
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem' }}>
                                                <TableSortLabel
                                                    active={orderBy === 'invested'}
                                                    direction={orderBy === 'invested' ? order : 'asc'}
                                                    onClick={createSortHandler('invested')}
                                                >
                                                    Investment<br />Weight
                                                    {orderBy === 'invested' ? (
                                                        <Box component="span" sx={visuallyHidden}>
                                                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                        </Box>
                                                    ) : null}
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem' }}>
                                                <TableSortLabel
                                                    active={orderBy === 'value'}
                                                    direction={orderBy === 'value' ? order : 'asc'}
                                                    onClick={createSortHandler('value')}
                                                >
                                                    Current Value<br />Weight
                                                    {orderBy === 'value' ? (
                                                        <Box component="span" sx={visuallyHidden}>
                                                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                        </Box>
                                                    ) : null}
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem' }}>
                                                Day's Gain<br />% Change
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem' }}>
                                                <TableSortLabel
                                                    active={orderBy === 'unrealizedPL'}
                                                    direction={orderBy === 'unrealizedPL' ? order : 'asc'}
                                                    onClick={createSortHandler('unrealizedPL')}
                                                >
                                                    Unrealized<br />Returns
                                                    {orderBy === 'unrealizedPL' ? (
                                                        <Box component="span" sx={visuallyHidden}>
                                                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                        </Box>
                                                    ) : null}
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem' }}>
                                                <TableSortLabel
                                                    active={orderBy === 'realizedPL'}
                                                    direction={orderBy === 'realizedPL' ? order : 'asc'}
                                                    onClick={createSortHandler('realizedPL')}
                                                >
                                                    Realized P/L
                                                    {orderBy === 'realizedPL' ? (
                                                        <Box component="span" sx={visuallyHidden}>
                                                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                        </Box>
                                                    ) : null}
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem' }}>
                                                <TableSortLabel
                                                    active={orderBy === 'dividends'}
                                                    direction={orderBy === 'dividends' ? order : 'asc'}
                                                    onClick={createSortHandler('dividends')}
                                                >
                                                    Dividends
                                                    {orderBy === 'dividends' ? (
                                                        <Box component="span" sx={visuallyHidden}>
                                                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                        </Box>
                                                    ) : null}
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem' }}>
                                                <TableSortLabel
                                                    active={orderBy === 'totalGain'}
                                                    direction={orderBy === 'totalGain' ? order : 'asc'}
                                                    onClick={createSortHandler('totalGain')}
                                                >
                                                    Total Gain
                                                    {orderBy === 'totalGain' ? (
                                                        <Box component="span" sx={visuallyHidden}>
                                                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                        </Box>
                                                    ) : null}
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem' }}>
                                                <TableSortLabel
                                                    active={orderBy === 'xirr'}
                                                    direction={orderBy === 'xirr' ? order : 'asc'}
                                                    onClick={createSortHandler('xirr')}
                                                >
                                                    XIRR %
                                                    {orderBy === 'xirr' ? (
                                                        <Box component="span" sx={visuallyHidden}>
                                                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                        </Box>
                                                    ) : null}
                                                </TableSortLabel>
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stableSort(portfolio?.assetBreakdown || [], getComparator(order, orderBy)).map((asset, index) => {
                                            const totalGain = (asset.value - asset.invested) + (asset.realizedPL || 0) + (asset.dividends || 0);
                                            // Enrich asset object for sorting dynamically if needed, but here we can just use the comparator logic
                                            // logic needs to compute totalGain inside comparator or map first.
                                            // Better approach: mapping first is cleaner but here data is inside render.
                                            // Let's create a pre-computed list for sorting.

                                            // ... logic moved to before return

                                            const unrealizedGain = asset.value - asset.invested;
                                            const unrealizedGainPercentage = asset.invested > 0 ? (unrealizedGain / asset.invested * 100) : 0;

                                            // Mock today's gain for now as backend doesn't provide it per asset class yet
                                            const todayGain = 0;
                                            const todayGainPercentage = 0;

                                            return (
                                                <TableRow
                                                    key={asset.name}
                                                    hover
                                                    sx={{ '&:last-child td': { border: 0 } }}
                                                >
                                                    <TableCell>
                                                        <Box display="flex" alignItems="center" gap={1.5}>
                                                            <Box
                                                                sx={{
                                                                    width: 12,
                                                                    height: 12,
                                                                    borderRadius: 1,
                                                                    backgroundColor: COLORS[index % COLORS.length],
                                                                }}
                                                            />
                                                            <Box>
                                                                <Link
                                                                    to={`/holdings?assetClass=${encodeURIComponent(asset.name)}`}
                                                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                                                >
                                                                    <Typography
                                                                        variant="body2"
                                                                        fontWeight={700}
                                                                        sx={{
                                                                            fontSize: '0.95rem',
                                                                            '&:hover': { color: theme.palette.primary.main, textDecoration: 'underline' }
                                                                        }}
                                                                    >
                                                                        {asset.name}
                                                                    </Typography>
                                                                </Link>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2">₹{(asset.invested || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{((asset.invested / (portfolio.totalInvested || 1)) * 100).toFixed(1)}%</Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2">₹{(asset.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{((asset.value / (portfolio.totalValue || 1)) * 100).toFixed(1)}%</Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" sx={{ color: todayGain >= 0 ? 'success.main' : 'error.main' }}>
                                                            {todayGain.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' })}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: todayGain >= 0 ? 'success.main' : 'error.main' }}>
                                                            {todayGainPercentage.toFixed(2)}%
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" sx={{ color: unrealizedGain >= 0 ? 'success.main' : 'error.main' }}>
                                                            {unrealizedGain.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: unrealizedGain >= 0 ? 'success.main' : 'error.main' }}>
                                                            {unrealizedGainPercentage.toFixed(2)}%
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" sx={{ color: (asset.realizedPL || 0) >= 0 ? 'success.main' : 'error.main' }}>
                                                            {(asset.realizedPL || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2">
                                                            {(asset.dividends || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" fontWeight={600} sx={{ color: totalGain >= 0 ? 'success.main' : 'error.main' }}>
                                                            {totalGain.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" fontWeight={600} sx={{ color: (asset.xirr || 0) >= 0 ? 'success.main' : 'error.main' }}>
                                                            {asset.xirr !== null && asset.xirr !== undefined ? `${asset.xirr.toFixed(2)}%` : '-'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

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

export default Dashboard;
