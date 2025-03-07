import React from "react";
import { useAccountInfo } from "./hooks";
import {
  AccountContainer,
  AccountIcon,
  AccountIconContainer,
  StyledLink,
} from "./components.styled";
import { Stack } from "@mui/material";
import { useSelector } from "react-redux";
import VOIIcon from "/src/static/crypto-icons/voi/0.svg";
import { RootState } from "@/store/store";
import { Link } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";

export const Profile = ({ children }: { children?: React.ReactNode }) => {
  const { activeAccount } = useWallet();
  const { data: accInfo, isLoading: isBalanceLoading } = useAccountInfo();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return (
    <div>
      {activeAccount && accInfo ? (
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
                  display: { sm: "flex" },
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <img src={VOIIcon} style={{ height: "12px" }} />
                  <div>
                    {(
                      (accInfo.amount - accInfo["min-balance"]) /
                      1e6
                    ).toLocaleString()}{" "}
                    VOI
                  </div>
                </Stack>
              </Stack>
            </div>
          </Stack>
        </StyledLink>
      ) : null}
      <AccountContainer>{children}</AccountContainer>
    </div>
  );
};
