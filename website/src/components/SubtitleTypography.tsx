import { TypographyProps, Typography } from "@mui/material";
import React from "react";

export const SubtitleTypography: React.FC<TypographyProps> = (props) => (
    <Typography
        variant="h4"
        sx={{ marginX: "30%", marginTop: "3%", color: "red" }}
    >
        {props.children}
    </Typography>
)