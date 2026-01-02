import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
    Box,
    Container,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Card,
    CardContent,
    Chip,
    useTheme,
    useMediaQuery,
    CircularProgress,
    Stack,
    IconButton,
    Grid,
    TableSortLabel
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { getHoldings } from '../services/api';

function Holdings() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const assetClass = searchParams.get('assetClass');
    const goal = searchParams.get('goal');
    const type = searchParams.get('type');
    const isRealized = type === 'realized';

    // Sort State
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('security');

    const [holdings, setHoldings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHoldings = async () => {
            try {
                setLoading(true);
                const response = await getHoldings(assetClass, goal, type);
                setHoldings(response.data.holdings || []);
            } catch (error) {
                console.error('Error fetching holdings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHoldings();
    }, [assetClass, goal, type]);

    const handleRowClick = (security, assetName) => {
        const viewType = isRealized ? 'realized' : 'unrealized';
        navigate(`/transactions?assetClass=${encodeURIComponent(assetName)}&security=${encodeURIComponent(security)}&type=${viewType}`);
    };

    // Group holdings by Asset Class
    const groupedHoldings = holdings.reduce((acc, holding) => {
        const type = holding.assetClass || 'Other';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(holding);
        return acc;
    }, {});

    // Format helpers
    const formatCurrency = (value) => {
        return `₹${(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatUnits = (value) => {
        return (value || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    const getTitle = () => {
        if (isRealized) return 'Realized Holdings (Profit/Loss)';
        if (goal) return `Holdings for ${goal}`;
        if (assetClass) return `${assetClass} Holdings`;
        return 'Portfolio Holdings';
    };

    const getSubtitle = () => {
        if (isRealized) return 'View your closed positions and realized gains/losses';
        if (goal) return `Detailed view of investments allocated to ${goal}`;
        if (assetClass) return `Detailed view of your ${assetClass} investments`;
        return 'Detailed view of your investments grouped by asset class';
    };

    // Sorting Helpers
    function descendingComparator(a, b, orderBy) {
        if (b[orderBy] < a[orderBy]) {
            return -1;
        }
        if (b[orderBy] > a[orderBy]) {
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

    const StatCard = ({ title, value, subtitle, color = '#2196f3' }) => (
        <Card
            elevation={0}
            sx={{
                height: '100%',
                background: '#ffffff',
                border: 1,
                borderColor: 'divider',
                borderLeft: `4px solid ${color}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
                    {title}
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: 'text.primary', mb: 0.5 }}>
                    {value}
                </Typography>
                {subtitle && (
                    <Typography variant="caption" sx={{ color: color, fontWeight: 500 }}>
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );

    // Calculate summaries for header tiles
    const summaryTiles = Object.keys(groupedHoldings).map(groupName => {
        const groupItems = groupedHoldings[groupName];
        let totalValue = 0;
        let totalInvested = 0;
        let totalRealizedPL = 0;

        groupItems.forEach(item => {
            if (isRealized) {
                totalRealizedPL += (item.realizedPL || 0);
            } else {
                totalValue += (item.currentValue || 0);
                totalInvested += (item.invested || 0);
            }
        });

        const totalUnrealizedPL = totalValue - totalInvested;
        const totalUnrealizedPLPercent = totalInvested > 0 ? (totalUnrealizedPL / totalInvested) * 100 : 0;

        let isPositive;
        if (isRealized) {
            isPositive = totalRealizedPL >= 0;
        } else {
            isPositive = totalUnrealizedPL >= 0;
        }

        let subtitleText;
        if (isRealized) {
            subtitleText = isPositive ? 'Profit' : 'Loss';
        } else {
            const sign = totalUnrealizedPL >= 0 ? '+' : '';
            subtitleText = `${sign}₹${Math.abs(totalUnrealizedPL).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${sign}${totalUnrealizedPLPercent.toFixed(2)}%)`;
        }

        return {
            title: isRealized ? `${groupName} Realized P/L` : `${groupName} Value`,
            value: isRealized ?
                `₹${totalRealizedPL.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` :
                `₹${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            color: isPositive ? '#2e7d32' : '#d32f2f', // Green/Red based on PL
            subtitle: subtitleText
        };
    });

    return (
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
            {/* Header */}
            <Box mb={{ xs: 2, sm: 3, md: 4 }}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/')}
                        color="inherit"
                    >
                        Back
                    </Button>
                </Box>
                <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
                    {getTitle()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {getSubtitle()}
                </Typography>
            </Box>

            {/* Summary Tiles */}
            {summaryTiles.length > 0 && (
                <Grid container spacing={2} columns={{ xs: 12, sm: 12, md: 10 }} sx={{ mb: 4 }}>
                    {summaryTiles.map((tile) => (
                        <Grid item xs={12} sm={6} md={2} key={tile.title}>
                            <StatCard
                                title={tile.title}
                                value={tile.value}
                                subtitle={tile.subtitle}
                                color={tile.color}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}

            <Stack spacing={4}>
                {Object.keys(groupedHoldings).length === 0 ? (
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', py: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            {isRealized ? 'No realized profit/loss found.' : 'No active holdings found.'}
                        </Typography>
                    </Card>
                ) : (
                    Object.keys(groupedHoldings).sort().map((assetClass) => (
                        <Card key={assetClass} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                            <CardContent sx={{ pb: 0 }}>
                                <Typography variant="h6" fontWeight="bold" color="primary">
                                    {assetClass}
                                </Typography>
                            </CardContent>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{
                                            borderBottom: `2px solid ${theme.palette.primary.main}40`,
                                        }}>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                                <TableSortLabel
                                                    active={orderBy === 'security'}
                                                    direction={orderBy === 'security' ? order : 'asc'}
                                                    onClick={createSortHandler('security')}
                                                >
                                                    Security Name
                                                    {orderBy === 'security' ? (
                                                        <Box component="span" sx={visuallyHidden}>
                                                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                        </Box>
                                                    ) : null}
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                <TableSortLabel
                                                    active={orderBy === 'units'}
                                                    direction={orderBy === 'units' ? order : 'asc'}
                                                    onClick={createSortHandler('units')}
                                                >
                                                    {isRealized ? 'Sold Units' : 'Units'}
                                                    {orderBy === 'units' ? (
                                                        <Box component="span" sx={visuallyHidden}>
                                                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                        </Box>
                                                    ) : null}
                                                </TableSortLabel>
                                            </TableCell>
                                            {!isRealized && (
                                                <>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                        <TableSortLabel
                                                            active={orderBy === 'invested'}
                                                            direction={orderBy === 'invested' ? order : 'asc'}
                                                            onClick={createSortHandler('invested')}
                                                        >
                                                            Invested Value
                                                            {orderBy === 'invested' ? (
                                                                <Box component="span" sx={visuallyHidden}>
                                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                                </Box>
                                                            ) : null}
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                        <TableSortLabel
                                                            active={orderBy === 'currentValue'}
                                                            direction={orderBy === 'currentValue' ? order : 'asc'}
                                                            onClick={createSortHandler('currentValue')}
                                                        >
                                                            Current Value
                                                            {orderBy === 'currentValue' ? (
                                                                <Box component="span" sx={visuallyHidden}>
                                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                                </Box>
                                                            ) : null}
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                        <TableSortLabel
                                                            active={orderBy === 'unrealizedPL'}
                                                            direction={orderBy === 'unrealizedPL' ? order : 'asc'}
                                                            onClick={createSortHandler('unrealizedPL')}
                                                        >
                                                            Unrealized Gains
                                                            {orderBy === 'unrealizedPL' ? (
                                                                <Box component="span" sx={visuallyHidden}>
                                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                                </Box>
                                                            ) : null}
                                                        </TableSortLabel>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                        <TableSortLabel
                                                            active={orderBy === 'xirr'}
                                                            direction={orderBy === 'xirr' ? order : 'asc'}
                                                            onClick={createSortHandler('xirr')}
                                                        >
                                                            XIRR
                                                            {orderBy === 'xirr' ? (
                                                                <Box component="span" sx={visuallyHidden}>
                                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                                </Box>
                                                            ) : null}
                                                        </TableSortLabel>
                                                    </TableCell>
                                                </>
                                            )}
                                            {isRealized && (
                                                <>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
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
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
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
                                                </>
                                            )}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stableSort(groupedHoldings[assetClass], getComparator(order, orderBy)).map((holding) => (
                                            <TableRow
                                                key={holding.security}
                                                hover
                                                onClick={() => handleRowClick(holding.security, assetClass)}
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {holding.security}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">
                                                        {formatUnits(holding.units)}
                                                    </Typography>
                                                </TableCell>
                                                {!isRealized && (
                                                    <>
                                                        <TableCell align="right">
                                                            <Typography variant="body2">
                                                                {formatCurrency(holding.invested)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight={600}>
                                                                {formatCurrency(holding.currentValue)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography
                                                                variant="body2"
                                                                fontWeight={600}
                                                                color={holding.unrealizedPL >= 0 ? 'success.main' : 'error.main'}
                                                            >
                                                                {formatCurrency(holding.unrealizedPL)}
                                                            </Typography>
                                                            <Typography variant="caption" color={holding.unrealizedPL >= 0 ? 'success.main' : 'error.main'}>
                                                                {holding.unrealizedPLPercent.toFixed(2)}%
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {holding.xirr !== null ? (
                                                                <Chip
                                                                    label={`${holding.xirr}%`}
                                                                    size="small"
                                                                    color={holding.xirr >= 0 ? 'success' : 'error'}
                                                                    variant="outlined"
                                                                />
                                                            ) : (
                                                                <Typography variant="caption" color="text.secondary">N/A</Typography>
                                                            )}
                                                        </TableCell>
                                                    </>
                                                )}
                                                {isRealized && (
                                                    <>
                                                        <TableCell align="right">
                                                            <Typography
                                                                variant="body2"
                                                                fontWeight={600}
                                                                color={holding.realizedPL >= 0 ? 'success.main' : 'error.main'}
                                                            >
                                                                {formatCurrency(holding.realizedPL)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography
                                                                variant="body2"
                                                                fontWeight={600}
                                                                color="success.main"
                                                            >
                                                                {formatCurrency(holding.dividends)}
                                                            </Typography>
                                                        </TableCell>
                                                    </>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>
                    ))
                )}
            </Stack>
        </Container>
    );
}

export default Holdings;
