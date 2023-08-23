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
            console.error("Error processing file: ", error);
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

  // If uploadWIP is true then signal to the user that the file is being processed.
  if (uploadWIP) {
    return (
      <div className="border-2 border-dashed p-4">
        <h1 className="font-bold">Uploading...</h1>
      </div>
    );
  } else {
    // Else show the DropZone.
    return (
      <>
        <div
          {...getRootProps()}
          className="cursor-pointer border-2 border-dashed p-4"
        >
          <input {...getInputProps({ multiple: false })} />
          {isDragActive ? (
            <p>Release to upload</p>
          ) : (
            <p>Upload your log file (.fb) here</p>
          )}
        </div>
      </>
    );
  }
};

export default DropZone;
