import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import React from "react";
import { Switch } from "@headlessui/react";
import Layout from "@/layouts/Default";
import { toast } from "react-toastify";
import TokenInfoModal from "@/components/TokenInfoModal";
import algosdk from "algosdk";
import { abi, CONTRACT } from "ulujs";
import { getAlgorandClients } from "@/wallets";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { ViewList, ViewModule, PieChart } from "@mui/icons-material";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import { useBalances } from "../hooks/useBalance";
import { MIMIR_API } from "@/config/arc72-idx";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

interface TokenBalance {
  accountId: string;
  contractId: number;
  balance: string;
}

interface TokenInfo {
  contractId: number;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  creator: string;
  verified: number;
  price: string;
  arc200_balanceOf?: string;
}

interface BalanceResponse {
  "current-round": number;
  balances: TokenBalance[];
  "next-token": string | null;
}

interface TokenResponse {
  "current-round": number;
  tokens: TokenInfo[];
}

interface ContractMethodResponse {
  "current-round": number;
  methods: Array<{
    name: string;
    address: string;
  }>;
}

const MAX_SUPPLY =
  "115792089237316200000000000000000000000000000000000000000000000000000000000000000";

export default function Wallet() {
  const { accountId } = useParams();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [tokenInfo, setTokenInfo] = useState<Record<number, TokenInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "pie">("list");

  // Example array of ARC200 asset IDs
  const arc200AssetIds = ["asset1", "asset2"];
  const arc200Balances = useBalances(accountId);

  const fetchBalances = async () => {
    if (!accountId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `https://${MIMIR_API}/arc200/balances?accountId=${accountId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch wallet data");
      }

      const data: BalanceResponse = await response.json();
      setBalances(data.balances);

      // Fetch token info for each balance
      const tokenInfoPromises = data.balances.map(async (balance) => {
        const tokenResponse = await fetch(
          `https://${MIMIR_API}/arc200/tokens?includes=all&contractId=${balance.contractId}`
        );
        if (!tokenResponse.ok) return null;
        const tokenData: TokenResponse = await tokenResponse.json();
        const token = tokenData.tokens[0];

        // If totalSupply matches MAX_SUPPLY, fetch the contract method address
        if (token && token.totalSupply === MAX_SUPPLY) {
          // TODO implement me
        }
        return token;
      });

      const tokenInfoResults = await Promise.all(tokenInfoPromises);
      const tokenInfoMap: Record<number, TokenInfo> = {};
      tokenInfoResults.forEach((token) => {
        if (token) {
          tokenInfoMap[token.contractId] = token;
        }
      });
      setTokenInfo(tokenInfoMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [accountId]);

  const formatBalance = (balance: string, decimals: number = 0) => {
    const num = parseFloat(balance);
    return (num / Math.pow(10, decimals)).toFixed(decimals);
  };

  const filteredBalances = balances
    .filter((balance) => {
      const token = tokenInfo[balance.contractId];

      // First apply verified filter
      if (verifiedOnly && token?.verified !== 1) return false;

      // Then apply search filter if there's a search term
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = token?.name?.toLowerCase().includes(search);
        const matchesSymbol = token?.symbol?.toLowerCase().includes(search);
        const matchesContract = balance.contractId.toString().includes(search);
        return matchesName || matchesSymbol || matchesContract;
      }

      return true;
    })
    .sort((a, b) => {
      const tokenA = tokenInfo[a.contractId];
      const tokenB = tokenInfo[b.contractId];

      const valueA =
        (parseFloat(a.balance) * parseFloat(tokenA?.price || "0")) /
        Math.pow(10, tokenA?.decimals || 0);
      const valueB =
        (parseFloat(b.balance) * parseFloat(tokenB?.price || "0")) /
        Math.pow(10, tokenB?.decimals || 0);

      return valueB - valueA; // Sort in descending order
    });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard", {
        position: "bottom-right",
        autoClose: 2000,
        hideProgressBar: true,
      });
    } catch (err) {
      toast.error("Failed to copy", {
        position: "bottom-right",
        autoClose: 2000,
        hideProgressBar: true,
      });
    }
  };

  const getPieChartData = () => {
    const chartData = filteredBalances.map((balance) => {
      const token = tokenInfo[balance.contractId];
      const value =
        (parseFloat(balance.balance) * parseFloat(token?.price || "0")) /
        Math.pow(10, token?.decimals || 0);
      return {
        value,
        label: token ? `${token.symbol}` : `Contract ${balance.contractId}`,
      };
    });

    // Sort by value and take top 10
    const top10Data = chartData.sort((a, b) => b.value - a.value).slice(0, 10);

    return {
      labels: top10Data.map((item) => item.label),
      datasets: [
        {
          data: top10Data.map((item) => item.value),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const calculateTotalValue = (balances: TokenBalance[]) => {
    return balances.reduce((total, balance) => {
      const token = tokenInfo[balance.contractId];
      const value =
        (parseFloat(balance.balance) * parseFloat(token?.price || "0")) /
        Math.pow(10, token?.decimals || 0);
      return total + (isNaN(value) ? 0 : value);
    }, 0);
  };

  if (isLoading)
    return (
      <div
        className={`min-h-screen ${isDarkTheme ? "bg-gray-900" : "bg-white"}`}
      >
        Loading wallet data...
      </div>
    );
  if (error)
    return (
      <div
        className={`min-h-screen ${isDarkTheme ? "bg-gray-900" : "bg-white"}`}
      >
        Error: {error}
      </div>
    );
  if (!accountId)
    return (
      <div
        className={`min-h-screen ${isDarkTheme ? "bg-gray-900" : "bg-white"}`}
      >
        No account ID provided
      </div>
    );

  return (
    <Layout>
      <div
        className={`p-4 min-h-screen ${
          isDarkTheme ? "bg-gray-900" : "bg-white"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Wallet Holdings</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg ${
                viewMode === "list"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <ViewList />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg ${
                viewMode === "grid"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <ViewModule />
            </button>
            <button
              onClick={() => setViewMode("pie")}
              className={`p-2 rounded-lg ${
                viewMode === "pie"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <PieChart />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <span className="font-semibold">Account ID: </span>
          <span className="font-mono">{accountId}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={verifiedOnly}
              onChange={setVerifiedOnly}
              className={`${
                verifiedOnly ? "bg-blue-600" : "bg-gray-200"
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
            >
              <span
                className={`${
                  verifiedOnly ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
            <span className="text-sm">Verified tokens only</span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              ></button>
            )}
          </div>
        </div>

        {viewMode === "pie" ? (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">
                Portfolio Distribution
              </h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                Total Value: {calculateTotalValue(filteredBalances).toFixed(2)}{" "}
                VOI
              </p>
            </div>
            <Pie
              data={getPieChartData()}
              options={{
                plugins: {
                  legend: {
                    position: "right" as const,
                    labels: {
                      color: isDarkTheme ? "white" : "black",
                      generateLabels: (chart) => {
                        const dataset = chart.data.datasets[0];
                        const labels = chart.data.labels || [];
                        return labels.map((label, i) => {
                          const value = dataset.data[i] as number;
                          const percentage = (
                            (value / calculateTotalValue(filteredBalances)) *
                            100
                          ).toFixed(1);
                          return {
                            text: `${label} - ${value.toFixed(
                              2
                            )} VOI (${percentage}%)`,
                            fillStyle:
                              (dataset.backgroundColor as string[])[i] ||
                              "#000000",
                            hidden: false,
                            index: i,
                            strokeStyle: isDarkTheme ? "#ffffff" : "#000000",
                            fontColor: isDarkTheme ? "#ffffff" : "#000000",
                          };
                        });
                      },
                    },
                  },
                  tooltip: {
                    titleColor: isDarkTheme ? "white" : "black",
                    bodyColor: isDarkTheme ? "white" : "black",
                    backgroundColor: isDarkTheme
                      ? "rgba(0, 0, 0, 0.8)"
                      : "rgba(255, 255, 255, 0.8)",
                    callbacks: {
                      label: function (context) {
                        const value = context.raw as number;
                        const total = calculateTotalValue(filteredBalances);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: ${value.toFixed(
                          2
                        )} VOI (${percentage}%)`;
                      },
                    },
                  },
                },
                maintainAspectRatio: true,
                responsive: true,
              }}
            />
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-hidden rounded-lg border border-gray-600 dark:border-gray-700">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="px-4 py-2 border-b border-r border-gray-600 dark:border-gray-700 text-gray-900 dark:text-gray-100 first:border-l-0">
                    Token
                  </th>
                  <th className="px-4 py-2 border-b border-r border-gray-600 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                    Contract ID
                  </th>
                  <th className="px-4 py-2 border-b border-r border-gray-600 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                    Balance
                  </th>
                  <th className="px-4 py-2 border-b border-r border-gray-600 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                    Price (VOI)
                  </th>
                  <th className="px-4 py-2 border-b border-gray-600 dark:border-gray-700 text-gray-900 dark:text-gray-100 last:border-r-0">
                    Value (VOI)
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.length === 0 ? (
                  <tr className="dark:bg-gray-900">
                    <td
                      colSpan={5}
                      className="px-4 py-2 text-center text-gray-500"
                    >
                      No tokens found
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map((balance) => {
                    const token = tokenInfo[balance.contractId];
                    const formattedBalance = token
                      ? formatBalance(balance.balance, token.decimals)
                      : balance.balance;
                    const price = token ? parseFloat(token.price) : 0;
                    const value =
                      (parseFloat(balance.balance) * price) /
                      Math.pow(10, token?.decimals || 0);

                    return (
                      <tr
                        key={balance.contractId}
                        className="dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-2 border-b border-r border-gray-600 dark:border-gray-700 first:border-l-0">
                          <button
                            onClick={() => {
                              setSelectedToken(token);
                              setIsModalOpen(true);
                            }}
                            className="hover:underline text-left flex items-center"
                          >
                            {token ? (
                              <>
                                {token.name} ({token.symbol})
                                {token.verified === 1 && (
                                  <span className="ml-2 text-green-600 dark:text-green-500">
                                    ✓
                                  </span>
                                )}
                              </>
                            ) : (
                              "Unknown Token"
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-2 border-b border-r border-gray-600 dark:border-gray-700">
                          <button
                            onClick={() =>
                              copyToClipboard(balance.contractId.toString())
                            }
                            className="hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors duration-200 flex items-center gap-1 w-full"
                          >
                            <span>{balance.contractId}</span>
                            <svg
                              className="w-4 h-4 opacity-50 hover:opacity-100"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                        </td>
                        <td className="px-4 py-2 border-b border-r border-gray-600 dark:border-gray-700 text-right font-mono">
                          {formattedBalance}
                        </td>
                        <td className="px-4 py-2 border-b border-r border-gray-600 dark:border-gray-700 text-right">
                          {isNaN(price) ? "-" : `${price.toFixed(6)} VOI`}
                        </td>
                        <td className="px-4 py-2 border-b border-gray-600 dark:border-gray-700 text-right last:border-r-0">
                          {isNaN(value) ? "-" : `${value.toFixed(6)} VOI`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBalances.map((balance) => {
              const token = tokenInfo[balance.contractId];
              const formattedBalance = token
                ? formatBalance(balance.balance, token.decimals)
                : balance.balance;
              const price = token ? parseFloat(token.price) : 0;
              const value =
                (parseFloat(balance.balance) * price) /
                Math.pow(10, token?.decimals || 0);

              return (
                <div
                  key={balance.contractId}
                  className="p-4 rounded-lg border border-gray-600 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => {
                    setSelectedToken(token);
                    setIsModalOpen(true);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">
                        {token ? (
                          <>
                            {token.name} ({token.symbol})
                            {token.verified === 1 && (
                              <span className="ml-2 text-green-600 dark:text-green-500">
                                ✓
                              </span>
                            )}
                          </>
                        ) : (
                          "Unknown Token"
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {balance.contractId}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-lg font-mono">{formattedBalance}</p>
                    <p className="text-sm text-gray-500">
                      {isNaN(value) ? "-" : `${value.toFixed(6)} VOI`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selectedToken && (
        <TokenInfoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTransferSuccess={() => {
            // Refresh balances after successful transfer
            fetchBalances();
          }}
          token={selectedToken}
          balance={
            balances.find((b) => b.contractId === selectedToken.contractId)
              ?.balance || "0"
          }
        />
      )}
    </Layout>
  );
}
