import React, { useState } from "react";
import Head from "next/head";
import Image from "next/image";
import { shell } from "electron";
import logo from "../../resources/claval-logo.jpg";
import type { ChartPointString } from "../types";
import DropZone from "../components/DropZone";
import LogPlot from "../components/LogPlot";

function Home() {
  const [logData, setLogData] = useState<ChartPointString[]>([]);
  const [logDataReceived, setLogDataReceived] = useState(false);

  // Callback used by DropZone to store plot data.
  const handleLogData = (data: ChartPointString[]) => {
    setLogData(data);
    setLogDataReceived(true);
  };

  // Callback used by LogPlot to reset the plot data.
  const resetLogData = () => {
    setLogData([]);
    setLogDataReceived(false);
  };

  let pageContent = null;

  // If we do not have logData, show the DropZone.
  if (!logDataReceived) {
    pageContent = (
      <div className="flex grow items-center justify-center">
        <div className="flex flex-col rounded-lg bg-[#ffffff12] p-10 gap-8">
          <h1 className="text-center text-5xl font-extrabold text-[#ffffffde] tracking-wide sm:text-[5rem]">
            Smart Plotter
          </h1>
          <div className="flex justify-center text-[#ffffffde]">
            <DropZone onLogDataReceived={handleLogData} />
          </div>
        </div>
      </div>
    );
  } else {
    // Else show the LogPlot.
    pageContent = <LogPlot plotData={logData} onReset={resetLogData} />;
  }

  return (
    <React.Fragment>
      <Head>
        <title>Cla-Val Smart Plotter</title>
      </Head>
      <main className="flex min-h-screen flex-col bg-[#121212]">
        <header className="flex flex-row items-center justify-start p-6 text-[#ffffffde]">
          <a
            title="www.cla-val.com"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              shell.openExternal("https://www.cla-val.com");
            }}
          >
            <div className="flex bg-white rounded-lg px-2 py-1">
              <Image height={42} width={200} src={logo} alt="Cla-Val Logo" />
            </div>
          </a>
          <div className="flex grow" />
          <div className="px-2 underline">
            <a
              href="mailto:kdarmstadt@cla-val.com;jsuzuki@cla-val.com?subject=Smart Plotter Support Request"
              title="Open an email to Cla-Val technical support"
            >
              Contact Us
            </a>
          </div>
        </header>
        {pageContent}
      </main>
    </React.Fragment>
  );
}

export default Home;
