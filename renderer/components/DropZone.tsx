import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import type { RawChartPoint } from "../types";

interface DropZoneProps {
  onLogDataReceived: (logData: RawChartPoint[]) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onLogDataReceived }) => {
  const [uploadWIP, setUploadWIP] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const formData = new FormData();
      if (file) formData.append("file", file);

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      try {
        setUploadWIP(true); // set uploadingFlag to true

        // Make a POST request to the server endpoint
        const response = await fetch("http://localhost:3001/convert-file", {
          method: "POST",
          headers: {
            timezone: userTimezone,
          },
          body: formData,
        });

        const result = (await response.json()) as RawChartPoint[];

        onLogDataReceived(result); // store the data
      } catch (error) {
        console.error(error);
      } finally {
        setUploadWIP(false); // reset the uploadWIP flag
      }
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
