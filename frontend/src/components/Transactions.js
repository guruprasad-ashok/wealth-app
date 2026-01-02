import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    IconButton,
    Chip,
    Card,
    CardContent,
    useTheme,
    useMediaQuery,
    Stack,
    Grid,
    Switch,
    FormControlLabel,
    TableSortLabel
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    FilterList,
    Download,
    TrendingUp,
    TrendingDown,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from '../services/api';

const ASSET_CLASSES = [
    { value: 'equity', label: 'Equity', color: '#008577' },
    { value: 'stocks', label: 'Stocks', color: '#008577' },
    { value: 'mutual_funds', label: 'Mutual Funds', color: '#009688' },
    { value: 'equity_mf', label: 'Equity MF', color: '#009688' },
    { value: 'debt_mf', label: 'Debt MF', color: '#4db6ac' },
    { value: 'ppf', label: 'PPF', color: '#4db6ac' },
    { value: 'nps_tier_i', label: 'NPS Tier I', color: '#ffca28' },
    { value: 'nps_tier_ii', label: 'NPS Tier II', color: '#ff6f00' },
    { value: 'gold', label: 'Gold', color: '#ffc107' },
    { value: 'bonds', label: 'Bonds', color: '#80cbc4' },
    { value: 'real_estate', label: 'Real Estate', color: '#b2dfdb' },
];

const TRANSACTION_TYPES = [
    { value: 'Invest', label: 'Invest', color: 'success' },
    { value: 'Dividend', label: 'Dividend', color: 'info' },
    { value: 'Interest', label: 'Interest', color: 'info' },
    { value: 'Trade', label: 'Trade', color: 'warning' },
    { value: 'Buy', label: 'Buy', color: 'success' },
    { value: 'Sell', label: 'Sell', color: 'error' },
];

function Transactions() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Get filter parameters from URL
    const assetClassFilter = searchParams.get('assetClass');
    const securityFilter = searchParams.get('security');
    const typeFilter = searchParams.get('type'); // 'realized' or 'unrealized'
    const unrealizedOnlyParam = searchParams.get('unrealized') === 'true'; // Legacy support

    const [transactions, setTransactions] = useState([]);
    const [unrealizedOnly, setUnrealizedOnly] = useState(false);

    // Sort State
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('date');

    const [open, setOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [formData, setFormData] = useState({
        buyDate: new Date().toISOString().split('T')[0],
        sellDate: '',
        assetClass: '',
        security: '',
        buyDate: new Date().toISOString().split('T')[0],
        sellDate: '',
        assetClass: '',
        security: '',
        type: 'Invest',
        units: '',
        pricePerUnit: '',
        account: '',
        entity: ''
    });
    const [filterData, setFilterData] = useState({
        assetClass: '',
        security: '',
        view: 'all', // 'all', 'realized', 'unrealized'
    });

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const response = await getTransactions();
            setTransactions(response.data.transactions || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    };

    const handleOpen = () => {
        setEditMode(false);
        setSelectedTransaction(null);
        setOpen(true);
    };

    const handleFilterOpen = () => {
        setFilterData({
            assetClass: assetClassFilter || '',
            security: securityFilter || '',
            view: typeFilter || (unrealizedOnlyParam ? 'unrealized' : 'all'),
        });
        setFilterOpen(true);
    };

    const handleFilterClose = () => {
        setFilterOpen(false);
    };

    const handleFilterChange = (e) => {
        const { name, value, checked } = e.target;
        setFilterData({
            ...filterData,
            [name]: name === 'unrealized' ? checked : value,
        });
    };

    const handleFilterApply = () => {
        const params = new URLSearchParams();
        if (filterData.assetClass) params.set('assetClass', filterData.assetClass);
        if (filterData.security) params.set('security', filterData.security);
        if (filterData.view && filterData.view !== 'all') params.set('type', filterData.view);
        navigate(`/transactions?${params.toString()}`);
        setFilterOpen(false);
    };

    const handleClose = () => {
        setOpen(false);
        setEditMode(false);
        setSelectedTransaction(null);
        setFormData({
            buyDate: new Date().toISOString().split('T')[0],
            sellDate: '',
            assetClass: '',
            security: '',
            type: 'Invest',
            units: '',
            pricePerUnit: '',
            account: '',
            entity: ''
        });
    };

    // Helper to format date for input (yyyy-mm-dd)
    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        // If already yyyy-mm-dd
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

        // Handle dd-MMM-yy or dd-MMM-yyyy (e.g., 20-Oct-25)
        const monthMap = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        };

        const parts = dateStr.toString().split(/[-/]/);

        // Case: dd-mm-yyyy or dd-MMM-yyyy
        if (parts.length === 3) {
            let day = parts[0].padStart(2, '0');
            let monthStr = parts[1].toLowerCase();
            let year = parseInt(parts[2], 10);
            let month = parts[1].padStart(2, '0');

            // Check if month is name
            if (monthMap.hasOwnProperty(monthStr)) {
                month = monthMap[monthStr];
            }

            // Handle 2-digit year (assume 20xx)
            if (year < 100) {
                year += 2000;
            }

            return `${year}-${month}-${day}`;
        }
        return dateStr;
    };

    const handleEdit = (transaction) => {
        setEditMode(true);
        setSelectedTransaction(transaction);

        // Normalize Transaction Type
        // If the type from backend matches one of our known types (case insensitive), use the known value (Title Case)
        let type = transaction.type;
        const knownType = TRANSACTION_TYPES.find(t => t.value.toLowerCase() === type?.toLowerCase());
        if (knownType) {
            type = knownType.value;
        } else if (type?.toUpperCase() === 'PURCHASE') {
            type = 'Invest';
        } else if (type?.toUpperCase() === 'BUY') {
            type = 'Invest'; // Map old BUY to Invest if preferred, or keep as is. User listed 'Invest'.
        }

        setFormData({
            buyDate: formatDateForInput(transaction.buyDate || transaction.date),
            sellDate: formatDateForInput(transaction.sellDate),
            assetClass: transaction.assetClass,
            security: transaction.security,
            type: type,
            units: transaction.units.toString(),
            pricePerUnit: transaction.pricePerUnit.toString(),
            account: transaction.account || '',
            entity: transaction.entity || ''
        });
        setOpen(true);
    };

    const handleDeleteClick = (transaction) => {
        setTransactionToDelete(transaction);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteCancel = () => {
        setDeleteConfirmOpen(false);
        setTransactionToDelete(null);
    };

    const handleDeleteConfirm = async () => {
        try {
            await deleteTransaction(transactionToDelete.id);
            setDeleteConfirmOpen(false);
            setTransactionToDelete(null);
            setTimeout(() => {
                fetchTransactions();
            }, 1000);
        } catch (error) {
            console.error('Error deleting transaction:', error);
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
            if (editMode && selectedTransaction) {
                // Update existing transaction
                await updateTransaction(selectedTransaction.id, {
                    ...formData,
                    units: parseFloat(formData.units),
                    pricePerUnit: parseFloat(formData.pricePerUnit),
                });
            } else {
                // Create new transaction
                await createTransaction({
                    ...formData,
                    units: parseFloat(formData.units),
                    pricePerUnit: parseFloat(formData.pricePerUnit),
                });
            }
            handleClose();
            // Delay to allow Google Sheets to sync
            setTimeout(() => {
                fetchTransactions();
            }, 1000);
        } catch (error) {
            console.error('Error saving transaction:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            try {
                await deleteTransaction(id);
                fetchTransactions();
            } catch (error) {
                console.error('Error deleting transaction:', error);
            }
        }
    };

    // Filter transactions based on URL parameters
    const filteredTransactions = transactions.filter(txn => {
        // Filter by Realized/Unrealized status
        // Logic:
        // 1. If type='realized' -> Show if realised != 'FALSE'
        // 2. If type='unrealized' OR unrealized=true -> Show if realised == 'FALSE'
        // 3. Else show all

        const isUnrealizedReq = (typeFilter === 'unrealized' || unrealizedOnlyParam || filterData.view === 'unrealized');
        const isRealizedReq = (typeFilter === 'realized' || filterData.view === 'realized');

        if (isUnrealizedReq) {
            if (txn.realised?.toString().toUpperCase() !== 'FALSE') return false;
        } else if (isRealizedReq) {
            if (txn.realised?.toString().toUpperCase() === 'FALSE') return false;
        }

        // Filter by asset class if parameter is set
        if (assetClassFilter && txn.assetClass !== assetClassFilter) {
            return false;
        }
        // Filter by security if parameter is set
        if (securityFilter && txn.security !== securityFilter) {
            return false;
        }
        return true;
    });

    // Handler to clear filters
    const handleClearFilters = () => {
        navigate('/transactions');
    };

    const totalAmount =
        (parseFloat(formData.units) || 0) * (parseFloat(formData.pricePerUnit) || 0);

    // Sorting Helpers
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date(0); // Epoch for empty

        // Handle dd-MMM-yy or dd-MMM-yyyy (e.g., 20-Oct-25)
        const monthMap = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };

        const parts = dateStr.toString().split(/[-/]/);

        // Case: yyyy-mm-dd (ISO)
        if (parts.length === 3 && parts[0].length === 4) {
            return new Date(dateStr);
        }

        // Case: dd-mm-yyyy or dd-MMM-yyyy
        if (parts.length === 3) {
            let day = parseInt(parts[0], 10);
            let monthStr = parts[1].toLowerCase();
            let year = parseInt(parts[2], 10);
            let month = -1;

            // Check if month is name or number
            if (monthMap.hasOwnProperty(monthStr)) {
                month = monthMap[monthStr];
            } else {
                month = parseInt(parts[1], 10) - 1; // 0-indexed
            }

            // Handle 2-digit year (assume 20xx)
            if (year < 100) {
                year += 2000;
            }

            return new Date(year, month, day);
        }

        // Fallback
        return new Date(dateStr);
    };

    function descendingComparator(a, b, orderBy) {
        if (orderBy === 'date' || orderBy === 'buyDate' || orderBy === 'sellDate') {
            const dateA = parseDate(a[orderBy] || a.date);
            const dateB = parseDate(b[orderBy] || b.date);
            if (dateB < dateA) return -1;
            if (dateB > dateA) return 1;
            return 0;
        }

        // Handle numeric sorting safely
        if (['units', 'pricePerUnit', 'totalAmount', 'sellValue', 'gainLoss'].includes(orderBy)) {
            const valA = parseFloat(a[orderBy]) || 0;
            const valB = parseFloat(b[orderBy]) || 0;
            if (valB < valA) return -1;
            if (valB > valA) return 1;
            return 0;
        }

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

    const MobileTransactionCard = ({ txn }) => (
        <Card elevation={0} sx={{
            mb: 1.5,
            border: 1,
            borderColor: 'divider',
            background: '#ffffff',
            borderLeft: `4px solid ${txn.type === 'Invest' || txn.type === 'Buy' ? theme.palette.success.main : theme.palette.error.main}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
            <CardContent sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Box>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            {txn.security}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {txn.date}
                        </Typography>
                    </Box>
                    <Chip
                        label={txn.type}
                        size="small"
                        color={txn.type === 'BUY' ? 'success' : 'error'}
                    />
                </Box>
                <Stack spacing={1.5}>
                    <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                            Asset Class
                        </Typography>
                        <Chip label={txn.assetClass} size="small" variant="outlined" />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                            Units
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                            {(parseFloat(txn.units) || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                            Price/Unit
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                            ₹{txn.pricePerUnit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" pt={1} borderTop={1} borderColor="divider">
                        <Typography variant="body1" fontWeight="bold">
                            Buy Value
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="text.primary">
                            ₹{(txn.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                            Sell/Current Value
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                            ₹{(txn.sellValue || txn.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                            Gain/Loss
                        </Typography>
                        <Typography
                            variant="body2"
                            fontWeight="600"
                            color={(txn.gainLoss || 0) >= 0 ? 'success.main' : 'error.main'}
                        >
                            ₹{(txn.gainLoss || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                    </Box>
                </Stack>
                <Box display="flex" gap={1} mt={2}>
                    <IconButton size="small" sx={{ color: 'primary.main' }} onClick={() => handleEdit(txn)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(txn)}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
            {/* Header */}
            <Box mb={{ xs: 2, sm: 3, md: 4 }}>
                {securityFilter && (
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(`/holdings?assetClass=${encodeURIComponent(assetClassFilter || '')}`)}
                        color="inherit"
                        sx={{ mb: 1 }}
                    >
                        Back to Holdings
                    </Button>
                )}
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    flexDirection={{ xs: 'column', sm: 'row' }}
                    gap={2}
                >
                    <Box>
                        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
                            Transactions
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                            {assetClassFilter || unrealizedOnly || securityFilter
                                ? `Filtered view: ${assetClassFilter || ''} ${securityFilter ? `(${securityFilter})` : ''} ${unrealizedOnly ? '(Unrealized)' : ''}`
                                : 'Manage your buy and sell transactions'}
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width={{ xs: '100%', sm: 'auto' }}>
                        {(assetClassFilter || unrealizedOnly || securityFilter) && (
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={handleClearFilters}
                                fullWidth={isMobile}
                            >
                                Clear Filter
                            </Button>
                        )}
                        <Button
                            variant="outlined"
                            startIcon={<FilterList />}
                            fullWidth={isMobile}
                            onClick={handleFilterOpen}
                        >
                            Filter
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpen}
                            fullWidth={isMobile}
                        >
                            Add Transaction
                        </Button>
                    </Stack>
                </Box>
            </Box>

            {/* Transactions List */}
            {isMobile ? (
                // Mobile View: Cards
                <Box>
                    {filteredTransactions.length === 0 ? (
                        <Card elevation={0} sx={{ border: 1, borderColor: 'divider', py: 6, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                {assetClassFilter || unrealizedOnly || securityFilter
                                    ? 'No transactions match the current filter.'
                                    : 'No transactions found. Add your first transaction!'}
                            </Typography>
                        </Card>
                    ) : (
                        filteredTransactions.map((txn) => <MobileTransactionCard key={txn.id} txn={txn} />)
                    )}
                </Box>
            ) : (
                // Desktop View: Table
                <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{
                                    borderBottom: `2px solid ${theme.palette.primary.main}40`,
                                }}>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        <TableSortLabel
                                            active={orderBy === 'date'}
                                            direction={orderBy === 'date' ? order : 'asc'}
                                            onClick={createSortHandler('date')}
                                        >
                                            Date
                                            {orderBy === 'date' ? (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        <TableSortLabel
                                            active={orderBy === 'security'}
                                            direction={orderBy === 'security' ? order : 'asc'}
                                            onClick={createSortHandler('security')}
                                        >
                                            Security
                                            {orderBy === 'security' ? (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        <TableSortLabel
                                            active={orderBy === 'assetClass'}
                                            direction={orderBy === 'assetClass' ? order : 'asc'}
                                            onClick={createSortHandler('assetClass')}
                                        >
                                            Asset Class
                                            {orderBy === 'assetClass' ? (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        <TableSortLabel
                                            active={orderBy === 'type'}
                                            direction={orderBy === 'type' ? order : 'asc'}
                                            onClick={createSortHandler('type')}
                                        >
                                            Type
                                            {orderBy === 'type' ? (
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
                                            Units
                                            {orderBy === 'units' ? (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                        <TableSortLabel
                                            active={orderBy === 'pricePerUnit'}
                                            direction={orderBy === 'pricePerUnit' ? order : 'asc'}
                                            onClick={createSortHandler('pricePerUnit')}
                                        >
                                            Price/Unit
                                            {orderBy === 'pricePerUnit' ? (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                        <TableSortLabel
                                            active={orderBy === 'totalAmount'}
                                            direction={orderBy === 'totalAmount' ? order : 'asc'}
                                            onClick={createSortHandler('totalAmount')}
                                        >
                                            Buy Value
                                            {orderBy === 'totalAmount' ? (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                        <TableSortLabel
                                            active={orderBy === 'sellValue'}
                                            direction={orderBy === 'sellValue' ? order : 'asc'}
                                            onClick={createSortHandler('sellValue')}
                                        >
                                            Sell/Current
                                            {orderBy === 'sellValue' ? (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                        <TableSortLabel
                                            active={orderBy === 'gainLoss'}
                                            direction={orderBy === 'gainLoss' ? order : 'asc'}
                                            onClick={createSortHandler('gainLoss')}
                                        >
                                            Gain/Loss
                                            {orderBy === 'gainLoss' ? (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary">
                                                {assetClassFilter || unrealizedOnly || securityFilter
                                                    ? 'No transactions match the current filter.'
                                                    : 'No transactions found. Add your first transaction!'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    stableSort(filteredTransactions, getComparator(order, orderBy)).map((txn) => (
                                        <TableRow key={txn.id} hover>
                                            <TableCell>
                                                <Typography variant="body2">{txn.date}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {txn.security}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={txn.assetClass}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ textTransform: 'capitalize' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={txn.type}
                                                    size="small"
                                                    color={txn.type === 'BUY' ? 'success' : 'error'}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    {(parseFloat(txn.units) || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    ₹{txn.pricePerUnit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600}>
                                                    ₹{txn.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    ₹{(txn.sellValue || txn.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    color={(txn.gainLoss || 0) >= 0 ? 'success.main' : 'error.main'}
                                                >
                                                    ₹{(txn.gainLoss || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton size="small" sx={{ color: 'primary.main' }} onClick={() => handleEdit(txn)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteClick(txn)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            )}

            {/* Add/Edit Transaction Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h5" fontWeight="bold">
                        {editMode ? 'Edit Transaction' : 'Add New Transaction'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box display="flex" gap={2}>
                            <TextField
                                name="buyDate"
                                label="Buy Date"
                                type="date"
                                value={formData.buyDate}
                                onChange={handleChange}
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                name="sellDate"
                                label="Sell Date"
                                type="date"
                                value={formData.sellDate}
                                onChange={handleChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                        <TextField
                            name="assetClass"
                            select
                            label="Asset Class"
                            value={formData.assetClass}
                            onChange={handleChange}
                            fullWidth
                            required
                        >
                            {ASSET_CLASSES.map((option) => (
                                <MenuItem key={option.value} value={option.label}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            label="Security Name"
                            name="security"
                            value={formData.security}
                            onChange={handleChange}
                        />
                        <TextField
                            fullWidth
                            select
                            label="Transaction Type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                        >
                            {TRANSACTION_TYPES.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            label="Units"
                            name="units"
                            type="number"
                            value={formData.units}
                            onChange={handleChange}
                        />
                        <TextField
                            name="pricePerUnit"
                            label="Price Per Unit"
                            type="number"
                            value={formData.pricePerUnit}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                        <TextField
                            name="account"
                            label="Account"
                            value={formData.account}
                            onChange={handleChange}
                            fullWidth
                            placeholder="e.g. Investment, Trading"
                        />
                        <TextField
                            name="entity"
                            label="Entity"
                            value={formData.entity}
                            onChange={handleChange}
                            fullWidth
                            placeholder="e.g. Zerodha, Groww"
                        />
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                borderRadius: 2,
                            }}
                        >
                            <Typography variant="body2" sx={{ opacity: 0.9 }} gutterBottom>
                                Total Amount
                            </Typography>
                            <Typography variant="h5" fontWeight="bold">
                                ₹{totalAmount.toLocaleString()}
                            </Typography>
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={handleClose} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editMode ? 'Update Transaction' : 'Add Transaction'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Transaction?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this transaction? This action cannot be undone.
                    </Typography>
                    {transactionToDelete && (
                        <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
                            <Typography variant="body2" color="text.secondary">
                                {transactionToDelete.security} - {transactionToDelete.type}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                                ₹{transactionToDelete.totalAmount?.toLocaleString()}
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
            {/* Filter Dialog */}
            <Dialog open={filterOpen} onClose={handleFilterClose} maxWidth="sm" fullWidth>
                <DialogTitle>Filter Transactions</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            fullWidth
                            select
                            label="View"
                            name="view"
                            value={filterData.view}
                            onChange={handleFilterChange}
                        >
                            <MenuItem value="all">All Transactions</MenuItem>
                            <MenuItem value="unrealized">Unrealized Only</MenuItem>
                            <MenuItem value="realized">Realized Only</MenuItem>
                        </TextField>
                        <TextField
                            fullWidth
                            select
                            label="Asset Class"
                            name="assetClass"
                            value={filterData.assetClass}
                            onChange={handleFilterChange}
                        >
                            <MenuItem value="">
                                <em>All Asset Classes</em>
                            </MenuItem>
                            {ASSET_CLASSES.map((option) => (
                                <MenuItem key={option.value} value={option.label}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            label="Security Name"
                            name="security"
                            value={filterData.security}
                            onChange={handleFilterChange}
                            helperText="Leave empty to search all securities"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleFilterClose} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleFilterApply} variant="contained">
                        Apply Filters
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default Transactions;
