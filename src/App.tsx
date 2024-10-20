import React from "react";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { Provider, useSelector } from "react-redux";
import { store, persistor, RootState } from "./store/store";
import { PersistGate } from "redux-persist/integration/react";
import Navbar from "./components/Navbar";
import { routes } from "./routes";
import { getCurrentNodeEnv } from "./wallets";
import { ToastContainer } from "react-toastify";
import styled from "styled-components";
import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  NetworkId,
  WalletId,
  WalletManager,
  WalletProvider,
} from "@txnlab/use-wallet-react";

const BackgroundLayer = styled.div`
  width: 100%;
  height: 100%;
  top: 0;
`;

interface AppContainerProps {
  children: React.ReactNode;
}
const AppContainer: React.FC<AppContainerProps> = ({ children }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  return (
    <div
      style={{
        color: isDarkTheme ? "#fff" : "#000",
        transition: "all 0.25s linear",
      }}
    >
      <BackgroundLayer
        className="background-layer"
        style={{
          background: isDarkTheme ? "#161717" : "#FFFFFF",
        }}
      ></BackgroundLayer>
      <div className="relati overflow-x-hidden h-fi" style={{}}>
        {children}
      </div>
    </div>
  );
};

const queryClient = new QueryClient();

const App: React.FC = () => {
  const { ALGO_SERVER, ALGO_INDEXER_SERVER } = getCurrentNodeEnv();

  let walletConnectProjectId; // = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;
  if (!walletConnectProjectId) {
    walletConnectProjectId = "cd7fe0125d88d239da79fa286e6de2a8";
  }

  const walletManager = new WalletManager({
    wallets: [
      WalletId.KIBISIS,
      {
        id: WalletId.LUTE,
        options: { siteName: "VoiX" },
      },
      {
        id: WalletId.WALLETCONNECT,
        options: {
          projectId: walletConnectProjectId,
          metadata: {
            name: "Nautilus",
            url: "https://nautilus.sh",
            description: "Nautilus NFT Marketplace",
            icons: ["https://nautilus.sh/favicon.ico"],
          },
          themeMode: "light",
        },
      },
    ],
    algod: {
      baseServer: ALGO_SERVER,
      port: "",
      token: "",
    },
    network: NetworkId.MAINNET,
  });

  return (
    <WalletProvider manager={walletManager}>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <AppContainer>
              <Router>
                <Navbar />
                <Routes>
                  {routes.map((el, key) => (
                    <Route key={key} path={el.path} Component={el.Component} />
                  ))}
                </Routes>
              </Router>
            </AppContainer>
          </PersistGate>
        </Provider>
        <ToastContainer />
      </QueryClientProvider>
    </WalletProvider>
  );
};

export default App;
