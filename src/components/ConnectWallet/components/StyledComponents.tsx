import styled from "styled-components";

export const WalletIconContainer = styled.div`
  display: flex;
  padding: var(--Main-System-8px, 8px);
  align-items: flex-start;
  gap: var(--Main-System-10px, 10px);
  border-radius: 100px;
  background: #9f3;
  flex-shrink: 0;
`;

export const Button = styled.div`
  cursor: pointer;
`;

export const AccountDropdown = styled(Button)`
  color: #93f;
  display: flex;
  padding: 6px 6px 8px 20px;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  border-radius: 32px;
  border: 1px solid #93f;
  width: fit-content;
  box-shadow: 0px 2px 4px 0px rgba(16, 24, 40, 0.1);
  &:hover {
    border: 1px solid #93f;
    background: #93f;
    color: #fff;
  }
`;

export const AccountDropdownLabel = styled.span<{ theme: "light" | "dark" }>`
  height: 17px;
  flex-shrink: 0;
  color: ${(props) => (props.theme === "dark" ? "#fff" : "inherit")};
  text-align: right;
  font-family: Nohemi;
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 22px;
`; 