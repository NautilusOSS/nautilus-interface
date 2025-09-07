import { TextField, TextFieldProps } from "@mui/material";
import { styled } from "@mui/material/styles";

export const ShadedInput = styled(TextField)<TextFieldProps>(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
    borderRadius: "16px",
    "& fieldset": {
      borderColor: "transparent",
    },
    "&:hover fieldset": {
      borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
    },
    "&.Mui-focused fieldset": {
      borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",
    },
  },
  "& .MuiInputBase-input": {
    color: theme.palette.mode === "dark" ? "#fff" : "#000",
  },
  "& .MuiFormLabel-root": {
    color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.7)",
    "&.Mui-focused": {
      color: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.7)",
    },
  },
})); 