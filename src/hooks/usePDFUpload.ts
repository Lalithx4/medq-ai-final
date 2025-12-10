import { useState, useCallback } from 'react';

export function usePDFUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const uploadFiles = async (files: File[]) => {
        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            let collectionId: string | null = null;
            const uploadedIds: string[] = [];

            // Create a collection if multiple files
            if (files.length > 1) {
                const collectionName = `Collection - ${new Date().toLocaleString()}`;
                const collectionRes = await fetch('/api/pdf-chat/collections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: collectionName }),
                });

                if (collectionRes.ok) {
                    const data = await collectionRes.json();
                    collectionId = data.collectionId;
                }
            }

            // Process each file
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 100 * 1024 * 1024) throw new Error(`File ${file.name} exceeds 100MB limit`);

                const formData = new FormData();
                formData.append('file', file);
                if (collectionId) formData.append('collectionId', collectionId);

                // Upload
                const uploadRes = await fetch('/api/pdf-chat/upload', { method: 'POST', body: formData });
                if (!uploadRes.ok) throw new Error(`Failed to upload ${file.name}`);
                const { documentId } = await uploadRes.json();

                // Process
                await fetch('/api/pdf-chat/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documentId }),
                });

                uploadedIds.push(documentId);
                setUploadProgress(((i + 1) / files.length) * 100);
            }

            setIsUploading(false);
            return {
                documentId: uploadedIds[0], // Return first doc ID for single file chat
                collectionId,
                count: uploadedIds.length
            };

        } catch (err) {
            console.error('Upload failed:', err);
            setError(err instanceof Error ? err.message : 'Upload failed');
            setIsUploading(false);
            return null;
        }
    };

    return { uploadFiles, isUploading, uploadProgress, error };
}
