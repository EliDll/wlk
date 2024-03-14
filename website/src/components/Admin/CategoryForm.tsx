import { Category } from "../../types/bindings"
import React, { useState } from "react";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { apiClient } from "../../App";
import { ErrorOutline } from "@mui/icons-material";

type CategoryFormProps = {
  onSubmit: () => void,
  onAbort: () => void,
  categories: Category[],
  apiToken: string,
}

const baseCategory: Category = {
  name: ""
}

export const CategoryForm: React.FC<CategoryFormProps> = (props) => {
  const handleConfirm = () => {
    apiClient.query(["modCategory", { data: localCategory, op: "Create", token: props.apiToken }]).then(props.onSubmit)
  }
  const handleCancel = () => {
    props.onAbort();
  }

  const [localCategory, setLocalCategory] = useState<Category>(baseCategory);

  const alreadyExists = props.categories.find(cat => cat.name === localCategory.name) !== undefined

  return <>
    <div style={{ display: "flex", flexFlow: "row wrap" }}>
      <Typography variant="h5" style={{ marginBottom: "1rem" }}>{"Neue Kategorie erstellen"}</Typography>
      <TextField label="Bezeichnung" margin="normal" fullWidth multiline inputProps={{ maxLength: 100 }}
        value={localCategory.name}
        onChange={(e) => setLocalCategory({ ...localCategory, name: e.target.value })}
      />
    </div>
    {alreadyExists && <Stack direction={"row"} sx={{ placeItems: "center center" }} gap="1vw">
      <ErrorOutline color="error"></ErrorOutline>
      <Typography color="error">{`Eine Kategorie mit diesem Namen existiert bereits`}</Typography>
    </Stack>
    }
    <div style={{ display: "flex", gap: "1vw", paddingTop: "1vh" }}>
      <Button onClick={handleCancel} variant="outlined" color="error">Abbrechen</Button>
      <Button onClick={handleConfirm} variant="outlined" disabled={alreadyExists}>Bestätigen</Button>
    </div>
  </>
}