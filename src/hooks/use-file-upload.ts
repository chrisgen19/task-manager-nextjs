import { useState, useCallback } from "react";
import { UPLOAD_MAX_SIZE, UPLOAD_ALLOWED_TYPES } from "@/schemas";

interface UploadResult {
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

interface UploadContext {
  taskId?: string;
  commentId?: string;
}

export function useFileUpload(context?: UploadContext) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<UploadResult> => {
    setError(null);

    if (file.size > UPLOAD_MAX_SIZE) {
      const err = "File exceeds 10MB limit";
      setError(err);
      throw new Error(err);
    }

    if (!UPLOAD_ALLOWED_TYPES.includes(file.type as (typeof UPLOAD_ALLOWED_TYPES)[number])) {
      const err = `File type "${file.type}" is not allowed`;
      setError(err);
      throw new Error(err);
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (context?.taskId) formData.append("taskId", context.taskId);
      if (context?.commentId) formData.append("commentId", context.commentId);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      return await res.json() as UploadResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [context?.taskId, context?.commentId]);

  return { uploadFile, isUploading, error };
}
