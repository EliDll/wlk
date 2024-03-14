import { AppBar, Box, Button, Checkbox, CssBaseline, FormControlLabel, Grid, IconButton, Paper, TextField, Toolbar, Typography, Avatar, Tooltip, Dialog, DialogContent, Stack } from "@mui/material";
import React, { useState } from "react";
import { DeleteForever, Logout, Refresh, SupervisorAccount } from "@mui/icons-material";
import backgroundImg from ".././assets/images/bidt-bg.png";
import AdminPanel from "../components/Admin/AdminPanel";
import { apiClient } from "../App";
import { LoginResponse } from "../types/bindings";
import { Footer } from "../components/Footer";
import jwt_decode from 'jwt-decode';

const LOGIN_TOKEN_KEY = "loginToken";
type TokenType = {
  email: string,
  role: string,
  exp: number
}

/**
 * Admin page
 *
 * @returns component : {JSX.Element}
 */
export const AdminPage: React.FC = () => {
  const loadToken = () => {
    const tkn = localStorage.getItem(LOGIN_TOKEN_KEY)
    if (tkn !== null) { // valid age check
      const dec_tkn: TokenType = jwt_decode(tkn)
      //console.log(dec_tkn)
      //console.log(Date.now())
      if (dec_tkn.exp*1000 < Date.now()) {
        //console.log("deleted")
        localStorage.removeItem(LOGIN_TOKEN_KEY)
        return null
      }
    }
    return tkn
  };
  const [token, setToken] = useState<string | null>(loadToken());
  const [login, setLogin] = useState<boolean>(true); //true shows login, false register
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberUser, setRememberUser] = useState(false);

  const [adminPanelKey, setAdminPanelKey] = useState("0");
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  const [deleteAllVerification, setDeleteAllVerification] = useState("");

  const submitHandler = async () => {
    const response = await apiClient.query([
      login ? "login" : "register",
      { email: username, password: password },
    ]);
    console.log(response);
    if (login) {
      const token = (response as LoginResponse).token
      setToken(token);
      if (token && rememberUser) localStorage.setItem(LOGIN_TOKEN_KEY, token);
    }
  };

  const deleteAllHandler = async () => {
    await apiClient.query(["deleteAllData", { token: token || "" }]).catch(e => console.log(e))
    setDeleteAllDialog(false)
    setAdminPanelKey(adminPanelKey === "0" ? "1" : "0") // refresh page
  };

  const deleteConfirmPassphrase = "sudo"

  return (
    <>
    <Dialog open={deleteAllDialog} onClose={() => setDeleteAllDialog(false)}>
      <DialogContent>
        <Stack>
          <Box>
            <Typography align="center">Sollen wirklich alle Kanten, Knoten, Artikel, Disziplinen und Kategorien endgültig gelöscht werden? Um hiermit fortzufahren, muss das Folgende wiederholt werden: </Typography>
            <Typography align="center" fontSize={20} color="red">{deleteConfirmPassphrase} </Typography>
          </Box>
          <TextField onChange={(e)=>setDeleteAllVerification(e.target.value)}></TextField>
          <Button sx={{marginTop: "5px"}} color="warning" variant="contained" size="large" disabled={deleteAllVerification !== deleteConfirmPassphrase} onClick={deleteAllHandler}>Alles Löschen</Button>
        </Stack>
      </DialogContent>
    </Dialog>
      {token ?
        <Box sx={{ display: "flex" }}>
          <CssBaseline />
          <AppBar position="absolute" style={{ backgroundColor: "#39D098" }}>
            <Toolbar sx={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", placeItems: "end center", gap: "1vw" }}>
                <Typography sx={{ display: 'inline' }}
                  component="span"
                  variant="h5"
                  color="text.primary">
                  {"bidt Wissenslandkarte"}
                </Typography>
                <Typography sx={{ display: 'inline' }}
                  component="span"
                  variant="button"
                  color="text.primary">
                  {"Admin Dashboard"}
                </Typography>
              </div>
              <div>
                <Tooltip title={"Delete all data"}>
                  <IconButton sx={{ marginRight: "1vw" }}>
                    <DeleteForever onClick={()=>setDeleteAllDialog(true)} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={"Daten neu laden"}>
                  <IconButton sx={{ marginRight: "1vw" }}>
                    <Refresh onClick={() => { setAdminPanelKey(adminPanelKey === "0" ? "1" : "0") }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={"Abmelden"}>
                  <IconButton>
                    <Logout onClick={() => { setToken(null); localStorage.removeItem(LOGIN_TOKEN_KEY); }} />
                  </IconButton>
                </Tooltip>
              </div>
            </Toolbar>
          </AppBar>
          <AdminPanel apiToken={token} key={"panel-" + adminPanelKey}></AdminPanel>
        </Box>
        :
        <Grid container component="main" sx={{ height: "100vh" }}>
          <Grid item xs={false} sm={4} md={7} sx={{ backgroundImage: `url(${backgroundImg})`, backgroundSize: "cover", backgroundPosition: "center", }} />
          <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square >
            <Box sx={{ my: 8, mx: 4, display: "flex", flexDirection: "column", alignItems: "center", }}>
              <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
                <SupervisorAccount />
              </Avatar>
              <Typography variant="h5">
                {login ? "Anmelden" : "Neuen Nutzer registrieren"}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <TextField
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  margin="normal"
                  fullWidth
                  label="Username"
                />
                <TextField
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  fullWidth
                  label="Password"
                  type="password"
                />
                <div style={{ display: "flex", gap: "1vw", margin: "1vw 1vh" }}>
                  <Typography variant="body1">
                    {login ? "Neu hier?" : "Bereits existierender Nutzer?"}
                  </Typography>
                  <Typography variant="body1" onClick={() => setLogin(!login)} style={{ cursor: "pointer", textDecoration: "underline" }} >
                    {login ? "Account registrieren" : "Zur Anmeldung"}
                  </Typography>
                </div>
                <Button disabled={password === "" || username === ""} fullWidth variant="contained" sx={{ mt: 3, mb: 2, background: "#39D098" }} onMouseUp={() => submitHandler()} >
                  {login ? "Anmelden" : "Registrieren"}
                </Button>
                {login &&
                  <FormControlLabel
                    control={<Checkbox value="remember" color="primary" />}
                    label="Anmeldedaten merken"
                    value={rememberUser}
                    onChange={(_e, checked) => setRememberUser(checked)}
                  />
                }
                <Footer />
              </Box>
            </Box>
          </Grid>
        </Grid>}
    </>
  );
};

export default AdminPage;
