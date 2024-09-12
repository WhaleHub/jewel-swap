import { PublicKey } from "@solana/web3.js";
import { isMainnet } from "../config";

export const defaultColor = "#FFFFFF";

export const wlValidators = [
  {
    name: "Orangefin Ventures",
    voteAccount: "oRAnGeU5h8h2UkvbfnE5cjXnnAa4rBoaxmS4kbFymSe",
    color: "#006666",
    logo: "https://keybase.io/orangefin/picture?format=square_360",
  },
  {
    name: "DimAn",
    voteAccount: "voteRnv6PBzmiGP8NicWtQiqEJTwKKq2SxtqtdLUJjd",
    color: "#40bf7b",
    logo: "https://keybase.io/diman_io/picture?format=square_360",
  },
  {
    name: "L0vd 0% fee +MEV",
    voteAccount: "A7uqmajxP3NdzbYDXiGQRGTL8d3dZ5pjS4kR9NTZcxtg",
    color: "#5e20e5",
    logo: "https://keybase.io/snv7/picture?format=square_360",
  },
];

export const sliderMarks = [
  {
    value: 0,
    label: "0%",
  },
  {
    value: 25,
    label: "25%",
  },
  {
    value: 50,
    label: "50%",
  },
  {
    value: 75,
    label: "75%",
  },
  {
    value: 100,
    label: "100%",
  },
];

export const tokensRegistered = ["AQUA"];
export const tokenAddresses = isMainnet
  ? {
      hades: new PublicKey("BWXrrYFhT7bMHmNBFoQFWdsSgA3yXoAnMhDK6Fn1eSEn"),
    }
  : {
      hades: new PublicKey("AkeMXdPXeGNNLKFsk6Pc9AwfJUsZzrLK1YTBqJpomEiB"),
    };
