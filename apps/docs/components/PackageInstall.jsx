"use client";

import { useEffect, useState } from "react";

const MANAGERS = [
  { id: "npm", label: "npm", cmd: (pkgs) => `npm install ${pkgs}` },
  { id: "pnpm", label: "pnpm", cmd: (pkgs) => `pnpm add ${pkgs}` },
  { id: "yarn", label: "yarn", cmd: (pkgs) => `yarn add ${pkgs}` },
  { id: "bun", label: "bun", cmd: (pkgs) => `bun add ${pkgs}` },
];

const LS_KEY = "routar:pkg-manager";
const SYNC_EVENT = "routar:pkg-manager-change";

const VALID_IDS = new Set(MANAGERS.map((m) => m.id));

function getStored() {
  try {
    const val = localStorage.getItem(LS_KEY);
    return VALID_IDS.has(val) ? val : "npm";
  } catch {
    return "npm";
  }
}

function setStored(id) {
  try {
    localStorage.setItem(LS_KEY, id);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: id }));
  } catch {}
}

export function PackageInstall({ packages }) {
  const pkgStr = Array.isArray(packages) ? packages.join(" ") : packages;
  const [active, setActive] = useState("npm");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setActive(getStored());

    function onSync(e) {
      if (VALID_IDS.has(e.detail)) setActive(e.detail);
    }

    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  function select(id) {
    setActive(id);
    setStored(id);
  }

  const manager = MANAGERS.find((m) => m.id === active);
  const command = manager.cmd(pkgStr);

  function copy() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-black/10 font-mono text-[0.875rem] dark:border-white/10">
      <div className="flex gap-0.5 border-b border-black/10 bg-black/3 px-2 pt-1.5 text-left dark:border-white/10 dark:bg-white/5">
        {MANAGERS.map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => select(m.id)}
            className={`cursor-pointer rounded-t-md border-b-2 border-transparent bg-transparent px-3.5 py-[5px] text-[0.8rem] font-semibold transition-colors ${
              active === m.id
                ? "!border-b-brand bg-[var(--nextra-bg,#fff)] !text-brand dark:bg-gray-900"
                : "text-gray-700 dark:text-gray-400"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between bg-[var(--nextra-bg,#fff)] px-4 py-3 text-left dark:bg-gray-900">
        <code className="grow select-all overflow-hidden text-ellipsis whitespace-nowrap text-gray-900 dark:text-gray-100">
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          title="Copy"
          className={`ml-3 min-w-[52px] shrink-0 cursor-pointer rounded-md border border-black/10 bg-transparent px-2.5 py-1 font-sans text-[0.78rem] font-semibold transition-all dark:border-white/15 ${
            copied
              ? "!bg-brand/10 !text-brand"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
