import {
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  aquaAssetCode,
  aquaAssetIssuer,
  blubAssetCode,
  blubIssuer,
  blubIssuerPublicKey,
  lpSignerPublicKey,
  usdcAssetCode,
  usdcIssuer,
  XlmAssetCode,
} from "../../utils/constants";
import aquaLogo from "../../assets/images/aqua_logo.png";
import xlmLogo from "../../assets/images/xlm.png";
import usdcLogo from "../../assets/images/usdc.svg";
import { useEffect, useState } from "react";
import { useAppDispatch } from "../../lib/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../lib/store";
import clsx from "clsx";
import { Button, Input } from "@headlessui/react";
import {
  FREIGHTER_ID,
  FreighterModule,
  LOBSTR_ID,
  LobstrModule,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import {
  getAccountInfo,
  provideLiquidity,
  providingLp,
  resetStateValues,
  storeAccountBalance,
} from "../../lib/slices/userSlice";
import { toast } from "react-toastify";
import { StellarService } from "../../services/stellar.service";
import { TailSpin } from "react-loader-spinner";
import { InformationCircleIcon } from "@heroicons/react/16/solid";
import DialogC from "./Dialog";

function AddLiquidity() {
  const poolRecords: Record<
    string,
    { img1: string; img2: string; assetA: Asset; assetB: Asset }
  > = {
    "BLUB/AQUA": {
      img1: "/blub_logo.png",
      img2: aquaLogo,
      assetA: new Asset(blubAssetCode, blubIssuer),
      assetB: new Asset(aquaAssetCode, blubIssuer),
    },
    "USDC/XLM": {
      img1: usdcLogo,
      img2: xlmLogo,
      assetA: new Asset(usdcAssetCode, usdcIssuer),
      assetB: new Asset(XlmAssetCode),
    },
  };

  const [lpAmount1, setLPDepositAmount1] = useState<number | null>();
  const [lpAmount2, setLPDepositAmount2] = useState<number | null>();
  const [activePool, setActivePool] = useState("");

  const [dialogMsg, setDialogMsg] = useState<string>("");
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [openDialog, setOptDialog] = useState<boolean>(false);

  const poolImage1 = poolRecords[activePool]?.img1;
  const poolImage2 = poolRecords[activePool]?.img2;

  const poolAsset1 = poolRecords[activePool]?.assetA;
  const poolAsset2 = poolRecords[activePool]?.assetB;

  const dispatch = useAppDispatch();

  const user = useSelector((state: RootState) => state.user);

  const handleProvideLiquidity = async () => {
    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId:
        user?.walletName === LOBSTR_ID ? LOBSTR_ID : FREIGHTER_ID,
      modules: [selectedModule],
    });

    const wallet = await kit.getAddress();

    if (!wallet.address) {
      dispatch(providingLp(false));
      return toast.warn("Please connect wallet.");
    }

    if (!user) {
      dispatch(providingLp(false));
      return toast.warn("Global state not initialized");
    }

    if (!lpAmount1) {
      dispatch(providingLp(false));
      return toast.warn(
        `Please input ${activePool.split("/")[0]} amount to stake.`
      );
    }

    if (!lpAmount2) {
      dispatch(providingLp(false));
      return toast.warn(
        `Please input ${activePool.split("/")[1]}  amount to stake.`
      );
    }
    dispatch(providingLp(true));

    try {
      // Retrieve the wallet address from the Stellar Kit
      const stellarService = new StellarService();
      const senderAccount = await stellarService.loadAccount(wallet.address);

      // Load the sponsor (whaleHub) account details from the Stellar network
      await stellarService.loadAccount(lpSignerPublicKey);

      const aquaAsset = new Asset(aquaAssetCode, aquaAssetIssuer);

      const stakeAmount1 = lpAmount1.toFixed(7);
      const stakeAmount2 = lpAmount2.toFixed(7);

      //transfer asset to server wallet
      const paymentOperation1 = Operation.payment({
        destination: lpSignerPublicKey,
        asset: poolAsset1,
        amount: `${stakeAmount1}`,
      });

      const paymentOperation2 = Operation.payment({
        destination: lpSignerPublicKey,
        asset: poolAsset2,
        amount: `${stakeAmount2}`,
      });

      // Build transaction
      const transactionBuilder = new TransactionBuilder(senderAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.PUBLIC,
      })
        .addOperation(
          Operation.changeTrust({
            asset: aquaAsset,
            limit: "100000000",
            source: blubIssuerPublicKey,
          })
        )
        .addOperation(paymentOperation1)
        .addOperation(paymentOperation2)
        .setTimeout(30)
        .build();

      // Convert the transaction to XDR format for signing
      const transactionXDR = transactionBuilder.toXDR();

      const address = wallet.address;

      const { signedTxXdr } = await kit.signTransaction(transactionXDR, {
        address,
        networkPassphrase: WalletNetwork.PUBLIC,
      });

      dispatch(
        provideLiquidity({
          asset1: {
            ...poolAsset1,
            amount: stakeAmount1,
          },
          asset2: {
            ...poolAsset2,
            amount: stakeAmount2,
          },
          signedTxXdr,
          senderPublicKey: address,
        })
      );
      dispatch(providingLp(true));
      toast.success("Transaction sent!");
    } catch (err) {
      console.error("Transaction failed:", err);
      dispatch(providingLp(false));
    }
  };

  const updateWalletRecords = async () => {
    const selectedModule =
      user?.walletName === LOBSTR_ID
        ? new LobstrModule()
        : new FreighterModule();

    const kit: StellarWalletsKit = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      selectedWalletId: FREIGHTER_ID,
      modules: [selectedModule],
    });

    const { address } = await kit.getAddress();
    const stellarService = new StellarService();
    const wrappedAccount = await stellarService.loadAccount(address);

    dispatch(getAccountInfo(address));
    dispatch(storeAccountBalance(wrappedAccount.balances));
  };

  const onDialogOpen = (msg: string, title: string) => {
    setOptDialog(true);
    setDialogMsg(msg);
    setDialogTitle(title);
  };

  const closeModal = () => {
    setOptDialog(false);
  };

  // Close modal on ESC key press or click outside
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOptDialog(false);
    }
  };

  useEffect(() => {
    if (openDialog) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDialog]);

  useEffect(() => {
    if (user?.providedLp) {
      updateWalletRecords();
      toast.success("Provided Liquidity successfully!");
      setLPDepositAmount1(0);
      setLPDepositAmount1(0);
      dispatch(providingLp(false));
      dispatch(resetStateValues());
    }

    setActivePool("BLUB/AQUA");
  }, [user?.providedLp]);

  return (
    <div>
      <div className="bg-[#0E111BCC] p-10 rounded-[16px]"   style={{
            filter: "blur(1.5px)"
          }}>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <img
              src={"/Blub_logo2.svg"}
              alt="Aqua"
              className="w-8 h-8 rounded-full"
            />
            <span className="text-lg">BLUB</span>
          </div>
        </div>
        <div className="text-2xl font-medium text-white mt-5 flex items-center space-x-2">
          <div>Boost liquidity pool for yield</div>
          <InformationCircleIcon
            className="h-[15px] w-[15px] text-white cursor-pointer"
            onClick={() =>
              onDialogOpen(
                `Maximize your earnings by locking an equal amount of BLUB and AQUA tokens in a liquidity pool. Both tokens are required to enhance your yield potential. This liquidity pool can also be found in AQUA AMM. Recommended for experienced users to utilize full cycle of investment opportunity.`,
                "Boost liquidity pool for yield"
              )
            }
          />
        </div>

        <div className="flex items-center bg-[#0E111B] py-2 space-x-2 mt-2 rounded-[8px]">
          <Input
            placeholder="0 BLUB"
            className={clsx(
              "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
              "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-[#3C404D]",
              "w-full p-3 bg-none"
            )}
            onChange={(e) =>
              setLPDepositAmount1(
                e.target.value ? Number(e.target.value) : null
              )
            }
          />
          <button className="bg-[#3C404D] p-2 rounded-[4px]">Max</button>
        </div>
        <div className="flex items-center text-normal mt-2 space-x-1">
          <div className="font-normal text-[#B1B3B8]">Balance:</div>
          <div className="font-medium">0 BLUB</div>
        </div>

        <div className="flex items-center bg-[#0E111B]  py-2 space-x-2 mt-5 rounded-[8px]">
          <Input
            placeholder="0 AQUA"
            className={clsx(
              "block w-full rounded-lg border-none bg-[#0E111B] px-3 text-sm/6 text-white",
              "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-[#3C404D]",
              "w-full p-3 bg-none"
            )}
            onChange={(e) =>
              setLPDepositAmount2(
                e.target.value ? Number(e.target.value) : null
              )
            }
          />
          <button className="bg-[#3C404D] p-2 rounded-[4px]">Max</button>
        </div>
        <div className="flex items-center text-normal mt-2 space-x-1">
          <div className="font-normal text-[#B1B3B8]">Balance:</div>
          <div className="font-medium">0 AQUA</div>
        </div>

        <Button
          className="rounded-[12px] py-5 px-4 text-white mt-10 w-full bg-[linear-gradient(180deg,_#00CC99_0%,_#005F99_100%)] text-base font-semibold backdrop-filter: blur(10px"
          onClick={handleProvideLiquidity}
          disabled={true}
          // style={{
          //   filter: "blur(1.5px)"
          // }}
        >
          {!user?.providingLp ? (
            <span>Generate Yield (Coming soon)</span>
          ) : (
            <div className="flex justify-center items-center gap-[10px]">
              <span className="text-white">Processing...</span>
              <TailSpin
                height="18"
                width="18"
                color="#ffffff"
                ariaLabel="tail-spin-loading"
                radius="1"
                wrapperStyle={{}}
                wrapperClass=""
                visible={true}
              />
            </div>
          )}
        </Button>
      </div>

      <DialogC
        msg={dialogMsg}
        openDialog={openDialog}
        dialogTitle={dialogTitle}
        closeModal={closeModal}
      />
    </div>
  );
}

export default AddLiquidity;
