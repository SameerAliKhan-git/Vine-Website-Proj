import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImageUp, Plus, Trash2, X } from "lucide-react";
import { adminApi } from "../lib/api.js";
import { useToast } from "./toast.jsx";

function ImageField({ value, onChange, id, raw = false }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await adminApi.upload(file, { raw });
      onChange(url);
      toast("Image uploaded — remember to save.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="image-field">
      <div className="image-field__preview">{value ? <img src={value} alt="" /> : <ImageUp size={22} aria-hidden="true" />}</div>
      <div className="image-field__controls">
        <button type="button" className="a-btn a-btn--ghost" onClick={() => input.current?.click()} disabled={busy}>
          <ImageUp size={15} aria-hidden="true" /> {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
        </button>
        {value && (
          <button type="button" className="a-btn a-btn--ghost" onClick={() => onChange("")}>
            <X size={15} aria-hidden="true" /> Remove
          </button>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onFile} />
        <input id={id} className="a-input a-input--small" value={value || ""} placeholder="…or paste an image link" onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function StringList({ value = [], onChange, placeholder }) {
  const update = (index, next) => onChange(value.map((item, i) => (i === index ? next : item)));
  return (
    <div className="list-field">
      {value.map((item, index) => (
        <div className="list-field__row" key={index}>
          <input className="a-input" value={item} placeholder={placeholder} onChange={(e) => update(index, e.target.value)} />
          <button type="button" className="icon-btn" aria-label="Remove" onClick={() => onChange(value.filter((_, i) => i !== index))}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" className="a-btn a-btn--ghost" onClick={() => onChange([...value, ""])}>
        <Plus size={15} aria-hidden="true" /> Add
      </button>
    </div>
  );
}

function ObjectList({ value = [], onChange, columns }) {
  const update = (index, key, next) => onChange(value.map((item, i) => (i === index ? { ...item, [key]: next } : item)));
  const move = (index, delta) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  return (
    <div className="list-field">
      {value.map((item, index) => (
        <div className="list-field__row list-field__row--object" key={index}>
          {columns.map((col) => (
            <input
              key={col.name}
              className="a-input"
              aria-label={col.label}
              placeholder={col.label}
              value={item[col.name] || ""}
              onChange={(e) => update(index, col.name, e.target.value)}
            />
          ))}
          <span className="list-field__tools">
            <button type="button" className="icon-btn" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
              <ArrowUp size={14} />
            </button>
            <button type="button" className="icon-btn" aria-label="Move down" disabled={index === value.length - 1} onClick={() => move(index, 1)}>
              <ArrowDown size={14} />
            </button>
            <button type="button" className="icon-btn" aria-label="Remove" onClick={() => onChange(value.filter((_, i) => i !== index))}>
              <Trash2 size={14} />
            </button>
          </span>
        </div>
      ))}
      <button
        type="button"
        className="a-btn a-btn--ghost"
        onClick={() => onChange([...value, Object.fromEntries(columns.map((c) => [c.name, ""]))])}
      >
        <Plus size={15} aria-hidden="true" /> Add row
      </button>
    </div>
  );
}

export function Field({ field, value, onChange }) {
  const id = `f-${field.name}`;
  let control;
  switch (field.type) {
    case "textarea":
      control = <textarea id={id} className="a-input" rows={field.rows || 4} value={value || ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "checkbox":
      return (
        <label className="a-check">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span>
            <strong>{field.label}</strong>
            {field.help && <small>{field.help}</small>}
          </span>
        </label>
      );
    case "image":
      control = <ImageField id={id} value={value} onChange={onChange} raw={field.raw} />;
      break;
    case "list":
      control = <StringList value={value} onChange={onChange} placeholder={field.placeholder} />;
      break;
    case "objects":
      control = <ObjectList value={value} onChange={onChange} columns={field.columns} />;
      break;
    default:
      control = (
        <input
          id={id}
          className="a-input"
          type={field.type === "datetime" ? "datetime-local" : field.type || "text"}
          min={field.min}
          max={field.max}
          value={value || ""}
          placeholder={field.placeholder}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
  return (
    <div className={`a-field${field.wide ? " a-field--wide" : ""}`}>
      <label htmlFor={id}>
        {field.label}
        {field.required && " *"}
      </label>
      {control}
      {field.help && <small className="a-help">{field.help}</small>}
    </div>
  );
}

export function FieldGrid({ fields, value, onChange }) {
  return (
    <div className="a-grid">
      {fields.map((field) => (
        <Field key={field.name} field={field} value={value[field.name]} onChange={(next) => onChange({ ...value, [field.name]: next })} />
      ))}
    </div>
  );
}
