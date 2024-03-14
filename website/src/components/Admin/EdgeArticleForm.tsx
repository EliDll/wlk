import { Article, Discipline, EdgeWithArticlesInfo } from "../../types/bindings"
import React, { useState } from "react";
import { Typography, TextField, FormControl, InputLabel, Select, MenuItem, Chip, Avatar, Button, Stack } from "@mui/material";
import { apiClient } from "../../App";
import { disciplineKeyToDisplayString } from "../../utils/genericHelpers";
import { OpenInFull, Timeline } from "@mui/icons-material";

type EdgeArticleFormProps = {
  onSubmit: () => void,
  onAbort: () => void,
  disciplines: Discipline[],
  edges: EdgeWithArticlesInfo[],
  apiToken: string,
  target?: Article,
}

const defaultArticle: Article = {
  author: "", //arbitrary
  date: "", //not editable, as it is never displayed
  discipline_id: "", //selection
  edge_source_id: "", //selection
  edge_target_id: "", //selection
  name: "", //not editable, will be ignored and overwritten on create query call
  read_time: "", //arbitrary
  teaser_text: "", //arbitrary
  url: "", //arbitrary
  views: 0, //not editable
  wlk_clicks: 0, //not editable
  wlk_hovers: 0 //not editable
}
export const EdgeArticleForm: React.FC<EdgeArticleFormProps> = (props) => {
  const handleConfirm = () => {
    apiClient.query(["modArticle", { data: localArticle, op: props.target ? "Update" : "Create", token: props.apiToken }]).then(props.onSubmit)
  }
  const handleCancel = () => {
    props.onAbort();
  }

  const [localArticle, setLocalArticle] = useState<Article>(props.target || defaultArticle);

  return <>
    <div style={{ display: "flex", flexFlow: "row wrap" }}>
      <Typography variant="h5" style={{ marginBottom: "1rem" }}>{props.target ? "Kantenartikel bearbeiten" : "Neuen Kantenartikel erstellen"}</Typography>
      <TextField label="Name" margin="normal" fullWidth multiline
        value={localArticle.name}
        onChange={(e) => setLocalArticle({ ...localArticle, name: e.target.value })}
        error={localArticle.name === ""}
        disabled={props.target !== undefined}
      />
      <FormControl fullWidth sx={{marginTop: "1vh"}}>
        <InputLabel id="cat-label" error={localArticle.edge_source_id == "" && localArticle.edge_target_id == ""}>Kante</InputLabel>
        <Select
          labelId="cat-label"
          id="grr"
          value={localArticle.edge_source_id + '|' + localArticle.edge_target_id}
          label="Kategorie"
          onChange={(e) => {
            const ids_array = (e.target.value as string).split('|')
            setLocalArticle({ ...localArticle, edge_source_id: ids_array[0], edge_target_id: ids_array[1] })
          }}
          error={localArticle.edge_source_id == "" && localArticle.edge_target_id == ""}
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
      <FormControl fullWidth sx={{marginTop: "2vh"}}>
        <InputLabel id="cat-label" error={props.disciplines.find(disc => disc.name === localArticle.discipline_id) === undefined}>Disziplin</InputLabel>
        <Select
          labelId="cat-label"
          id="grr"
          value={localArticle.discipline_id}
          label="Kategorie"
          onChange={(e) => setLocalArticle({ ...localArticle, discipline_id: e.target.value })}
          error={props.disciplines.find(disc => disc.name === localArticle.discipline_id) === undefined}
        >
          {props.disciplines.map(cat =>
            <MenuItem value={cat.name} key={cat.name}>
              <Chip
                label={disciplineKeyToDisplayString(cat.name)}
                avatar={<Avatar><Timeline /> </Avatar>}
              />
            </MenuItem>
          )}
        </Select>
      </FormControl>
      <TextField label="Author" margin="normal" fullWidth multiline inputProps={{ maxLength: 100 }}
        value={localArticle.author}
        onChange={(e) => setLocalArticle({ ...localArticle, author: e.target.value })}
      />
      <TextField label="URL" margin="normal" fullWidth placeholder={"Bsp.: \"https://www.bidt.digital\""} inputProps={{ maxLength: 100 }}
        value={localArticle.url}
        onChange={(e) => setLocalArticle({ ...localArticle, url: e.target.value })}
      />
      <TextField label="Erwartete Lesedauer" margin="normal" fullWidth placeholder={"Bsp.: \"6:30 min.\""} inputProps={{ maxLength: 100 }}
        value={localArticle.read_time}
        onChange={(e) => setLocalArticle({ ...localArticle, read_time: e.target.value })}
      />
      <TextField label="Teaser-Text" margin="normal" fullWidth multiline inputProps={{ maxLength: 1000 }}
        value={localArticle.teaser_text}
        onChange={(e) => setLocalArticle({ ...localArticle, teaser_text: e.target.value })}
      />

    </div>
    <div style={{ display: "flex", gap: "1vw", paddingTop: "1vh" }}>
      <Button onClick={handleCancel} variant="outlined" color="error">Abbrechen</Button>
      <Button onClick={handleConfirm} variant="outlined" disabled={localArticle.name === "" || (localArticle.edge_source_id === "" && localArticle.edge_target_id === "")}>Bestätigen</Button>
    </div>
  </>
}
