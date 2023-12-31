import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import type { ChartPointString } from "../types";
const ipc = require("electron").ipcRenderer;

// DropZoneProps provides the onLogDataReceived callback.
interface DropZoneProps {
  onLogDataReceived: (logData: ChartPointString[]) => void;
}

// DropZone definition.
const DropZone: React.FC<DropZoneProps> = ({ onLogDataReceived }) => {
  // uploadWIP signals that the log data is being processed.
  const [uploadWIP, setUploadWIP] = useState(false);

  // onDrop is triggered when a file is given to the DropZone.
  const onDrop = useCallback(
    // Array of Files is received.
    async (acceptedFiles: File[]) => {
      // If length is 0 then no files were received.
      if (acceptedFiles.length === 0) return;

      // Signal that upload is beginning.
      setUploadWIP(true);

      // Get the first file.
      const file = acceptedFiles[0];

      // Create a FileReader and read the file into a buffer.
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);

      // When the FileReader has loaded the file into the buffer,
      reader.onload = async (event) => {
        // Get the fileBuffer.
        const fileBuffer = event.target?.result;

        // If fileBuffer exists,
        if (fileBuffer) {
          // Use IPC to send a request to the main process to process the file.
          try {
            const plotData: ChartPointString[] = await ipc.invoke(
              "process-file",
              {
                buffer: fileBuffer,
                name: file.name,
              }
            );

            // Use the onLogDataReceived callback to store the data.
            onLogDataReceived(plotData);

            // Upload complete.
            setUploadWIP(false);
          } catch (error) {
            console.error(`Error processing file: ${error}`);
          }
        }
      };
    },
    [onLogDataReceived]
  );

  // Link up the onDrop event handler.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      void onDrop(files);
    },
  });

  let dropzoneContent = null;

  // If uploadWIP is true then signal to the user that the file is being processed.
  if (uploadWIP) {
    dropzoneContent = (
      <div className="flex flex-col rounded-xl bg-[#ffffff12] px-10 py-6 gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="lds-ring">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <div className="text-center">
            Processing... please allow up to 1 minute.
          </div>
        </div>
      </div>
    );
  } else {
    // Else show the DropZone.
    dropzoneContent = (
      <>
        <div className="flex flex-col rounded-xl bg-[#ffffff12] p-10 gap-8">
          <h1 className="text-center text-5xl font-extrabold text-[#ffffffde] tracking-wide sm:text-[5rem]">
            Smart Plotter
          </h1>
          <div className="flex justify-center text-[#ffffffde]">
            <div
              {...getRootProps()}
              className="cursor-pointer border-2 rounded-2xl border-dashed p-3 text-center"
            >
              <input {...getInputProps({ multiple: false })} />
              {isDragActive ? (
                <p>Release to generate plot</p>
              ) : (
                <p>
                  Drag & drop your .fb log file here,
                  <br />
                  or click to open a file browser
                </p>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex grow items-center justify-center">
      {dropzoneContent}
    </div>
  );
};

export default DropZone;
