import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LightLogo from "/src/static/logo-light.svg";
import DarkLogo from "/src/static/logo-dark.svg";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import ThemeSelector from "../ThemeSelector";
import { Button, Stack, Tooltip } from "@mui/material";
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
import { TOKEN_WVOI } from "@/contants/tokens";

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

const Navbar = () => {
  const location = useLocation();

  /* Wallet */

  const { activeAccount, signTransactions } = useWallet();

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

  return (
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
            <li style={{ color: isDarkTheme ? "#717579" : undefined }}>
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
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
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
                      <div>
                        {(
                          (accountInfoData.amount -
                            accountInfoData["min-balance"]) /
                          1e6
                        ).toLocaleString()}{" "}
                        VOI
                      </div>
                      {balanceData && balanceData.success ? (
                        <Tooltip title="Click to withdraw VOI">
                          <Button
                            size="small"
                            variant="contained"
                            sx={{ borderRadius: "25px" }}
                            onClick={async (ev) => {
                              ev.preventDefault();
                              if (!balanceData || isBalanceDataLoading) return;
                              if (!balanceData.success) {
                                toast.info("Failed to get balance");
                                return;
                              }
                              if (balanceData.returnValue === BigInt(0)) {
                                toast.info("No VOI to withdraw");
                                return;
                              }
                              const ci = new CONTRACT(
                                TOKEN_WVOI,
                                getAlgorandClients().algodClient,
                                getAlgorandClients().indexerClient,
                                abi.nt200,
                                {
                                  addr: activeAccount.address,
                                  sk: new Uint8Array(0),
                                }
                              );
                              ci.setFee(2000);
                              const withdrawR = await ci.withdraw(
                                balanceData.returnValue
                              );
                              if (!withdrawR.success) return;
                              const stxns = await signTransactions(
                                withdrawR.txns.map((t: string) => {
                                  return new Uint8Array(
                                    Buffer.from(t, "base64")
                                  );
                                })
                              );
                              const res = await getAlgorandClients()
                                .algodClient.sendRawTransaction(
                                  stxns as Uint8Array[]
                                )
                                .do();
                              console.log("withdraw", res);
                              setTimeout(() => {
                                refetchBalance();
                                refetchBalanceData();
                              }, 4000);
                            }}
                          >
                            <img src={VIAIcon} style={{ height: "12px" }} />
                            {(
                              Number(balanceData.returnValue) / 1e6
                            ).toLocaleString()}{" "}
                            VOI
                          </Button>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </Stack>
                </div>
              </Stack>
            </StyledLink>
          ) : null}
          <AccountContainer>
            {activeAccount ? (
              <Link to={`/account/${activeAccount?.address}`}>
                <AccountIconContainer>
                  <AccountIcon />
                </AccountIconContainer>
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
  );
};

export default Navbar;
