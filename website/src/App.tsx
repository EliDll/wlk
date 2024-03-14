import React from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";


import GlossarPage from './pages/GlossarPage';
import { ThemeProvider } from '@emotion/react';
import { createTheme, responsiveFontSizes } from '@mui/material';
import { createClient, FetchTransport } from '@rspc/client';
import { Procedures } from './types/bindings';
import AdminPage from './pages/AdminPage';

let theme = createTheme({
  palette: {
    primary: {
      light: '#ffffff',
      main: '#002951',
      dark: '#4052b3',
      contrastText: '#000',
    },
    secondary: {
      light: '#ffffff',
      main: '#002951',
      dark: '#4052b3',
      contrastText: '#000',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff'
    }
  },
});
theme = responsiveFontSizes(theme);

// RSPC API client
export const apiClient = createClient<Procedures>({
  transport: new FetchTransport("http://localhost:5000/api/rspc"),
});

/**
   * Entry point and page routing
   * @returns component : {JSX.Element}
   */
const App: React.FC = () => {
  return <>
    <div className="App" style={{ fontFamily: "roboto" }}>
      <Router>
        <ThemeProvider theme={theme}>
          <Routes>
            <Route path="/" element={<GlossarPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </ThemeProvider>
      </Router>
    </div>
  </>
}

export default App;
