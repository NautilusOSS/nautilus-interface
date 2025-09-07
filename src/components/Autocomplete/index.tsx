import React from "react";
import { useAutocomplete } from "@mui/base/useAutocomplete";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";

const TextFieldContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  align-self: stretch;
  color: #000;
`;

const InputContainer = styled.div`
  display: flex;
  padding: var(--Main-System-10px, 10px) var(--Main-System-12px, 12px);
  align-items: center;
  gap: var(--Main-System-8px, 8px);
  align-self: stretch;
  border-radius: 16px;
  /* Shadow/XSM */
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.04);
  border: 1px solid #eaebf0;
  &:hover {
    border: 1px solid #3b3b3b;
  }
`;

const Input = styled.input`
  flex: 1 0 0;
  /* Text S/Medium */
  font-family: Inter;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 20px; /* 142.857% */
  color: #68727d;
  /*
  &.dark.has-value {
    color: #fff;
  }
  &.light.has-value {
    color: #000;
  }
  */
`;

const Listbox = styled.ul`
  align-self: stretch;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.875rem;
  box-sizing: border-box;
  padding: 6px;
  margin: 12px 0;
  overflow: auto;
  outline: 0px;
  max-height: 300px;
  z-index: 2;
  position: absolute;
  border-radius: 20px;
  margin-top: 44px;
  /*
  width: 220px;
  */
  border: 1px solid #eaebf0;
  background: #fff;
`;

const Option = styled.li`
  list-style: none;
  padding: 8px;
  border-radius: 12px;
  cursor: default;

  &:last-of-type {
    border-bottom: none;
  }
  &:hover {
    cursor: pointer;
    background: #f0f0f0;
  }
  &[aria-selected="true"] {
  }
  &.Mui-focused,
  &.Mui-focusVisible {
  }

  &.Mui-focusVisible {
  }

  &[aria-selected="true"].Mui-focused,
  &[aria-selected="true"].Mui-focusVisible {
  }
`;

const Autocomplete: React.FC<any> = (props) => {
  const [value, setValue] = React.useState<any>(null);
  const {
    getRootProps,
    getInputLabelProps,
    getInputProps,
    getListboxProps,
    getOptionProps,
    groupedOptions,
    focused,
  } = useAutocomplete({
    id: "use-autocomplete-demo",
    options: props.options,
    getOptionLabel: (option) => option.label,
    value,
    onChange: (event, newValue) => {
      props.onChange(newValue?.value);
      setValue(newValue);
    },
  });
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return (
    <TextFieldContainer>
      <InputContainer
        {...getRootProps}
        className={isDarkTheme ? "dark" : "light"}
      >
        <Input
          disabled={props.disabled}
          {...getInputProps()}
          placeholder={props.placeholder}
          type="text"
          className={[
            value ? "has-value" : "",
            isDarkTheme ? "dark" : "light",
          ].join(" ")}
        />
      </InputContainer>
      {groupedOptions.length > 0 ? (
        <Listbox
          className={isDarkTheme ? "dark" : "light"}
          {...getListboxProps()}
        >
          {groupedOptions.map((option, index) => (
            <Option {...getOptionProps({ option, index })}>
              {option.label}
            </Option>
          ))}
        </Listbox>
      ) : null}
    </TextFieldContainer>
  );
};

export default Autocomplete;
