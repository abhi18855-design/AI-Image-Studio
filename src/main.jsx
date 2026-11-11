import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { bytes, decode, encode, formats, supportedFormats } from "./image";
import { endpoint, transformImage } from "./ai";
import { styles } from "./styles";
import { zipImages } from "./zip";
import "./style.css";
function Icon({ type = "spark", size = 22 }) {
  const paths = {
    spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
    upload: "M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5",
    sliders: "M4 7h16M4 17h16M8 4v6m8 4v6",
    arrow: "M5 12h14m-5-5 5 5-5 5",
    download: "M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4",
    shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[type]} />
    </svg>
  );
}
function Art({ style = styles[0], large = false }) {
  return (
    <svg
      className={large ? "art large" : "art"}
      viewBox="0 0 240 150"
      role="img"
      aria-label={`${style[1]} illustrative mood thumbnail`}
    >
      <rect width="240" height="150" fill={style[3]} />
      <circle cx="175" cy="42" r="24" fill={style[4]} />
      <path d="M0 120 70 40 145 150H0" fill={style[4]} opacity=".75" />
      <path d="m60 150 85-98 95 83v15" fill="#233c42" opacity=".35" />
      <path d="M0 130q60-45 120-5t120-15v40H0" fill="#173f3b" opacity=".45" />
      <path d="M105 150v-42q0-20 17-20t17 20v42" fill={style[4]} />
      <circle cx="122" cy="80" r="16" fill={style[4]} />
      <path d="m108 76 4-17 10 9 10-9 5 18" fill={style[4]} />
      <circle cx="117" cy="80" r="2" fill="#35404a" />
      <circle cx="128" cy="80" r="2" fill="#35404a" />
      {style[0] === "pencil" && (
        <path
          d="m0 140 240-80M0 130 240 50M0 120 240 40"
          stroke="#fff"
          opacity=".4"
        />
      )}
    </svg>
  );
}
function Upload({ source, sources = [], onFile, busy }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  return (
    <div
      className={`upload ${drag ? "drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!busy && e.dataTransfer.files.length)
          onFile([...e.dataTransfer.files]);
      }}
    >
      <input
        ref={ref}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label="Upload images"
        disabled={busy}
        onChange={(e) => {
          if (e.target.files.length) onFile([...e.target.files]);
          e.target.value = "";
        }}
      />
      {source ? (
        <>
          <img
            className="source-preview"
            src={source.url}
            alt="Uploaded original"
          />
          <div className="upload-meta">
            <span title={source.file.name}>
              {sources.length > 1
                ? `${sources.length} images selected`
                : source.file.name}
            </span>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => ref.current.click()}
            >
              Replace images
            </button>
          </div>
          {sources.length > 1 && (
            <div className="file-list">
              {sources.map((item, i) => (
                <div key={i}>
                  <span>{item.file.name}</span>
                  <small>
                    {item.width} × {item.height} · {bytes(item.file.size)}
                  </small>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <button
          className="upload-trigger"
          disabled={busy}
          onClick={() => ref.current.click()}
        >
          <span className="upload-icon">
            <Icon type="upload" />
          </span>
          <strong>Drop your images here</strong>
          <span>
            or <b>browse files</b> to get started
          </span>
          <small>Up to 20 images · 30 MB each · 100 MB total</small>
          <small>JPG, PNG, WebP, AVIF · 24 MP per image</small>
        </button>
      )}
    </div>
  );
}
function useSource() {
  const [sources, setSources] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const sequence = useRef(0);
  useEffect(
    () => () => {
      sources.forEach((s) => URL.revokeObjectURL(s.url));
    },
    [sources],
  );
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  const upload = async (files) => {
    const id = ++sequence.current;
    setError("");
    if (files.length > 20) {
      setError("Choose up to 20 images per batch.");
      return;
    }
    if (files.reduce((sum, f) => sum + f.size, 0) > 100 * 1048576) {
      setError("Choose a batch smaller than 100 MB.");
      return;
    }
    setLoading(true);
    const next = [],
      errors = [];
    for (const file of files) {
      try {
        const item = await decode(file);
        if (
          next.reduce((n, s) => n + s.width * s.height, 0) +
            item.width * item.height >
          60000000
        ) {
          URL.revokeObjectURL(item.url);
          throw new Error("Batch exceeds 60 megapixels. Use a smaller batch.");
        }
        next.push(item);
      } catch (e) {
        errors.push(file.name + ": " + e.message);
      }
    }
    if (id === sequence.current) {
      setSources(next);
      setError(errors.join(" "));
      setLoading(false);
    } else next.forEach((s) => URL.revokeObjectURL(s.url));
  };
  return { source: sources[0], sources, error, setError, upload, loading };
}
function useBlobURL(blob) {
  const [url, setURL] = useState("");
  useEffect(() => {
    if (!blob) {
      setURL("");
      return;
    }
    const u = URL.createObjectURL(blob);
    setURL(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
function Download({ blob, name, label = "Download image" }) {
  const url = useBlobURL(blob);
  return (
    <a className="button" href={url} download={name}>
      <Icon type="download" size={18} />
      {label}
    </a>
  );
}
function outputName(name, suffix, ext, index) {
  return `${String(index + 1).padStart(2, "0")}-${name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80)}-${suffix}.${ext}`;
}
function ResultItem({ item, creative }) {
  const url = useBlobURL(item.blob);
  return (
    <div className="panel result">
      <div>
        {creative && <p className="hint">Before</p>}
        <img
          className="batch-preview"
          src={creative || item.error ? item.source.url : url || undefined}
          alt={creative ? "Before transformation" : "Optimised result"}
        />
        {creative && item.blob && (
          <>
            <p className="hint">After</p>
            <img
              className="batch-preview"
              src={url || undefined}
              alt="AI transformed result"
            />
          </>
        )}
      </div>
      <div>
        <h3 className="result-name">{item.source.file.name}</h3>
        {item.error ? (
          <p className="error" role="alert">
            {item.error}
          </p>
        ) : (
          <>
            <h3>{bytes(item.blob.size)}</h3>
            <p>
              {item.width ? `${item.width} × ${item.height} px · ` : ""}
              {item.blob.type.split("/")[1].toUpperCase()}
            </p>
            {!creative && (
              <>
                <span className="pill green">
                  {item.blob.size <= item.source.file.size
                    ? `${((1 - item.blob.size / item.source.file.size) * 100).toFixed(1)}% smaller`
                    : `${((item.blob.size / item.source.file.size - 1) * 100).toFixed(1)}% larger`}
                </span>
                <p className="hint">
                  Original: {bytes(item.source.file.size)}. Metadata and
                  animation are not preserved.
                </p>
              </>
            )}
            <Download blob={item.blob} name={item.name} />
          </>
        )}
      </div>
    </div>
  );
}
function BatchResults({ results, creative = false }) {
  const [archive, setArchive] = useState(null);
  const [packing, setPacking] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setArchive(null);
    setError("");
  }, [results]);
  const good = results.filter((r) => r.blob);
  async function pack() {
    setPacking(true);
    try {
      setArchive(await zipImages(good));
    } catch (e) {
      setError(e.message);
    } finally {
      setPacking(false);
    }
  }
  return (
    <div aria-live="polite">
      <div className="batch-heading">
        <h3>
          {good.length} of {results.length} images ready
        </h3>
        {good.length > 1 &&
          (archive ? (
            <Download
              blob={archive}
              name="image-studio-batch.zip"
              label="Download all (ZIP)"
            />
          ) : (
            <button className="button" onClick={pack} disabled={packing}>
              {packing ? "Preparing ZIP…" : "Prepare all downloads (ZIP)"}
            </button>
          ))}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {results.map((item, i) => (
        <ResultItem key={i} item={item} creative={creative} />
      ))}
    </div>
  );
}
function Optimiser() {
  const { source, sources, error, setError, upload, loading } = useSource();
  const [resizeMode, setResizeMode] = useState("original");
  const [scale, setScale] = useState(1);
  const [box, setBox] = useState([1920, 1080]);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState("image/webp");
  const [supported, setSupported] = useState(["image/jpeg", "image/png"]);
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [locked, setLocked] = useState(true);
  const [quality, setQuality] = useState(85);
  const [estimate, setEstimate] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supportedFormats().then((f) => {
      setSupported(f);
      setFormat(f.includes("image/webp") ? "image/webp" : "image/jpeg");
    });
  }, []);
  useEffect(() => {
    if (source) {
      setWidth(source.width);
      setHeight(source.height);
      setResizeMode("original");
    }
  }, [source]);
  function settings(item) {
    let w = width,
      h = height;
    if (resizeMode === "original") {
      w = item.width;
      h = item.height;
    } else if (resizeMode === "percent") {
      w = Math.max(1, Math.round(item.width * scale));
      h = Math.max(1, Math.round(item.height * scale));
    } else if (resizeMode === "fit") {
      const f = Math.min(box[0] / item.width, box[1] / item.height);
      w = Math.max(1, Math.round(item.width * f));
      h = Math.max(1, Math.round(item.height * f));
    } else if (locked) {
      h = Math.max(1, Math.round((width * item.height) / item.width));
    }
    return { width: w, height: h, format, quality };
  }
  useEffect(() => {
    setResult(null);
    setEstimate(null);
    if (!source) return;
    let active = true;
    const timer = setTimeout(
      () =>
        encode(source, settings(source))
          .then((b) => {
            if (active) setEstimate(b.size);
          })
          .catch(() => {}),
      400,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [sources, width, height, format, quality, resizeMode, scale, box, locked]);
  function resize(value, axis) {
    setResizeMode("custom");
    const n = Number(value);
    if (axis === "width") {
      setWidth(n);
      if (locked && source)
        setHeight(Math.max(1, Math.round((n * source.height) / source.width)));
    } else {
      setHeight(n);
      if (locked && source)
        setWidth(Math.max(1, Math.round((n * source.width) / source.height)));
    }
  }
  async function process() {
    setBusy(true);
    setError("");
    setResult(null);
    setProgress(0);
    const outputs = [];
    for (let i = 0; i < sources.length; i++) {
      const item = sources[i];
      try {
        const options = settings(item);
        const blob = await encode(item, options);
        outputs.push({
          blob,
          source: item,
          ...options,
          name: outputName(item.file.name, "optimised", formats[format], i),
        });
      } catch (e) {
        outputs.push({ source: item, error: e.message });
      }
      setProgress(i + 1);
      await new Promise((r) => setTimeout(r, 0));
    }
    setResult(outputs);
    setBusy(false);
  }
  return (
    <section id="optimiser" className="workspace">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SMALLER FILES. SAME BIG IDEAS.</span>
          <h2>Image Optimiser</h2>
          <p>Make every pixel work harder. All on your device.</p>
        </div>
        <span className="pill green">
          <Icon type="shield" size={15} />
          100% local processing
        </span>
      </div>
      <div className="panel-grid">
        <div className="panel">
          <h3>
            <span className="step">1</span>Your image
          </h3>
          <Upload
            source={source}
            sources={sources}
            onFile={upload}
            busy={busy || loading}
          />
          {source && (
            <dl className="facts">
              <div>
                <dt>Dimensions</dt>
                <dd>
                  {source.width} × {source.height} px
                </dd>
              </div>
              <div>
                <dt>Original size</dt>
                <dd>{bytes(source.file.size)}</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>{source.file.type.split("/")[1].toUpperCase()}</dd>
              </div>
            </dl>
          )}
          <div className="privacy">
            <Icon type="shield" size={18} />
            <span>
              Your images stay yours. Nothing is uploaded to a server.
            </span>
          </div>
        </div>
        <div className="panel">
          <h3>
            <span className="step">2</span>Make it fit
          </h3>
          <fieldset disabled={!source || busy || loading}>
            <label>Output format</label>
            <div className="format-options">
              {Object.entries(formats).map(([mime, ext]) => (
                <button
                  key={mime}
                  disabled={!supported.includes(mime)}
                  className={format === mime ? "selected" : ""}
                  title={
                    !supported.includes(mime)
                      ? "Export unavailable in this browser"
                      : ext.toUpperCase()
                  }
                  onClick={() => setFormat(mime)}
                  aria-pressed={format === mime}
                >
                  {ext.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="label-row">
              <label htmlFor="quality">Quality</label>
              <strong>
                {format === "image/png" ? "Lossless PNG" : `${quality}%`}
              </strong>
            </div>
            <input
              id="quality"
              type="range"
              min="10"
              max="100"
              value={quality}
              disabled={format === "image/png"}
              onChange={(e) => setQuality(+e.target.value)}
            />
            <div className="range-labels">
              <span>Smaller file</span>
              <span>Higher quality</span>
            </div>
            <p className="hint">
              {format === "image/png"
                ? "PNG preserves pixels; the quality slider does not apply."
                : "Lossy compression balances detail and file size."}{" "}
              {format === "image/jpeg" ? "Transparent areas become white." : ""}
            </p>
            <div className="dimensions">
              <label>
                Width{" "}
                <input
                  type="number"
                  min="1"
                  max="8192"
                  value={width}
                  onChange={(e) => resize(e.target.value, "width")}
                />
              </label>
              <span>×</span>
              <label>
                Height{" "}
                <input
                  type="number"
                  min="1"
                  max="8192"
                  value={height}
                  onChange={(e) => resize(e.target.value, "height")}
                />
              </label>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={locked}
                onChange={(e) => setLocked(e.target.checked)}
              />
              Maintain original aspect ratio
            </label>
            <div className="dimensions presets">
              <label>
                Resize by{" "}
                <select
                  value=""
                  onChange={(e) => {
                    setResizeMode("percent");
                    setScale(Number(e.target.value));
                    setWidth(
                      Math.max(
                        1,
                        Math.round(source.width * Number(e.target.value)),
                      ),
                    );
                    setHeight(
                      Math.max(
                        1,
                        Math.round(source.height * Number(e.target.value)),
                      ),
                    );
                  }}
                >
                  <option value="" disabled>
                    Percentage
                  </option>
                  {[25, 50, 75, 100].map((n) => (
                    <option key={n} value={n / 100}>
                      {n}%
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fit within{" "}
                <select
                  value=""
                  onChange={(e) => {
                    setResizeMode("fit");
                    const [w, h] = e.target.value.split("x").map(Number);
                    setBox([w, h]);
                    const scale = Math.min(w / source.width, h / source.height);
                    setWidth(Math.max(1, Math.round(source.width * scale)));
                    setHeight(Math.max(1, Math.round(source.height * scale)));
                  }}
                >
                  <option value="" disabled>
                    Common dimensions
                  </option>
                  <option value="1920x1080">1920 × 1080</option>
                  <option value="1080x1080">1080 × 1080</option>
                  <option value="1200x630">1200 × 630</option>
                  <option value="800x800">800 × 800</option>
                </select>
              </label>
            </div>
            <p className="hint">
              Batch settings apply to every image. Percentage and fit presets
              preserve each image’s proportions. Custom locked width
              recalculates each height.
            </p>
            <div className="estimate">
              <span>
                Estimated output{sources.length > 1 ? " (first image)" : ""}
              </span>
              <strong>{estimate === null ? "—" : bytes(estimate)}</strong>
            </div>
            <button className="button full" onClick={process}>
              {busy
                ? `Processing ${progress} / ${sources.length}…`
                : sources.length > 1
                  ? `Optimise ${sources.length} images`
                  : "Optimise image"}
              <Icon type="arrow" size={18} />
            </button>
          </fieldset>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading && <p role="status">Reading images…</p>}
      {busy && (
        <p role="status">
          Processing {progress} of {sources.length} images…
        </p>
      )}
      {result && <BatchResults results={result} />}
    </section>
  );
}
function Creative() {
  const { source, sources, error, setError, upload, loading } = useSource();
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState("ghibli");
  const [blob, setBlob] = useState(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef();
  useEffect(() => {
    setBlob(null);
  }, [sources, selected]);
  useEffect(() => () => controller.current?.abort(), []);
  async function generate() {
    setBusy(true);
    setBlob(null);
    setError("");
    setProgress(0);
    controller.current = new AbortController();
    const results = [];
    for (let i = 0; i < sources.length; i++) {
      if (controller.current.signal.aborted) break;
      const item = sources[i];
      const timeout = setTimeout(() => controller.current.abort(), 120000);
      try {
        const b = await transformImage(
          item.file,
          selected,
          controller.current.signal,
        );
        const check = await decode(new File([b], "result", { type: b.type }));
        URL.revokeObjectURL(check.url);
        results.push({
          blob: b,
          source: item,
          name: outputName(item.file.name, selected, formats[b.type], i),
        });
      } catch (e) {
        results.push({
          source: item,
          error:
            e.name === "AbortError" ? "Cancelled or timed out." : e.message,
        });
      } finally {
        clearTimeout(timeout);
        setProgress(i + 1);
      }
    }
    setBlob(results);
    if (controller.current.signal.aborted)
      setError(
        "Batch stopped. Completed images are available below; remaining images were not sent.",
      );
    setBusy(false);
  }
  return (
    <section id="creative" className="workspace">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ONE IMAGE. TEN NEW PERSPECTIVES.</span>
          <h2>Creative Studio</h2>
          <p>A little imagination. A whole new look.</p>
        </div>
        <span className="pill">✧ AI-powered transformations</span>
      </div>
      <div className="panel-grid creative-grid">
        <div className="panel">
          <h3>
            <span className="step">1</span>Start with your image
          </h3>
          <Upload
            source={source}
            sources={sources}
            onFile={upload}
            busy={busy || loading}
          />
          <div className="notice">
            <strong>
              {endpoint
                ? "Your creative connection is ready"
                : "AI configuration required"}
            </strong>
            <p>
              {endpoint
                ? "Generate sends every selected image, one at a time, to the configured AI service. Each image may incur provider charges. Processing follows that service’s privacy policy."
                : "Connect a secure AI endpoint to enable generation. You can upload an image and explore styles now."}
            </p>
          </div>
          <button
            className="button full"
            disabled={!source || !endpoint || busy || loading}
            onClick={generate}
          >
            <Icon size={18} />
            {busy
              ? `Creating ${progress} / ${sources.length}…`
              : sources.length > 1
                ? `Generate ${sources.length} images`
                : "Generate image"}
          </button>
          {busy && (
            <div role="status" className="processing">
              <span className="spinner" />
              Transforming image {Math.min(
                progress + 1,
                sources.length,
              )} of {sources.length}…{" "}
              <button
                className="text-button"
                onClick={() => controller.current.abort()}
              >
                Cancel
              </button>
            </div>
          )}
          <p className="hint">
            Only Generate sends an image. No filters posing as AI.
          </p>
        </div>
        <div className="panel">
          <h3>
            <span className="step">2</span>Find your style{" "}
            <small>10 curated looks</small>
          </h3>
          <div className="styles">
            {styles.map((s) => (
              <button
                disabled={busy}
                aria-pressed={selected === s[0]}
                className={`style-card ${selected === s[0] ? "active" : ""}`}
                key={s[0]}
                onClick={() => setSelected(s[0])}
              >
                <Art style={s} />
                <span>
                  {s[1]}
                  {selected === s[0] && <b>✓</b>}
                </span>
                <small>{s[2]}</small>
              </button>
            ))}
          </div>
          <p className="hint">
            Illustrated mood thumbnails, not AI output samples. Inspired
            aesthetics; no affiliation with the named studios.
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading && <p role="status">Reading images…</p>}
      {blob && <BatchResults results={blob} creative />}
    </section>
  );
}
function App() {
  return (
    <>
      <header>
        <a href="#" className="brand">
          <span className="brand-icon">
            <Icon size={21} />
          </span>
          image<span className="brand-light">studio</span>
          <sup>AI</sup>
        </a>
        <nav aria-label="Main navigation">
          <a href="#creative">Creative Studio</a>
          <a href="#optimiser">Image Optimiser</a>
        </nav>
        <span className="header-note">
          A little toolkit. Endless possibility.
        </span>
      </header>
      <main>
        <section className="hero">
          <span className="pill">
            <span className="dot" />
            YOUR EVERYDAY IMAGE TOOLKIT
          </span>
          <h1>
            Big ideas.
            <br />
            Beautiful <span>images.</span>
          </h1>
          <p>
            Reimagine a moment. Perfect every pixel.
            <br />
            Two simple tools to take your images further.
          </p>
          <div className="tool-cards">
            <a className="tool-card creative-card" href="#creative">
              <div className="tool-copy">
                <span className="tool-icon">
                  <Icon />
                </span>
                <h2>Creative Studio</h2>
                <p>
                  Turn your images into something
                  <br />
                  wonderfully unexpected.
                </p>
                <span className="card-link">
                  Explore 10 artistic styles <Icon type="arrow" size={18} />
                </span>
              </div>
              <div className="art-stack">
                <Art style={styles[4]} />
                <Art large style={styles[0]} />
                <span className="floating-label">✧ A new perspective</span>
              </div>
            </a>
            <a className="tool-card optimise-card" href="#optimiser">
              <div className="tool-copy">
                <span className="tool-icon">
                  <Icon type="sliders" />
                </span>
                <h2>Image Optimiser</h2>
                <p>
                  Less file size. More possibility.
                  <br />
                  Resize, compress, and convert.
                </p>
                <span className="card-link">
                  Fine-tune your image <Icon type="arrow" size={18} />
                </span>
              </div>
              <div className="file-art">
                <div className="file-back"></div>
                <div className="file-front">
                  <Icon type="sliders" size={38} />
                  <b>Made to fit.</b>
                  <span>JPG · PNG · WebP</span>
                  <div className="mini-slider">
                    <i />
                  </div>
                </div>
                <span className="floating-label">
                  ↘ Small file. Big impact.
                </span>
              </div>
            </a>
          </div>
          <div className="benefits">
            <span>✓ No sign-up needed</span>
            <span>✓ Your originals stay untouched</span>
            <span>✓ Designed to keep things simple</span>
          </div>
        </section>
        <Optimiser />
        <Creative />
        <section className="closing">
          <Icon size={28} />
          <h2>Make something worth sharing.</h2>
          <p>
            From a quick resize to a fresh creative direction. It starts with an
            image.
          </p>
        </section>
      </main>
      <footer>
        <a className="brand" href="#">
          image<span className="brand-light">studio</span>
          <sup>AI</sup>
        </a>
        <span>© {new Date().getFullYear()} Image Studio</span>
        <span>Made for your next idea.</span>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
