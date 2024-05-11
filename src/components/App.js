// import React from "react";
// import AutoHideAlert, {alertRef} from "./AutoHideAlert.js";
// import MintModal, {modalRef} from "./MintModal.js";
// import ScoreModal, {scoreModalRef} from "./ShowScoreModal.js";
// import ProSightModal, {proSightModalRef} from "./ProSightModal.js";
// import {ThemeProvider} from "@mui/material";
// import {theme} from "../styles/theme.js";

// export const App = () => {
//     return <ThemeProvider theme={theme}>
//         <div>
//             <AutoHideAlert ref={alertRef} />
//             <MintModal ref={modalRef} />
//             <ScoreModal ref={scoreModalRef} />
//             <ProSightModal ref={proSightModalRef} />
//         </div>
//     </ThemeProvider>
// }

import React, { useEffect } from "react";
import AutoHideAlert, { alertRef } from "./AutoHideAlert.js";
import MintModal, { modalRef } from "./MintModal.js";
import ScoreModal, { scoreModalRef } from "./ShowScoreModal.js";
import ProSightModal, { proSightModalRef } from "./ProSightModal.js";
import { ThemeProvider } from "@mui/material";
import { theme } from "../styles/theme.js";
import { updateWalletStatus } from "../wallet.js";

export const App = () => {
    useEffect(() => {
        const account = web3.eth.accounts[0];
        const accountInterval = setInterval(() => {
            if (web3.eth.accounts[0] !== account) {
                account = web3.eth.accounts[0];
                updateWalletStatus();
            }
        }, 100);

        return () => {
            clearInterval(accountInterval);
        };
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <div>
                <AutoHideAlert ref={alertRef} />
                <MintModal ref={modalRef} />
                <ScoreModal ref={scoreModalRef} />
                <ProSightModal ref={proSightModalRef} />
            </div>
        </ThemeProvider>
    );
};

