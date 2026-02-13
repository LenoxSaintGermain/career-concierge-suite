import React from 'react';

export function JsonDoc(props: { title?: string; value: unknown }) {
  return (
    <div className="border border-black/5 bg-gray-50 p-6 overflow-auto">
      {props.title && (
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">{props.title}</div>
      )}
      <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-gray-700">
        {JSON.stringify(props.value, null, 2)}
      </pre>
    </div>
  );
}

