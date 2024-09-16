import { LpBalance, SummarizedAssets } from "../interfaces";

export function summarizeAssets(
  data: LpBalance[] | null
): SummarizedAssets | null {
  if (!data) return null;

  return data.reduce((result, item) => {
    const assets = [
      { code: item.assetA.code, amount: item.assetAAmount },
      { code: item.assetB.code, amount: item.assetBAmount },
    ];

    assets.forEach((asset) => {
      if (!result[asset.code]) {
        result[asset.code] = {
          assetCode: asset.code,
          totalAmount: "0.0000000",
        };
      }

      const currentTotal = Number(result[asset.code].totalAmount);
      const additionalAmount = Number(asset.amount);

      const newTotal = currentTotal + additionalAmount;
      result[asset.code].totalAmount = newTotal.toString();
    });

    return result;
  }, {} as SummarizedAssets);
}
