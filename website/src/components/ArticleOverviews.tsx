import { ListItemButton, ListItem, Tooltip, Chip, Avatar, ListItemText, Typography } from "@mui/material"
import { getCategoryColor } from "../definitions/colors"
import { Article, Node } from "../types/bindings"
import { openLink } from "../utils/genericHelpers"
import React from "react";
import { AccessTime, Visibility, School } from "@mui/icons-material"

export const renderNodeArticleOverview = (n: Node, onMouseEnter?: () => void, onClick?: () => void) => {
  return <ListItemButton sx={{ borderRadius: "10px" }}>
    <ListItem
      alignItems="flex-start"
      onClick={() => { onClick && onClick(); openLink(n.url) }}
      onMouseEnter={onMouseEnter}
      sx={{ padding: "0.5vh 0.5vw" }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignSelf: "center", marginRight: 20, width: "5vw" }}>
        <Tooltip title={`Kategorie: ${n.category_id}`} placement="left" >
          <Chip label={n.category_id} size="small" style={{ width: "inherit" }} avatar={< Avatar sx={{ bgcolor: getCategoryColor(n.category_id) }}> </Avatar>} />
        </Tooltip>
        < Tooltip title={"Erwartete Lesedauer"} placement="left" >
          <Chip icon={
            <AccessTime />} label={n.read_time} size="small" style={{ marginBottom: 10, marginTop: 10, width: "inherit" }}></Chip >
        </Tooltip>
        < Tooltip title={"Anzahl Aufrufe"} placement="left" >
          <Chip icon={
            <Visibility />} label={n.wlk_clicks} size="small" style={{ width: "inherit" }}></Chip >
        </Tooltip>
      </div>
      < ListItemText
        primary={n.name}
        secondary={< React.Fragment >
          <Typography
            sx={{ display: 'inline' }}
            component="span"
            variant="body2"
            color="text.primary"
          >
            {n.author}
          </Typography>
          {" — " + n.teaser_text}
        </React.Fragment>} />
    </ListItem>
  </ListItemButton>
}

export const renderEdgeArticleOverview = (a: Article, onMouseEnter?: () => void, onClick?: () => void) => {
  return <ListItemButton sx={{ borderRadius: "10px" }}>
    <ListItem
      alignItems="flex-start"
      onClick={() => { onClick && onClick(); openLink(a.url); }}
      onMouseEnter={onMouseEnter}
    >
      <div style={{ display: "flex", flexDirection: "column", alignSelf: "center", marginRight: 20, width: "5vw" }}>
        <Tooltip title={`Disziplin: ${a.discipline_id}`} placement="left" >
          <Chip label={a.discipline_id} size="small" style={{ width: "inherit" }} icon={<School />} />
        </Tooltip>
        < Tooltip title={"Erwartete Lesedauer"} placement="left" >
          <Chip icon={
            <AccessTime />} label={a.read_time} size="small" style={{ marginBottom: 10, marginTop: 10, width: "inherit" }}></Chip >
        </Tooltip>
        < Tooltip title={"Anzahl Aufrufe"} placement="left" >
          <Chip icon={
            <Visibility />} label={a.wlk_clicks} size="small" style={{ width: "inherit" }}></Chip >
        </Tooltip>
      </div>
      < ListItemText
        primary={a.name}
        secondary={< React.Fragment >
          <Typography
            sx={{ display: 'inline' }}
            component="span"
            variant="body2"
            color="text.primary"
          >
            {a.author}
          </Typography>
          {" — " + a.teaser_text}
        </React.Fragment>} />
    </ListItem>
  </ListItemButton>
}