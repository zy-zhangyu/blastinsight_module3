import React, { useEffect, useState } from 'react';
import { Box, Button, Skeleton, Slider } from '@mui/material';
import {
    pro_insight
} from '../mint/web3';
import { showAlert } from './AutoHideAlert';
import { parseTxError, roundToDecimal } from '../utils';
import { Attribution } from './Attribution';
import { isEthereumContract } from "../contract";

export const QuantityModalStep = ({ setQuantity, setIsLoading, setTxHash, setStep }) => {
    const [quantityValue, setQuantityValue] = useState(1)
    const [maxTokens, setMaxTokens] = useState(3)
    const [mintPrice, setMintPrice] = useState(0)
    const [mintedNumber, setMintedNumber] = useState(0)
    const [totalNumber, setTotalNumber] = useState(10000)
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isEthereumContract()) {
            // Simulate fetching mint price
            setMintPrice(0); // Set a fixed value
        }
        setMaxTokens(3);
        // Simulate fetching minted number and total number
        if (!window.DEFAULTS?.hideCounter) {
            setMintedNumber(0); // Set a fixed value
            setTotalNumber(10000); // Set a fixed value
        }
    }, [])

    const maxRange = maxTokens ?? 10
    const maxTokensTooLarge = maxRange >= 20
    const step = !maxTokensTooLarge ? Math.max(maxRange, 1) : 10
    const marks = [
        ...[...Array(Math.floor(maxRange / step) + 1)].map((_, i) => 1 + i * step),
        ...(maxTokensTooLarge ? [maxRange + 1] : [])
    ].map(m => ({
        value: Math.max(1, m - 1),
        label: (maxTokens !== undefined || m === 1)
            ? (Math.max(1, m - 1)).toString()
            : <Skeleton width="10px" height="30px" sx={{ mt: -2 }} />
    }))

    const onSuccess = async () => {
        console.log('pro_insight777777')
        setIsLoading(true)
        const { tx } = await pro_insight()
        console.log("pro_insight666666666")
        setSuccess(true); // 设置成功状态为 true
        console.log("pro_insight888888888")
        if (tx === undefined) {
            setIsLoading(false)
        }

        tx?.on("transactionHash", (hash) => {
            setTxHash(hash)
        })?.on("confirmation", async () => {
            console.log("1111111111")
            setIsLoading(false)
            showAlert(`Successfully minted your score${window.DEFAULTS?.redirectURL ? ". You will be redirected in less than a second" : ""}`, "success")
            console.log("121223232")

            // TODO: show success state in the modal
            if (window.DEFAULTS?.redirectURL) {
                setTimeout(() => {
                    window.location.href = window.DEFAULTS?.redirectURL
                    console.log("222222222")
                }, 800)
            }
        })?.on("error", (e) => {
            setIsLoading(false)
            const { code, message } = parseTxError(e);
            if (code !== 4001) {
                showAlert(`Minting error: ${message}. Please try again or contact us`, "error");
            }
        })
    }
    return (
        <>
            {!success && ( // 如果成功状态为 false，显示按钮、计数器和属性的 div 元素
                <div style={{ width: "100%" }}>
                    <Button
                        onClick={onSuccess}
                        sx={{ mt: maxRange > 1 ? 4 : 2, width: "100%" }}
                        variant="contained"
                    >
                        {mintPrice !== undefined
                            ? mintPrice !== 0
                                ? `Mint for ${roundToDecimal(mintPrice * quantityValue, 4)} ETH`
                                : "Buy a Pro InSight"
                            : "Mint"}
                    </Button>
                    {!window.DEFAULTS?.hideCounter && (
                        <Box
                            sx={{
                                color: (theme) => theme.palette.grey[500],
                                display: "flex",
                                fontWeight: 400,
                                fontSize: 14,
                                justifyContent: "center",
                                mt: 2
                            }}
                        >
                            {/* 计数器组件 */}
                        </Box>
                    )}
                    <Attribution sx={{ mt: 3, justifyContent: "center" }} />
                </div>
            )}
        </>
    );
};