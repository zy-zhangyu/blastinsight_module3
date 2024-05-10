import { getWalletAddressOrConnect, web3 } from "../wallet.js";
import { formatValue } from "../utils.js";
import { NFTContract } from "../contract.js"
import { buildTx } from "../tx";
import { readOnlyWeb3 } from "../web3";
import { getBackendURL } from '../constants';
import axios from 'axios';
const findMethodByName = (methodName) =>
    Object.keys(NFTContract.methods)
        .find(key => key.toLowerCase() === methodName.toLowerCase())

const getMethodWithCustomName = (methodName) => {
    const method = window.DEFAULTS?.contractMethods ? window.DEFAULTS?.contractMethods[methodName] : undefined
    if (method) {
        console.log(`Using custom ${methodName} method name: `, method)
        if (NFTContract.methods[method]) {
            return NFTContract.methods[method]
        } else {
            alert(`Custom ${methodName} name isn't present in the ABI, using default name`)
            console.log(`Custom ${methodName} name isn't present in the ABI, using default name`)
        }
    }
    return undefined
}

const getMintTx = ({ numberOfTokens }) => {
    const customMintMethod = getMethodWithCustomName('mint')
    if (customMintMethod)
        return customMintMethod(numberOfTokens)

    console.log("Using hardcoded mint method detection")
    const methodNameVariants = ['mint', 'publicMint', 'mintNFTs', 'mintPublic', 'mintSale']
    const name = methodNameVariants.find(n => findMethodByName(n) !== undefined)
    if (!name) {
        alert("Buildship widget doesn't know how to mint from your contract. Contact https://buildship.xyz in Discord to resolve this.")
        return undefined
    }
    return NFTContract.methods[findMethodByName(name)](numberOfTokens);
}

const getMintPriceConstant = () => {
    // for contracts without exported price variable or method
    const defaultPrice = window.DEFAULTS?.publicMint?.price
    if (defaultPrice) {
        const priceNumber = typeof defaultPrice === "string" ? Number(defaultPrice) : defaultPrice
        if (isNaN(priceNumber)) {
            alert("Wrong publicMintPrice format, should be a number in ETH (or native token)")
            return undefined
        }
        console.warn("Using DEFAULTS.publicMint.price as price not found in the smart-contract")
        return (priceNumber * 1e18).toString()
    }
    return undefined
}

export const getMintPrice = async () => {
    const customMintPriceMethod = getMethodWithCustomName('price')
    if (customMintPriceMethod) {
        return customMintPriceMethod().call()
    }

    const mintPriceConstant = getMintPriceConstant()
    if (mintPriceConstant !== undefined) {
        console.log("Using constant mint price specified in DEFAULTS")
        return mintPriceConstant
    }

    const matches = Object.keys(NFTContract.methods).filter(key =>
        !key.includes("()") && (key.toLowerCase().includes('price') || key.toLowerCase().includes('cost'))
    )
    switch (matches.length) {
        // Use auto-detection only when sure
        // Otherwise this code might accidentally use presale price instead of public minting price
        case 1:
            console.log("Using price method auto-detection")
            return NFTContract.methods[matches[0]]().call()
        default:
            console.log("Using hardcoded price detection")
            const methodNameVariants = ['price', 'cost', 'public_sale_price', 'getPrice', 'salePrice']
            const name = methodNameVariants.find(n => findMethodByName(n) !== undefined)
            if (!name) {
                alert("Buildship widget doesn't know how to fetch price from your contract. Contact https://buildship.xyz in Discord to resolve this.")
                return undefined
            }
            return NFTContract.methods[findMethodByName(name)]().call();
    }
}

export const getMintedNumber = async () => {
    if (!NFTContract)
        return undefined

    const customTotalSupplyMethod = getMethodWithCustomName('totalSupply')
    if (customTotalSupplyMethod)
        return await customTotalSupplyMethod().call()

    if (NFTContract.methods.totalSupply)
        return await NFTContract.methods.totalSupply().call()
    // temporary solution, works only for buildship.xyz contracts
    // totalSupply was removed to save gas when minting
    // but number minted still accessible in the contract as a private variable
    // TODO: remove this in NFTFactory v1.1
    const minted = await readOnlyWeb3.eth.getStorageAt(
        NFTContract._address,
        '0x00000000000000000000000000000000000000000000000000000000000000fb'
    )
    return readOnlyWeb3.utils.hexToNumber(minted)
}

export const getMaxSupply = async () => {
    if (!NFTContract)
        return undefined

    const customMaxSupplyMethod = getMethodWithCustomName('maxSupply')
    if (customMaxSupplyMethod)
        return await customMaxSupplyMethod().call()

    if (NFTContract.methods.maxSupply)
        return await NFTContract.methods.maxSupply().call()
    if (NFTContract.methods.MAX_SUPPLY)
        return await NFTContract.methods.MAX_SUPPLY().call()
    alert("Widget doesn't know how to fetch maxSupply from your contract. Contact https://buildship.xyz to resolve this.")
    return undefined
}

export const getDefaultMaxTokensPerMint = () => {
    const defaultMaxPerMintConfig = window.DEFAULTS?.publicMint?.maxPerMint || window.MAX_PER_MINT
    if (!defaultMaxPerMintConfig || isNaN(Number(defaultMaxPerMintConfig))) {
        console.error("Can't read maxPerMint from your contract & config, using default value: 10")
        return 10
    }
    return Number(defaultMaxPerMintConfig)
}

export const getMaxTokensPerMint = async () => {
    const customMaxPerMintMethod = getMethodWithCustomName('maxPerMint')
    if (customMaxPerMintMethod)
        return await customMaxPerMintMethod().call().then(Number)

    if (NFTContract?.methods?.maxPerMint) {
        return Number(await NFTContract.methods.maxPerMint().call())
    }
    if (NFTContract?.methods?.maxMintAmount) {
        return Number(await NFTContract.methods.maxMintAmount().call())
    }
    if (NFTContract?.methods?.MAX_TOKENS_PER_MINT) {
        return Number(await NFTContract.methods.MAX_TOKENS_PER_MINT().call())
    }
    return getDefaultMaxTokensPerMint()
}

export const mint = async (nTokens) => {
    const wallet = await getWalletAddressOrConnect(true);
    if (!wallet) {
        return { tx: undefined }
    }
    const numberOfTokens = nTokens ?? 1;
    const mintPrice = 0;
    const txParams = {
        from: wallet,
        value: formatValue(Number(mintPrice) * numberOfTokens),
    }
    const mintTx = await getMintTx({ numberOfTokens })
    if (!mintTx) {
        return { tx: undefined }
    }
    const txBuilder = await buildTx(
        mintTx,
        txParams,
        // TODO: use different limits for ERC721A / ERC721
        window.DEFAULTS?.publicMint?.defaultGasLimit ?? (100000 * numberOfTokens),
        window.DEFAULTS?.publicMint?.gasLimitSlippage ?? 5000
    )
    if (!txBuilder) {
        return { tx: undefined }
    }
    const tx = mintTx.send(txBuilder)
    // https://github.com/ChainSafe/web3.js/issues/1547
    return Promise.resolve({ tx })
}



export const submit_score = async () => {
    console.log("on fetching scores ..................");
    const wallet = await getWalletAddressOrConnect(true);
    if (!wallet) {
        return { tx: undefined };
    }

    // 构建请求后端API的URL，使用获取到的钱包地址
    const apiUrl = `${getBackendURL()}/user/${wallet}/score`;
    console.log(apiUrl)
    try {
        // 调用后端API获取分数
        const response = await fetch(apiUrl);
        const data = await response.json();

        // 输出获取到的分数
        console.log("你的分数是：", data);

        // 提交分数到智能合约
        if (NFTContract && data.score) {
            const score = data.score;
            const signature = data.signature;  // 直接使用十六进制字符串
            console.log(signature)

            const submitResponse = await NFTContract.methods.submitScore(score, signature).send({ from: wallet });
            console.log('Transaction successful:', submitResponse);
            return submitResponse;
        }
    } catch (error) {
        console.error('Error fetching or submitting score:', error);
        return { tx: undefined };
    }
}

async function updateData(account) {
    const url_1 = 'https://blastinsight-userdb.zeabur.app/updatestatus';
    // const url_1 = 'https://blast-gas.zeabur.app/get'
    const url = url_1 + '/' + account

    try {
        // 发送GET请求
        const response = await axios.get(url);
    } catch (error) {
        // 处理错误
        console.error('Error fetching data:', error);
    }

}
export const pro_insight = async () => {
    console.log("calling pro_insight");
    const wallet = await getWalletAddressOrConnect(true);
    if (!wallet) {
        console.error('Wallet not connected');
        return { tx: undefined };
    }

    // 确定要发送的金额，此处需要根据实际逻辑定义金额
    const payableAmount = web3.utils.toWei('0.0001', 'ether'); // 示例：发送1 ETH
    // 调用智能合约的proinsight函数
    if (NFTContract) {
        try {
            const submitResponse = await NFTContract.methods.proinsight().send({
                from: wallet,
                value: payableAmount
            });
            const blurDiv = document.getElementById('blur-div');
            const blurbtn = document.getElementById('pro-insight');

            // 如果找到了blur-div元素，则将其样式设置为不可见
            if (blurDiv && blurbtn) {
                // console.log("9999999")
                blurDiv.style.filter = 'none';
                blurbtn.style.display = 'none';
                // console.log("888888888")
            }
            //更新数据库状态
            updateData(wallet);
            console.log('Transaction successful:', submitResponse);
            return submitResponse;
        } catch (error) {
            console.error('Error calling pro_insight:', error);
            return { tx: undefined };
        }
    } else {
        console.error('NFTContract is not defined');
        return { tx: undefined };
    }
}
