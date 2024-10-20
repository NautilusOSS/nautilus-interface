import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import axios from "axios";
import NFTSalesTable from "../NFTSalesTable";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { getSmartTokens } from "../../store/smartTokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { BigNumber } from "bignumber.js";
import { stakingRewards } from "@/static/staking/staking";
import { useStakingContract } from "@/hooks/staking";
import StakingInformation from "../StakingInformation/StakingInformation";

const formatter = Intl.NumberFormat("en", { notation: "compact" });

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

interface NFTTabsProps {
  nft: any;
  loading: boolean;
  exchangeRate: number;
}

const NFTTabs: React.FC<NFTTabsProps> = ({ nft, loading, exchangeRate }) => {
  const dispatch = useDispatch();
  /* Smart Tokens */
  const smartTokens = useSelector((state: any) => state.smartTokens.tokens);
  const smartTokenStatus = useSelector(
    (state: any) => state.smartTokens.status
  );
  React.useEffect(() => {
    dispatch(getSmartTokens() as unknown as UnknownAction);
  }, [dispatch]);

  const sales = useSelector((state: any) => state.sales.sales);
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* Tabs */
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const tokenSales = React.useMemo(() => {
    const tokenSales = sales.filter(
      (sale: any) =>
        sale.collectionId === nft.contractId && sale.tokenId === nft.tokenId
    );
    tokenSales.sort((a: any, b: any) => b.timestamp - a.timestamp);
    return tokenSales;
  }, [sales, nft]);

  const { data: stakingAccountData, isLoading: loadingStakingAccountData } =
    useStakingContract(nft.tokenId);

  return !loading ? (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          sx={{
            color: "717579",
            "& .MuiTabs-root": {},
            "& .MuiTabs-indicator": {
              color: "#93F",
              backgroundColor: "#93F",
            },
            "& .Mui-selected": {
              color: "#93F",
              textAlign: "center",
              leadingTrim: "both",
              textEdge: "cap",
              fontFamily: "Nohemi",
              //fontSize: "24px",
              fontStyle: "normal",
              fontWeight: "700",
              lineHeight: "20px",
            },
          }}
          textColor="inherit"
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab
            sx={{
              color: "717579",
            }}
            label="History"
            {...a11yProps(0)}
          />
          <Tab label="Staking Information" {...a11yProps(1)} />
          {/*<Tab label="Information" {...a11yProps(1)} />
          <Tab label="Attributes" {...a11yProps(2)} />*/}
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        {tokenSales && tokenSales.length > 0 ? (
          <NFTSalesTable
            sales={
              tokenSales?.map((sale: any) => {
                const currency = smartTokens.find(
                  (token: any) => `${token.contractId}` === `${sale.currency}`
                );
                console.log({ currency });
                const currencySymbol =
                  currency?.tokenId === "0" ? "VOI" : currency?.symbol || "VOI";
                const currencyDecimals =
                  currency?.decimals === 0 ? 0 : currency?.decimals || 6;
                const currencyPrice =
                  currency?.tokenId === "0" ? 0 : currency?.price || 0;
                const priceBn = new BigNumber(sale.price).div(
                  new BigNumber(10).pow(currencyDecimals)
                );
                const price = formatter.format(priceBn.toNumber());
                const normalPrice = formatter.format(
                  new BigNumber(currencyPrice).multipliedBy(priceBn).toNumber()
                );
                return {
                  event: "Sale",
                  price: price,
                  normalPrice: currencyPrice > 0 ? normalPrice : 0,
                  currency: currencySymbol,
                  seller: sale.seller,
                  buyer: sale.buyer,
                  date: moment.unix(sale.timestamp).format("LLL"),
                  round: sale.round,
                };
              }) || []
            }
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: isDarkTheme ? "#fff" : "#000",
              textAlign: "left",
              paddingTop: "20px",
            }}
          >
            No sales found
          </Typography>
        )}
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <StakingInformation contractId={nft.tokenId} />
      </CustomTabPanel>
      {/*<CustomTabPanel value={value} index={1}>
        Information
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        Attributes
        </CustomTabPanel>*/}
    </Box>
  ) : null;
};

export default NFTTabs;
