"use client";

import { useEffect, useState } from "react";
import styles from "./PackageInstall.module.css";

const MANAGERS = [
  { id: "npm", label: "npm", cmd: (pkgs) => `npm install ${pkgs}` },
  { id: "pnpm", label: "pnpm", cmd: (pkgs) => `pnpm add ${pkgs}` },
  { id: "yarn", label: "yarn", cmd: (pkgs) => `yarn add ${pkgs}` },
  { id: "bun", label: "bun", cmd: (pkgs) => `bun add ${pkgs}` },
];

const LS_KEY = "routar:pkg-manager";
const SYNC_EVENT = "routar:pkg-manager-change";

function getStored() {
  try {
    return localStorage.getItem(LS_KEY) ?? "npm";
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
      setActive(e.detail);
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
    <div className={styles.wrapper}>
      <div className={styles.tabBar}>
        {MANAGERS.map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => select(m.id)}
            className={`${styles.tab} ${active === m.id ? styles.tabActive : ""}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className={styles.commandRow}>
        <code className={styles.command}>{command}</code>
        <button
          type="button"
          onClick={copy}
          title="Copy"
          className={`${styles.copyBtn} ${copied ? styles.copyBtnActive : ""}`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
