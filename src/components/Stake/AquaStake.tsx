import React, { Fragment } from "react";
import StakeAqua from "./StakeAqua";
import Restake from "./Restake";
import Pools from "../Pools/Pools";

function AquaStake() {
  return (
    <Fragment>
      <div className="flex flex-col gap-[21px] w-full mt-[21px]">
        <StakeAqua />
        <Restake />
        <Pools />
      </div>
    </Fragment>
  );
}

export default AquaStake;
