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

    // Use stock data from insiderData instead of fetching separately
    const stockData = insiderData.stock_data || [];
    const ticker = insiderData.ticker || "Unknown";
    const loading = false; // No loading since we already have the data
    const error = null; // No error since we already have the data

    // Convert insider trades to chart-friendly transactions with null checks
    const allTransactions: ChartTrade[] = (insiderData.insiders || []).flatMap(insider => 
        (insider.trades || [])
            .filter(trade => trade.date) // Skip invalid trades
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
                        console.log(`Estimated price for ${trade.date}: $${effectivePrice}`);
                    } else {
                        effectivePrice = 0;
                        console.log(`No stock price found for ${trade.date}`);
                    }
                }
                
                return {
                    ...trade,
                    insider_name: insider.name,
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
    const insiderNames = ["all", ...new Set((insiderData.insiders || []).map(insider => insider.name))];

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
            {
            label: "Transactions",
            data: stockData.map((entry) => {
                const transactionsOnDate = displayedTransactions.filter((t: ChartTrade) => t.date === entry.date);
                return transactionsOnDate.length > 0 ? entry.price : null;
            }),
            backgroundColor: stockData.map((entry) => {
                const transactionsOnDate = displayedTransactions.filter((t: ChartTrade) => t.date === entry.date);
                if (transactionsOnDate.length > 0) {
                    // Use the color of the first transaction (or could be most common type)
                    return transactionsOnDate[0].chart_type === "buy" ? "rgba(34, 197, 94, 1)" : "rgba(239, 68, 68, 1)";
                }
                return "transparent";
            }),
            borderColor: stockData.map((entry) => {
                const transactionsOnDate = displayedTransactions.filter((t: ChartTrade) => t.date === entry.date);
                if (transactionsOnDate.length > 0) {
                    return transactionsOnDate[0].chart_type === "buy" ? "rgba(34, 197, 94, 1)" : "rgba(239, 68, 68, 1)";
                }
                return "transparent";
            }),
            pointRadius: stockData.map((entry) => {
                const transactionsOnDate = displayedTransactions.filter((t: ChartTrade) => t.date === entry.date);
                if (transactionsOnDate.length > 0) {
                    // Base size of 6, plus 2 for each additional transaction
                    return 6 + (transactionsOnDate.length - 1) * 1;
                }
                return 0;
            }),
            pointHoverRadius: stockData.map((entry) => {
                const transactionsOnDate = displayedTransactions.filter((t: ChartTrade) => t.date === entry.date);
                if (transactionsOnDate.length > 0) {
                    // Base hover size of 10, plus 2 for each additional transaction
                    return 10 + (transactionsOnDate.length - 1) * 1;
                }
                return 0;
            }),
            showLine: false,
        },
        ],
    };

    const options = {
        responsive: true,
        onHover: (event: any, activeElements: any) => {
            // Clear tooltip when not hovering over any elements
            if (activeElements.length === 0) {
                setHoveredTransactions([]);
            }
        },
        plugins: {
            tooltip: {
                enabled: false,
                external: (context: any) => {
                    const tooltipModel = context.tooltip;
                    
                    // Hide tooltip when not hovering
                    if (tooltipModel.opacity === 0) {
                        setHoveredTransactions([]);
                        return;
                    }
                    
                    if (tooltipModel.dataPoints && tooltipModel.dataPoints.length > 0) {
                        const dataPoint = tooltipModel.dataPoints[0];
                        const originalDate = stockData[dataPoint.dataIndex]?.date;
                        const transactionsOnDate = displayedTransactions.filter(
                            (t: ChartTrade) => t.date === originalDate
                        );
                        
                        // Set tooltip position relative to the chart
                        const chart = context.chart;
                        const canvas = chart.canvas;
                        const rect = canvas.getBoundingClientRect();
                        
                        setTooltipPosition({
                            x: tooltipModel.caretX,
                            y: tooltipModel.caretY
                        });
                        
                        setHoveredTransactions(transactionsOnDate);
                    } else {
                        setHoveredTransactions([]);
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
            className="relative w-full max-w-4xl p-4"
            onMouseLeave={() => setHoveredTransactions([])}
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
                    className="absolute bg-white border border-gray-300 shadow-lg p-4 rounded-md min-w-sm max-w-md z-10 pointer-events-none"
                    style={{
                        left: `${tooltipPosition.x + 10}px`,
                        top: `${tooltipPosition.y - 50}px`,
                        transform: tooltipPosition.x > 500 ? 'translateX(-100%)' : 'none' // Flip to left if too close to right edge
                    }}
                >
                    <h4 className="font-bold mb-2">
                        Transaction Details {hoveredTransactions.length > 1 && `(${hoveredTransactions.length} trades)`}
                    </h4>
                    <div className={`${hoveredTransactions.length > 1 ? 'max-h-60 overflow-y-auto' : ''} space-y-3`}>
                        {hoveredTransactions.map((transaction, index) => (
                            <div key={index} className={`${index > 0 ? 'pt-3 border-t border-gray-200' : ''}`}>
                                <p><strong>Insider:</strong> {transaction.insider_name}</p>
                                <p><strong>Date:</strong> {transaction.date}</p>
                                <p><strong>Action:</strong> {transaction.chart_type === "buy" ? "Bought" : "Sold"}</p>
                                <p><strong>Shares:</strong> {transaction.shares.toLocaleString()}</p>
                                <p>
                                    <strong>Price per Share:</strong> ${transaction.effective_price.toFixed(2)}
                                    {transaction.estimated_price && (
                                        <span className="text-orange-600 text-sm ml-1">(estimated from closing price)</span>
                                    )}
                                </p>
                                <p>
                                    <strong>Total Value:</strong> ${transaction.total_value.toLocaleString()}
                                    {transaction.estimated_price && (
                                        <span className="text-orange-600 text-sm ml-1">(estimated)</span>
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockGraph;