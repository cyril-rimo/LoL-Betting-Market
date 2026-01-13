"use client";

import { createTheme } from "@mui/material/styles";
import { plexMono } from "./fonts";

const theme = createTheme({
  typography: {
    fontFamily: plexMono.style.fontFamily,
  },
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#9c27b0",
    },
  },
});

export default theme;