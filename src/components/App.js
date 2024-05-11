// import React from "react";
// import AutoHideAlert, { alertRef } from "./AutoHideAlert.js";
// import MintModal, { modalRef } from "./MintModal.js";
// import ScoreModal, { scoreModalRef } from "./ShowScoreModal.js";
// import ProSightModal, { proSightModalRef } from "./ProSightModal.js";
// import { ThemeProvider } from "@mui/material";
// import { theme } from "../styles/theme.js";

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
import Web3 from '../web3.js';
export const App = () => {
    useEffect(() => {
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.on('accountsChanged', async function (accounts) {
                await updateWalletStatus();
            });
        }
    }, []); // 空数组作为依赖，表示只在组件挂载时执行一次
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
}
