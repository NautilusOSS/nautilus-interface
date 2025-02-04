import { Box } from "@mui/material";
import styled from "styled-components";

export const SectionHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 45px;
  & h2.dark {
    color: #fff;
  }
  & h2.light {
    color: #93f;
  }
`;

export const SectionTitle = styled.h2`
  text-align: center;
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Nohemi;
  font-size: 36px;
  font-style: normal;
  font-weight: 700;
  line-height: 100%;
  @media (min-width: 620px) {
    font-size: 40px;
  }
`;

export const SectionButtonContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  & a {
    text-decoration: none;
  }
  & button.button-dark {
    border: 1px solid #fff;
  }
  & div.button-text-dark {
    color: #fff;
  }
  & button.button-light {
    border: 1px solid #93f;
  }
  & div.button-text-light {
    color: #93f;
  }
`;

export const SectionMoreButtonContainer = styled(SectionButtonContainer)`
  & button.button-light::after {
    background: url("/arrow-narrow-up-right-light.svg") no-repeat;
  }
  & button.button-dark::after {
    background: url("/arrow-narrow-up-right-dark.svg") no-repeat;
  }
`;

export const SectionButton = styled.button`
  display: flex;
  padding: 12px 20px;
  justify-content: center;
  align-items: center;
  gap: 6px;
  border-radius: 100px;
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.04);
  background-color: transparent;
`;

export const SectionMoreButton = styled(SectionButton)`
  &::after {
    content: "";
    width: 20px;
    height: 20px;
    position: relative;
    display: inline-block;
  }
`;

export const SectionMoreButtonText = styled.div`
  font-family: "Inter", sans-serif;
  font-size: 15px;
  font-style: normal;
  font-weight: 600;
  line-height: 22px;
  letter-spacing: 0.1px;
  cursor: pointer;
`; 