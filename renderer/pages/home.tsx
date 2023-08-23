import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
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
        <div className="flex flex-col gap-12 rounded-lg bg-[#ffffff12] p-12">
          <h1 className="text-center text-5xl font-extrabold tracking-tight text-[#ffffffde] sm:text-[5rem]">
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
        <header className="flex flex-row items-center justify-start px-4 py-4 text-[#ffffffde]">
          <Image
            className="mx-2"
            height={50}
            width={200}
            src={logo}
            alt="Cla-Val Logo"
          />
        </header>
        {pageContent}
      </main>
    </React.Fragment>
  );
}

export default Home;
