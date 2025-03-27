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

// Add interface for better type safety
interface SideBarProps {
  exclude?: string[];
  flattenMarketplace?: boolean;
}

export function SideBar({ exclude, flattenMarketplace }: SideBarProps) {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const navigate = useNavigate();
  const location = useLocation();

  const theme = isDarkTheme ? "dark" : "light";

  // Extract NavLink rendering logic to reduce duplication
  const renderNavLink = (label: string, href: string, key: string) => {
    const isActive = linkLabels[location.pathname] === label;
    const Component = isActive ? ActiveNavLink : NavLink;
    
    return (
      <SheetClose asChild key={key}>
        <Component
          className="w-full text-start flex items-start flex-col"
          style={{ color: !isActive && isDarkTheme ? "#717579" : undefined }}
          onClick={() => navigate(href)}
        >
          {label}
          {!isActive && (
            <div className="divide-solid divide-x w-full h-[1px] bg-primary rounded" />
          )}
        </Component>
      </SheetClose>
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className={theme} variant="outline" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent className={theme}>
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
          {navlinks.map((item) => {
            if (exclude?.includes(item.label)) {
              return null;
            }

            if (flattenMarketplace && item.label === "Marketplace") {
              return item.children?.map((child) => 
                renderNavLink(child.label, child.href, `marketplace-${child.label}`)
              );
            }

            return renderNavLink(item.label, item.href, `nav-${item.label}`);
          })}
        </NavLinks>
        <SheetFooter>
          <SheetClose asChild>
            <Profile>
              <ConnectWallet expanded={true} />
            </Profile>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
