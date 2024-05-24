import Web3 from "web3";
import Web3Modal, { injected } from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';

import { NETWORKS } from "./constants.js";
import { isMobile, objectMap } from "./utils.js";
import { setContracts } from "./contract.js";
import { updateMintedCounter } from './mint/ui';
import axios from 'axios';

export let [web3, provider] = [];

export const isWeb3Initialized = () => {
    console.log("isWeb3Initialized执行")
    return web3 && provider;
}

const getWeb3ModalProviderOptions = ({
    forceConnect,
    isMobileOnlyInjectedProvider,
    isDesktopNoInjectedProvider
}) => {
    const walletConnectOptions = {
        rpc: objectMap(NETWORKS, (value) => (value.rpcURL)),
        qrcodeModalOptions: {
            mobileLinks: [
                "rainbow",
                "zerion",
                "trust",
                "ledger",
                "gnosis"
            ],
            desktopLinks: [
                "rainbow",
                "zerion",
                "trust",
                "ledger",
                "gnosis"
            ]
        }
    }

    const basicProviderOptions = {
        walletconnect: {
            display: {
                description: "Connect Rainbow, Trust, Ledger, Gnosis, or scan QR code"
            },
            package: WalletConnectProvider,
            options: walletConnectOptions
        },
        coinbasewallet: {
            package: CoinbaseWalletSDK, // Required
            options: {
                appName: "Buildship", // Required
                rpc: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // Optional if `infuraId` is provided; otherwise it's required
                chainId: 1, // Optional. It defaults to 1 if not provided
                darkMode: false // Optional. Use dark theme, defaults to false
            }
        }
    }
    const metamaskProvider = {
        // Use custom Metamask provider because of conflicts with Coinbase injected provider
        "custom-metamask": {
            display: {
                logo: injected.METAMASK.logo,
                name: "MetaMask",
                description: "Connect to your MetaMask wallet"
            },
            package: {},
            options: {},
            connector: async (ProviderPackage, options) => {
                const mobileNotInjectedProvider = isMobile() && !window.ethereum
                // If mobile user doesn't have injected web3
                // Open the website in the Metamask mobile app via deep link
                if (mobileNotInjectedProvider && forceConnect) {
                    const link = window.location.href
                        .replace("https://", "")
                    // TODO: add "www." ?
                    // .replace("www.", "");
                    window.open(`https://metamask.app.link/dapp/${link}`);
                    return undefined
                }

                let provider
                if (window?.ethereum?.providers?.length > 1) {
                    provider = window?.ethereum?.providers?.filter(p => p.isMetaMask)?.at(0)
                    console.log("Found multiple injected web3 providers, using Metamask")
                } else {
                    provider = window?.ethereum
                }
                console.log(" method: 'eth_requestAccounts'111111111")
                await provider?.request({ method: 'eth_requestAccounts' });
                console.log(" method: 'eth_requestAccounts'222222")

                return provider
            }
        },
    }
    // Used on desktop browsers without injected web3
    // Actually opens WalletConnect
    // TODO: start using this if MetaMask app stops crashes
    // TODO: experiment with MM + custom Infura for WalletConnect
    const fakeMetamaskProvider = {
        "custom-fake-metamask": {
            display: {
                logo: injected.METAMASK.logo,
                name: "MetaMask",
                description: "Connect MetaMask mobile wallet via QR code"
            },
            package: WalletConnectProvider,
            options: {
                rpc: objectMap(NETWORKS, (value) => (value.rpcURL)),
                qrcodeModalOptions: {
                    desktopLinks: ["metamask"]
                },
            },
            connector: async (ProviderPackage, options) => {
                const provider = new ProviderPackage(options);

                await provider.enable();

                return provider;
            }
        }
    }

    // Don't show separate Metamask option on Safari, Opera, Firefox desktop
    const allProviderOptions = isDesktopNoInjectedProvider ? basicProviderOptions : {
        ...metamaskProvider,
        ...basicProviderOptions
    }

    // Use only injected provider if it's the only wallet available
    // Built for mobile in-app browser wallets like Metamask, Coinbase
    return !isMobileOnlyInjectedProvider ? allProviderOptions : {}
}

const initWeb3Modal = (forceConnect, isMobileOnlyInjectedProvider) => {
    const isDesktopNoInjectedProvider = !isMobile() && !window.ethereum

    const web3Modal = new Web3Modal({
        cacheProvider: false,
        // Use custom Metamask provider because of conflicts with Coinbase injected provider
        // On mobile apps with injected web3, use ONLY injected providers
        disableInjectedProvider: !isMobileOnlyInjectedProvider,
        providerOptions: getWeb3ModalProviderOptions({
            forceConnect,
            isMobileOnlyInjectedProvider,
            isDesktopNoInjectedProvider
        })
    });

    return web3Modal
}

const initWeb3 = async (forceConnect = false) => {
    if (isWeb3Initialized()) return

    const isMobileOnlyInjectedProvider = isMobile() && window.ethereum
    const web3Modal = initWeb3Modal(forceConnect, isMobileOnlyInjectedProvider)

    if (web3Modal.cachedProvider || forceConnect) {
        if (web3Modal.cachedProvider === "walletconnect") {
            web3Modal.clearCachedProvider()
        }
        // this is for fixing a previous bug
        if (isMobileOnlyInjectedProvider && web3Modal.cachedProvider !== "injected") {
            web3Modal.clearCachedProvider()
        }
        provider = await web3Modal.connect();
        if (provider) {
            let providerID
            if (provider.isMetaMask)
                providerID = isMobileOnlyInjectedProvider ? "injected" : "custom-metamask"
            if (provider.isCoinbaseWallet)
                providerID = isMobileOnlyInjectedProvider ? "injected" : "coinbasewallet"

            if (providerID)
                web3Modal.setCachedProvider(providerID)
        }
        provider.on("accountsChanged", async (accounts) => {
            if (accounts.length === 0) {
                if (provider.close) {
                    await provider.close();
                }
                const walletBtn = getConnectButton();
                walletBtn.textContent = 'Connect Wallet';
                web3Modal.clearCachedProvider();
            }
            else {
                console.log("changed1111")
                const button = getConnectButton();
                button.textContent = String(accounts[0]).substring(0, 6) +
                    "..." +
                    String(accounts[0]).substring(38);
                // 更新浮动窗口中的地址
                updateFloatingWindowAddress(accounts[0]);
                const session1 = await fetchData(accounts[0]);
                if (session1 && session1.status) {
                    const blurDiv = document.getElementById('blur-div');
                    const blurbtn = document.getElementById('pro-insight');

                    // 如果找到了blur-div元素，则将其样式设置为不可见
                    if (blurDiv && blurbtn) {
                        // console.log("9999999")
                        blurDiv.style.filter = 'none';
                        blurbtn.style.display = 'none';
                        // console.log("888888888")
                    }
                }
            }
        });
    }
    web3 = provider ? new Web3(provider) : undefined;
}


export const isWalletConnected = async () => {
    if (!isWeb3Initialized()) {
        return false
    }
    const accounts = await web3.eth.getAccounts();
    return accounts?.length > 0;
}

export const getWalletAddressOrConnect = async (shouldSwitchNetwork, refresh) => {
    const currentAddress = async () => {
        if (!isWeb3Initialized()) {
            return undefined;
        }
        try {
            return (await provider?.request({ method: 'eth_requestAccounts' }))[0];
        } catch {
            await provider.enable();
            return (await web3.eth.getAccounts())[0];
        }
    }
    if (!isWeb3Initialized()) {
        await connectWallet();
        if (refresh) {
            window.location.reload();
        }
    }
    // For multi-chain dapps (multi-chain contracts on the same page)
    if (shouldSwitchNetwork ?? true) {
        await setContracts(shouldSwitchNetwork ?? true);
    }
    return await currentAddress();
}

export const getCurrentNetwork = async () => {
    return Number(await provider?.request({ method: 'net_version' }));
}

export const switchNetwork = async (chainID) => {
    if (!provider) {
        return
    }
    if (chainID === await getCurrentNetwork()) {
        console.log("Don't need to change network")
        return
    }
    const chainIDHex = `0x${chainID.toString(16)}`;
    try {
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIDHex }],
        });
    } catch (error) {
        // This error code indicates that the chain has not been added to MetaMask
        // if it is not, then install it into the user MetaMask
        if (error.code === 4902) {
            try {
                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: chainIDHex,
                            nativeCurrency: NETWORKS[chainID].currency,
                            chainName: NETWORKS[chainID].name,
                            rpcUrls: [NETWORKS[chainID].rpcURL],
                            blockExplorerUrls: [NETWORKS[chainID].blockExplorerURL]
                        },
                    ],

                });
            } catch (addError) {
                console.error(addError);
            }
        }
        console.error(error);
    }
}

const tryInitWeb3 = async (forceConnect) => {
    try {
        await initWeb3(forceConnect);
    } catch (e) {
        const message = e?.message ?? e
        const cancelMessageVariants = [
            "Modal closed by user",
            "User rejected the request",
            "User closed modal",
            "accounts received is empty"
        ]
        if (!cancelMessageVariants.find(s => message.includes(s))) {
            alert(`Error in initWeb3(${forceConnect}): ${message?.toString()}`)
            console.error(e)
        }
        return
    }
}

export const connectWallet = async () => {
    console.log("Connecting Wallet")
    await tryInitWeb3(true)
    await updateWalletStatus()
    console.log("Connected Wallet")
}

const getConnectButton = () => {
    const btnID = window.buttonID ?? '#connect';
    return document.querySelector(btnID)
        ?? document.querySelector(`a[href='${btnID}']`);
}
async function fetchData(account) {
    const url_1 = 'https://blastinsight-userdb.zeabur.app/get';
    // const url_1 = 'https://blast-gas.zeabur.app/get'
    const url = url_1 + '/' + account

    try {
        // 发送GET请求
        const response = await axios.get(url);
        return response.data
    } catch (error) {
        // 处理错误
        console.error('Error fetching data:', error);
    }

}
export const updateWalletStatus = async () => {
    const [connected, button] = await Promise.all([isWalletConnected(), getConnectButton()]);

    if (button && connected) {
        const accounts = await getWalletAddressOrConnect(true);
        const session1 = await fetchData(accounts);

        button.textContent = String(accounts).substring(0, 6) +
            "..." +
            String(accounts).substring(38);

        const blurDiv = document.getElementById('blur-div');
        const blurbtn = document.getElementById('pro-insight');

        if (session1 && session1.status === true) {
            if (blurDiv && blurbtn) {
                blurDiv.style.filter = 'none';
                blurbtn.style.display = 'none';
            }
        } else {
            if (blurDiv && blurbtn) {
                blurDiv.style.filter = 'blur(8px)';
                blurbtn.style.display = 'block';
            }
        }
    }
};


document.addEventListener('DOMContentLoaded', function () {
    window.onload = async function () {
        await handleClick();
    };
});

async function handleClick() {
    const connected = await isWalletConnected();

    if (connected) {
        await updateWalletStatus();
    } else {
        await connectWallet();
        if (window.CONTRACT_ADDRESS && !window?.DISABLE_MINT) {
            await setContracts(true);
            await updateMintedCounter();
        }
    }
}



export const updateConnectButton = () => {
    const walletBtn = getConnectButton();
    walletBtn?.addEventListener('click', async () => {
        const connected = await isWalletConnected();
        // 如果已经连接，显示悬浮窗口而非单独的断开连接按钮
        if (connected) {
            createFloatingWindow();
        } else {
            // 如果未连接，尝试连接钱包
            await connectWallet();
            if (window.CONTRACT_ADDRESS && !window?.DISABLE_MINT) {
                await setContracts(true);
                await updateMintedCounter();
            }
        }
    });
};




export const disconnectWallet = async () => {
    if (!provider) {
        return;
    }

    try {
        // 如果提供程序支持关闭，则关闭提供程序
        if (provider.close) {
            await provider.close();
        }

        // 清除 Web3Modal 中的缓存提供程序
        const web3Modal = initWeb3Modal();
        web3Modal.clearCachedProvider();
    } catch (error) {
        console.error('disconnect error:', error);
    } finally {
        // 重置 web3 和 provider
        web3 = undefined;
        provider = undefined;
    }
}

const updateFloatingWindowAddress = (newAddress) => {
    const floatingWindow = document.getElementById('floating-window');
    if (floatingWindow) {
        const title = floatingWindow.querySelector('div:nth-child(2)'); // 第二个子元素是标题
        if (title) {
            title.textContent = String(newAddress).substring(0, 4) +
                "..." +
                String(newAddress).substring(38);
        }
    }
}

const createFloatingWindow = async () => {
    const walletBtn = getConnectButton();
    const btnRect = walletBtn.getBoundingClientRect();

    const floatingWindow = document.createElement('div');
    floatingWindow.id = 'floating-window';
    floatingWindow.style.position = 'absolute';
    floatingWindow.style.top = `${btnRect.bottom + window.scrollY}px`; // 保持在连接按钮正下方
    floatingWindow.style.left = `${btnRect.left + window.scrollX - 175}px`; // 左侧偏移300px
    floatingWindow.style.width = '320px';
    floatingWindow.style.height = '200px';
    floatingWindow.style.padding = '10px';
    floatingWindow.style.border = '1px solid black';
    floatingWindow.style.borderRadius = '20px';
    floatingWindow.style.backgroundColor = '#001329';
    floatingWindow.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    floatingWindow.style.display = 'flex';
    floatingWindow.style.flexDirection = 'column';
    floatingWindow.style.alignItems = 'center';
    floatingWindow.style.justifyContent = 'space-between';
    floatingWindow.style.zIndex = '1000';
    // 添加金币图标
    const coinIcon = document.createElement('img');
    coinIcon.src = 'https://uploads-ssl.webflow.com/65bc5c072835ea18c7eb3466/65bc5f04f7fc47e670ba0c7e_lh1.png'; // 替换为金币图标的路径
    coinIcon.style.marginTop = '15px';
    coinIcon.style.width = '60px'; // 可以根据需要调整图标大小
    floatingWindow.appendChild(coinIcon);
    // const accounts = await getWalletAddressOrConnect(true);
    // 添加标题
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const title = document.createElement('div');
    title.textContent = String(accounts[0]).substring(0, 4) +
        "..." +
        String(accounts[0]).substring(38);;
    title.style.color = 'white';
    title.style.marginTop = '0px';
    title.style.fontWeight = 'bold'; // 设置字体加粗
    title.style.fontSize = '24px'; // 设置字体大小为20像素
    floatingWindow.appendChild(title);

    // 添加复制地址按钮
    const copyAddressBtn = document.createElement('button');
    copyAddressBtn.style.backgroundColor = '#373a40';
    copyAddressBtn.style.color = 'white';
    copyAddressBtn.style.border = 'none';
    copyAddressBtn.style.padding = '10px 20px';
    copyAddressBtn.style.borderRadius = '5px';
    copyAddressBtn.style.width = '140px'; // 设置按钮宽度，使其固定不变
    copyAddressBtn.style.position = 'relative'; // 让图标相对于按钮定位
    copyAddressBtn.onclick = async () => {
        const accounts = await web3.eth.getAccounts();
        navigator.clipboard.writeText(accounts[0]);
        // 修改按钮文本为“复制成功”
        copyText.textContent = 'Copy Success!';
        // 隐藏复制图标，显示成功图标
        copyIcon.style.display = 'none';
        successIcon.style.display = 'inline-block';
        // 延迟2秒后恢复按钮文本内容为“Copy Address”
        setTimeout(() => {
            copyText.textContent = 'Copy Address';
            // 显示复制图标，隐藏成功图标
            copyIcon.style.display = 'inline-block';
            successIcon.style.display = 'none';
        }, 2000);
    };
    copyAddressBtn.onmouseover = () => {
        copyAddressBtn.style.backgroundColor = '#464a51'; // 按钮背景颜色变化
    };
    copyAddressBtn.onmouseleave = () => {
        copyAddressBtn.style.backgroundColor = '#373a40'; // 恢复原始按钮背景颜色
    };
    // 设置按钮样式为 Flex 布局，并垂直居中排列
    copyAddressBtn.style.display = 'flex';
    copyAddressBtn.style.flexDirection = 'column';
    copyAddressBtn.style.alignItems = 'center';

    // 添加图标到按钮中，第一行居中显示
    const copyIcon = document.createElement('img');
    copyIcon.src = 'https://uploads-ssl.webflow.com/65bc5c072835ea18c7eb3466/662236ff2b37472eeb86c76e_copy.png'; // 替换为您的图标路径
    copyIcon.style.width = '20px'; // 设置图标大小
    copyIcon.style.display = 'inline-block'; // 初始显示
    copyAddressBtn.appendChild(copyIcon);

    // 添加备用图标到按钮中，用于成功后的状态，初始隐藏
    const successIcon = document.createElement('img');
    successIcon.src = 'https://uploads-ssl.webflow.com/65bc5c072835ea18c7eb3466/662236ff2b37472eeb86c774_correct4.png'; // 替换为您的备用图标路径
    successIcon.style.width = '20px'; // 设置备用图标大小
    successIcon.style.display = 'none'; // 初始隐藏
    copyAddressBtn.appendChild(successIcon);

    // 添加文本到按钮中，第二行居中显示
    const copyText = document.createElement('span');
    copyText.textContent = 'Copy Address';
    copyText.style.color = 'white';
    copyText.style.marginTop = '5px'; // 设置文本与图标之间的间距
    copyAddressBtn.appendChild(copyText);

    // 添加断开连接按钮
    const disconnectBtn = document.createElement('button');
    disconnectBtn.style.backgroundColor = '#373a40';
    disconnectBtn.style.color = 'white';
    disconnectBtn.style.border = 'none';
    disconnectBtn.style.padding = '10px 20px';
    disconnectBtn.style.borderRadius = '5px';
    disconnectBtn.style.width = '140px';
    disconnectBtn.style.position = 'relative'; // 让图标相对于按钮定位

    // 使用 Flex 布局使图标和文本分别在两行显示
    disconnectBtn.style.display = 'flex';
    disconnectBtn.style.flexDirection = 'column';
    disconnectBtn.style.alignItems = 'center';

    disconnectBtn.onclick = async () => {
        walletBtn.textContent = 'Connect Wallet';
        await disconnectWallet();
        const blurDiv = document.getElementById('blur-div');
        const blurbtn = document.getElementById('pro-insight');

        // 显示遮罩和按钮
        if (blurDiv && blurbtn) {
            blurDiv.style.filter = 'blur(8px)';
            blurbtn.style.display = 'block';
            console.log("显示遮罩和按钮")
        }
        document.body.removeChild(document.getElementById('floating-window'));
    };
    disconnectBtn.onmouseover = () => {
        disconnectBtn.style.backgroundColor = '#464a51'; // 按钮背景颜色变化
    };
    disconnectBtn.onmouseleave = () => {
        disconnectBtn.style.backgroundColor = '#373a40'; // 恢复原始按钮背景颜色
    };

    // 添加图标到按钮中，第一行居中显示
    const disconnectIcon = document.createElement('img');
    disconnectIcon.src = 'https://uploads-ssl.webflow.com/65bc5c072835ea18c7eb3466/662236fea8850ec53ff2463c_disconnect.png'; // 替换为您的图标路径
    disconnectIcon.style.width = '20px'; // 设置图标大小
    disconnectBtn.appendChild(disconnectIcon);

    // 添加文本到按钮中，第二行居中显示
    const disconnectText = document.createElement('span');
    disconnectText.textContent = 'Disconnect';
    disconnectText.style.color = 'white';
    disconnectText.style.marginTop = '5px'; // 设置文本与图标之间的间距
    disconnectBtn.appendChild(disconnectText);

    // 将按钮添加到悬浮弹窗中
    floatingWindow.appendChild(disconnectBtn);

    // 创建按钮容器以使按钮水平排列
    const buttonContainer = document.createElement('div');
    buttonContainer.appendChild(copyAddressBtn);
    buttonContainer.appendChild(disconnectBtn);
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-evenly';
    buttonContainer.style.width = '100%';

    floatingWindow.appendChild(buttonContainer);


    // 添加退出按钮
    const closeButton = document.createElement('button');
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '5px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'transparent';
    closeButton.style.width = '36px'; // 根据图标大小调整
    closeButton.style.height = '30px'; // 根据图标大小调整

    const closeIcon = document.createElement('img');
    closeIcon.src = 'https://uploads-ssl.webflow.com/65bc5c072835ea18c7eb3466/662236fe1f5ef2481f575805_tuichu.png'; // 替换为退出图标的路径
    closeIcon.style.width = '100%';
    closeIcon.style.height = '100%';

    closeButton.appendChild(closeIcon);

    closeButton.onclick = () => document.body.removeChild(floatingWindow);
    floatingWindow.appendChild(closeButton);

    // 将悬浮窗口添加到页面上
    document.body.appendChild(floatingWindow);
};