function MainContent() {
    function def(){
        console.log("yay!!")
    }
  return (
    <div className="flex-grow p-10 overflow-y-auto bg-white">
      <header className="mb-10">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2 flex items-center">
          Analyze Corporate Trading
        </h2>
        <p className="text-gray-600 text-lg">
          Input a publicly traded company's name or ticker symbol to detect statistically suspicious insider trading patterns.
        </p>
      </header>
      <form onSubmit={def} className="max-w-3xl">
        <div className="flex items-center space-x-3 bg-white border-2 border-gray-300 rounded-xl p-2 shadow-lg focus-within:border-blue-500 transition duration-300">
          <input
            type="text"
            className="flex-grow p-3 text-lg border-none focus:ring-0 rounded-lg outline-none"
            placeholder="e.g., Apple, JPMorgan, TSLA, AAPL..."
            value={0}
            onChange={def}
            aria-label="Search company name or ticker"
            required
          />
          <button
            type="submit"
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300 shadow-md transform active:scale-95"
            aria-label="Run analysis"
          >
            Analyze
          </button>
        </div>
      </form>
      
      <div className="mt-16 p-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg max-w-3xl">
        <p className="text-center text-gray-500 italic">
          Search results and the Corporate Integrity Score will appear here.
        </p>
      </div>
    </div>
  );
}

export default MainContent;