import { Link, Typography } from "@mui/material";
import React from "react";

export const Footer: React.FC = (props) => {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      {...props}
      sx={{paddingTop: "5vh"}}
    >
      <Link color="inherit" href="https://www.bidt.digital/">
        bidt-Wissenlandskarte
      </Link>{" - "}
      {new Date().getFullYear()}
    </Typography>
  );
}