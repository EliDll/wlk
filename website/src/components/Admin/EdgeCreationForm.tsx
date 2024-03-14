import { Edge, Node, EdgeWithArticlesInfo } from "../../types/bindings"
import React, { useEffect, useState } from "react";
import { apiClient } from "../../App";
import { Button, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";

type EdgeCreationFormProps = {
  onSubmit: () => void,
  onAbort: () => void,
  edges: EdgeWithArticlesInfo[],
  nodes: Node[],
  apiToken: string,
}

const baseEdge: Edge = {
  source_id: "",
  target_id: ""
}

export const EdgeCreationForm: React.FC<EdgeCreationFormProps> = (props) => {
  const handleConfirm = () => {
      apiClient.query(["modEdge", { data: localEdge, op: "Create", token: props.apiToken }]).then(props.onSubmit)
  }
  const handleCancel = () => {
    props.onAbort();
  }

  const [localEdge, setLocalEdge] = useState<Edge>(baseEdge);

  const [sourceOptions] = useState<string[]>(props.nodes.map(node => node.name));
  const [targetOptions, setTargetOptions] = useState<string[]>([]);

  useEffect(() => {
    const blacklist: string[] = [];
    props.edges.map(edge => {
      if(edge.source_id === localEdge.source_id){
        //rule out existing edges
        blacklist.push(edge.target_id)
      }else if(edge.target_id === localEdge.source_id){
        //also rule out symmetric edges
        blacklist.push(edge.source_id)
      }
      blacklist.push(localEdge.source_id);
      setTargetOptions(props.nodes.map(node => node.name).filter(nodeName => !blacklist.includes(nodeName)));
    })
  }, [localEdge, props.edges, props.nodes])

  
  return <>
  <div style={{ display: "flex", flexFlow: "row wrap" }}>
    <Typography variant="h5" style={{ marginBottom: "1rem" }}>{"Kante erstellen"}</Typography>
    <FormControl fullWidth sx={{ marginBottom: "1vh" }}>
      <InputLabel id="edge-label" error={localEdge.source_id === ""}>Knoten 1</InputLabel>
      <Select
        labelId="edge-label"
        id="grr"
        value={localEdge.source_id}
        label="Knoten 1"
        onChange={(e) => setLocalEdge({...localEdge, source_id: e.target.value, target_id: ""})}
        error={localEdge.source_id === ""}
      >
        {sourceOptions.map(nodeName =>
          <MenuItem value={nodeName} key={nodeName}>
              <Typography variant="body2" noWrap={true}>{nodeName}</Typography>
          </MenuItem>
        )}
      </Select>
    </FormControl>
    <FormControl fullWidth sx={{ marginBottom: "1vh" }}>
      <InputLabel id="edge-label" error={localEdge.source_id !== "" && localEdge.target_id === ""}>Knoten 2</InputLabel>
      <Select
        labelId="edge-label"
        id="grr"
        value={localEdge.target_id}
        label="Knoten 2"
        disabled={localEdge.source_id === ""}
        onChange={(e) => setLocalEdge({...localEdge, target_id: e.target.value})}
        error={localEdge.target_id === ""}
      >
        {targetOptions.map(nodeName =>
          <MenuItem value={nodeName} key={nodeName}>
              <Typography variant="body2" noWrap={true}>{nodeName}</Typography>
          </MenuItem>
        )}
      </Select>
    </FormControl>
  </div>
  <div style={{ display: "flex", gap: "1vw", paddingTop: "1vh" }}>
    <Button onClick={handleCancel} variant="outlined" color="error">Abbrechen</Button>
    <Button onClick={handleConfirm} variant="outlined" disabled={localEdge.source_id === "" || localEdge.target_id === ""}>Bestätigen</Button>
  </div>
</>
}