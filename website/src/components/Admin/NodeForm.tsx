import { Category, Node } from "../../types/bindings"
import React, { useState } from "react";
import { Button, Avatar, Chip, FormControl, TextField, Typography, MenuItem, Select, InputLabel } from "@mui/material";
import { getCategoryColor } from "../../definitions/colors";
import { categoryKeyToDisplayString } from "../../utils/genericHelpers";
import { apiClient } from "../../App";

type NodeFormProps = {
  onSubmit: () => void,
  onAbort: () => void,
  categories: Category[],
  apiToken: string,
  target?: Node,
}

const defaultNode: Node = {
  author: "", //arbitrary
  category_id: "", //selection
  name: "", //arbitrary non empty
  read_time: "", //arbitrary
  teaser_text: "", //arbitrary
  url: "", //arbitrary
  views: 0, //not editable
  wlk_clicks: 0, //not editable
  wlk_hovers: 0 //not editable
}

export const NodeForm: React.FC<NodeFormProps> = (props) => {
  const handleConfirm = () => {
    apiClient.query(["modNode", {data: localNode, op: props.target ? "Update" : "Create", token: props.apiToken}]).then(props.onSubmit)
  }

  const handleCancel = () => {
    props.onAbort();
  }

  const [localNode, setLocalNode] = useState<Node>(props.target || defaultNode);

  return <>
  <div style={{display: "flex", flexFlow: "row wrap"}}>
    <Typography variant="h5" style={{ marginBottom: "1rem" }}>{props.target ? "Knoten bearbeiten" : "Neuen Knoten erstellen"}</Typography>
    <TextField label="Name" margin="normal" fullWidth
    disabled={props.target !== undefined}
    value={localNode.name}
    onChange={(e) => setLocalNode({...localNode, name: e.target.value})}
    error={localNode.name === ""}
    />
    <FormControl fullWidth sx={{marginTop: "1vh"}}>
      <InputLabel id="cat-label" error={props.categories.find(cat => cat.name === localNode.category_id) === undefined}>Kategorie</InputLabel>
      <Select
        labelId="cat-label"
        id="grr"
        value={localNode.category_id}
        label="Kategorie"
        onChange={(e) => setLocalNode({ ...localNode, category_id: e.target.value })}
        error={props.categories.find(cat => cat.name === localNode.category_id) === undefined}
      >
        {props.categories.map(cat =>
          <MenuItem value={cat.name} key={cat.name}>
            <Chip
              label={categoryKeyToDisplayString(cat.name)}
              avatar={<Avatar sx={{ bgcolor: getCategoryColor(cat.name) }}> </Avatar>}
            />
          </MenuItem>
        )}
      </Select>
    </FormControl>
    <TextField label="Author" margin="normal" fullWidth multiline inputProps={{ maxLength: 100 }}
    value={localNode.author}
    onChange={(e) => setLocalNode({...localNode, author: e.target.value})}
    />
    <TextField label="URL" margin="normal" fullWidth placeholder={"Bsp.: \"https://www.bidt.digital\""} inputProps={{ maxLength: 100 }}
    value={localNode.url}
    onChange={(e) => setLocalNode({...localNode, url: e.target.value})}
    />
    <TextField label="Erwartete Lesedauer" margin="normal" fullWidth placeholder={"Bsp.: \"6:30 min.\""} inputProps={{ maxLength: 100 }}
    value={localNode.read_time}
    onChange={(e) => setLocalNode({...localNode, read_time: e.target.value})}
    />
    <TextField label="Teaser-Text" margin="normal" fullWidth multiline inputProps={{ maxLength: 1000 }}
    value={localNode.teaser_text}
    onChange={(e) => setLocalNode({...localNode, teaser_text: e.target.value})}
    />

    </div>
    <div style={{display: "flex", gap: "1vw", paddingTop: "1vh"}}>
    <Button onClick={handleCancel} variant="outlined" color="error">Abbrechen</Button>
    <Button onClick={handleConfirm} variant="outlined" disabled={localNode.name === ""}>Bestätigen</Button>
    </div>
  </>
}
