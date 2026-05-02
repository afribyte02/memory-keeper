/**
 * MediaUploader Component
 * Drag-and-drop / click upload for images, videos, and audio
 * Shows progress bar and file previews before saving
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiX, FiImage, FiVideo, FiMic, FiCheckCircle } from 'react-icons/fi';
import { uploadSingle } from '../api/memoryApi';
import { toast } from 'react-toastify';
import './MediaUploader.css';

const ACCEPT = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'video/*': ['.mp4', '.mov', '.avi', '.webm'],
  'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.aac'],
};

const FILE_ICON = {
  image: <FiImage />,
  video: <FiVideo />,
  audio: <FiMic />,
};

function getMediaType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'image';
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function MediaUploader({ onMediaChange, existingMedia = [], onUploadingChange }) {
  const [uploadedMedia, setUploadedMedia] = useState(existingMedia);
  const [queue, setQueue] = useState([]); // files pending upload with progress

  // Notify parent whenever upload status changes
  const updateQueue = useCallback((updater) => {
    setQueue((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const isUploading = next.some((item) => !item.done && !item.error);
      onUploadingChange?.(isUploading);
      return next;
    });
  }, [onUploadingChange]);

  const uploadFile = useCallback(
    async (file) => {
      const id = `${Date.now()}-${file.name}`;
      const mediaType = getMediaType(file.type);
      const preview = mediaType === 'image' ? URL.createObjectURL(file) : null;

      // Add to queue with 0% progress
      updateQueue((q) => [
        ...q,
        { id, name: file.name, size: file.size, type: mediaType, preview, progress: 0, done: false, error: null },
      ]);

      try {
        const result = await uploadSingle(file, (pct) => {
          updateQueue((q) => q.map((item) => (item.id === id ? { ...item, progress: pct } : item)));
        });

        const mediaObj = {
          url: result.file.url,
          publicId: result.file.publicId,
          type: result.file.type,
          filename: result.file.filename,
        };

        // Mark done in queue
        updateQueue((q) => q.map((item) => (item.id === id ? { ...item, progress: 100, done: true } : item)));

        // After 1s remove from queue and add to uploaded list
        setTimeout(() => {
          updateQueue((q) => q.filter((item) => item.id !== id));
          setUploadedMedia((prev) => {
            const updated = [...prev, mediaObj];
            onMediaChange?.(updated);
            return updated;
          });
        }, 1000);
      } catch (err) {
        updateQueue((q) =>
          q.map((item) => (item.id === id ? { ...item, error: err.message, done: false } : item))
        );
        toast.error(`Upload failed: ${err.message}`);
      }
    },
    [onMediaChange, updateQueue]
  );

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (uploadedMedia.length + acceptedFiles.length > 10) {
        toast.warning('Maximum 10 files per memory');
        return;
      }
      acceptedFiles.forEach(uploadFile);
    },
    [uploadFile, uploadedMedia.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: 10 * 1024 * 1024, // 10MB — Cloudinary free plan limit
    onDropRejected: (files) => {
      files.forEach(({ file, errors }) => {
        if (errors[0]?.code === 'file-too-large')
          toast.error(`"${file.name}" is too large (${formatBytes(file.size)}). Maximum size is 10MB.`);
        else toast.error(errors[0]?.message || 'File rejected');
      });
    },
  });

  const removeUploaded = (index) => {
    setUploadedMedia((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onMediaChange?.(updated);
      return updated;
    });
  };

  return (
    <div className="mu-wrap">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`mu-dropzone ${isDragActive ? 'mu-dropzone--active' : ''}`}
        id="media-dropzone"
      >
        <input {...getInputProps()} id="media-input" />
        <FiUploadCloud className="mu-icon" />
        <p className="mu-title">
          {isDragActive ? 'Drop your files here!' : 'Drag & drop files, or click to browse'}
        </p>
        <p className="mu-subtitle text-xs text-muted">
          Images, Videos, Audio — up to 10MB each · Max 10 files
        </p>
        <div className="mu-accepted-types">
          <span><FiImage /> JPG, PNG, GIF, WEBP</span>
          <span><FiVideo /> MP4, MOV, AVI</span>
          <span><FiMic /> MP3, WAV, M4A</span>
        </div>
      </div>

      {/* Upload queue (in-progress) */}
      {queue.length > 0 && (
        <div className="mu-queue">
          {queue.map((item) => (
            <div key={item.id} className={`mu-queue-item ${item.done ? 'mu-queue-item--done' : ''} ${item.error ? 'mu-queue-item--error' : ''}`}>
              <div className="mu-queue-left">
                {item.preview ? (
                  <img src={item.preview} alt={item.name} className="mu-queue-thumb" />
                ) : (
                  <div className="mu-queue-icon">{FILE_ICON[item.type]}</div>
                )}
                <div className="mu-queue-info">
                  <span className="mu-queue-name">{item.name}</span>
                  <span className="text-xs text-muted">{formatBytes(item.size)}</span>
                </div>
              </div>
              <div className="mu-queue-right">
                {item.done ? (
                  <FiCheckCircle className="mu-done-icon" />
                ) : item.error ? (
                  <span className="mu-error-text text-xs">Failed</span>
                ) : (
                  <span className="text-xs text-muted">{item.progress}%</span>
                )}
              </div>
              {/* Progress bar */}
              {!item.error && (
                <div className="mu-progress-bar">
                  <div
                    className={`mu-progress-fill ${item.done ? 'mu-progress-fill--done' : ''}`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Already uploaded previews */}
      {uploadedMedia.length > 0 && (
        <div className="mu-previews">
          <p className="mu-previews-label text-xs text-muted">
            Uploaded ({uploadedMedia.length}/10)
          </p>
          <div className="mu-previews-grid">
            {uploadedMedia.map((m, i) => (
              <div key={i} className="mu-preview-item">
                {m.type === 'image' ? (
                  <img src={m.url} alt={m.filename} className="mu-preview-img" />
                ) : (
                  <div className="mu-preview-placeholder">
                    {FILE_ICON[m.type]}
                    <span className="text-xs">{m.filename?.slice(0, 12) || m.type}</span>
                  </div>
                )}
                <button
                  className="mu-preview-remove"
                  onClick={() => removeUploaded(i)}
                  title="Remove"
                  type="button"
                >
                  <FiX size={12} />
                </button>
                <span className={`mu-preview-badge mu-preview-badge--${m.type}`}>
                  {FILE_ICON[m.type]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
