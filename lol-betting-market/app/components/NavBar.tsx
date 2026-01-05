"use client";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";

export default function NavBar() {
  return (
    <AppBar position="static" color="primary">
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        
        {/* Website Name */}
        <Typography variant="h6" component="div">
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
            Match Predict
          </Link>
        </Typography>

        {/* Navigation Links */}
        <div>
          <Button color="inherit" component={Link} href="/history">
            History
          </Button>
          <Button color="inherit" component={Link} href="/about">
            About
          </Button>
        </div>
      </Toolbar>
    </AppBar>
  );
}