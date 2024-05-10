import { getMaxSupply, getMintedNumber} from "./web3.js";
import { showMintModal } from "../components/MintModal";

import { showScoreModal } from "../components/ShowScoreModal.js";
import { showProSightModal } from "../components/ProSightModal.js";

// export const updateStrategy6Button = () => {
//     const strategy6Buttons = [...document.querySelectorAll('#strategy_6-button')];

//     if (strategy6Buttons.length) {
//         strategy6Buttons.forEach((button) => {
//             button.href = "#";
//             button.onclick = async () => {
//                 // 这里可以添加逻辑来处理点击事件，例如显示策略6的模态框
//                 ShowStrategiesModal("6");
//             };
//         });
//     }
// };



export const proInsightButton = () => {
    const submmitButtons = [
        ...document.querySelectorAll('#pro-insight'),
        ...document.querySelectorAll("a[href*='#pro-insight']")
    ]

    if (submmitButtons) {
        console.log(submmitButtons)
        submmitButtons.forEach((mintButton) => {
            mintButton.href = "#"
            mintButton.onclick = async () => {
                const initialBtnText = mintButton.textContent;
                setButtonText(mintButton, "Loading...")
                try {
                    const quantity = getMintQuantity();
                    showProSightModal(quantity);
                } catch (e) {
                    console.log("Error on pressing mint")
                    console.error(e)
                    alert(`Error on mint: ${e}`)
                }
                setButtonText(mintButton, initialBtnText)
            }
        })
    }
}




export const submitScoreButton = () => {
    const submmitButtons = [
        ...document.querySelectorAll('#submit-score'),
        ...document.querySelectorAll("a[href*='#submit-score']")
    ]

    if (submmitButtons) {
        console.log(submmitButtons)
        submmitButtons.forEach((mintButton) => {
            mintButton.href = "#"
            mintButton.onclick = async () => {
                const initialBtnText = mintButton.textContent;
                setButtonText(mintButton, "Loading...")
                try {
                    const quantity = getMintQuantity();
                    showScoreModal(quantity);
                } catch (e) {
                    console.log("Error on pressing mint")
                    console.error(e)
                    alert(`Error on mint: ${e}`)
                }
                setButtonText(mintButton, initialBtnText)
            }
        })
    }
}



export const updateMintButton = () => {
    const submmitButtons = [
        ...document.querySelectorAll('#mint-button'),
        ...document.querySelectorAll("a[href*='#mint-button']")
    ]

    if (submmitButtons) {
        console.log(submmitButtons)
        submmitButtons.forEach((submitButton) => {
            submitButton.href = "#"
            submitButton.onclick = async () => {
                const initialBtnText = submitButton.textContent;
                setButtonText(submitButton, "Loading...")
                try {
                    const quantity = getMintQuantity();
                    showMintModal(quantity);
                } catch (e) {
                    console.log("Error on pressing mint")
                    console.error(e)
                    alert(`Error on mint: ${e}`)
                }
                setButtonText(submitButton, initialBtnText)
            }
        })
    }
}

export const updateMintedCounter = async () => {
    // just test
}

const getMintQuantity = () => {
    const quantity = document.querySelector('#quantity-select')?.value
    return quantity !== '' && quantity !== undefined ? Number(quantity) : undefined;
}

const setButtonText = (btn, text) => {
    if (btn.childElementCount > 0) {
        btn.children[0].textContent = text;
    } else {
        btn.textContent = text;
    }
}
