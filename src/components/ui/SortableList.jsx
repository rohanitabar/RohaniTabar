/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from 'react';
import './SortableList.css';

export default function SortableList({ items, lang, busy, renderItem, onReorder }) {
  const [ordered, setOrdered] = useState(items);
  const [dragging, setDragging] = useState(null);
  const list = useRef(null);
  const active = useRef(null);
  const current = useRef(items);
  useEffect(() => { if (!active.current) { current.current = items; setOrdered(items); } }, [items]);

  const move = (fromId, toId) => {
    const next = [...current.current];
    const from = next.findIndex((item) => item.id === fromId);
    const to = next.findIndex((item) => item.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    current.current = next;
    setOrdered(next);
  };
  const finish = async () => {
    const fromId = active.current;
    active.current = null;
    setDragging(null);
    if (!fromId) return;
    const ids = current.current.map((item) => item.id);
    if (ids.every((id, index) => id === items[index]?.id)) return;
    if (!(await onReorder(ids))) { current.current = items; setOrdered(items); }
  };
  return <><p className="sort-hint">{lang === 'fa' ? 'دستهٔ کنار هر مورد را نگه دار و به جای دلخواه بکش.' : 'Hold the grip beside an item and drag it into place.'}</p><ul className="admin-list sortable-list" ref={list}
    onPointerMove={(event) => { if (!active.current) return; if (event.clientY < 70) window.scrollBy(0, -14); else if (event.clientY > window.innerHeight - 70) window.scrollBy(0, 14); const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-sort-id]'); if (target && list.current?.contains(target)) move(active.current, target.dataset.sortId); }}
    onPointerUp={finish}
    onPointerCancel={() => { active.current = null; current.current = items; setOrdered(items); setDragging(null); }}>
    {ordered.map((item) => { const label = item.name || item.href || item.title?.[lang] || item.title?.fa || item.title?.en || ''; return <li key={item.id} data-sort-id={item.id} className={dragging === item.id ? 'sortable-active' : ''}>
      <button className="drag-handle" type="button" disabled={busy} aria-label={lang === 'fa' ? `برای جابه‌جایی ${label} بکش یا از کلیدهای بالا و پایین استفاده کن` : `Drag ${label} to reorder, or use arrow keys`} title={lang === 'fa' ? 'برای مرتب‌سازی بکش' : 'Drag to reorder'} aria-grabbed={dragging === item.id}
        onPointerDown={(event) => { if (busy || event.button !== 0) return; event.preventDefault(); list.current?.setPointerCapture(event.pointerId); active.current = item.id; setDragging(item.id); }}
        onKeyDown={async (event) => { if (busy || !['ArrowUp', 'ArrowDown'].includes(event.key)) return; event.preventDefault(); const index = current.current.findIndex((entry) => entry.id === item.id); const target = index + (event.key === 'ArrowUp' ? -1 : 1); if (target < 0 || target >= current.current.length) return; const next = [...current.current]; next.splice(target, 0, next.splice(index, 1)[0]); current.current = next; setOrdered(next); if (!(await onReorder(next.map((entry) => entry.id)))) { current.current = items; setOrdered(items); } }}
      >⠿</button>{renderItem(item)}
    </li>; })}
  </ul></>;
}
