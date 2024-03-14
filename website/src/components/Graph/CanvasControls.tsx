import { ZoomOut, ZoomIn, RestartAlt, ChevronLeft, ExpandLess, ExpandMore, ChevronRight, FilterCenterFocus } from "@mui/icons-material";
import { Card, FormControl, Stack, Slider, ButtonGroup, Tooltip, IconButton, Box } from "@mui/material";
import React from "react";


export type CanvasControlProps = {
    zoomLevel: number,
    onZoom: (n: number) => void
    onLeft: () => void,
    onRight: () => void,
    onUp: () => void,
    onDown: () => void,
    onCenter: () => void,
    onReset: () => void,
}

export const CanvasControls: React.FC<CanvasControlProps> = (props) => {

    const panningImpossible = props.zoomLevel <= 1;

    return <Card sx={{ padding: "1vh" }}>
        <FormControl>
            <Stack spacing={2} direction="row" alignItems="center">
                <Tooltip title="Verkleinern" placement="top">
                    <IconButton onClick={() => props.onZoom(props.zoomLevel - 0.1)}>
                        <ZoomOut />
                    </IconButton>
                </Tooltip>
                <Slider
                    aria-label="zoom"
                    defaultValue={1}
                    step={0.02}
                    size="small"
                    min={0.5}
                    max={2}
                    value={props.zoomLevel}
                    onChange={(e, newValue: number | number[]) => props.onZoom(newValue as number)}
                />
                <Tooltip title="Vergrößern" placement="top">
                    <IconButton onClick={() => props.onZoom(props.zoomLevel + 0.1)}>
                        <ZoomIn />
                    </IconButton>
                </Tooltip>
            </Stack>
            <ButtonGroup variant="outlined" aria-label="outlined button group" sx={{ display: "flex", placeItems: "center center" }}>
                <Tooltip title="Zurücksetzen" placement="bottom">
                    <IconButton onClick={props.onReset}>
                        <RestartAlt />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Schritt nach links" placement="bottom">
                    <IconButton onClick={props.onLeft} disabled={panningImpossible}>
                        <ChevronLeft />
                    </IconButton>
                </Tooltip>
                <Box sx={{ display: "flex", flexDirection: "column", placeItems: "center center" }}>
                    <Tooltip title="Schritt nach oben" placement="bottom">
                        <IconButton onClick={props.onUp} disabled={panningImpossible}>
                            <ExpandLess />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Schritt nach unten" placement="bottom">
                        <IconButton onClick={props.onDown} disabled={panningImpossible}>
                            <ExpandMore />
                        </IconButton>
                    </Tooltip>
                </Box>
                <Tooltip title="Schritt nach rechts" placement="bottom">
                    <IconButton onClick={props.onRight} disabled={panningImpossible}>
                        <ChevronRight />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Zentrieren" placement="bottom">
                    <IconButton onClick={props.onCenter} disabled={panningImpossible}>
                        <FilterCenterFocus />
                    </IconButton>
                </Tooltip>
            </ButtonGroup>
        </FormControl>
    </Card>
}


export default CanvasControls;