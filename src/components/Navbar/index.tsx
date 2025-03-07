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
  Menu,
  MenuItem,
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
import { useName } from "@/hooks/useName";
import { namehash, uint8ArrayToBigInt } from "@/utils/namehash";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const AccountIcon = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M20 21C20 19.6044 20 18.9067 19.8278 18.3389C19.44 17.0605 18.4395 16.0601 17.1611 15.6722C16.5933 15.5 15.8956 15.5 14.5 15.5H9.5C8.10444 15.5 7.40665 15.5 6.83886 15.6722C5.56045 16.0601 4.56004 17.0605 4.17224 18.3389C4 18.9067 4 19.6044 4 21M16.5 7.5C16.5 9.98528 14.4853 12 12 12C9.51472 12 7.5 9.98528 7.5 7.5C7.5 5.01472 9.51472 3 12 3C14.4853 3 16.5 5.01472 16.5 7.5Z"
        stroke={isDarkTheme ? "#717579" : "#161717"}
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
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

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
        xmlns="http://www.w3.org/2/000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M16.5 14H16.51M3 5V19C3 20.1045 3.89543 21 5 21H19C20.1046 21 21 20.1045 21 19V9C21 7.89543 20.1046 7 19 7L5 7C3.89543 7 3 6.10457 3 5ZM3 5C3 3.89543 3.89543 3 5 3H17M17 14C17 14.2761 16.7761 14.5 16.5 14.5C16.2239 14.5 16 14.2761 16 14C16 13.7239 16.2239 13.5 16.5 13.5C16.7761 13.5 17 13.7239 17 14Z"
          stroke={isDarkTheme ? "#717579" : "#161717"}
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

  const resolver = useName();

  const {
    resolver: envoiResolver,
    activeProfile,
    setActiveProfile,
  } = useEnvoiResolver();

  useEffect(() => {
    if (activeAccount) {
      resolver.fetchName(activeAccount.address).then((name) => {
        namehash(name).then((hash) => {
          envoiResolver.http
            .getTokenInfo(uint8ArrayToBigInt(hash).toString())
            .then((res) => {
              setActiveProfile(res[0]);
            });
        });
      });
    }
  }, [activeAccount]);

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

  // Separate state for each dropdown menu
  const [tokensAnchorEl, setTokensAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const [earnAnchorEl, setEarnAnchorEl] = useState<null | HTMLElement>(null);

  const isTokensMenuOpen = Boolean(tokensAnchorEl);
  const isEarnMenuOpen = Boolean(earnAnchorEl);

  const handleTokensMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setTokensAnchorEl(event.currentTarget);
  };

  const handleEarnMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setEarnAnchorEl(event.currentTarget);
  };

  const handleTokensMenuClose = () => {
    setTokensAnchorEl(null);
  };

  const handleEarnMenuClose = () => {
    setEarnAnchorEl(null);
  };

  // Add state for Stats dropdown
  const [statsAnchorEl, setStatsAnchorEl] = useState<null | HTMLElement>(null);
  const isStatsMenuOpen = Boolean(statsAnchorEl);

  const handleStatsMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setStatsAnchorEl(event.currentTarget);
  };

  const handleStatsMenuClose = () => {
    setStatsAnchorEl(null);
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
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <Link to="/">
              <NavLogo
                className="w-40 lg:w-48 "
                src={isDarkTheme ? DarkLogo : LightLogo}
              />
            </Link>
            <NavLinks>
              {/* Replace the navlinks mapping with custom rendering for Tokens dropdown */}
              {navlinks.map((item, key) => {
                if (
                  item.label === "Launchpad" ||
                  item.label === "Community Chest" ||
                  item.label === "Staking"
                ) {
                  return null;
                }

                if (item.label === "Tokens") {
                  return (
                    <React.Fragment key={key}>
                      <div key="tokens-menu">
                        <Button
                          onClick={handleTokensMenuClick}
                          endIcon={
                            <KeyboardArrowDownIcon
                              sx={{
                                transform: isTokensMenuOpen
                                  ? "rotate(180deg)"
                                  : "rotate(0)",
                                transition: "transform 0.2s",
                              }}
                            />
                          }
                          style={{
                            color: isDarkTheme ? "#717579" : "#000",
                            textTransform: "none",
                            fontSize: "16px",
                            padding: "6px 8px",
                            minWidth: "unset",
                          }}
                        >
                          Tokens
                        </Button>
                        <Menu
                          anchorEl={tokensAnchorEl}
                          open={isTokensMenuOpen}
                          onClose={handleTokensMenuClose}
                          PaperProps={{
                            style: {
                              backgroundColor: isDarkTheme ? "#161717" : "#fff",
                              color: isDarkTheme ? "#717579" : "#000",
                              marginTop: "8px",
                            },
                          }}
                        >
                          <MenuItem
                            onClick={() => {
                              navigate("/create-arc200");
                              handleTokensMenuClose();
                            }}
                            style={{
                              fontSize: "16px",
                              padding: "8px 16px",
                            }}
                          >
                            Launchpad
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              navigate("/community-chest");
                              handleTokensMenuClose();
                            }}
                            style={{
                              fontSize: "16px",
                              padding: "8px 16px",
                            }}
                          >
                            Wrapped Voi Hub
                          </MenuItem>
                        </Menu>
                      </div>
                    </React.Fragment>
                  );
                }

                if (item.label === "Earn") {
                  return (
                    <div key="earn-menu">
                      <Button
                        onClick={handleEarnMenuClick}
                        endIcon={
                          <KeyboardArrowDownIcon
                            sx={{
                              transform: isEarnMenuOpen
                                ? "rotate(180deg)"
                                : "rotate(0)",
                              transition: "transform 0.2s",
                            }}
                          />
                        }
                        style={{
                          color: isDarkTheme ? "#717579" : "#000",
                          textTransform: "none",
                          fontSize: "16px",
                          padding: "6px 8px",
                          minWidth: "unset",
                        }}
                      >
                        Earn
                      </Button>
                      <Menu
                        anchorEl={earnAnchorEl}
                        open={isEarnMenuOpen}
                        onClose={handleEarnMenuClose}
                        PaperProps={{
                          style: {
                            backgroundColor: isDarkTheme ? "#161717" : "#fff",
                            color: isDarkTheme ? "#717579" : "#000",
                            marginTop: "8px",
                          },
                        }}
                      >
                        {/*<MenuItem
                          onClick={() => {
                            navigate("/nft-games");
                            handleEarnMenuClose();
                          }}
                          style={{
                            fontSize: "16px",
                            padding: "8px 16px",
                          }}
                        >
                          NFT Games
                        </MenuItem>*/}
                        <MenuItem
                          onClick={() => {
                            navigate("/staking");
                            handleEarnMenuClose();
                          }}
                          style={{
                            fontSize: "16px",
                            padding: "8px 16px",
                          }}
                        >
                          Nautilus Voi Staking
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            navigate("/community-chest?contract=390001");
                            handleEarnMenuClose();
                            window.location.reload();
                          }}
                        >
                          Wrapped Voi LP Incentives
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            navigate("/community-chest?contract=770561");
                            handleEarnMenuClose();
                            window.location.reload();
                          }}
                        >
                          Fountain Voi
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            navigate("/community-chest?contract=664258");
                            handleEarnMenuClose();
                            window.location.reload();
                          }}
                        >
                          Community Chest Voi
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            navigate("/community-chest?contract=913147");
                            handleEarnMenuClose();
                            window.location.reload();
                          }}
                        >
                          NFT Voi
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            navigate("/community-chest?contract=8372092");
                            handleEarnMenuClose();
                            window.location.reload();
                          }}
                        >
                          Liquid Voi
                        </MenuItem>
                      </Menu>
                    </div>
                  );
                }

                if (item.label === "Stats") {
                  return (
                    <div key="stats-menu">
                      <Button
                        onClick={handleStatsMenuClick}
                        endIcon={
                          <KeyboardArrowDownIcon
                            sx={{
                              transform: isStatsMenuOpen
                                ? "rotate(180deg)"
                                : "rotate(0)",
                              transition: "transform 0.2s",
                            }}
                          />
                        }
                        style={{
                          color: isDarkTheme ? "#717579" : "#000",
                          textTransform: "none",
                          fontSize: "16px",
                          padding: "6px 8px",
                          minWidth: "unset",
                        }}
                      >
                        Stats
                      </Button>
                      <Menu
                        anchorEl={statsAnchorEl}
                        open={isStatsMenuOpen}
                        onClose={handleStatsMenuClose}
                        PaperProps={{
                          style: {
                            backgroundColor: isDarkTheme ? "#161717" : "#fff",
                            color: isDarkTheme ? "#717579" : "#000",
                            marginTop: "8px",
                          },
                        }}
                      >
                        {item.children?.map((child, childKey) => (
                          <MenuItem
                            key={childKey}
                            onClick={() => {
                              navigate(child.href);
                              handleStatsMenuClose();
                            }}
                            style={{
                              fontSize: "16px",
                              padding: "8px 16px",
                            }}
                          >
                            {child.label}
                          </MenuItem>
                        ))}
                      </Menu>
                    </div>
                  );
                }

                return linkLabels[location.pathname] === item.label ? (
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
                );
              })}
            </NavLinks>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <ul
              style={{
                listStyleType: "none",
                margin: 0,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              {activeAccount && (
                <li
                  style={{ alignItems: "center", gap: "4px" }}
                  className="hidden md:flex"
                >
                  <img src={VOIIcon} alt="VOI" width={16} height={16} />
                  <span style={{ color: isDarkTheme ? "#fff" : "#000" }}>
                    {isAccountInfoLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      ((accountInfoData?.amount || 0) / 1e6).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )
                    )}
                  </span>
                </li>
              )}

              {activeAccount && (
                <li
                  style={{ color: isDarkTheme ? "#717579" : undefined }}
                  className="hidden md:block"
                >
                  <WalletIcon2 />
                </li>
              )}
              {activeAccount && (
                <li
                  style={{ color: isDarkTheme ? "#717579" : undefined }}
                  className="hidden md:block"
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeAccount) {
                        navigate(`/account/${activeAccount.address}`);
                      }
                    }}
                    style={{
                      cursor: activeAccount ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <AccountIcon />
                  </div>
                </li>
              )}
              <li
                style={{ color: isDarkTheme ? "#717579" : undefined }}
                className="hidden md:block"
              >
                <ThemeSelector>
                  {isDarkTheme ? (
                    <WbSunnyOutlinedIcon
                      className="cursor-pointer"
                      sx={{ height: 24, width: 24 }}
                    />
                  ) : (
                    <LgIconLink
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M21.5 14.0784C20.3003 14.6123 18.9654 14.9048 17.5647 14.9048C12.2974 14.9048 8.03513 10.6425 8.03513 5.37522C8.03513 3.97447 8.32756 2.63959 8.86155 1.43991C5.61474 2.91119 3.35 6.20455 3.35 10.0451C3.35 15.3124 7.61231 19.5747 12.8796 19.5747C16.7202 19.5747 20.0135 17.31 21.5 14.0784Z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </LgIconLink>
                  )}
                </ThemeSelector>
              </li>
            </ul>
            <AccountContainer>
              <div className="hidden md:block">
                <ConnectWallet />
              </div>
            </AccountContainer>
            <div className="md:hidden">
              <SideBar exclude={["Tokens", "Earn"]} />
            </div>
          </div>
        </NavContainer>
      </NavRoot>
    </>
  );
};

export default Navbar;
