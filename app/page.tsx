"use client";

import { useState, useCallback, useRef } from "react";

interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draggingItemIndex = useRef<number | null>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const pdfs = Array.from(incoming).filter((f) => f.type === "application/pdf");
    if (pdfs.length === 0) return;
    setError(null);
    setFiles((prev) => [
      ...prev,
      ...pdfs.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        name: f.name,
        size: formatSize(f.size),
      })),
    ]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const sortAlphabetically = () => {
    const naturalCompare = (a: string, b: string): number => {
      const re = /(\d+)/g;
      const aParts = a.split(re);
      const bParts = b.split(re);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        if (i >= aParts.length) return -1;
        if (i >= bParts.length) return 1;
        if (i % 2 === 1) {
          const diff = parseInt(aParts[i], 10) - parseInt(bParts[i], 10);
          if (diff !== 0) return diff;
        } else {
          const cmp = aParts[i].localeCompare(bParts[i], undefined, { sensitivity: "base" });
          if (cmp !== 0) return cmp;
        }
      }
      return 0;
    };
    setFiles((prev) => [...prev].sort((a, b) => naturalCompare(a.name, b.name)));
  };

  const moveFile = (from: number, to: number) => {
    setFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Add at least 2 PDF files to merge.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f.file));

      const res = await fetch("/api/merge", { method: "POST", body: formData });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">PDF Merger</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Drag & drop PDFs, reorder them, then merge into one file.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0-3 3m3-3 3 3M4.5 19.5h15a1.5 1.5 0 0 0 0-3h-15a1.5 1.5 0 0 0 0 3Z" />
            </svg>
            <p className="text-sm text-gray-400">
              <span className="text-blue-400 font-medium">Click to browse</span> or drag & drop PDF files here
            </p>
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li
                key={f.id}
                draggable
                onDragStart={() => { draggingItemIndex.current = i; }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
                onDragEnd={() => {
                  if (draggingItemIndex.current !== null && dragOverIndex !== null && draggingItemIndex.current !== dragOverIndex) {
                    moveFile(draggingItemIndex.current, dragOverIndex);
                  }
                  draggingItemIndex.current = null;
                  setDragOverIndex(null);
                }}
                className={`flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 cursor-grab active:cursor-grabbing transition-all ${
                  dragOverIndex === i ? "ring-2 ring-blue-500 scale-[1.01]" : ""
                }`}
              >
                <span className="text-gray-500 text-xs w-5 text-center select-none">{i + 1}</span>
                <svg className="w-5 h-5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm-1 1.5L18.5 9H13V3.5ZM8.5 17h7v1h-7v-1Zm0-3h7v1h-7v-1Zm0-3H11v1H8.5v-1Z"/>
                </svg>
                <span className="flex-1 text-sm truncate">{f.name}</span>
                <span className="text-xs text-gray-500 shrink-0">{f.size}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                  className="text-gray-600 hover:text-red-400 transition-colors ml-1"
                  aria-label="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {files.length > 0 && (
            <button
              onClick={() => { setFiles([]); setError(null); }}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-sm text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
            >
              Clear all
            </button>
          )}
          {files.length > 1 && (
            <button
              onClick={sortAlphabetically}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-sm text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
            >
              Sort A → Z
            </button>
          )}
          <button
            onClick={handleMerge}
            disabled={loading || files.length < 2}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Merging…" : `Merge ${files.length > 0 ? `${files.length} PDFs` : "PDFs"}`}
          </button>
        </div>
      </div>
    </main>
  );
}
