import React, { useState, useEffect } from "react";
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

ChartJS.register(
CategoryScale,
LinearScale,
PointElement,
LineElement,
Title,
Tooltip,
Legend
);

interface Transaction {
date: string;
type: "buy" | "sell";
amount: number;
}

interface StockDataPoint {
date: string;
price: number;
}

interface ApiResponse {
success: boolean;
cik: string;
ticker: string;
data_points: number;
stock_data: StockDataPoint[];
error?: string;
}

function StockGraph() {
    const [hoveredTransaction, setHoveredTransaction] = useState<Transaction | null>(null);
    const [stockData, setStockData] = useState<StockDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ticker, setTicker] = useState<string>("");

    // Apple's CIK for now
    const APPLE_CIK = "320193";

    useEffect(() => {
        const fetchStockData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://127.0.0.1:5000/getInfo/${APPLE_CIK}/graph`);
                const data: ApiResponse = await response.json();
                
                if (data.success) {
                    setStockData(data.stock_data);
                    setTicker(data.ticker);
                    setError(null);
                } else {
                    setError(data.error || "Failed to fetch stock data");
                }
            } catch (err) {
                setError("Error connecting to server");
                console.error("Error fetching stock data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStockData();
    }, []);

    // Mock transactions for now (can be replaced with real data later)
    // Using dates that are more likely to be in the stock data range
    const mockTransactions: Transaction[] = [
        { date: "2024-12-15", type: "buy", amount: 500 },
        { date: "2025-08-15", type: "sell", amount: 300 },
    ];

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
                    const transaction = mockTransactions.find((t) => t.date === entry.date);
                    return transaction ? entry.price : null;
                }),
                backgroundColor: stockData.map((entry) => {
                    const transaction = mockTransactions.find((t) => t.date === entry.date);
                    if (transaction) {
                        return transaction.type === "buy" ? "rgba(34, 197, 94, 1)" : "rgba(239, 68, 68, 1)";
                    }
                    return "transparent";
                }),
                borderColor: stockData.map((entry) => {
                    const transaction = mockTransactions.find((t) => t.date === entry.date);
                    if (transaction) {
                        return transaction.type === "buy" ? "rgba(34, 197, 94, 1)" : "rgba(239, 68, 68, 1)";
                    }
                    return "transparent";
                }),
                pointRadius: stockData.map((entry) => {
                    const transaction = mockTransactions.find((t) => t.date === entry.date);
                    return transaction ? 6 : 0; // Only show points for transactions
                }),
                pointHoverRadius: stockData.map((entry) => {
                    const transaction = mockTransactions.find((t) => t.date === entry.date);
                    return transaction ? 16 : 0;
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
                setHoveredTransaction(null);
            }
        },
        plugins: {
            tooltip: {
                enabled: false,
                external: (context: any) => {
                    const tooltipModel = context.tooltip;
                    
                    // Hide tooltip when not hovering
                    if (tooltipModel.opacity === 0) {
                        setHoveredTransaction(null);
                        return;
                    }
                    
                    if (tooltipModel.dataPoints && tooltipModel.dataPoints.length > 0) {
                        const dataPoint = tooltipModel.dataPoints[0];
                        const originalDate = stockData[dataPoint.dataIndex]?.date;
                        const transaction = mockTransactions.find(
                            (t) => t.date === originalDate
                        );
                        setHoveredTransaction(transaction || null);
                    } else {
                        setHoveredTransaction(null);
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
            onMouseLeave={() => setHoveredTransaction(null)}
        >
            <h1 className="text-2xl font-bold mb-4">
                {ticker} Stock Price History 1 year
            </h1>
            <Line data={data} options={options} />
            {hoveredTransaction && (
                <div className="absolute top-0 left-0 bg-white border border-gray-300 shadow-lg p-4 rounded-md">
                    <p>
                        <strong>{hoveredTransaction.type === "buy" ? "Bought" : "Sold"}:</strong>{" "}
                        {hoveredTransaction.amount} shares
                    </p>
                    <p>
                        <strong>Date:</strong> {hoveredTransaction.date}
                    </p>
                </div>
            )}
        </div>
    );
};

export default StockGraph;