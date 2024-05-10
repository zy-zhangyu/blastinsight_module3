import React from "react";
import AutoHideAlert, {alertRef} from "./AutoHideAlert.js";
import MintModal, {modalRef} from "./MintModal.js";
import ScoreModal, {scoreModalRef} from "./ShowScoreModal.js";
import ProSightModal, {proSightModalRef} from "./ProSightModal.js";
import {ThemeProvider} from "@mui/material";
import {theme} from "../styles/theme.js";

export const App = () => {
    return <ThemeProvider theme={theme}>
        <div>
            <AutoHideAlert ref={alertRef} />
            <MintModal ref={modalRef} />
            <ScoreModal ref={scoreModalRef} />
            <ProSightModal ref={proSightModalRef} />
        </div>
    </ThemeProvider>
}
