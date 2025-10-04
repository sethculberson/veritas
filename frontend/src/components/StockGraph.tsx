import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import {
Chart as ChartJS,
CategoryScale,
LinearScale,
PointElement,
LineElement,
Title,
Tooltip,
Legend,
} from "chart.js";
import { GetInfoResponse, Trade } from '../lib/types';
import { formatName } from "../lib/Trades";

ChartJS.register(
CategoryScale,
LinearScale,
PointElement,
LineElement,
Title,
Tooltip,
Legend
);

// Extended trade interface for chart display
interface ChartTrade extends Trade {
    insider_name: string;
    total_value: number;
    chart_type: "buy" | "sold";
    estimated_price: boolean; // Whether the price was estimated from stock data
    effective_price: number; // The actual price used (either trade price or estimated)
}

function StockGraph({ insiderData }: {insiderData: GetInfoResponse}) {
    const [hoveredTransactions, setHoveredTransactions] = useState<ChartTrade[]>([]);
    const [selectedInsider, setSelectedInsider] = useState<string>("all");
    const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
    const [currentTransactionIndex, setCurrentTransactionIndex] = useState<number>(0);
    const [isTooltipHovered, setIsTooltipHovered] = useState<boolean>(false);
    const hideTimeoutRef = React.useRef<number | null>(null);

    // Use stock data from insiderData instead of fetching separately
    const stockData = insiderData.stock_data || [];
    const ticker = insiderData.ticker || "Unknown";
    const loading = false; // No loading since we already have the data
    const error = null; // No error since we already have the data

    // Convert insider trades to chart-friendly transactions with null checks
    const allTransactions: ChartTrade[] = (insiderData.insiders || []).flatMap(insider => 
        (insider.trades || [])
            .filter(trade => trade.date)
            .map(trade => {
                // Try to use the trade's price, or estimate from stock data
                let effectivePrice = trade.price_per_share;
                let isEstimated = false;
                
                if (!effectivePrice || effectivePrice === 0) {
                    // Find the stock price for this date
                    const stockPriceOnDate = stockData.find(stock => stock.date === trade.date);
                    if (stockPriceOnDate) {
                        effectivePrice = stockPriceOnDate.price;
                        isEstimated = true;
                    } else {
                        effectivePrice = 0;

                    }
                }
                
                return {
                    ...trade,
                    insider_name: formatName(insider.name),
                    effective_price: effectivePrice,
                    estimated_price: isEstimated,
                    total_value: trade.shares * effectivePrice,
                    chart_type: (trade.acquired_disposed === 'A' ? "buy" : "sold") as "buy" | "sold",
                };
            })
    );
    
    // Log summary of price estimation
    const estimatedCount = allTransactions.filter(t => t.estimated_price).length;
    const totalCount = allTransactions.length;
    console.log(`Price estimation: ${estimatedCount}/${totalCount} transactions used estimated prices`);
    
    // Filter transactions - first by date (past year), then by selected insider
    const Today = new Date();
    const oneYearAgo = Today.setFullYear(Today.getFullYear() - 1);
    const pastYearTransactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.date);

        return transactionDate.getTime() >= oneYearAgo;
    });
    
    const displayedTransactions = selectedInsider === "all" 
        ? pastYearTransactions 
        : pastYearTransactions.filter(t => t.insider_name === selectedInsider);

    // Get unique insider names for the selector
    const insiderNames = ["all", ...new Set((insiderData.insiders || []).map(insider => formatName(insider.name)))];
    
    // Navigation functions for multiple transactions
    const nextTransaction = () => {
        if (hoveredTransactions.length > 1) {
            setCurrentTransactionIndex((prev) => 
                prev < hoveredTransactions.length - 1 ? prev + 1 : 0
            );
        }
    };
    
    const prevTransaction = () => {
        if (hoveredTransactions.length > 1) {
            setCurrentTransactionIndex((prev) => 
                prev > 0 ? prev - 1 : hoveredTransactions.length - 1
            );
        }
    };
    
    // Tooltip visibility management with delays
    const showTooltip = (transactions: ChartTrade[]) => {
        // Clear any pending hide timeout
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setHoveredTransactions(transactions);
    };
    
    const hideTooltip = () => {
        // Don't hide immediately if tooltip is being hovered
        if (isTooltipHovered) {
            return;
        }
        
        // Add a small delay to allow mouse movement to tooltip
        hideTimeoutRef.current = window.setTimeout(() => {
            if (!isTooltipHovered) {
                setHoveredTransactions([]);
            }
        }, 100);
    };
    
    // Keyboard navigation
    React.useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (hoveredTransactions.length > 1 && isTooltipHovered) {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    nextTransaction();
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    prevTransaction();
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [hoveredTransactions.length, isTooltipHovered]);
    
    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);
    
    // Reset transaction index when hovering new transactions
    React.useEffect(() => {
        setCurrentTransactionIndex(0);
    }, [hoveredTransactions]);

    if (loading) {
        return (
            <div className="relative w-full max-w-4xl mx-auto p-4">
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg">Loading stock data...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="relative w-full max-w-4xl mx-auto p-4">
                <div className="text-red-600 text-center">
                    <h2 className="text-xl font-bold mb-2">Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    // Function to format date as "Jan 2024", "Feb 2024", etc.
    const formatDateLabel = (dateString: string): string => {
        // Handle different date formats that might come from the API
        let date: Date;
        
        if (dateString && typeof dateString === 'string') {
            date = new Date(dateString);
        } else {
            console.warn('Invalid date string:', dateString);
            return 'Invalid Date';
        }
        
        const options: Intl.DateTimeFormatOptions = { 
            month: 'short', 
            year: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    };

    // Create data with formatted labels
    const chartLabels = stockData.map((entry) => {
        const date = new Date(entry.date);
        // For daily data, show month/year for every 30th point to avoid crowding
        return formatDateLabel(entry.date);
    });

    const data = {
        labels: chartLabels,
        datasets: [
            {
                label: "Stock Price",
                data: stockData.map((entry) => entry.price),
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.5)",
                pointRadius: 0, // Hide points for the stock price line
                pointHoverRadius: 0, // Hide points on hover too
            },
            // Separate dataset for purchase transactions
            {
                label: "Purchases",
                data: stockData.map((entry) => {
                    const transactionsOnDate = displayedTransactions.filter((t: ChartTrade) => t.date === entry.date);
                    const buys = transactionsOnDate.filter(t => t.chart_type === "buy");
                    return buys.length > 0 ? entry.price : null;
                }),
                backgroundColor: "rgba(34, 197, 94, 1)", // Green for purchases
                borderColor: "rgba(34, 197, 94, 1)",
                pointRadius: stockData.map((entry) => {
                    const transactionsOnDate = displayedTransactions.filter((t: ChartTrade) => t.date === entry.date);
                    const buys = transactionsOnDate.filter(t => t.chart_type === "buy");
                    if (buys.length > 0) {
                        // Base size of 6, plus 1 for each additional buy transaction
                        return 6 + (buys.length - 1) * 1;
                    }
                    return 0;
                }),
                pointHoverRadius: stockData.map((entry) => {
                    const transactionsOnDate = displayedTransactions.filter((t: ChartTrade) => t.date === entry.date);
                    const buys = transactionsOnDate.filter(t => t.chart_type === "buy");
                    if (buys.length > 0) {
                        // Keep the same size on hover to prevent flickering
                        return 6 + (buys.length - 1) * 1;
                    }
                    return 0;
                }),
                showLine: false,
            },
            // Separate dataset for sale transactions
            {
                label: "Sales",
                data: stockData.map((entry) => {
                    const transactionsOnDate = displayedTransactions.filter((t: ChartTrade) => t.date === entry.date);
                    const sells = transactionsOnDate.filter(t => t.chart_type === "sold");
                    return sells.length > 0 ? entry.price : null;
                }),
                backgroundColor: "rgba(239, 68, 68, 1)", // Red for sales
                borderColor: "rgba(239, 68, 68, 1)",
                pointRadius: stockData.map((entry) => {
                    const transactionsOnDate = displayedTransactions.filter((t: ChartTrade) => t.date === entry.date);
                    const sells = transactionsOnDate.filter(t => t.chart_type === "sold");
                    if (sells.length > 0) {
                        // Base size of 6, plus 1 for each additional sell transaction
                        return 6 + (sells.length - 1) * 1;
                    }
                    return 0;
                }),
                pointHoverRadius: stockData.map((entry) => {
                    const transactionsOnDate = displayedTransactions.filter((t: ChartTrade) => t.date === entry.date);
                    const sells = transactionsOnDate.filter(t => t.chart_type === "sold");
                    if (sells.length > 0) {
                        // Keep the same size on hover to prevent flickering
                        return 6 + (sells.length - 1) * 1;
                    }
                    return 0;
                }),
                showLine: false,
            },
        ],
    };

    const options = {
        responsive: true,
        interaction: {
            mode: 'nearest' as const,
            intersect: false,
        },
        onHover: (event: any, activeElements: any) => {
            // Clear tooltip when not hovering over any elements
            if (activeElements.length === 0) {
                hideTooltip();
            }
        },
        plugins: {
            tooltip: {
                enabled: false,
                external: (context: any) => {
                    const tooltipModel = context.tooltip;
                    
                    // Hide tooltip when not hovering
                    if (tooltipModel.opacity === 0) {
                        hideTooltip();
                        return;
                    }
                    
                    if (tooltipModel.dataPoints && tooltipModel.dataPoints.length > 0) {
                        const dataPoint = tooltipModel.dataPoints[0];
                        const originalDate = stockData[dataPoint.dataIndex]?.date;
                        // Show all transactions for the date regardless of which dataset was hovered
                        const transactionsOnDate = displayedTransactions.filter(
                            (t: ChartTrade) => t.date === originalDate
                        );
                        
                        // Set tooltip position relative to the chart
                        const chart = context.chart;
                        const canvas = chart.canvas;
                        const rect = canvas.getBoundingClientRect();
                        
                        // Get the actual pixel position of the data point for better alignment
                        const hoveredPoint = tooltipModel.dataPoints[0];
                        const meta = chart.getDatasetMeta(hoveredPoint.datasetIndex);
                        const element = meta.data[hoveredPoint.dataIndex];
                        
                        setTooltipPosition({
                            x: element.x,
                            y: element.y
                        });
                        
                        showTooltip(transactionsOnDate);
                    } else {
                        hideTooltip();
                    }
                },
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "Date",
                },
                ticks: {
                    maxTicksLimit: 12, // Show max 12 labels to avoid overcrowding
                    autoSkip: true,
                    maxRotation: 45,
                    minRotation: 0
                }
            },
            y: {
                title: {
                    display: true,
                    text: "Price ($)",
                },
            },
        },
    };

    return (
        <div 
            className="relative w-full max-w-4xl"
            onMouseLeave={() => {
                // Only hide if not hovering tooltip
                if (!isTooltipHovered) {
                    hideTooltip();
                    setIsTooltipHovered(false);
                }
            }}
        >
            <h1 className="text-2xl font-bold mb-4">
                {ticker} Stock Price History 1 year
            </h1>
            
            <div className="mb-4">
                <label htmlFor="insider-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Insider:
                </label>
                <select
                    id="insider-select"
                    value={selectedInsider}
                    onChange={(e) => setSelectedInsider(e.target.value)}
                    className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                    {insiderNames.map(name => (
                        <option key={name} value={name}>
                            {name === "all" ? "All Insiders" : name}
                        </option>
                    ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                    Showing {displayedTransactions.length} trades
                </p>
            </div>
            
            <Line data={data} options={options} />
            
            {hoveredTransactions.length > 0 && (
                <div 
                    className="absolute bg-white border border-gray-300 shadow-lg p-4 rounded-md min-w-sm max-w-md z-10 pointer-events-auto"
                    style={{
                        left: `${tooltipPosition.x + 15}px`,
                        top: `${tooltipPosition.y - 45}px`,
                        transform: tooltipPosition.x > 500 ? 'translateX(-100%)' : 'none' // Flip to left if too close to right edge
                    }}
                    onMouseEnter={() => {
                        // Clear any pending hide timeout when entering tooltip
                        if (hideTimeoutRef.current) {
                            clearTimeout(hideTimeoutRef.current);
                            hideTimeoutRef.current = null;
                        }
                        setIsTooltipHovered(true);
                    }}
                    onMouseLeave={() => {
                        setIsTooltipHovered(false);
                        hideTooltip();
                    }}
                >
                    {/* Arrow pointer to dot */}
                    <div 
                        className="absolute w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-300"
                        style={{
                            left: tooltipPosition.x > 500 ? 'calc(100% - 15px)' : '-15px',
                            top: '40px'
                        }}
                    />
                    <div 
                        className="absolute w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"
                        style={{
                            left: tooltipPosition.x > 500 ? 'calc(100% - 15px)' : '-15px',
                            top: '39px'
                        }}
                    />
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold">
                            {hoveredTransactions.length === 1 
                                ? "Transaction Details" 
                                : `${hoveredTransactions.length} Transactions on Same Day`
                            }
                        </h4>
                        {hoveredTransactions.length > 1 && (
                            <div className="flex items-center space-x-2 text-sm">
                                <button 
                                    onClick={prevTransaction}
                                    className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded"
                                    title="Previous transaction (Arrow Left)"
                                >
                                    ←
                                </button>
                                <span className="text-gray-600">
                                    {currentTransactionIndex + 1} of {hoveredTransactions.length}
                                </span>
                                <button 
                                    onClick={nextTransaction}
                                    className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded"
                                    title="Next transaction (Arrow Right)"
                                >
                                    →
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* Show summary for multiple transactions */}
                    {hoveredTransactions.length > 1 && (
                        <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                            <p className="font-medium text-gray-700">Day Summary:</p>
                            <div className="flex justify-between">
                                <span>Purchases: {hoveredTransactions.filter(t => t.chart_type === "buy").length}</span>
                                <span>Sales: {hoveredTransactions.filter(t => t.chart_type === "sold").length}</span>
                            </div>
                        </div>
                    )}
                    
                    {hoveredTransactions[currentTransactionIndex] && (
                        <div>
                            <p><strong>Insider:</strong> {hoveredTransactions[currentTransactionIndex].insider_name}</p>
                            <p><strong>Date:</strong> {hoveredTransactions[currentTransactionIndex].date}</p>
                            <p><strong>Action:</strong> {hoveredTransactions[currentTransactionIndex].chart_type === "buy" ? "Bought" : "Sold"}</p>
                            <p><strong>Shares:</strong> {hoveredTransactions[currentTransactionIndex].shares.toLocaleString()}</p>
                            <p>
                                <strong>Price per Share:</strong> ${hoveredTransactions[currentTransactionIndex].effective_price.toFixed(2)}
                                {hoveredTransactions[currentTransactionIndex].estimated_price && (
                                    <span className="text-orange-600 text-sm ml-1">(estimated from closing price)</span>
                                )}
                            </p>
                            <p>
                                <strong>Total Value:</strong> ${hoveredTransactions[currentTransactionIndex].total_value.toLocaleString()}
                                {hoveredTransactions[currentTransactionIndex].estimated_price && (
                                    <span className="text-orange-600 text-sm ml-1">(estimated)</span>
                                )}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StockGraph;