const Footer = () => {
  return (
    <footer className="flex justify-center items-center w-full mt-[20px] mb-[20px]">
      <div className="flex flex-col md:flex-row justify-between items-center gap-[7px] w-full max-w-[1320px] px-[10.5px] md:px-0">
        <div className="text-sm font-normal">&#169;2026 - Whalehub</div>
        <div className="flex items-center space-x-4 text-[#B1B3B8] text-sm font-normal">
          <a href="/terms">Terms & Conditions</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="https://whalehub-1.gitbook.io/whalehub" target="_blank" rel="noopener noreferrer">Docs</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
