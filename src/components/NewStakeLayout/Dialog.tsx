import DOMPurify from "dompurify";

interface DialogCProps {
  msg: string;
  openDialog: boolean;
  dialogTitle: string;
  closeModal: () => void;
}

function DialogC({ msg, openDialog, dialogTitle, closeModal }: DialogCProps) {
  const formattedMsg = msg.replace(/\n/g, "<br />");
  const sanitizedMsg = DOMPurify.sanitize(formattedMsg);

  return openDialog ? (
    <div
      className="fixed inset-0 z-10 flex items-end lg:items-center justify-center backdrop-blur-sm"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[#151A29]/75"
        aria-hidden="true"
        onClick={closeModal}
      ></div>

      {/* Modal Content */}
      <div className="relative z-20 w-full lg:max-w-md bg-[#3C404D] lg:rounded-2xl shadow-xl sm:w-auto animate-slideIn">
        <div className="border-b-[1px] border-b-[#fff]/75 py-[16px] text-white font-inter font-semiBold text-sm md:text-base px-6">
          {dialogTitle}
        </div>

        <p
          className="mt-4 text-sm md:text-base pb-[2.5rem] text-white font-inter font-normal break-words whitespace-normal px-6"
          dangerouslySetInnerHTML={{ __html: sanitizedMsg }}
        />
      </div>
    </div>
  ) : null;
}

export default DialogC;
