import React, { Fragment } from "react";
import StakeAqua from "./StakeAqua";
import Restake from "./Restake";
import ProvideLP from "./ProvideLP";

function AquaStake() {
  return (
    <Fragment>
      <div className="flex flex-col gap-[21px] w-full mt-[21px]">
        <StakeAqua />
        <Restake />
        <ProvideLP />
      </div>
    </Fragment>
  );
}

export default AquaStake;
