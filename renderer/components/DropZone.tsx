import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import type { RawChartPoint } from "../types";
const ipc = require("electron").ipcRenderer;

interface DropZoneProps {
  onLogDataReceived: (logData: RawChartPoint[]) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onLogDataReceived }) => {
  const [uploadWIP, setUploadWIP] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      setUploadWIP(true); // set uploadingFlag to true

      const reader = new FileReader();

      reader.readAsArrayBuffer(file);

      reader.onload = async (event) => {
        const fileBuffer = event.target?.result;

        if (fileBuffer) {
          try {
            const plotData = await ipc.invoke("process-file", {
              buffer: fileBuffer,
              name: file.name,
            });
            
            onLogDataReceived(plotData);
            setUploadWIP(false);
          } catch (error) {
            console.error("Error processing file: ", error);
          }
        }
      };
    },
    [onLogDataReceived]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      void onDrop(files);
    },
  });

  if (uploadWIP) {
    return (
      <div className="border-2 border-dashed p-4">
        <h1 className="font-bold">Uploading...</h1>
      </div>
    );
  } else {
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
