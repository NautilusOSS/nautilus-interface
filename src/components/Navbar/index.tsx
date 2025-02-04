import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LightLogo from "/src/static/logo-light.svg";
import DarkLogo from "/src/static/logo-dark.svg";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import ThemeSelector from "../ThemeSelector";
import {
  Button,
  Stack,
  Tooltip,
  CircularProgress,
  Avatar,
} from "@mui/material";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "react-toastify";
import ConnectWallet from "../ConnectWallet";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import VOIIcon from "/src/static/crypto-icons/voi/0.svg";
import VIAIcon from "/src/static/crypto-icons/voi/6779767.svg";
import { SideBar } from "../SideBar";
import {
  AccountContainer,
  AccountIconContainer,
  ActiveNavLink,
  LgIconLink,
  NavContainer,
  NavLink,
  NavLinks,
  NavLogo,
  NavRoot,
  StyledLink,
} from "./components.styled";
import { useAccountInfo, useARC72BalanceOf } from "./hooks";
import { linkLabels, navlinks } from "./constants";
import { useWallet } from "@txnlab/use-wallet-react";
import { getAlgorandClients } from "@/wallets";
import { abi, CONTRACT } from "ulujs";
import { TOKEN_NAUT_VOI_STAKING, TOKEN_WVOI } from "@/contants/tokens";
import { ROUTES } from "@/constants/routes";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import WithdrawModal from "../modals/WithdrawModal";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useOwnedStakingContract } from "@/hooks/staking";
import { useOwnedARC72Token } from "@/hooks/arc72";
import { getStakingWithdrawableAmount } from "@/utils/staking";
import { useEnvoiResolver } from "@/hooks/useEnvoiResolver";

const AccountIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="33"
      height="32"
      viewBox="0 0 33 32"
      fill="none"
    >
      <path
        d="M27.5 28C27.5 26.1392 27.5 25.2089 27.2632 24.4518C26.7299 22.7473 25.3544 21.4134 23.5966 20.8963C22.8159 20.6667 21.8564 20.6667 19.9375 20.6667H13.0625C11.1436 20.6667 10.1841 20.6667 9.40343 20.8963C7.64563 21.4134 6.27006 22.7473 5.73683 24.4518C5.5 25.2089 5.5 26.1392 5.5 28M22.6875 10C22.6875 13.3137 19.9173 16 16.5 16C13.0827 16 10.3125 13.3137 10.3125 10C10.3125 6.68629 13.0827 4 16.5 4C19.9173 4 22.6875 6.68629 22.6875 10Z"
        stroke="#9933FF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const WalletIcon2 = () => {
  const navigate = useNavigate();
  const { activeAccount } = useWallet();

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (activeAccount) {
          navigate(`/wallet/${activeAccount.address}`);
        }
      }}
      style={{ cursor: activeAccount ? "pointer" : "default" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M11 9.33333H11.0067M2 3.33333V12.6667C2 13.403 2.59695 14 3.33333 14H12.6667C13.403 14 14 13.403 14 12.6667V6C14 5.26362 13.403 4.66667 12.6667 4.66667L3.33333 4.66667C2.59695 4.66667 2 4.06971 2 3.33333ZM2 3.33333C2 2.59695 2.59695 2 3.33333 2H11.3333M11.3333 9.33333C11.3333 9.51743 11.1841 9.66667 11 9.66667C10.8159 9.66667 10.6667 9.51743 10.6667 9.33333C10.6667 9.14924 10.8159 9 11 9C11.1841 9 11.3333 9.14924 11.3333 9.33333Z"
          stroke="#161717"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

const Navbar: React.FC = () => {
  const location = useLocation();

  /* Wallet */

  const { activeAccount, signTransactions } = useWallet();

  const resolver = useEnvoiResolver();

  const [accountName, setAccountName] = useState<string | null>(null);
  const [accountProfile, setAccountProfile] = useState<any>(null);
  useEffect(() => {
    if (activeAccount) {
      resolver.http
        .getNameFromAddress(activeAccount.address)
        .then((result: string) => {
          if (!!result) {
            setAccountName(result);
            resolver.http.search(result).then((results: any[]) => {
              if (results.length === 1) {
                setAccountProfile(results[0]);
              }
            });
          }
        });
    }
  }, [activeAccount]);

  // const { data: stakingContractData, isLoading: stakingContractLoading } =
  //   useOwnedStakingContract(activeAccount?.address);
  // const { data: arc72TokenData, isLoading: arc72TokenLoading } =
  //   useOwnedARC72Token(activeAccount?.address, TOKEN_NAUT_VOI_STAKING, {
  //     includeStaking: true,
  //   });

  // EFFECT: get voi account info
  const {
    data: accountInfoData,
    isLoading: isAccountInfoLoading,
    refetch: refetchBalance,
  } = useAccountInfo();

  // EFFECT: get token balance
  const {
    data: balanceData,
    isLoading: isBalanceDataLoading,
    refetch: refetchBalanceData,
  } = useARC72BalanceOf(TOKEN_WVOI);

  /* Theme */

  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* Navigation */

  const navigate = useNavigate();

  /* Popper */

  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen((previousOpen) => !previousOpen);
  };

  const canBeOpen = open && Boolean(anchorEl);
  const id = canBeOpen ? "transition-popper" : undefined;

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawableBalance, setWithdrawableBalance] = useState("0");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const handleWithdrawClick = async () => {
    if (!balanceData || isBalanceDataLoading) return;
    if (!balanceData.success) {
      toast.info("Failed to get balance");
      return;
    }

    setIsLoadingBalance(true);
    try {
      let withdrawableBalance = Number(balanceData.returnValue) / 1e6;
      // const { algodClient } = getAlgorandClients();
      // for (const stakingContract of stakingContractData || []) {
      //   const withdrawable = await getStakingWithdrawableAmount(
      //     algodClient,
      //     stakingContract.contractId,
      //     activeAccount?.address || ""
      //   );
      //   withdrawableBalance += withdrawable;
      // }
      // for (const arc72Token of arc72TokenData || []) {
      //   console.log({ arc72Token });
      //   const withdrawable = await getStakingWithdrawableAmount(
      //     algodClient,
      //     arc72Token.tokenId,
      //     activeAccount?.address || ""
      //   );
      //   withdrawableBalance += withdrawable;
      // }
      setWithdrawableBalance(withdrawableBalance.toString());
      setShowWithdrawModal(true);
    } catch (error) {
      console.error("Error fetching withdrawable balance:", error);
      toast.error("Failed to fetch withdrawable balance");
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleWithdraw = async (includeStaking: boolean) => {
    setIsWithdrawing(true);
    try {
      // Withdraw wVOI balance
      const ci = new CONTRACT(
        TOKEN_WVOI,
        getAlgorandClients().algodClient,
        getAlgorandClients().indexerClient,
        abi.nt200,
        {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        }
      );
      ci.setFee(2000);
      const withdrawR = await ci.withdraw(
        balanceData?.returnValue || BigInt(0)
      );
      if (!withdrawR.success) return;

      // If including staking, withdraw from staking contracts
      // if (includeStaking) {
      //   // Add staking contract withdrawal logic here
      //   for (const stakingContract of stakingContractData || []) {
      //     const withdrawable = await getStakingWithdrawableAmount(
      //       algodClient,
      //       stakingContract.contractId,
      //       activeAccount?.address || ""
      //     );
      //     // Add withdrawal transaction
      //   }
      // }

      const stxns = await signTransactions(
        withdrawR.txns.map((t: string) => {
          return new Uint8Array(Buffer.from(t, "base64"));
        })
      );
      const res = await getAlgorandClients()
        .algodClient.sendRawTransaction(stxns as Uint8Array[])
        .do();
      console.log("withdraw", res);
      setTimeout(() => {
        refetchBalance();
        refetchBalanceData();
      }, 6000);
      toast.success("Withdrawal successful!");
      setShowWithdrawModal(false);
    } catch (error) {
      console.error("Withdrawal failed:", error);
      toast.error("Withdrawal failed");
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <>
      <NavRoot
        style={{
          backgroundColor: isDarkTheme ? "#161717" : undefined,
          borderBottom: isDarkTheme ? "none" : undefined,
        }}
      >
        <NavContainer>
          <Link to="/">
            <NavLogo
              className="w-40 lg:w-48 "
              src={isDarkTheme ? DarkLogo : LightLogo}
            />
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <NavLinks>
              {navlinks.map((item, key) =>
                linkLabels[location.pathname] === item.label ? (
                  <ActiveNavLink
                    key={`${key}_${item?.label}`}
                    onClick={() => {
                      navigate(item.href);
                    }}
                  >
                    {item.label}
                  </ActiveNavLink>
                ) : (
                  <NavLink
                    key={`${key}_${item?.label}`}
                    style={{ color: isDarkTheme ? "#717579" : undefined }}
                    onClick={() => {
                      navigate(item.href);
                    }}
                  >
                    {item.label}
                  </NavLink>
                )
              )}
            </NavLinks>
            <ul
              style={{
                listStyleType: "none",
                margin: 0,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "24px",
              }}
            >
              <li style={{ color: isDarkTheme ? "#717579" : undefined }}
                  className="hidden md:block"
              >
                <ThemeSelector>
                  {isDarkTheme ? (
                    <WbSunnyOutlinedIcon className="cursor-pointer" />
                  ) : (
                    <LgIconLink>
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22 15.8442C20.6866 16.4382 19.2286 16.7688 17.6935 16.7688C11.9153 16.7688 7.23116 12.0847 7.23116 6.30654C7.23116 4.77135 7.5618 3.3134 8.15577 2C4.52576 3.64163 2 7.2947 2 11.5377C2 17.3159 6.68414 22 12.4623 22C16.7053 22 20.3584 19.4742 22 15.8442Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </LgIconLink>
                  )}
                </ThemeSelector>
              </li>
            </ul>
            {activeAccount && accountInfoData ? (
              <StyledLink to={`/account/${activeAccount?.address}`}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center" }}
                >
                  <div
                    style={{
                      color: isDarkTheme ? "#717579" : undefined,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        display: { xs: "none", sm: "flex" },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <img src={VOIIcon} style={{ height: "12px" }} />
                        <div style={{ flexShrink: 0 }}>
                          {(
                            (accountInfoData.amount -
                              accountInfoData["min-balance"]) /
                            1e6
                          ).toLocaleString()}{" "}
                          VOI
                        </div>
                        {/*balanceData && balanceData.success ? (
                          <Tooltip title="Click to withdraw VOI">
                            <Button
                              size="small"
                              variant="contained"
                              sx={{
                                flexShrink: 0,
                                borderRadius: "25px",
                                color: isDarkTheme ? "#fff" : "inherit",
                                backgroundColor: isDarkTheme
                                  ? "rgba(255, 255, 255, 0.1)"
                                  : undefined,
                                "&:hover": {
                                  backgroundColor: isDarkTheme
                                    ? "rgba(255, 255, 255, 0.15)"
                                    : undefined,
                                },
                                "&.Mui-disabled": {
                                  backgroundColor: isDarkTheme
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : undefined,
                                  color: isDarkTheme
                                    ? "rgba(255, 255, 255, 0.3)"
                                    : undefined,
                                },
                              }}
                              onClick={(ev: any) => {
                                ev.preventDefault();
                                handleWithdrawClick();
                              }}
                              disabled={isLoadingBalance}
                            >
                              {isLoadingBalance ? (
                                <CircularProgress
                                  size={16}
                                  sx={{
                                    color: isDarkTheme
                                      ? "rgba(255, 255, 255, 0.7)"
                                      : "inherit",
                                  }}
                                />
                              ) : (
                                <>
                                  <img
                                    src={VIAIcon}
                                    style={{ height: "12px" }}
                                  />
                                  {(
                                    Number(balanceData.returnValue) / 1e6
                                  ).toLocaleString()}{" "}
                                  VOI
                                </>
                              )}
                            </Button>
                          </Tooltip>
                        ) : null*/}
                      </Stack>
                    </Stack>
                  </div>
                </Stack>
              </StyledLink>
            ) : null}
            <AccountContainer>
              {activeAccount ? (
                <Link to={`/account/${activeAccount?.address}`} className="hidden md:block">
                  {accountProfile?.metadata?.avatar ? (
                    <Avatar
                      src={accountProfile?.metadata?.avatar}
                      sx={{ width: 47, height: 47 }}
                    />
                  ) : (
                    <AccountIconContainer>
                      <AccountIcon />
                    </AccountIconContainer>
                  )}
                </Link>
              ) : null}
              <div className="hidden md:block">
                <ConnectWallet />
              </div>
            </AccountContainer>
            <div className="md:hidden">
              <SideBar />
            </div>
          </div>
        </NavContainer>
      </NavRoot>

      {/*<WithdrawModal
        open={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        isDarkTheme={isDarkTheme}
        balance={withdrawableBalance}
        isLoading={isWithdrawing}
        onWithdraw={handleWithdraw}
      />*/}
    </>
  );
};

export default Navbar;
