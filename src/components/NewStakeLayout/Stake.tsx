import STKAqua from "./STKAqua";
import Wrapper from "./Wrapper";
import Yield from "./Yield";

function NewStakelayout() {
  return (
    <div className="font-inter md:w-[914px] mx-auto">
      <Wrapper>
        <STKAqua />
        <Yield />
      </Wrapper>
    </div>
  );
}

export default NewStakelayout;
