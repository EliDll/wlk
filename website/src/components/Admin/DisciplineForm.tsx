import { Category, Discipline } from "../../types/bindings"
import React, { useState } from "react";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { apiClient } from "../../App";
import { ErrorOutline } from "@mui/icons-material";

type DisciplineFormProps = {
  onSubmit: () => void,
  onAbort: () => void,
  disciplines: Discipline[],
  apiToken: string,
}

const baseCategory: Category = {
  name: ""
}

export const DisciplineForm: React.FC<DisciplineFormProps> = (props) => {
  const handleConfirm = () => {
    apiClient.query(["modDiscipline", { data: localDiscipline, op: "Create", token: props.apiToken }]).then(props.onSubmit)
  }
  const handleCancel = () => {
    props.onAbort();
  }

  const [localDiscipline, setLocalDiscipline] = useState<Category>(baseCategory);

  const alreadyExists = props.disciplines.find(disc => disc.name === localDiscipline.name) !== undefined

  return <>
    <div style={{ display: "flex", flexFlow: "row wrap" }}>
      <Typography variant="h5" style={{ marginBottom: "1rem" }}>{"Neue Disziplin erstellen"}</Typography>
      <TextField label="Bezeichnung" margin="normal" fullWidth multiline inputProps={{ maxLength: 100 }}
        value={localDiscipline.name}
        onChange={(e) => setLocalDiscipline({ ...localDiscipline, name: e.target.value })}
      />
    </div>
    {alreadyExists && <Stack direction={"row"} sx={{ placeItems: "center center" }} gap="1vw">
      <ErrorOutline color="error"></ErrorOutline>
      <Typography color="error">{`Eine Disziplin mit diesem Namen existiert bereits`}</Typography>
    </Stack>
    }
    <div style={{ display: "flex", gap: "1vw", paddingTop: "1vh" }}>
      <Button onClick={handleCancel} variant="outlined" color="error">Abbrechen</Button>
      <Button onClick={handleConfirm} variant="outlined" disabled={alreadyExists}>Bestätigen</Button>
    </div>
  </>
}