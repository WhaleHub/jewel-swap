import STKAqua from "./STKAqua";
import Wrapper from "./Wrapper";
import Yeild from "./Yeild";

function NewStakelayout() {
  return (
    <div className="font-inter md:w-[914px] mx-auto">
      <Wrapper>
        <STKAqua />
        <Yeild />
      </Wrapper>
    </div>
  );
}

export default NewStakelayout;
