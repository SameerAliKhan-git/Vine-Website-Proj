import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { adminApi } from "../lib/api.js";
import { FieldGrid } from "./fields.jsx";
import { useToast } from "./toast.jsx";

function DeleteButton({ onConfirm }) {
  const [armed, setArmed] = useState(false);
  if (armed) {
    return (
      <span className="confirm">
        <span>Delete?</span>
        <button type="button" className="a-btn a-btn--danger a-btn--tiny" onClick={onConfirm}>
          Yes, delete
        </button>
        <button type="button" className="a-btn a-btn--ghost a-btn--tiny" onClick={() => setArmed(false)}>
          Cancel
        </button>
      </span>
    );
  }
  return (
    <button type="button" className="icon-btn" aria-label="Delete" onClick={() => setArmed(true)}>
      <Trash2 size={15} />
    </button>
  );
}
export { DeleteButton };

/**
 * List + add/edit/delete/reorder UI for one collection (activities, sessions, sermons, …).
 */
export default function CollectionEditor({ collection, items, onItemsChange, fields, blank, describe, addLabel = "Add new", reorderable = true, emptyText }) {
  const [editing, setEditing] = useState(null); // { id?: string, value: object }
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const { id, value } = editing;
      if (id) {
        const saved = await adminApi.put(`/${collection}/${id}`, value);
        onItemsChange(items.map((item) => (item.id === id ? saved : item)));
      } else {
        const saved = await adminApi.post(`/${collection}`, value);
        onItemsChange([saved, ...items]);
      }
      setEditing(null);
      toast("Saved — it’s live on the website.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await adminApi.delete(`/${collection}/${id}`);
      onItemsChange(items.filter((item) => item.id !== id));
      toast("Deleted.");
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function move(index, delta) {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onItemsChange(next);
    try {
      await adminApi.put(`/${collection}/reorder`, { ids: next.map((i) => i.id) });
    } catch (error) {
      toast(error.message, "error");
    }
  }

  return (
    <div className="collection">
      {!editing && (
        <button type="button" className="a-btn a-btn--primary" onClick={() => setEditing({ value: structuredClone(blank) })}>
          <Plus size={16} aria-hidden="true" /> {addLabel}
        </button>
      )}

      {editing && (
        <form className="a-card editor" onSubmit={save}>
          <h3>{editing.id ? "Edit" : addLabel}</h3>
          <FieldGrid fields={fields} value={editing.value} onChange={(value) => setEditing({ ...editing, value })} />
          <div className="editor__actions">
            <button type="submit" className="a-btn a-btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="a-btn a-btn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length === 0 && !editing && <p className="a-empty">{emptyText || "Nothing here yet."}</p>}

      <ul className="item-list">
        {items.map((item, index) => {
          const { title, meta, image } = describe(item);
          return (
            <li key={item.id} className={editing?.id === item.id ? "is-editing" : ""}>
              {image !== undefined && <span className="item-list__thumb">{image && <img src={image} alt="" />}</span>}
              <span className="item-list__body">
                <strong>{title || "Untitled"}</strong>
                {meta && <small>{meta}</small>}
              </span>
              <span className="item-list__tools">
                {reorderable && (
                  <>
                    <button type="button" className="icon-btn" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp size={15} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown size={15} />
                    </button>
                  </>
                )}
                <button type="button" className="icon-btn" aria-label="Edit" onClick={() => setEditing({ id: item.id, value: structuredClone(item) })}>
                  <Pencil size={15} />
                </button>
                <DeleteButton onConfirm={() => remove(item.id)} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
