import { useEffect, useRef, useState } from "react";
import "./promptForm.css";
import { useApi } from "../../lib/api";
import { ACCEPTED_IMAGE_TYPES, uploadImage, validateImage } from "../../lib/upload";

const NO_IMAGE = { status: "idle", filePath: null, previewUrl: null, error: null };
const MAX_LENGTH = 8000;

/**
 * Message input with an optional image attachment, shared by the dashboard and
 * chat pages. `onSubmit({ text, img })` may return (or resolve to) `false` to
 * keep the current input, e.g. when sending failed.
 */
const PromptForm = ({
  onSubmit,
  isGenerating = false,
  onStop,
  placeholder = "Ask me anything...",
  autoFocus = false,
}) => {
  const request = useApi();
  const [text, setText] = useState("");
  const [image, setImage] = useState(NO_IMAGE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const { previewUrl } = image;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [image.previewUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Grow the textarea with its content, up to the max height set in CSS.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [text]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const error = validateImage(file);
    if (error) {
      setImage({ ...NO_IMAGE, status: "error", error });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImage({ ...NO_IMAGE, status: "uploading", previewUrl });
    try {
      const filePath = await uploadImage(file, request);
      // Ignore the result if the user removed or replaced the image meanwhile.
      setImage((current) =>
        current.previewUrl === previewUrl ? { ...current, status: "ready", filePath } : current
      );
    } catch (err) {
      setImage((current) =>
        current.previewUrl === previewUrl
          ? { ...current, status: "error", error: err.message }
          : current
      );
    }
  };

  const trimmed = text.trim();
  const canSend =
    !isGenerating &&
    !isSubmitting &&
    image.status !== "uploading" &&
    (trimmed.length > 0 || image.status === "ready");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSend) return;

    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        text: trimmed,
        img: image.status === "ready" ? image.filePath : undefined,
      });
      if (result === false) return;
      setText("");
      setImage(NO_IMAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      handleSubmit(e);
    }
  };

  return (
    <form className="promptForm" onSubmit={handleSubmit}>
      {image.status !== "idle" && (
        <div className="attachment">
          {image.previewUrl && (
            <div className="preview">
              <img src={image.previewUrl} alt="Attachment preview" />
              {image.status === "uploading" && <div className="uploading">Uploading…</div>}
            </div>
          )}
          {image.error && <span className="attachmentError">{image.error}</span>}
          <button
            type="button"
            className="removeAttachment"
            onClick={() => setImage(NO_IMAGE)}
            aria-label="Remove image"
            title="Remove image"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      <div className="inputRow">
        <button
          type="button"
          className="iconButton attach"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach an image"
          title="Attach an image"
          disabled={isGenerating}
        >
          <img src="/attachment.png" alt="" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          onChange={handleFileChange}
          hidden
        />

        <textarea
          ref={textareaRef}
          name="text"
          rows={1}
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Message"
          autoFocus={autoFocus}
        />

        {isGenerating && onStop ? (
          <button
            type="button"
            className="iconButton send"
            onClick={onStop}
            aria-label="Stop generating"
            title="Stop generating"
          >
            <i className="fa-solid fa-stop" />
          </button>
        ) : (
          <button
            type="submit"
            className="iconButton send"
            disabled={!canSend}
            aria-label="Send message"
            title="Send message"
          >
            <img src="/arrow.png" alt="" />
          </button>
        )}
      </div>
    </form>
  );
};

export default PromptForm;
