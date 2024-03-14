import { Article, Edge, EdgeWithArticlesInfo } from "../../types/bindings"
import React, { useEffect, useState } from "react";
import { Button, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import { apiClient } from "../../App";
import { ErrorOutline, OpenInFull } from "@mui/icons-material";

type EdgeDeletionFormProps = {
  onSubmit: () => void,
  onAbort: () => void,
  edges: EdgeWithArticlesInfo[],
  articles: Article[],
  apiToken: string,
}

export const EdgeDeletionForm: React.FC<EdgeDeletionFormProps> = (props) => {
  const handleConfirm = () => {
    if (selectedEdge) {
      apiClient.query(["modEdge", { data: selectedEdge, op: "Delete", token: props.apiToken }]).then(props.onSubmit)
    }
  }
  const handleCancel = () => {
    props.onAbort();
  }

  const [selectedEdge, setSelectedEdge] = useState<Edge | undefined>();
  const [articleConflicts, setArticleConflicts] = useState<Article[]>([]);

  useEffect(() => {
    if (selectedEdge) setArticleConflicts(props.articles.filter(article => article.edge_source_id === selectedEdge.source_id && article.edge_target_id === selectedEdge.target_id));
  }, [props.articles, selectedEdge]);

  return <>
    <div style={{ display: "flex", flexFlow: "row wrap" }}>
      <Typography variant="h5" style={{ marginBottom: "1rem" }}>{"Kante entfernen"}</Typography>
      <FormControl fullWidth sx={{ marginBottom: "1vh" }}>
        <InputLabel id="edge-label" error={selectedEdge === undefined}>Kante</InputLabel>
        <Select
          labelId="edge-label"
          id="grr"
          value={selectedEdge?.source_id ? selectedEdge?.source_id + '|' + selectedEdge?.target_id : undefined}
          label="Kante"
          onChange={(e) => {
            const ids_array = (e.target.value as string).split('|')
            //console.log(ids_array)
            setSelectedEdge(props.edges.find(edge => edge.source_id === ids_array[0] && edge.target_id === ids_array[1]))
          }}
          error={selectedEdge === undefined}
        >
          {props.edges.map(edge =>
            <MenuItem value={edge.source_id + '|' + edge.target_id} key={edge.source_id + "|" + edge.target_id}>
              <Stack direction={"row"} gap={"1vw"}>
                <Typography variant="body2" noWrap={true}>{edge.source_id}</Typography>
                <OpenInFull sx={{ placeSelf: "center center" }}></OpenInFull>
                <Typography variant="body2" noWrap={true}>{edge.target_id}</Typography>
              </Stack>
            </MenuItem>
          )}
        </Select>
      </FormControl>
      {articleConflicts.length > 0 ?
        <>
          <Stack direction={"row"} sx={{ placeItems: "center center" }} gap="1vw">
            <ErrorOutline color="error"></ErrorOutline>
            <Typography color="error">{`Diese Kante kann nicht entfernt werden, da noch Artikel darauf verweisen:`}</Typography>
          </Stack>
          <Stack direction={"column"}>
            {articleConflicts.map(article =>
              <Typography key={article.name}>{article.name}</Typography>
            )}
          </Stack>
        </>
        :
        <>
          {selectedEdge !== undefined && <Typography>{`Soll diese Kante wirklich entfernt werden?`}</Typography>}
        </>
      }
    </div>
    <div style={{ display: "flex", gap: "1vw", paddingTop: "1vh" }}>
      <Button onClick={handleCancel} variant="outlined" color="error">Abbrechen</Button>
      <Button onClick={handleConfirm} variant="outlined" disabled={selectedEdge === undefined || articleConflicts.length > 0}>Bestätigen</Button>
    </div>
  </>
}