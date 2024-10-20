import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Menu } from "@mui/icons-material";
import ThemeSwitcher from "../ThemeSelector/light-dark-mode-switcher";
import ConnectWallet from "../ConnectWallet";
import { Profile } from "../Navbar/components";
import { ActiveNavLink, NavLink, NavLinks } from "../Navbar/components.styled";
import { linkLabels, navlinks } from "../Navbar/constants";
import { useLocation, useNavigate } from "react-router-dom";

export function SideBar() {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const navigate = useNavigate();
  const location = useLocation();

  const theme = isDarkTheme ? "dark" : "light";
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className={`${theme}`} variant={`outline`}>
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent className={`${theme}`}>
        <SheetHeader>
          <SheetTitle className="text-primary-text text-start text-4xl">
            <div className="flex gap-2 items-center">
              Nautilus <ThemeSwitcher />
            </div>
          </SheetTitle>
          <SheetDescription className="text-start">
            Explore Nautilus
          </SheetDescription>
        </SheetHeader>
        <NavLinks className="!flex !flex-col !items-start !justify-start !gap-2 !my-8">
          {navlinks.map((item, key) => {
            return linkLabels[location.pathname] === item.label ? (
              <SheetClose asChild>
                <ActiveNavLink
                  className="w-full text-start flex items-start flex-col"
                  key={`${key}_${item?.label}`}
                  onClick={() => {
                    navigate(item.href);
                  }}
                >
                  {item.label}
                </ActiveNavLink>
              </SheetClose>
            ) : (
              <SheetClose asChild>
                <NavLink
                  className="w-full text-start flex items-start flex-col"
                  key={`${key}_${item?.label}`}
                  style={{ color: isDarkTheme ? "#717579" : undefined }}
                  onClick={() => {
                    navigate(item.href);
                  }}
                >
                  {item.label}
                  <div
                    className={`divide-solid divide-x w-full h-[1px] bg-primary rounded`}
                  ></div>
                </NavLink>
              </SheetClose>
            );
          })}
        </NavLinks>
        <SheetFooter>
          <SheetClose asChild>
            <Profile>
              <ConnectWallet />
            </Profile>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
