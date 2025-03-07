import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

export const LgIconLink = styled.a`
  /* display: none; */
  cursor: pointer;
  &:hover {
    color: #9933ff;
  }
  @media screen and (min-width: 600px) {
    display: inline-flex;
  }
`;

export const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
`;

export const AccountContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
`;

export const Button = styled.div`
  cursor: pointer;
`;

export const AccountIconContainer = styled(Button)`
  display: flex;
  width: 45px;
  height: 45px;
  /*
  padding: var(--Main-System-8px, 8px);
  */
  justify-content: center;
  align-items: center;
  gap: var(--Main-System-10px, 10px);
  border-radius: 100px;
  border: 1px solid #93f;
`;

export const NavRoot = styled.nav`
  color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 20px 0px;
  border-bottom: 1px solid #eaebf0;
  backdrop-filter: blur(32px);
`;

export const NavContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0px 10px;
  @media screen and (min-width: 640px) {
    padding: 0px 20px;
  }
  /* @media screen and (min-width: 960px) {
    padding: 0px 20px;
  } */
`;

export const NavLogo = styled.img``;

export const NavLinks = styled.ul`
  list-style-type: none;
  margin: 0;
  padding: 0;
  display: none;
  align-items: center;
  gap: 24px;
  @media screen and (min-width: 960px) {
    display: inline-flex;
  }
`;

export const NavLink = styled.a`
  font-family: Nohemi, sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  letter-spacing: 0.1px;
  text-align: left;
  text-decoration: none;
  color: #161717;
  cursor: pointer;
  &:hover {
    color: #9933ff !important;
  }
  text-align: center;
  padding-left: 6px;
  padding-right: 6px;
`;

export const ActiveNavLink = styled(NavLink)`
  color: #9933ff;
  border-bottom: 3px solid #9933ff;
`;

export const ConnectButton = styled.svg`
  cursor: pointer;
`;
export const AccountIcon = () => {
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
